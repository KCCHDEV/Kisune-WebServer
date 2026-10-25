/**
 * Console สวยๆ: banner ตอนเริ่ม, ตาราง route แยกตาม method และ log ทุก request
 *
 *   21:27:31  GET   200   3.2ms  /?part=orders  htmx  admin
 *
 * env:  NO_COLOR=1 ปิดสี · FORCE_COLOR=1 บังคับสี · LOG_STATIC=1 แสดงไฟล์ /public · LOG_BENCH=1 แสดง /api/bench/* · LOG=0 ปิด request log
 */
import { Elysia, StatusMap } from 'elysia'
import { unsignCookie } from 'elysia/utils'
import type { LoadedRoute } from './router'
import { cache } from './cache'

/* ---------- สี ANSI ---------- */

const useColor = !!process.env.FORCE_COLOR || (!process.env.NO_COLOR && !!process.stdout.isTTY)
const esc = (open: string, close = '39') => (s: string | number) =>
  useColor ? `\x1b[${open}m${s}\x1b[${close}m` : String(s)

export const c = {
  bold: esc('1', '22'),
  dim: esc('2', '22'),
  gray: esc('90'),
  red: esc('91'),
  green: esc('92'),
  yellow: esc('93'),
  blue: esc('94'),
  magenta: esc('95'),
  cyan: esc('96'),
  white: esc('97'),
  pink: esc('38;5;205'),
  violet: esc('38;5;141'),
}

/** ป้ายตัวหนังสือดำบนพื้นสี เช่น  GET  */
const badge = (bg: string, text: string, width = 0) => {
  const t = ` ${text.padEnd(width)} `
  return useColor ? `\x1b[${bg};30m${t}\x1b[0m` : `[${text.padEnd(width)}]`
}

const METHOD_BG: Record<string, string> = {
  GET: '102', // เขียว
  POST: '104', // ฟ้า
  PUT: '103', // เหลือง
  PATCH: '105', // ม่วง
  DELETE: '101', // แดง
  WS: '106', // ฟ้าอมเขียว
}
const methodBadge = (m: string, width = 6) => badge(METHOD_BG[m] ?? '47', m, width)

/** ความกว้างที่แสดงจริง (ภาษาไทยมีสระบน/ล่างที่ไม่กินช่อง, ไม่นับรหัสสี) */
const width = (s: string) => Bun.stringWidth(s)
const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - width(s)))
const cols = () => process.stdout.columns || 120

/** ตัดข้อความยาวจากด้านซ้ายให้พอดีช่อง: …/admin/products/[id].tsx */
const fitLeft = (s: string, w: number) => (w < 4 ? '' : width(s) <= w ? s : '…' + s.slice(s.length - (w - 1)))

const rule = (w = Math.min(cols(), 72)) => c.gray('─'.repeat(w))

/* ---------- banner + ตาราง route ---------- */

type BannerOptions = { name: string; mode: string; port: number | undefined; routes: LoadedRoute[] }

export function printBanner({ name, mode, port, routes }: BannerOptions) {
  const base = `http://localhost:${port}`
  const pages = routes.filter((r) => r.kind === 'page' && r.method !== 'WS').length
  const apis = routes.filter((r) => r.kind === 'api').length
  const ws = routes.filter((r) => r.method === 'WS').length

  const row = (label: string, value: string) => `  ${pad(c.gray(label), 10)} ${value}`
  const link = (path = '') => c.violet(base + path)

  console.log()
  console.log(rule())
  console.log(
    `  ${c.bold(c.white(name))}  ${c.gray('·')}  ${mode.startsWith('production') ? c.green(mode) : c.yellow(mode)}  ${c.gray('·')}  ${c.gray(`Bun ${Bun.version}`)}`,
  )
  console.log(row('เว็บ', link()))
  console.log(row('ตัวอย่าง', link('/examples')))
  console.log(row('ทดสอบ', link('/benchmark')))
  console.log(row('API doc', link('/openapi')))
  console.log(row('cache', `${c.white(Math.round(cache.maxBytes / 1024 / 1024))} MB ${c.gray('(in-memory LRU · ตั้งด้วย CACHE_MAX_MB)')}`))
  console.log(
    row(
      'route',
      `${c.bold(c.white(routes.length))} ทั้งหมด  ${c.gray('·')}  หน้าเว็บ ${c.white(pages)}  ${c.gray('·')}  API ${c.white(apis)}${ws ? `  ${c.gray('·')}  WS ${c.white(ws)}` : ''}`,
    ),
  )
  console.log(rule())
}

const ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'WS']
const KIND = { page: c.green('page'), api: c.magenta('api '), ws: c.cyan('ws  ') }

export function printRoutes(routes: LoadedRoute[]) {
  const pathW = Math.min(36, Math.max(...routes.map((r) => width(r.path)), 8))

  for (const method of ORDER) {
    const group = routes
      .filter((r) => r.method === method)
      // หน้าเว็บก่อน แล้วค่อย API
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'page' ? -1 : 1))
    if (!group.length) continue

    console.log()
    console.log(`${methodBadge(method, 0)} ${c.gray(`${group.length} route`)}`)
    for (const r of group) {
      const kind = method === 'WS' ? KIND.ws : KIND[r.kind]
      const colorPath = method === 'GET' ? c.green : method === 'POST' ? c.blue : method === 'DELETE' ? c.red : c.cyan
      const path = width(r.path) > pathW ? fitLeft(r.path, pathW) : r.path
      // 3 เว้นหน้า + 4 ชนิด + 2 + path + 2 = ที่เหลือคือชื่อไฟล์
      const fileW = cols() - (3 + 4 + 2 + pathW + 2) - 1
      const ttl = r.cache ? c.yellow(`⚡${r.cache}s `) : ''
      const ttlW = r.cache ? width(`⚡${r.cache}s `) : 0
      console.log(`   ${kind}  ${pad(colorPath(path), pathW)}  ${ttl}${c.gray(fitLeft(r.file, fileW - ttlW))}`)
    }
  }
}

