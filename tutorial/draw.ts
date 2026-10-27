/**
 * วาดวิดีโอสอนใช้ลง canvas 2D — ทุกอย่างเป็นฟังก์ชันของเวลา t (วินาที)
 * render เฟรมไหนก็ได้ ผลเหมือนเดิมทุกครั้ง (export MP4 ทีละเฟรมได้แม่นยำ)
 */
import { clamp, range, ease, EMOJI, GRAD } from '../trailer/style'
import {
  ANSWER_CPS,
  CARD,
  CAPTIONS,
  CHAPTERS,
  CHAPTER_STARTS,
  DURATION,
  TIMELINE,
  TYPE_CPS,
  termOf,
  type Panel,
  type Rect,
} from './script'

export const W = 1920
export const H = 1080

type Ctx = CanvasRenderingContext2D
export type Images = Record<string, HTMLImageElement | undefined>
type P<K extends Panel['kind']> = Extract<Panel, { kind: K }>

const SANS = `'KitsuneSans', ${EMOJI}, 'Segoe UI', sans-serif`
const CODE = `'KitsuneMono', 'KitsuneSans', ${EMOJI}, monospace`

const COL = {
  bg: '#070818',
  win: '#0b0d21',
  bar: '#12153a',
  border: 'rgba(165, 180, 252, 0.22)',
  text: '#e6e9fb',
  code: '#d7dcf5',
  muted: '#9aa3c7',
  dim: '#5f688f',
  violet: '#a78bfa',
  pink: '#f472b6',
  mint: '#5eead4',
  green: '#5af78e',
  yellow: '#facc15',
}

/* ---------- เครื่องมือวาด ---------- */

function font(ctx: Ctx, size: number, weight = 400, family = SANS) {
  ctx.font = `${weight} ${size}px ${family}`
}

function text(ctx: Ctx, s: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left') {
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(s, x, y)
}

