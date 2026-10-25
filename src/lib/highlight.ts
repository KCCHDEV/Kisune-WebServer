/**
 * Syntax highlight แบบเบาๆ สำหรับโชว์โค้ดในหน้าเว็บ (TS/TSX และ shell)
 * escape ทุกชิ้นก่อนห่อด้วย <span> — ผลลัพธ์จึงเป็น HTML ที่ปลอดภัย ใช้กับตัวแปรชื่อขึ้นต้นด้วย safe ได้
 */
import { Html } from '@kitajs/html'

export type Lang = 'ts' | 'sh'

const KEYWORDS = new Set(
  'import from export default const let var return async await function new if else for of in while try catch finally type interface extends yield true false null undefined as typeof'.split(
    ' ',
  ),
)

// ลำดับสำคัญ: คอมเมนต์ → string → tag JSX → ตัวเลข → คำ
const TS =
  /(?<com>\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(?<str>'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(?<tag><\/?[A-Za-z][\w.]*|(?<!=)\/?>)|(?<num>\b\d[\d_.]*\b)|(?<word>[A-Za-z_$][\w$]*)/g
const SH = /(?<com>#[^\n]*)|(?<str>'[^'\n]*'|"[^"\n]*")|(?<flag>\s--?[\w-]+)|(?<word>[A-Za-z_][\w-]*)/g

const span = (cls: string, text: string) => `<span class="tok-${cls}">${Html.escapeHtml(text)}</span>`

export function highlight(code: string, lang: Lang = 'ts'): string {
  const re = lang === 'sh' ? SH : TS
  let out = ''
  let last = 0
  let lineStart = true // shell: คำแรกของบรรทัด = คำสั่ง

  for (const m of code.matchAll(re)) {
    const g = m.groups!
    const before = code.slice(last, m.index)
    out += Html.escapeHtml(before)
    if (before.includes('\n')) lineStart = true
    const text = m[0]

    if (g.com) out += span('com', text)
    else if (g.str) out += span('str', text)
    else if (g.tag) out += span('tag', text)
    else if (g.num) out += span('num', text)
    else if (g.flag) out += span('kw', text)
    else if (lang === 'sh') {
      out += lineStart ? span('fn', text) : Html.escapeHtml(text)
    } else if (KEYWORDS.has(text)) out += span('kw', text)
    else if (code[m.index + text.length] === '(') out += span('fn', text)
    else if (/^[A-Z]/.test(text)) out += span('type', text)
    else out += Html.escapeHtml(text)

    if (!g.com) lineStart = false
    if (g.com && text.includes('\n')) lineStart = true
    last = m.index + text.length
  }
  return out + Html.escapeHtml(code.slice(last))
}

/** เดาภาษาจากชื่อไฟล์/ป้าย */
export const langOf = (label = ''): Lang => (/terminal|\.sh$|ติดตั้ง/.test(label) ? 'sh' : 'ts')
