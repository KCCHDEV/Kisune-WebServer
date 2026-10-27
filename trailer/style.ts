/**
 * ของที่ trailer และวิดีโอสอนใช้ร่วมกัน: คณิตศาสตร์ของ animation, ฟอนต์, สี
 * ไม่มี three.js — import จากไฟล์นี้ได้โดยไม่ลาก WebGL มาด้วย
 */

/* ---------- คณิตศาสตร์ ---------- */

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** ความคืบหน้า 0..1 ของ t ระหว่าง a ถึง b */
export const range = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const ease = {
  outCubic: (x: number) => 1 - (1 - x) ** 3,
  inCubic: (x: number) => x ** 3,
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inExpo: (x: number) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outBack: (x: number) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
  outQuint: (x: number) => 1 - (1 - x) ** 5,
}
/** fade in ช่วง a→b แล้ว fade out ช่วง c→d */
export const window4 = (t: number, a: number, b: number, c: number, d: number) =>
  Math.min(ease.outCubic(range(t, a, b)), 1 - ease.inCubic(range(t, c, d)))

/** สุ่มแบบกำหนด seed — ได้ค่าเดิมทุกครั้ง */
export function prng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- ฟอนต์ / สี ---------- */

export const FONT = "'KitsuneSans', 'Segoe UI', sans-serif"
export const MONO = "'KitsuneMono', Consolas, monospace"
export const EMOJI = "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'"
export const C = {
  white: '#ffffff',
  text: '#eef0ff',
  muted: '#9aa3c7',
  dim: '#5d6690',
  violet: '#a78bfa',
  indigo: '#818cf8',
  pink: '#f472b6',
  magenta: '#e879f9',
  mint: '#5eead4',
  green: '#5af78e',
  yellow: '#facc15',
  navy: '#060818',
}
/** ไล่สีชมพู → ม่วง → ฟ้า แบบในคลิปตัวอย่าง */
export const GRAD = ['#f9a8d4', '#c084fc', '#818cf8']

/** โหลดฟอนต์ที่ใช้วาดลง canvas จากเซิร์ฟเวอร์เราเอง */
export async function loadFonts() {
  const THAI = 'U+0E01-0E5B, U+200C-200D, U+25CC'
  const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2190-2199, U+2212, U+2215, U+221E, U+2248, U+FEFF, U+FFFD'
  const faces: FontFace[] = []
  for (const w of [400, 500, 600, 700])
    for (const [sub, range] of [['thai', THAI], ['latin', LATIN]] as const)
      faces.push(new FontFace('KitsuneSans', `url(/trailer/fonts/ibm-plex-sans-thai-${sub}-${w}-normal.woff2)`, { weight: String(w), unicodeRange: range }))
  for (const w of [400, 500, 700])
    faces.push(new FontFace('KitsuneMono', `url(/trailer/fonts/jetbrains-mono-latin-${w}-normal.woff2)`, { weight: String(w) }))
  // FontFaceSet เป็น Set ของ FontFace (type ใน lib.dom บางเวอร์ชันไม่มี add)
  await Promise.all(faces.map(async (f) => (document.fonts as unknown as Set<FontFace>).add(await f.load())))
}