/** ข้อความไล่สีชมพู → ม่วง → ฟ้า */
function gradText(ctx: Ctx, s: string, x: number, y: number, align: CanvasTextAlign = 'left') {
  const w = ctx.measureText(s).width
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0)
  GRAD.forEach((c, i) => g.addColorStop(i / (GRAD.length - 1), c))
  text(ctx, s, x, y, g as unknown as string, align)
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function pill(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  rrect(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

/** โลโก้ Kitsune (path เดียวกับ src/components/Logo.tsx) */
const LOGO = {
  face: new Path2D('M6.5 6 13 11.5h6L25.5 6 24.5 16.5 16 26 7.5 16.5z'),
  ears: new Path2D('M8.6 9.2 11.6 11.8 9.2 13.6zM23.4 9.2 20.4 11.8 22.8 13.6z'),
  nose: new Path2D('M14.6 21.6h2.8L16 23.4z'),
}
function logo(ctx: Ctx, x: number, y: number, size: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 32, size / 32)
  const g = ctx.createLinearGradient(0, 0, 32, 32)
  g.addColorStop(0, '#8b5cf6')
  g.addColorStop(1, '#ec4899')
  rrect(ctx, 0, 0, 32, 32, 9)
  ctx.fillStyle = g
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fill(LOGO.face)
  ctx.fillStyle = '#f9a8d4'
  ctx.fill(LOGO.ears)
  ctx.fillStyle = '#3b0764'
  for (const cx of [12.6, 19.4]) {
    ctx.beginPath()
    ctx.arc(cx, 16.4, 1.35, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fill(LOGO.nose)
  ctx.restore()
}

/** กรอบหน้าต่าง: พื้น + แถบหัว + ปุ่ม 3 สี · คืนค่าพื้นที่เนื้อหา */
function chrome(ctx: Ctx, r: Rect, bar = 46): Rect {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = 50
  ctx.shadowOffsetY = 18
  rrect(ctx, r.x, r.y, r.w, r.h, 16)
  ctx.fillStyle = COL.win
  ctx.fill()
  ctx.restore()
  ctx.save()
  rrect(ctx, r.x, r.y, r.w, r.h, 16)
  ctx.clip()
  ctx.fillStyle = COL.bar
  ctx.fillRect(r.x, r.y, r.w, bar)
  ctx.restore()
  rrect(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 16)
  ctx.strokeStyle = COL.border
  ctx.lineWidth = 1.5
  ctx.stroke()
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.beginPath()
    ctx.arc(r.x + 24 + i * 21, r.y + bar / 2, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.fill()
  })
  return { x: r.x, y: r.y + bar, w: r.w, h: r.h - bar }
}

/* ---------- ข้อความมีสี (§g เขียว ฯลฯ) ---------- */

const MARKUP: Record<string, string> = {
  g: COL.green,
  c: '#7dd3fc',
  v: COL.violet,
  p: COL.pink,
  y: COL.yellow,
  m: COL.mint,
  d: COL.dim,
  b: '#ffffff',
  r: COL.code,
}
function parseMarkup(s: string) {
  const parts = s.split('§')
  const out = [{ code: 'r', text: parts[0]! }]
  for (const p of parts.slice(1)) out.push({ code: p[0] ?? 'r', text: p.slice(1) })
  return out.filter((x) => x.text)
}
/** วาดบรรทัดที่มี markup · คืนค่า x ท้ายบรรทัด */
function markupLine(ctx: Ctx, s: string, x: number, y: number, size: number) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  for (const seg of parseMarkup(s)) {
    font(ctx, size, seg.code === 'b' ? 700 : 400, CODE)
    ctx.fillStyle = MARKUP[seg.code] ?? COL.code
    ctx.fillText(seg.text, x, y)
    x += ctx.measureText(seg.text).width
  }
  return x
}

const blink = (t: number) => Math.floor(t * 2.2) % 2 === 0

/* ---------- Terminal ---------- */

function drawTerm(ctx: Ctx, p: P<'term'>, t: number) {
  const body = chrome(ctx, p)
  font(ctx, 16, 500, CODE)
  text(ctx, p.title, p.x + p.w / 2, p.y + 23, COL.muted, 'center')

  const size = p.font ?? 23
  const lh = Math.round(size * 1.52)
  const pad = 26
  const { events, end } = termOf(p)
  const lines: { text: string; cursor?: boolean; typing?: boolean }[] = []
  for (const e of events) {
    if (e.kind === 'out') {
      if (t >= e.t) lines.push({ text: e.text })
      continue
    }
    if (e.kind === 'cmd') {
      if (t < e.t - 0.45) break
      const n = clamp(Math.floor((t - e.t) * TYPE_CPS), 0, e.text.length)
      lines.push({ text: `${e.prompt}§b${e.text.slice(0, n)}`, cursor: t < e.end + 0.2, typing: t >= e.t && t < e.end })
    } else {
      if (t < e.t) break
      const n = clamp(Math.floor((t - e.typeAt) * ANSWER_CPS), 0, e.answer.length)
      lines.push({ text: `${e.text}§b${e.answer.slice(0, n)}`, cursor: t < e.end })
    }
  }
  const last = events[events.length - 1]
  if (!lines.length) lines.push({ text: p.prompt, cursor: true })
  else if (last?.kind === 'out' && t >= end - 0.1) lines.push({ text: p.prompt, cursor: true })

  const visible = Math.floor((body.h - pad * 2) / lh)
  const from = Math.max(0, lines.length - visible)
  ctx.save()
  ctx.beginPath()
  ctx.rect(body.x, body.y, body.w, body.h)
  ctx.clip()
  lines.slice(from).forEach((line, i) => {
    const y = body.y + pad + lh * i + lh / 2
    const xEnd = markupLine(ctx, line.text, body.x + pad + 6, y, size)
    if (line.cursor && (line.typing || blink(t))) {
      ctx.fillStyle = COL.pink
      ctx.fillRect(xEnd + 2, y - size * 0.55, size * 0.55, size * 1.1)
    }
  })
  ctx.restore()
}

/* ---------- Code editor ---------- */

const TOKEN =
  /(\/\/[^\n]*|#[^\n]*)|(`[\s\S]*?`|'[^'\n]*'|"[^"\n]*")|(<\/?[A-Za-z][\w.]*|\/?>)|\b(import|from|export|const|default|function|return|type|as|await|async|let|new|true|false)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Z][A-Za-z0-9_]*)\b|([a-zA-Z_][\w-]*)(?=\s*[=(:])/g
const TOKEN_COLORS = [COL.dim, '#c3e88d', COL.pink, '#c792ea', '#f78c6c', '#82aaff', '#ffcb6b']

type Seg = { text: string; color: string; start: number }
const tokenCache = new Map<string, Seg[][]>()

/** แบ่งโค้ดเป็นบรรทัด → ช่วงสี (คำนวณครั้งเดียวต่อไฟล์) */
function tokenize(code: string) {
  const hit = tokenCache.get(code)
  if (hit) return hit
  // สีของแต่ละตัวอักษร (index แบบ UTF-16 ตรงกับ regex)
  const map: { color: string }[] = Array.from({ length: code.length }, () => ({ color: COL.code }))
  for (const m of code.matchAll(TOKEN)) {
    const g = m.slice(1).findIndex((x) => x !== undefined)
    for (let i = m.index; i < m.index + m[0].length; i++) map[i] = { color: TOKEN_COLORS[g]! }
  }
  const lines: Seg[][] = [[]]
  let cur: Seg | null = null
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!
    if (ch === '\n') {
      lines.push([])
      cur = null
      continue
    }
    const c = map[i]!
    const line = lines[lines.length - 1]!
    if (!cur || cur.color !== c.color) {
      cur = { text: '', color: c.color, start: i }
      line.push(cur)
    }
    cur.text += ch
  }
  tokenCache.set(code, lines)
  return lines
}

function drawCode(ctx: Ctx, p: P<'code'>, t: number) {
  const body = chrome(ctx, p)
  const full = p.code.length
  const from = p.prefill ?? 0
  const typed = p.typeAt === undefined ? full : from + clamp(Math.floor((t - p.typeAt) * (p.cps ?? 50)), 0, full - from)
  const typing = p.typeAt !== undefined && typed < full
  const doneAt = p.typeAt === undefined ? -1 : p.typeAt + (full - from) / (p.cps ?? 50)

  // แท็บชื่อไฟล์
  font(ctx, 17, 500, CODE)
  const tabW = ctx.measureText(p.file).width + 64
  rrect(ctx, p.x + 96, p.y + 7, tabW, 39, 9)
  ctx.fillStyle = COL.win
  ctx.fill()
  text(ctx, p.file, p.x + 96 + 22, p.y + 27, COL.text)
  if (typing) {
    ctx.beginPath()
    ctx.arc(p.x + 96 + tabW - 20, p.y + 27, 5, 0, Math.PI * 2)
    ctx.fillStyle = COL.text
    ctx.fill()
  } else if (doneAt > 0) {
    const a = ease.outCubic(range(t, doneAt + 0.15, doneAt + 0.5))
    ctx.save()
    ctx.globalAlpha *= a
    font(ctx, 16, 600)
    text(ctx, '✓ บันทึกแล้ว', p.x + p.w - 28, p.y + 23, COL.green, 'right')
    ctx.restore()
  }

  const size = p.font ?? 22
  const lh = Math.round(size * 1.6)
  const pad = 18
  const lines = tokenize(p.code)
  const cursorLine = p.code.slice(0, typed).split('\n').length - 1
  const visible = Math.floor((body.h - pad * 2) / lh)
  const maxTop = Math.max(0, lines.length - visible)
  const mark = p.marks?.find((m) => t >= m.at && t < m.until)
  let top = clamp(cursorLine - visible + 3, 0, maxTop)
  if (mark && !typing) top = clamp(Math.min(mark.lines[0] - 3, mark.lines[1] - visible + 2), 0, maxTop)

  const gutter = 70
  const focus = mark ? ease.outCubic(range(t, mark.at, mark.at + 0.35)) : 0
  ctx.save()
  ctx.beginPath()
  ctx.rect(body.x, body.y, body.w, body.h)
  ctx.clip()
  for (let li = top; li < Math.min(lines.length, top + visible); li++) {
    if (li > cursorLine) break
    const y = body.y + pad + (li - top) * lh + lh / 2
    const inMark = mark && li + 1 >= mark.lines[0] && li + 1 <= mark.lines[1]
    if (inMark) {
      ctx.fillStyle = `rgba(167, 139, 250, ${0.16 * focus})`
      ctx.fillRect(body.x, y - lh / 2, body.w, lh)
      ctx.fillStyle = `rgba(244, 114, 182, ${focus})`
      ctx.fillRect(body.x, y - lh / 2, 4, lh)
    }
    ctx.save()
    ctx.globalAlpha *= mark && !inMark ? 1 - 0.6 * focus : 1
    font(ctx, size * 0.82, 400, CODE)
    text(ctx, String(li + 1), body.x + gutter - 18, y, COL.dim, 'right')
    let x = body.x + gutter
    for (const seg of lines[li]!) {
      if (seg.start >= typed) break
      const s = seg.text.slice(0, typed - seg.start)
      ctx.font = `400 ${size}px ${CODE}`
      ctx.fillStyle = seg.color
      ctx.textAlign = 'left'
      ctx.fillText(s, x, y)
      x += ctx.measureText(s).width
    }
    if (li === cursorLine && p.typeAt !== undefined && (typing || (t < doneAt + 1.2 && blink(t)))) {
      ctx.fillStyle = COL.pink
      ctx.fillRect(x + 1, y - size * 0.62, 3, size * 1.24)
    }
    ctx.restore()
  }
  ctx.restore()
}

/* ---------- Browser ---------- */

function imgAt(p: P<'browser'>, t: number) {
  let cur = p.img
  let prev = p.img
  let since = Infinity
  for (const s of p.swaps ?? [])
    if (t >= s.at) {
      prev = cur
      cur = s.img
      since = t - s.at
    }
  return { cur, prev, mix: ease.inOutCubic(clamp(since / 0.45)) }
}

function drawBrowser(ctx: Ctx, p: P<'browser'>, t: number, imgs: Images) {
  const bar = 54
  const iw = Math.min(p.w, (p.h - bar) * 1.6)
  const ih = iw / 1.6
  const r = { x: p.x + (p.w - iw) / 2, y: p.y + (p.h - bar - ih) / 2, w: iw, h: ih + bar }
  const body = chrome(ctx, r, bar)

  // ช่อง URL (พิมพ์ทีละตัว ถ้า typeUrl)
  const urlStart = p.in + 0.5
  const n = p.typeUrl ? clamp(Math.floor((t - urlStart) * 30), 0, p.url.length) : p.url.length
  const typedAt = p.typeUrl ? urlStart + p.url.length / 30 + 0.25 : -1
  pill(ctx, r.x + 100, r.y + 11, r.w - 130, 32, 'rgba(255,255,255,0.07)')
  font(ctx, 17, 500, CODE)
  text(ctx, '🔒', r.x + 118, r.y + 28, COL.muted)
  const urlEnd = r.x + 148 + ctx.measureText(p.url.slice(0, n)).width
  text(ctx, p.url.slice(0, n), r.x + 148, r.y + 28, COL.text)
  if (p.typeUrl && t < typedAt && blink(t)) {
    ctx.fillStyle = COL.pink
    ctx.fillRect(urlEnd + 1, r.y + 18, 2, 20)
  }

  // หน้าเว็บ: โหลด (แถบวิ่ง) → ภาพหน้าจอจริง
  const shown = p.typeUrl ? ease.outCubic(range(t, typedAt + 0.25, typedAt + 0.6)) : 1
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(body.x, body.y, body.w, body.h, [0, 0, 16, 16])
  ctx.clip()
  ctx.fillStyle = '#0b0b12'
  ctx.fillRect(body.x, body.y, body.w, body.h)
  if (p.typeUrl && t >= typedAt && t < typedAt + 0.7) {
    const g = ctx.createLinearGradient(body.x, 0, body.x + body.w, 0)
    GRAD.forEach((c, i) => g.addColorStop(i / (GRAD.length - 1), c))
    ctx.fillStyle = g
    ctx.fillRect(body.x, body.y, body.w * ease.outCubic(range(t, typedAt, typedAt + 0.5)), 3)
  }
  const { cur, prev, mix } = imgAt(p, t)
  ctx.globalAlpha *= shown
  const a = imgs[prev]
  const b = imgs[cur]
  if (a && mix < 1) ctx.drawImage(a, body.x, body.y, body.w, body.h)
  if (b) {
    ctx.save()
    ctx.globalAlpha *= prev === cur ? 1 : mix
    ctx.drawImage(b, body.x, body.y, body.w, body.h)
    ctx.restore()
  }
  ctx.restore()

  // กรอบไฮไลต์บนภาพ (พิกัดของภาพจริง 1440×900)
  const s = body.w / 1440
  for (const box of p.boxes ?? []) {
    const a = Math.min(ease.outBack(range(t, box.at, box.at + 0.4)), 1 - range(t, box.until - 0.3, box.until))
    if (a <= 0) continue
    ctx.save()
    ctx.globalAlpha *= clamp(a)
    const x = body.x + box.x * s
    const y = body.y + box.y * s
    const pulse = 1 + Math.sin(t * 5) * 0.5
    ctx.shadowColor = COL.pink
    ctx.shadowBlur = 18 * pulse
    rrect(ctx, x - 6, y - 6, box.w * s + 12, box.h * s + 12, 12)
    ctx.strokeStyle = COL.pink
    ctx.lineWidth = 3.5
    ctx.stroke()
    ctx.shadowBlur = 0
    if (box.label) {
      font(ctx, 20, 600)
      const lw = ctx.measureText(box.label).width + 32
      const ly = y + box.h * s + 14 // ใต้กรอบ ไม่บังของที่ชี้
      pill(ctx, x - 6, ly, lw, 38, COL.pink)
      text(ctx, box.label, x - 6 + 16, ly + 19, '#fff')
    }
    ctx.restore()
  }
}

/* ---------- ตาราง ---------- */

function drawTable(ctx: Ctx, p: P<'table'>, t: number) {
  const rowH = 76
  const titleH = p.title ? 110 : 0
  const total = titleH + p.rows.length * rowH
  let y = p.y + (p.h - total) / 2
  if (p.title) {
    font(ctx, 60, 700)
    gradText(ctx, p.title, p.x + p.w / 2, y + 40, 'center')
    y += titleH
  }
  const leftW = 640
  p.rows.forEach(([l, r], i) => {
    const at = p.in + 0.3 + i * (p.stagger ?? 0.4)
    const a = ease.outCubic(range(t, at, at + 0.45))
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha *= a
    ctx.translate((1 - a) * -30, 0)
    const ry = y + i * rowH
    const hl = p.hl?.some((h) => h.row === i && t >= h.at && t < h.until)
    rrect(ctx, p.x + 80, ry + 6, p.w - 160, rowH - 12, 14)
    ctx.fillStyle = hl ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.045)'
    ctx.fill()
    ctx.strokeStyle = COL.border
    ctx.lineWidth = 1
    ctx.stroke()
    font(ctx, 25, 500, CODE)
    text(ctx, l, p.x + 116, ry + rowH / 2, COL.pink)
    font(ctx, 23, 400, CODE)
    text(ctx, '→', p.x + 80 + leftW, ry + rowH / 2, COL.dim, 'center')
    font(ctx, 26, 500)
    text(ctx, r, p.x + 80 + leftW + 44, ry + rowH / 2, COL.text)
    ctx.restore()
  })
}

