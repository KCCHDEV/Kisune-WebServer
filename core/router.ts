/**
 * File-based router — สแกนโฟลเดอร์แล้วสร้าง route ให้อัตโนมัติ
 *
 *   src/api/hello.ts            ->  /api/hello
 *   src/api/users/index.ts      ->  /api/users
 *   src/api/users/[id].ts       ->  /api/users/:id
 *   src/pages/index.tsx         ->  /
 *   src/pages/docs/[...slug].tsx ->  /docs/*
 *   src/pages/(marketing)/about.tsx -> /about   (โฟลเดอร์ในวงเล็บ = จัดกลุ่ม ไม่ขึ้นใน URL)
 *
 * ไฟล์/โฟลเดอร์ที่ขึ้นต้นด้วย _ จะไม่ถูกทำเป็น route (เช่น _guard.ts, _404.tsx, _lib/)
 *
 * ตอนรันจาก build (scripts/build.ts) ไม่มีโฟลเดอร์ให้สแกน — ใช้ module ที่ import ไว้ล่วงหน้าใน build.modules แทน
 *
 * ในไฟล์ route:
 *   export const GET = ...  / POST / PUT / PATCH / DELETE ...
 *   (เฉพาะ pages) export default = GET
 *   export const WS = defineSocket({ open, message, close })  → WebSocket ที่ path ของไฟล์
 *   export const cache = 60   → cache response ของ GET ไว้ 60 วินาที (บีบอัด + ETag ให้ด้วย)
 */
import type { Elysia } from 'elysia'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { METHODS, type Guard, type RouteDef } from './route'
import { c, logEvent } from './logger'
import { withResponseCache } from './http-cache'
import { build } from './files'

type Options = {
  /** โฟลเดอร์ที่จะสแกน */
  dir: string
  /** prefix ของ URL เช่น '/api' */
  prefix?: string
  /** pages = ให้ export default เป็น GET */
  kind: 'api' | 'page'
}

export type LoadedRoute = {
  method: string
  path: string
  file: string
  kind: Options['kind']
  /** วินาทีที่ cache response ไว้ (ถ้ามี) */
  cache?: number
}

/** route ทั้งหมดที่โหลดแล้ว (อ่านได้จากที่อื่น เช่น หน้า trailer) */
export const registry: LoadedRoute[] = []

const glob = new Bun.Glob('**/*.{ts,tsx}')

/** แปลง path ของไฟล์เป็น URL */
export function fileToPath(file: string, prefix = ''): string {
  const segments = file
    .replace(/\.(ts|tsx)$/, '')
    .split('/')
    .filter((s) => s !== 'index' && !/^\(.+\)$/.test(s)) // ตัด index และ (group)
    .map((s) => {
      if (/^\[\.\.\..+\]$/.test(s)) return '*' // [...slug]
      if (/^\[.+\]$/.test(s)) return ':' + s.slice(1, -1) // [id]
      return s
    })

  const path = [prefix.replace(/\/$/, ''), ...segments].filter(Boolean).join('/')
  return '/' + path.replace(/^\//, '')
}

/** route คงที่มาก่อน dynamic, wildcard ไว้ท้ายสุด */
function score(path: string) {
  return path
    .split('/')
    .map((s) => (s === '*' ? '2' : s.startsWith(':') ? '1' : '0'))
    .join('')
}

const isPrivate = (file: string) => file.split('/').some((s) => s.startsWith('_'))

type Source = { files: string[]; load: (file: string) => Promise<Record<string, any>> }

/** ไฟล์ทั้งหมดในโฟลเดอร์ (path แบบ a/b.tsx) และวิธีโหลด — จากดิสก์ หรือจาก build */
function sourceOf(dir: string): Source {
  if (build) {
    const prefix = `${dir}/`
    const modules = build.modules
    return {
      files: Object.keys(modules)
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length)),
      load: async (file) => modules[prefix + file]!,
    }
  }
  const root = resolve(dir)
  return {
    files: existsSync(root) ? [...glob.scanSync({ cwd: root })].map((f) => f.replaceAll('\\', '/')) : [],
    load: (file) => import(join(root, file)),
  }
}

