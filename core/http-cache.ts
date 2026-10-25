/**
 * Response ที่บีบอัดไว้ล่วงหน้า (brotli + gzip) พร้อม ETag — บีบครั้งเดียว ส่งได้ไม่จำกัดครั้ง
 * และตัวห่อ handler ให้ cache ทั้ง response:  export const cache = 60  ในไฟล์ route
 */
import { brotliCompressSync, constants } from 'node:zlib'
import { cache } from './cache'

type Bytes = Uint8Array<ArrayBuffer>

export type Packed = {
  raw: Bytes
  gz: Bytes | null
  br: Bytes | null
  etag: string
  type: string
  /** byte ทั้งหมดที่ใช้ใน cache */
  size: number
}

const encoder = new TextEncoder()
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml)|image\/svg)/

/** แปลงเนื้อหาเป็น Packed — brQuality: 5 เร็ว (หน้าเว็บ), 11 เล็กสุด (ไฟล์ static บีบครั้งเดียว) */
export function pack(body: string | Uint8Array, type: string, brQuality = 5): Packed {
  const raw = (typeof body === 'string' ? encoder.encode(body) : body) as Bytes
  const worth = raw.byteLength >= 1024 && COMPRESSIBLE.test(type) // ไฟล์เล็กบีบแล้วไม่คุ้ม
  const gz = worth ? (Bun.gzipSync(raw, { level: 6 }) as Bytes) : null
  const br = worth
    ? (new Uint8Array(
        brotliCompressSync(raw, {
          params: { [constants.BROTLI_PARAM_QUALITY]: brQuality, [constants.BROTLI_PARAM_SIZE_HINT]: raw.byteLength },
        }),
      ) as Bytes)
    : null
  return {
    raw,
    gz,
    br,
    etag: `"${Bun.hash(raw).toString(36)}"`,
    type,
    size: raw.byteLength + (gz?.byteLength ?? 0) + (br?.byteLength ?? 0) + 128,
  }
}

/** ส่ง Packed ตาม Accept-Encoding ของ browser · ETag ตรง = 304 (ไม่ส่ง body เลย) */
export function respond(p: Packed, request: Request, headers: Record<string, string> = {}): Response {
  const h = new Headers({ 'content-type': p.type, etag: p.etag, vary: 'Accept-Encoding', ...headers })
  if (request.headers.get('if-none-match') === p.etag) return new Response(null, { status: 304, headers: h })

  const accept = request.headers.get('accept-encoding') ?? ''
  if (p.br && accept.includes('br')) {
    h.set('content-encoding', 'br')
    return new Response(p.br, { headers: h })
  }
  if (p.gz && accept.includes('gzip')) {
    h.set('content-encoding', 'gzip')
    return new Response(p.gz, { headers: h })
  }
  return new Response(p.raw, { headers: h })
}

type Ctx = { request: Request; set: { status?: number | string } }
type AnyHandler = (ctx: any) => unknown

/**
 * cache ทั้ง response ของ GET ไว้ ttl วินาที (key = URL เต็มรวม query)
 * เก็บเฉพาะสถานะ 200 ที่เป็น HTML string หรือ JSON — อย่าใช้กับหน้าที่ขึ้นกับผู้ใช้/cookie
 */
export function withResponseCache(handler: AnyHandler, ttl: number): AnyHandler {
  const browserMaxAge = Math.min(ttl, 60)

  return async (ctx: Ctx) => {
    const key = `res:${ctx.request.url}`
    const headers = (state: string) => ({
      'cache-control': `public, max-age=${browserMaxAge}`,
      'x-cache': state,
    })

    const hit = cache.get<Packed>(key)
    if (hit) return respond(hit, ctx.request, headers('HIT'))

    const result = await handler(ctx)
    const status = ctx.set.status ?? 200
    if (status !== 200 && status !== 'OK') return result
    if (result instanceof Response || result == null) return result

    let p: Packed
    if (typeof result === 'string') {
      const html = result.startsWith('<html') ? '<!doctype html>' + result : result
      p = pack(html, html.startsWith('<') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8')
    } else if (typeof result === 'object') {
      p = pack(JSON.stringify(result), 'application/json')
    } else return result

    cache.set(key, p, { ttl, size: p.size })
    return respond(p, ctx.request, headers('MISS'))
  }
}