/* ---------- โครงสร้างโปรเจกต์ ---------- */

const TREE: { name: string; depth: number; dir?: boolean; icon?: string; title?: string; desc?: string; ex?: string[] }[] = [
  { name: 'my-app', depth: 0, dir: true },
  { name: 'core', depth: 1, dir: true, icon: '⚙️', desc: 'ระบบเบื้องหลังของ Kitsune', ex: ['router.ts — file-based routing', 'cache.ts  — in-memory cache 128 MB', 'logger.ts — console สวยๆ'] },
  { name: 'public', depth: 1, dir: true, icon: '🖼️', desc: 'ไฟล์ static: CSS, รูป, ฟอนต์', ex: ['public/style.css → /public/style.css', 'เสิร์ฟจากหน่วยความจำ + บีบอัดให้'] },
  { name: 'src', depth: 1, dir: true },
  { name: 'api', depth: 2, dir: true, icon: '⚡', desc: 'JSON API', ex: ['src/api/hello.ts  → /api/hello', 'src/api/health.ts → /api/health', 'export GET / POST / PUT / DELETE'] },
  { name: 'components', depth: 2, dir: true, icon: '🧩', desc: 'ชิ้นส่วน UI ใช้ซ้ำ', ex: ["import { Card, Button } from '@components'", 'เพิ่มไฟล์ .tsx แล้วใช้ได้ทันที'] },
  { name: 'lib', depth: 2, dir: true, icon: '🗃️', desc: 'ฐานข้อมูล + ฟังก์ชันช่วย', ex: ['db.ts — bun:sqlite พร้อม cache', 'ใส่ logic ที่ใช้ร่วมกันไว้ที่นี่'] },
  { name: 'pages', depth: 2, dir: true, icon: '📄', desc: 'หน้าเว็บ (JSX + htmx)', ex: ['src/pages/index.tsx → /', 'src/pages/about.tsx → /about', 'src/pages/users/[id].tsx → /users/:id'] },
  { name: 'tests', depth: 1, dir: true, icon: '🧪', desc: 'เทสอัตโนมัติ', ex: ['tests/app.test.ts', 'รันด้วย bun test'] },
  { name: '.env', depth: 1, icon: '🔑', desc: 'ค่าตั้งค่า + รหัสลับ', ex: ['PORT · COOKIE_SECRET · ADMIN_KEY', 'อยู่ใน .gitignore — ไม่ขึ้น git'] },
  { name: 'index.tsx', depth: 1 },
  { name: 'package.json', depth: 1 },
]

