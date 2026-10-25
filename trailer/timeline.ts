/**
 * ลำดับฉากของ trailer — ภาพ (scenes.ts) และเสียง (audio.ts) ใช้ค่าชุดเดียวกัน จังหวะจึงตรงกันเสมอ
 * 120 BPM → 1 ห้อง = 2 วินาที ทุกรอยต่อฉากจึงตกบนต้นห้องพอดี
 */
export const DURATION = 80

export const SCENES = [
  { id: 'prologue', name: 'PROLOGUE', start: 0, end: 6 },
  { id: 'title', name: 'KITSUNE', start: 6, end: 14 },
  { id: 'graph', name: 'ALL IN ONE', start: 14, end: 22 },
  { id: 'speed', name: 'PERFORMANCE', start: 22, end: 32 },
  { id: 'code', name: 'DEVELOPER EXPERIENCE', start: 32, end: 42 },
  { id: 'screens', name: 'SHOWCASE', start: 42, end: 50 },
  { id: 'devices', name: 'EVERYWHERE', start: 50, end: 58 },
  { id: 'terminal', name: 'OBSERVABILITY', start: 58, end: 68 },
  { id: 'finale', name: 'GET STARTED', start: 68, end: 80 },
] as const

export type SceneId = (typeof SCENES)[number]['id']
export const scene = (id: SceneId) => SCENES.find((s) => s.id === id)!

/** จังหวะ "ตูม": แฟลช + กล้องสั่น + เสียง impact */
export const IMPACTS = [6, 14, 22, 32, 42, 50, 58, 68, 74]
/** จังหวะ glitch สั้นๆ ก่อนเปลี่ยนฉาก */
export const GLITCHES = SCENES.slice(1).map((s) => s.start - 0.2)