export function printLogHeader() {
  const sep = c.gray('·')
  console.log()
  console.log(rule())
  console.log(
    `  ${c.bold(c.white('REQ log'))}  ${c.gray('เวลา  method  สถานะ  ใช้เวลา  path  [ชนิด]  ผู้ใช้')}`,
  )
  console.log(
    `  ${c.gray('ชนิด:')} ${c.pink('htmx')} ${c.gray('= อัปเดตบางส่วน')} ${sep} ${c.cyan('nav')} ${c.gray('= เปลี่ยนหน้า (hx-boost)')} ${sep} ${c.magenta('api')}`,
  )
  console.log(`  ${c.green('cache')} ${c.gray('= ตอบจาก cache · ⚡60s ในตาราง route = cache ทั้งหน้า 60 วินาที')}`)
  console.log(`  ${c.gray('ซ่อน /public, /vendor และ /api/bench อยู่ (LOG_STATIC=1 / LOG_BENCH=1 เพื่อแสดง)')}`)
  console.log(rule())
  console.log()
}

/** ข้อความระบบ เช่น reload: "21:30:04  ♻  พบไฟล์ใหม่ …" */
export function logEvent(icon: string, message: string) {
  console.log(`${c.gray(clock())}  ${icon}  ${message}`)
}

/* ---------- request log ---------- */

const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false })

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function fmtDuration(ms: number) {
  const text = ms < 1 ? `${Math.round(ms * 1000)}µs` : ms < 100 ? `${ms.toFixed(1)}ms` : `${Math.round(ms)}ms`
  const padded = text.padStart(7)
  return ms < 50 ? c.white(padded) : ms < 300 ? c.yellow(padded) : c.red(padded)
}

function fmtStatus(code: number) {
  const s = String(code)
  return code >= 500 ? c.red(s) : code >= 400 ? c.yellow(s) : code >= 300 ? c.cyan(s) : c.green(s)
}

function fmtPath(path: string, query: string) {
  return c.bold(c.white(path)) + (query ? c.gray(query) : '')
}

/** หาสถานะจริงของ response (Response, status(...), หรือ set.status) */
function statusOf(set: { status?: number | string }, value: unknown): number {
  if (value instanceof Response) return value.status
  if (value && typeof value === 'object' && 'code' in value && typeof value.code === 'number') return value.code
  const s = set.status ?? 200
  return typeof s === 'number' ? s : ((StatusMap as Record<string, number>)[s] ?? 200)
}

/** อ่านชื่อผู้ใช้จาก cookie session — แสดงเฉพาะที่ลายเซ็นถูกต้อง */
async function userOf(cookie: string | null, secret: string): Promise<string | null> {
  const raw = /(?:^|;\s*)session=([^;]+)/.exec(cookie ?? '')?.[1]
  if (!raw) return null
  const value = await unsignCookie(decode(raw), secret)
  return value === false ? null : value
}

type Pending = { t0: number; method: string; url: string; kind: string; cookie: string | null }

export function requestLogger({ secret }: { secret: string }) {
  const showStatic = process.env.LOG_STATIC === '1'
  const showBench = process.env.LOG_BENCH === '1'
  const pending = new WeakMap<Request, Pending>()

  return new Elysia({ name: 'request-logger' })
    // เก็บข้อมูลไว้ตั้งแต่ request เข้า — หลังส่ง response แล้ว Bun อาจคืน header ไปแล้ว
    .onRequest(({ request }) => {
      const h = request.headers
      const path = new URL(request.url).pathname
      pending.set(request, {
        t0: performance.now(),
        method: request.method,
        url: request.url,
        cookie: h.get('cookie'),
        kind: path.startsWith('/api')
          ? c.magenta('api')
          : h.get('upgrade') === 'websocket'
            ? c.cyan('ws')
            : h.get('hx-boosted')
              ? c.cyan('nav')
              : h.get('hx-request')
                ? c.pink('htmx')
                : '',
      })
    })
    .onAfterResponse({ as: 'global' }, async ({ request, set, responseValue, path }) => {
      if (!showStatic && (path.startsWith('/public/') || path.startsWith('/vendor/'))) return
      if (!showBench && path.startsWith('/api/bench/')) return
      const req = pending.get(request)
      if (!req) return

      const ms = performance.now() - req.t0
      const url = new URL(req.url)
      const user = await userOf(req.cookie, secret)
      const hit = responseValue instanceof Response && responseValue.headers.get('x-cache') === 'HIT'

      console.log(
        [
          c.gray(clock()),
          methodBadge(req.method),
          fmtStatus(statusOf(set, responseValue)),
          fmtDuration(ms),
          ' ' + fmtPath(decode(url.pathname), decode(url.search)),
          req.kind && ' ' + req.kind,
          hit ? ' ' + c.green('cache') : '',
          user ? ' ' + c.yellow(user) : '',
        ]
          .filter(Boolean)
          .join(' '),
      )
    })
}