function drawTree(ctx: Ctx, p: P<'tree'>, t: number) {
  const panel = { x: p.x + 20, y: p.y + 20, w: 560, h: p.h - 40 }
  const body = chrome(ctx, panel)
  font(ctx, 15, 600, CODE)
  text(ctx, 'EXPLORER', panel.x + 110, panel.y + 23, COL.muted)

  const step = [...p.steps].reverse().find((s) => t >= s.at)
  const rowH = 54
  TREE.forEach((row, i) => {
    const y = body.y + 26 + i * rowH + rowH / 2
    if (step?.row === i) {
      const a = ease.outCubic(range(t, step.at, step.at + 0.3))
      ctx.fillStyle = `rgba(167, 139, 250, ${0.22 * a})`
      ctx.fillRect(body.x, y - rowH / 2, body.w, rowH)
      ctx.fillStyle = COL.pink
      ctx.fillRect(body.x, y - rowH / 2, 4 * a, rowH)
    }
    const x = body.x + 30 + row.depth * 32
    font(ctx, 22, 400, CODE)
    text(ctx, row.dir ? (row.name === 'my-app' || row.name === 'src' ? '▾' : '▸') : ' ', x, y, COL.dim)
    font(ctx, 22)
    text(ctx, row.dir ? '📁' : row.name.endsWith('.tsx') ? '⚛️' : row.name === '.env' ? '🔑' : '📄', x + 22, y, '#fff')
    font(ctx, 23, step?.row === i ? 600 : 400, CODE)
    text(ctx, row.name, x + 62, y, step?.row === i ? '#fff' : row.dir ? COL.text : COL.muted)
  })

  // การ์ดคำอธิบายด้านขวา
  if (!step) return
  const row = TREE[step.row]!
  const a = ease.outCubic(range(t, step.at, step.at + 0.4))
  const cx = p.x + 640
  const cw = p.w - 660
  const cy = p.y + 150
  ctx.save()
  ctx.globalAlpha *= a
  ctx.translate((1 - a) * 40, 0)
  rrect(ctx, cx, cy, cw, 470, 24)
  ctx.fillStyle = 'rgba(255,255,255,0.045)'
  ctx.fill()
  ctx.strokeStyle = COL.border
  ctx.lineWidth = 1.5
  ctx.stroke()
  font(ctx, 72)
  text(ctx, row.icon ?? '📁', cx + 56, cy + 90, '#fff')
  const path = (row.depth === 2 ? 'src/' : '') + row.name + (row.dir ? '/' : '')
  font(ctx, 54, 700, CODE)
  gradText(ctx, path, cx + 160, cy + 92)
  font(ctx, 36, 600)
  text(ctx, row.desc ?? '', cx + 56, cy + 190, COL.text)
  ;(row.ex ?? []).forEach((ex, i) => {
    const ea = ease.outCubic(range(t, step.at + 0.25 + i * 0.18, step.at + 0.6 + i * 0.18))
    ctx.save()
    ctx.globalAlpha *= ea
    rrect(ctx, cx + 56, cy + 250 + i * 66, cw - 112, 52, 12)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fill()
    font(ctx, 23, 400, CODE)
    text(ctx, ex, cx + 80, cy + 276 + i * 66, COL.mint)
    ctx.restore()
  })
  ctx.restore()
}