/** รวม _guard.ts ทุกตัวจากโฟลเดอร์แม่ลงมาถึงโฟลเดอร์ของไฟล์ */
async function guardsFor(src: Source, file: string, cache: Map<string, Guard | null>) {
  const parts = file.split('/').slice(0, -1)
  const result: Guard[] = []

  for (let i = 0; i <= parts.length; i++) {
    const dir = parts.slice(0, i).join('/')
    if (!cache.has(dir)) {
      const found = ['_guard.ts', '_guard.tsx'].map((f) => (dir ? `${dir}/${f}` : f)).find((f) => src.files.includes(f))
      cache.set(dir, found ? ((await src.load(found)).default as Guard) : null)
    }
    const g = cache.get(dir)
    if (g) result.push(g)
  }
  return result
}

function toDef(exported: unknown): RouteDef | null {
  if (typeof exported === 'function') return { handler: exported as any }
  if (exported && typeof exported === 'object' && 'handler' in exported) return exported as RouteDef
  return null
}

export async function loadRoutes(app: Elysia<any, any, any, any, any, any, any>, opts: Options) {
  const src = sourceOf(opts.dir)
  const loaded: LoadedRoute[] = []

  const files = src.files
    .filter((f) => !isPrivate(f) && !f.endsWith('.d.ts') && !/\.(test|spec)\.tsx?$/.test(f))
    .map((file) => ({ file, path: fileToPath(file, opts.prefix) }))
    .sort((a, b) => score(a.path).localeCompare(score(b.path)) || a.path.localeCompare(b.path))

  const guardCache = new Map<string, Guard | null>()

  for (const { file, path } of files) {
    const mod = await src.load(file)
    const guards = await guardsFor(src, file, guardCache)

    const exports: [string, unknown][] = METHODS.filter((m) => m in mod).map((m) => [m, mod[m]])
    if (opts.kind === 'page' && mod.default && !('GET' in mod)) exports.push(['GET', mod.default])

    // WebSocket: ws://host/<path ของไฟล์> (แนะนำแยกไฟล์ต่างหาก ไม่ปน GET)
    if (mod.WS && typeof mod.WS === 'object') {
      app.ws(path, mod.WS)
      loaded.push({ method: 'WS', path, file: `${opts.dir}/${file}`, kind: opts.kind })
    }

    if (exports.length === 0) {
      if (mod.WS) continue
      logEvent(c.yellow('!'), `${opts.dir}/${file} ${c.gray('ไม่มี export GET/POST/... (หรือ default สำหรับ page)')}`)
      continue
    }

    for (const [method, exported] of exports) {
      const def = toDef(exported)
      if (!def) {
        logEvent(c.yellow('!'), `${opts.dir}/${file} ${c.gray(`export ${method} ต้องเป็นฟังก์ชันหรือ defineRoute({...})`)}`)
        continue
      }

      const { handler: rawHandler, beforeHandle, ...hook } = def
      // export const cache = <วินาที> → cache เฉพาะ GET (POST/DELETE เปลี่ยนข้อมูล ห้าม cache)
      const ttl = method === 'GET' && typeof mod.cache === 'number' && mod.cache > 0 ? mod.cache : undefined
      const handler = ttl ? withResponseCache(rawHandler, ttl) : rawHandler

      // guard ของโฟลเดอร์ทำงานก่อน beforeHandle ของ route เอง
      const chain = [
        ...guards.map((g) => async (ctx: any) => {
          if (g.derive) Object.assign(ctx, await g.derive(ctx))
          if (g.beforeHandle) return g.beforeHandle(ctx)
        }),
        ...(beforeHandle ? [beforeHandle].flat() : []),
      ]

      app.route(method, path, handler as any, {
        ...hook,
        ...(chain.length ? { beforeHandle: chain } : {}),
      } as any)

      loaded.push({ method, path, file: `${opts.dir}/${file}`, kind: opts.kind, cache: ttl })
    }
  }

  registry.push(...loaded)
  return loaded
}
