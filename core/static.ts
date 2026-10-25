/**
 * เสิร์ฟไฟล์ static จากหน่วยความจำ แทน @elysiajs/static
 *
 *   /public/*        → ไฟล์ในโฟลเดอร์ public/
 *   /vendor/<name>   → ไลบรารีจาก node_modules (htmx ฯลฯ) — ไม่ต้องพึ่ง CDN ภายนอก
 *
 * อ่านไฟล์ + บีบอัด brotli/gzip ครั้งเดียวแล้วเก็บใน cache · URL ที่มี ?v= ให้ browser cache 1 ปี (immutable)
 * dev: เช็กเวลาแก้ไขไฟล์ทุกครั้ง แก้แล้วเห็นผลทันที · production: ไม่เช็ก (ไฟล์ไม่เปลี่ยน)
 */
import { Elysia } from 'elysia'
import { statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { cache } from './cache'
import { pack, respond, type Packed } from './http-cache'

const isProd = process.env.NODE_ENV === 'production'
const PUBLIC_DIR = resolve('public')

/** ชื่อที่ใช้ใน URL → ไฟล์ใน node_modules */
export const VENDOR: Record<string, string> = {
  'htmx.js': 'htmx.org/dist/htmx.min.js',
  'htmx-sse.js': 'htmx-ext-sse/sse.js',
  'htmx-ws.js': 'htmx-ext-ws/ws.js',
  'htmx-preload.js': 'htmx-ext-preload/dist/preload.min.js',
}

export const vendorPath = (name: string) => join(process.cwd(), 'node_modules', VENDOR[name] ?? '')

const minifier = new Bun.Transpiler({ loader: 'js', minifyWhitespace: true })

type StaticEntry = { packed: Packed; mtime: number }

async function load(file: string, key: string): Promise<Packed | null> {
  const cached = cache.get<StaticEntry>(key)
  if (cached && isProd) return cached.packed

  let mtime: number
  try {
    const st = statSync(file)
    if (!st.isFile()) return null
    mtime = st.mtimeMs
  } catch {
    return null
  }
  if (cached && cached.mtime === mtime) return cached.packed

  const f = Bun.file(file)
  let body: Uint8Array = new Uint8Array(await f.arrayBuffer())
  // ไฟล์ .js ที่ยังไม่ได้ย่อ → ตัดช่องว่างออกก่อนบีบอัด
  if (file.endsWith('.js') && !file.endsWith('.min.js')) {
    try {
      body = new TextEncoder().encode(minifier.transformSync(new TextDecoder().decode(body)))
    } catch {}
  }
  const packed = pack(body, f.type, 11)
  cache.set(key, { packed, mtime }, { size: packed.size })
  return packed
}

function cacheControl(request: Request) {
  // มี ?v= (asset() ใส่ให้) = เนื้อหาไม่เปลี่ยนแน่นอน → cache ยาว · ไม่มี = ถาม server ทุกครั้งด้วย ETag
  return request.url.includes('?v=') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate'
}

export const staticFiles = new Elysia({ name: 'static-files' })
  .get('/public/*', async ({ params, request, set }) => {
    let rel: string
    try {
      rel = decodeURIComponent(params['*'])
    } catch {
      rel = params['*']
    }
    const file = resolve(PUBLIC_DIR, rel)
    // กัน path traversal เช่น /public/../.env
    if (!file.startsWith(PUBLIC_DIR + sep)) return ((set.status = 404), 'Not Found')

    const packed = await load(file, `static:${file}`)
    if (!packed) return ((set.status = 404), 'Not Found')
    return respond(packed, request, { 'cache-control': cacheControl(request) })
  })
  .get('/vendor/:name', async ({ params, request, set }) => {
    if (!VENDOR[params.name]) return ((set.status = 404), 'Not Found')
    const packed = await load(vendorPath(params.name), `vendor:${params.name}`)
    if (!packed) return ((set.status = 404), 'Not Found')
    return respond(packed, request, { 'cache-control': cacheControl(request) })
  })