/* ---------- แผนภาพ htmx ---------- */

function drawFlow(ctx: Ctx, p: P<'flow'>, t: number) {
  const nodeW = 390
  const nodeH = 330
  const gap = (p.w - nodeW * 3) / 2
  const ny = p.y + 40
  const nodes = [0, 1, 2].map((i) => ({ x: p.x + i * (nodeW + gap), y: ny, w: nodeW, h: nodeH }))
  const titles = ['🖥️  เบราว์เซอร์', '🦊  เซิร์ฟเวอร์', '📋  #list']
  nodes.forEach((n, i) => {
    rrect(ctx, n.x, n.y, n.w, n.h, 22)
    ctx.fillStyle = 'rgba(255,255,255,0.045)'
    ctx.fill()
    ctx.strokeStyle = COL.border
    ctx.lineWidth = 1.5
    ctx.stroke()
    font(ctx, 30, 700)
    text(ctx, titles[i]!, n.x + 30, n.y + 46, COL.text)
  })

  // 1) ฟอร์มในเบราว์เซอร์
  const [n1, n2, n3] = nodes as [Rect, Rect, Rect]
  const item = 'ซื้อกาแฟ ☕'
  const typed = item.slice(0, clamp(Math.floor((t - 0.6) * 7), 0, item.length))
  const cleared = t > 9.2
  rrect(ctx, n1.x + 30, n1.y + 110, n1.w - 60, 62, 12)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fill()
  ctx.strokeStyle = t > 0.4 && t < 2.6 ? COL.violet : COL.border
  ctx.stroke()
  font(ctx, 26)
  text(ctx, cleared ? 'ต้องทำอะไร?' : typed, n1.x + 52, n1.y + 141, cleared ? COL.dim : COL.text)
  const press = t > 2.3 && t < 2.6 ? 0.94 : 1
  ctx.save()
  ctx.translate(n1.x + n1.w / 2, n1.y + 236)
  ctx.scale(press, press)
  const bg = ctx.createLinearGradient(-90, 0, 90, 0)
  bg.addColorStop(0, '#7c3aed')
  bg.addColorStop(1, '#db2777')
  rrect(ctx, -90, -32, 180, 64, 14)
  ctx.fillStyle = bg
  ctx.fill()
  font(ctx, 28, 700)
  text(ctx, 'เพิ่ม', 0, 0, '#fff', 'center')
  ctx.restore()

  // 2) เซิร์ฟเวอร์
  const steps = [
    { at: 4.6, s: 'POST /todos' },
    { at: 5.6, s: 'todos.add(title)' },
    { at: 6.6, s: 'return <Item todo={…} />' },
  ]
  steps.forEach(({ at, s }, i) => {
    const a = ease.outCubic(range(t, at, at + 0.35))
    ctx.save()
    ctx.globalAlpha *= a
    font(ctx, 22, 500, CODE)
    text(ctx, '✓', n2.x + 32, n2.y + 128 + i * 64, COL.green)
    text(ctx, s, n2.x + 64, n2.y + 128 + i * 64, i === 0 ? COL.yellow : COL.text)
    ctx.restore()
  })

  // 3) รายการ — แถวใหม่เลื่อนเข้าบนสุด
  const slide = ease.outCubic(range(t, 8.6, 9.3))
  const rows = ['อ่านคู่มือ Kitsune', 'ส่งงานให้ลูกค้า']
  const rowY = (i: number) => n3.y + 100 + i * 66
  ;[item, ...rows].forEach((r, i) => {
    const isNew = i === 0
    if (isNew && slide <= 0) return
    const y = isNew ? rowY(0) : rowY(i - 1 + slide)
    ctx.save()
    ctx.globalAlpha *= isNew ? slide : 1
    rrect(ctx, n3.x + 30, y, n3.w - 60, 54, 12)
    ctx.fillStyle = isNew ? `rgba(244,114,182,${0.25 * (1 - range(t, 10, 12)) + 0.08})` : 'rgba(255,255,255,0.06)'
    ctx.fill()
    font(ctx, 24, 500)
    text(ctx, r, n3.x + 52, y + 27, COL.text)
    ctx.restore()
  })

  // ลูกศร + ก้อนข้อมูลวิ่ง
  const arrow = (a: Rect, b: Rect, label: string, sub: string, t0: number) => {
    const y = a.y + a.h / 2
    const x0 = a.x + a.w + 16
    const x1 = b.x - 16
    ctx.strokeStyle = 'rgba(165,180,252,0.35)'
    ctx.lineWidth = 3
    ctx.setLineDash([10, 10])
    ctx.lineDashOffset = -t * 30
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x1 - 16, y - 10)
    ctx.lineTo(x1 - 16, y + 10)
    ctx.fillStyle = 'rgba(165,180,252,0.6)'
    ctx.fill()
    const la = ease.outCubic(range(t, t0 - 0.3, t0))
    ctx.save()
    ctx.globalAlpha *= la
    font(ctx, 21, 600, CODE)
    text(ctx, label, (x0 + x1) / 2, y - 62, COL.yellow, 'center')
    font(ctx, 17, 400, CODE)
    text(ctx, sub, (x0 + x1) / 2, y - 30, COL.muted, 'center')
    ctx.restore()
    const k = range(t, t0, t0 + 1.6)
    if (k > 0 && k < 1) {
      const px = x0 + (x1 - x0) * ease.inOutCubic(k)
      ctx.save()
      ctx.shadowColor = COL.pink
      ctx.shadowBlur = 24
      ctx.beginPath()
      ctx.arc(px, y, 11, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.restore()
    }
  }
  arrow(n1, n2, 'POST /todos', 'title=ซื้อกาแฟ ☕', 2.7)
  arrow(n2, n3, 'HTML', '<li>ซื้อกาแฟ ☕</li>', 7)

  // attribute ที่ทำให้ทั้งหมดนี้เกิดขึ้น
  const chips = [
    { at: 2.4, code: 'hx-post="/todos"', desc: 'ส่งไปที่ไหน' },
    { at: 8.4, code: 'hx-target="#list"', desc: 'เอาผลไปใส่ตรงไหน' },
    { at: 9.0, code: 'hx-swap="afterbegin"', desc: 'แทรกไว้บนสุด' },
    { at: 9.6, code: 'hx-on--after-request', desc: 'ล้างช่องกรอก' },
  ]
  const cw = (p.w - 3 * 24) / 4
  chips.forEach((c, i) => {
    const on = ease.outCubic(range(t, c.at, c.at + 0.4))
    const x = p.x + i * (cw + 24)
    const y = ny + nodeH + 70
    rrect(ctx, x, y, cw, 128, 18)
    ctx.fillStyle = `rgba(167,139,250,${0.05 + 0.15 * on})`
    ctx.fill()
    ctx.strokeStyle = on > 0.5 ? COL.violet : COL.border
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.save()
    ctx.globalAlpha *= 0.35 + 0.65 * on
    font(ctx, 22, 600, CODE)
    text(ctx, c.code, x + cw / 2, y + 44, COL.pink, 'center')
    font(ctx, 25, 500)
    text(ctx, c.desc, x + cw / 2, y + 90, COL.text, 'center')
    ctx.restore()
  })
}

/* ---------- เปิด / ปิด ---------- */

function drawIntro(ctx: Ctx, t: number) {
  const out = 1 - range(t, 4.4, 4.9)
  if (out > 0) {
    ctx.save()
    ctx.globalAlpha *= out
    const a = ease.outBack(range(t, 0.1, 0.8))
    ctx.save()
    ctx.translate(W / 2, 300)
    ctx.scale(a, a)
    ctx.shadowColor = 'rgba(219,39,119,0.6)'
    ctx.shadowBlur = 80
    logo(ctx, -80, -80, 160)
    ctx.restore()
    const b = ease.outCubic(range(t, 0.5, 1.1))
    ctx.globalAlpha *= b
    font(ctx, 100, 700)
    gradText(ctx, 'สอนใช้งาน Kitsune', W / 2, 500 + (1 - b) * 30, 'center')
    font(ctx, 40, 500)
    text(ctx, 'ตั้งแต่ติดตั้ง จนขึ้นใช้งานจริง', W / 2, 600, COL.muted, 'center')
    const chips = ['Bun', 'Elysia', 'htmx', 'SQLite', 'TypeScript']
    font(ctx, 26, 600)
    const widths = chips.map((c) => ctx.measureText(c).width + 48)
    let x = W / 2 - (widths.reduce((s, w) => s + w, 0) + 16 * (chips.length - 1)) / 2
    chips.forEach((c, i) => {
      const ca = ease.outCubic(range(t, 1.1 + i * 0.12, 1.5 + i * 0.12))
      ctx.save()
      ctx.globalAlpha *= ca
      pill(ctx, x, 680, widths[i]!, 52, 'rgba(167,139,250,0.14)', 'rgba(167,139,250,0.4)')
      text(ctx, c, x + widths[i]! / 2, 706, COL.text, 'center')
      ctx.restore()
      x += widths[i]! + 16
    })
    font(ctx, 26, 500)
    text(ctx, 'by Yurachi Studio', W / 2, 800, COL.violet, 'center')
    ctx.restore()
  }

  // สารบัญ
  const a = ease.outCubic(range(t, 4.8, 5.4))
  if (a <= 0) return
  ctx.save()
  ctx.globalAlpha *= a
  font(ctx, 62, 700)
  gradText(ctx, 'ในคลิปนี้', W / 2, 190, 'center')
  const colW = 700
  CHAPTERS.forEach((c, i) => {
    const col = i < 6 ? 0 : 1
    const row = i < 6 ? i : i - 6
    const x = W / 2 - colW - 20 + col * (colW + 40)
    const y = 280 + row * 92
    const ia = ease.outCubic(range(t, 5 + i * 0.14, 5.4 + i * 0.14))
    ctx.save()
    ctx.globalAlpha *= ia
    ctx.translate((1 - ia) * 30, 0)
    rrect(ctx, x, y, colW, 76, 16)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = COL.border
    ctx.lineWidth = 1
    ctx.stroke()
    font(ctx, 28, 700, CODE)
    text(ctx, String(i + 1).padStart(2, '0'), x + 30, y + 38, COL.pink)
    font(ctx, 30, 600)
    text(ctx, c.title, x + 96, y + 38, COL.text)
    font(ctx, 21)
    text(ctx, c.sub, x + colW - 26, y + 38, COL.muted, 'right')
    ctx.restore()
  })
  ctx.restore()
}

const RECAP: [string, string][] = [
  ['bun create KCCHDEV/Kisune-WebServer my-app', 'สร้างโปรเจกต์ใหม่'],
  ['bun dev', 'โหมดพัฒนา (รีโหลดเอง)'],
  ['bun test', 'รันเทส'],
  ['bun run check', 'ตรวจ TypeScript + XSS'],
  ['bun start', 'โหมด production'],
]

function drawOutro(ctx: Ctx, t: number) {
  const out = 1 - range(t, 6.4, 6.9)
  if (out > 0) {
    ctx.save()
    ctx.globalAlpha *= out
    font(ctx, 62, 700)
    gradText(ctx, 'สรุปคำสั่ง', W / 2, 200, 'center')
    RECAP.forEach(([cmd, desc], i) => {
      const a = ease.outCubic(range(t, 0.3 + i * 0.25, 0.7 + i * 0.25))
      const y = 290 + i * 104
      ctx.save()
      ctx.globalAlpha *= a
      ctx.translate((1 - a) * -30, 0)
      rrect(ctx, 260, y, 1400, 84, 18)
      ctx.fillStyle = COL.win
      ctx.fill()
      ctx.strokeStyle = COL.border
      ctx.lineWidth = 1.5
      ctx.stroke()
      font(ctx, 30, 500, CODE)
      text(ctx, '❯', 300, y + 42, COL.mint)
      text(ctx, cmd, 344, y + 42, '#fff')
      font(ctx, 28, 500)
      text(ctx, desc, 1620, y + 42, COL.muted, 'right')
      ctx.restore()
    })
    ctx.restore()
  }

  const a = ease.outCubic(range(t, 6.8, 7.6))
  if (a <= 0) return
  ctx.save()
  ctx.globalAlpha *= a
  const s = 0.9 + 0.1 * ease.outBack(range(t, 6.8, 7.6))
  ctx.translate(W / 2, 0)
  ctx.scale(s, s)
  ctx.shadowColor = 'rgba(219,39,119,0.6)'
  ctx.shadowBlur = 80
  logo(ctx, -70, 220, 140)
  ctx.shadowBlur = 0
  font(ctx, 96, 700)
  gradText(ctx, 'ขอบคุณที่รับชม', 0, 480, 'center')
  font(ctx, 34, 500, CODE)
  text(ctx, 'github.com/KCCHDEV/Kisune-WebServer', 0, 590, COL.text, 'center')
  font(ctx, 30, 600)
  text(ctx, 'Kitsune · ว่องไว แสนกล ครบในตัวเดียว', 0, 660, COL.muted, 'center')
  font(ctx, 28, 600)
  text(ctx, 'by Yurachi Studio', 0, 730, COL.violet, 'center')
  ctx.restore()
}

/* ---------- ส่วนที่อยู่ทุกฉาก ---------- */

function background(ctx: Ctx, t: number) {
  ctx.fillStyle = COL.bg
  ctx.fillRect(0, 0, W, H)
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(7,8,24,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  glow(380 + Math.sin(t * 0.13) * 120, 200 + Math.cos(t * 0.11) * 60, 900, 'rgba(124,58,237,0.20)')
  glow(1600 + Math.cos(t * 0.09) * 120, 900 + Math.sin(t * 0.12) * 60, 900, 'rgba(219,39,119,0.13)')
  ctx.fillStyle = 'rgba(255,255,255,0.045)'
  for (let x = 40; x < W; x += 48) for (let y = 40; y < H; y += 48) ctx.fillRect(x, y, 2, 2)
}

function hud(ctx: Ctx, t: number, chapter: number) {
  logo(ctx, 96, 34, 40)
  font(ctx, 26, 700)
  text(ctx, 'Kitsune', 150, 55, '#fff')
  const w = ctx.measureText('Kitsune').width
  font(ctx, 24, 500)
  text(ctx, '· สอนใช้งาน', 150 + w + 12, 55, COL.muted)

  if (chapter > 0) {
    const label = `บทที่ ${String(chapter).padStart(2, '0')} / ${CHAPTERS.length}`
    const title = CHAPTERS[chapter - 1]!.title
    font(ctx, 22, 700, CODE)
    const lw = ctx.measureText(label).width
    font(ctx, 24, 600)
    const tw = ctx.measureText(title).width
    const pw = lw + tw + 70
    pill(ctx, W - 96 - pw, 32, pw, 48, 'rgba(255,255,255,0.06)', COL.border)
    font(ctx, 22, 700, CODE)
    text(ctx, label, W - 96 - pw + 24, 56, COL.pink)
    font(ctx, 24, 600)
    text(ctx, title, W - 96 - 24, 56, COL.text, 'right')
  }

  // แถบความคืบหน้าแยกตามบท
  const x0 = 96
  const x1 = W - 96
  const segGap = 8
  const segW = (x1 - x0 - segGap * (CHAPTERS.length - 1)) / CHAPTERS.length
  CHAPTER_STARTS.forEach((start, i) => {
    const end = CHAPTER_STARTS[i + 1] ?? TIMELINE.find((s) => s.chapter === 0 && s.start > start)?.start ?? DURATION
    const k = clamp((t - start) / (end - start))
    const x = x0 + i * (segW + segGap)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(x, H - 22, segW, 5)
    if (k > 0) {
      ctx.fillStyle = i + 1 === chapter ? COL.pink : COL.violet
      ctx.fillRect(x, H - 22, segW * k, 5)
    }
  })
}

function caption(ctx: Ctx, t: number) {
  const c = CAPTIONS.find((c) => t >= c.start && t < c.end)
  if (!c) return
  const a = Math.min(ease.outCubic(range(t, c.start, c.start + 0.25)), 1 - range(t, c.end - 0.15, c.end))
  font(ctx, 38, 600)
  // ยาวเกินจอ → ตัดเป็น 2 บรรทัดที่ช่องว่างใกล้กลางที่สุด
  let lines = [c.text]
  if (ctx.measureText(c.text).width > 1560) {
    const mid = c.text.length / 2
    let best = -1
    for (let i = 0; i < c.text.length; i++) if (c.text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
    if (best > 0) lines = [c.text.slice(0, best), c.text.slice(best + 1)]
  }
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 64
  const lh = 52
  const h = lines.length * lh + 30
  const y = 1000 - h / 2
  ctx.save()
  ctx.globalAlpha *= clamp(a)
  ctx.translate(0, (1 - clamp(a)) * 10)
  rrect(ctx, W / 2 - w / 2, y, w, h, 20)
  ctx.fillStyle = 'rgba(9, 10, 28, 0.88)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  lines.forEach((l, i) => text(ctx, l, W / 2, y + 15 + lh * i + lh / 2, '#fff', 'center'))
  ctx.restore()
}

/** การ์ดชื่อบทตอนเริ่มบทใหม่ */
function chapterCard(ctx: Ctx, t: number, chapter: number) {
  const a = Math.min(ease.outCubic(range(t, 0, 0.35)), 1 - ease.inCubic(range(t, CARD - 0.45, CARD)))
  if (a <= 0) return
  const c = CHAPTERS[chapter - 1]!
  ctx.save()
  ctx.globalAlpha *= a
  ctx.fillStyle = 'rgba(7,8,24,0.65)'
  ctx.fillRect(0, 0, W, H)
  const s = 0.94 + 0.06 * ease.outCubic(range(t, 0, 0.5))
  ctx.translate(W / 2, H / 2 - 40)
  ctx.scale(s, s)
  font(ctx, 30, 700, CODE)
  text(ctx, `บทที่ ${String(chapter).padStart(2, '0')}`, 0, -132, COL.pink, 'center')
  font(ctx, 110, 700)
  gradText(ctx, c.title, 0, 0, 'center')
  font(ctx, 38, 500)
  text(ctx, c.sub, 0, 100, COL.muted, 'center')
  ctx.restore()
}

/* ---------- เฟรม ---------- */

export function renderFrame(ctx: Ctx, t: number, imgs: Images) {
  ctx.save()
  ctx.globalAlpha = 1
  background(ctx, t)
  const scene = [...TIMELINE].reverse().find((s) => t >= s.start) ?? TIMELINE[0]!
  const local = t - scene.start
  const firstOfChapter = scene.chapter > 0 && TIMELINE.find((s) => s.chapter === scene.chapter) === scene

  // ทุก panel จางออกตอนท้ายฉาก
  const sceneOut = 1 - range(local, scene.dur - 0.35, scene.dur)
  for (const p of scene.panels) {
    const appear = ease.outCubic(range(local, p.in, p.in + 0.5))
    const leave = p.out === undefined ? 1 : 1 - range(local, p.out, p.out + 0.4)
    const a = Math.min(appear, leave) * sceneOut
    if (a <= 0) continue
    ctx.save()
    ctx.globalAlpha = a
    ctx.translate(0, (1 - appear) * 30)
    if (p.kind === 'term') drawTerm(ctx, p, local)
    else if (p.kind === 'code') drawCode(ctx, p, local)
    else if (p.kind === 'browser') drawBrowser(ctx, p, local, imgs)
    else if (p.kind === 'table') drawTable(ctx, p, local)
    else if (p.kind === 'tree') drawTree(ctx, p, local)
    else if (p.kind === 'flow') drawFlow(ctx, p, local)
    else if (p.kind === 'intro') drawIntro(ctx, local)
    else drawOutro(ctx, local)
    ctx.restore()
  }

  if (scene.chapter > 0 || (t > 10 && t < DURATION - 13)) hud(ctx, t, scene.chapter)
  if (firstOfChapter) chapterCard(ctx, local, scene.chapter)
  caption(ctx, t)

  // จางเข้าตอนเริ่ม / จางออกตอนจบ
  const fade = Math.max(1 - range(t, 0, 0.6), range(t, DURATION - 1.2, DURATION))
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`
    ctx.fillRect(0, 0, W, H)
  }
  ctx.restore()
}
