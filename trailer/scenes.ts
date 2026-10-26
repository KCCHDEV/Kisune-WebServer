/**
 * ฉากทั้งหมดของ trailer (80 วินาที) — ดูลำดับที่ timeline.ts
 * world = โมเดล 3D / ฉากหลัง · hud = ตัวหนังสือคมชัดที่วาดทับทีหลัง
 */
import {
  THREE,
  type Stage,
  DIST,
  C,
  GRAD,
  FONT,
  MONO,
  EMOJI,
  clamp,
  lerp,
  range,
  ease,
  window4,
  prng,
  makeText,
  makeCanvasPlane,
  drawWindow,
  roundRect,
  gradientFill,
  setOpacity,
  makeBackground,
  makeStars,
  makeTerrain,
  makeAppIcon,
  makeLaptop,
  makePhone,
  makeBrowserWindow,
  makeChip,
} from './engine'
import { DURATION, SCENES, IMPACTS, GLITCHES, scene } from './timeline'

export { DURATION }

export type TrailerData = {
  inprocess: { id: string; label: string; route: string; opsPerSec: number; nsPerOp: number }[]
  info: { bun: string; elysia: string; cpu: string; cores: number; platform: string }
  routes: {
    total: number
    pages: number
    api: number
    cached: number
    sample: { method: string; path: string; file: string; kind: string; cache?: number }[]
  }
  examples: { icon: string; title: string; desc: string; tags: string[] }[]
  cacheMB: number
  compression: { raw: number; br: number }
}

type ShotKey = 'landing' | 'examples' | 'benchmark' | 'cache' | 'm-landing' | 'm-examples' | 'm-cache'
export type Shots = Partial<Record<ShotKey, HTMLImageElement>>

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

/* ---------- โค้ดแบบมีสี (ใช้บนจอโน้ตบุ๊ก) ---------- */

const KW = new Set('import from export default const let return async await function new true false'.split(' '))
function tokenize(line: string): [string, string][] {
  const out: [string, string][] = []
  const re = /(\/\/.*$)|('[^']*'|"[^"]*"|`[^`]*`)|(<\/?[A-Za-z][\w.]*|\/?>)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g
  for (const m of line.matchAll(re)) {
    const [s, com, str, tag, num, word] = m
    if (com) out.push([s, '#6b7299'])
    else if (str) out.push([s, '#a6e3a1'])
    else if (tag) out.push([s, '#f38ba8'])
    else if (num) out.push([s, '#fab387'])
    else if (word && KW.has(word)) out.push([s, '#f0a6ff'])
    else if (word && line[m.index! + s.length] === '(') out.push([s, '#89b4fa'])
    else if (word && /^[A-Z]/.test(word)) out.push([s, '#f9e2af'])
    else out.push([s, '#e6e9ff'])
  }
  return out
}
function drawCode(ctx: CanvasRenderingContext2D, code: string, chars: number, x: number, y: number, size: number, cursor: boolean) {
  ctx.font = `500 ${size}px ${MONO}`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  let left = chars
  const lh = size * 1.65
  let cx = x
  let cy = y
  code.split('\n').forEach((line, li) => {
    if (left <= 0) return
    cx = x
    cy = y + li * lh
    ctx.fillStyle = '#3d4470'
    ctx.fillText(String(li + 1).padStart(2), x - size * 2.3, cy)
    for (const [text, color] of tokenize(line)) {
      if (left <= 0) break
      const part = text.slice(0, left)
      left -= part.length
      ctx.fillStyle = color
      ctx.fillText(part, cx, cy)
      cx += ctx.measureText(part).width
    }
    left -= 1
  })
  if (cursor) {
    ctx.fillStyle = C.pink
    ctx.fillRect(cx + 2, cy, size * 0.55, size * 1.25)
  }
}

/* ---------- สร้างทั้งเรื่อง ---------- */

export function buildTrailer(stage: Stage, data: TrailerData, shots: Shots) {
  const { scene: world, camera, hud, final, bloom } = stage
  const hudRoot = new THREE.Group()
  hud.add(hudRoot)
  const updates: ((t: number) => void)[] = []

  /* ===== ฉากหลัง ===== */
  const bg = makeBackground()
  world.add(bg.mesh)
  const stars = makeStars(2600)
  world.add(stars.points)
  const terrain = makeTerrain()
  world.add(terrain.mesh)

  /* ===== ตัวช่วย HUD ===== */
  /** วางข้อความบน HUD แล้วคืน mesh (เก็บตำแหน่งตั้งต้นไว้ทำ animation) */
  const hudText = (text: string, o: Parameters<typeof makeText>[1], x: number, y: number, parent: THREE.Object3D = hudRoot) => {
    const m = makeText(text, o)
    m.position.set(x, y, 0)
    m.userData.x = x
    m.userData.y = y
    parent.add(m)
    return m
  }
  /** fade + เลื่อนขึ้นเล็กน้อย ตามช่วงเวลา */
  const show = (m: THREE.Object3D, t: number, a: number, c: number, rise = 24, fadeIn = 0.6, fadeOut = 0.5) => {
    const p = window4(t, a, a + fadeIn, c - fadeOut, c)
    setOpacity(m, p)
    m.position.y = (m.userData.y ?? 0) - (1 - ease.outCubic(range(t, a, a + fadeIn))) * rise
  }
  // ฉากมืดๆ หลังหัวข้อมุมซ้ายบน — อ่านง่ายแม้ด้านหลังมีโมเดล/ภาพหน้าจอ
  const scrim = makeCanvasPlane(1920, 1080, (ctx, w, h) => {
    const g = ctx.createRadialGradient(330, 240, 40, 330, 240, 720)
    g.addColorStop(0, 'rgba(6, 8, 24, 0.8)')
    g.addColorStop(0.45, 'rgba(6, 8, 24, 0.5)')
    g.addColorStop(1, 'rgba(6, 8, 24, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
  scrim.update(null)
  scrim.mesh.renderOrder = -1
  hudRoot.add(scrim.mesh)
  let scrimLevel = 0
  updates.push(() => (scrimLevel = 0))

  /** หัวข้อสองบรรทัดมุมซ้ายบน: บรรทัดแรกขาว บรรทัดสองไล่สี (แบบในคลิปตัวอย่าง) */
  const headline = (l1: string, l2: string, at: number, end: number) => {
    const a = hudText(l1, { size: 86, weight: 700, color: C.white, align: 'left' }, -860, 330)
    const b = hudText(l2, { size: 86, weight: 700, gradient: GRAD, align: 'left' }, -860, 222)
    updates.push((t) => {
      show(a, t, at, end, 30)
      show(b, t, at + 0.25, end, 30)
      scrimLevel = Math.max(scrimLevel, window4(t, at - 0.2, at + 0.4, end - 0.4, end))
    })
  }
  const label = (text: string, o: { size?: number; color?: string; align?: 'left' | 'right' | 'center'; spacing?: number } = {}) =>
    makeText(text, { size: o.size ?? 15, weight: 500, font: MONO, color: o.color ?? C.muted, align: o.align ?? 'left', letterSpacing: o.spacing ?? 3, shadow: false })

  /* ===== HUD ถาวร: มุมจอแบบหนัง ===== */
  const frame = makeCanvasPlane(1920, 1080, (ctx, w, h) => {
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.35)'
    ctx.lineWidth = 1.5
    const i = 34
    const L = 26
    for (const [x, y, dx, dy] of [[i, i, 1, 1], [w - i, i, -1, 1], [i, h - i, 1, -1], [w - i, h - i, -1, -1]] as const) {
      ctx.beginPath()
      ctx.moveTo(x + dx * L, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + dy * L)
      ctx.stroke()
    }
  })
  frame.update(null)
  hudRoot.add(frame.mesh)
  const tl1 = label('YURACHI STUDIO', { color: C.white, size: 15 })
  const tl2 = label(`KITSUNE · V1.0 · BUN ${data.info.bun}`, { size: 12, color: C.dim })
  tl1.position.set(-900, 490, 0)
  tl2.position.set(-900, 466, 0)
  const bl = label('BUILT WITH BUN · ELYSIA · HTMX', { size: 12, color: C.dim })
  bl.position.set(-900, -492, 0)
  const br = label('RENDERED IN WEBGL · 1080P · 30 FPS', { size: 12, color: C.dim, align: 'right' })
  br.position.set(900, -492, 0)
  const tr = makeCanvasPlane(560, 70, (ctx, w, _h, s: { scene: number; name: string; tc: string }) => {
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.font = `500 15px ${MONO}`
    ctx.letterSpacing = '3px'
    ctx.fillStyle = C.white
    ctx.fillText(`SCENE ${String(s.scene).padStart(2, '0')} / ${String(SCENES.length).padStart(2, '0')}`, w - 4, 18)
    ctx.font = `500 12px ${MONO}`
    ctx.fillStyle = C.dim
    ctx.fillText(`${s.name} · ${s.tc}`, w - 4, 44)
  })
  tr.mesh.position.set(900 - 280, 478, 0)
  hudRoot.add(tl1, tl2, bl, br, tr.mesh)
  const corners = [frame.mesh, tl1, tl2, bl, br, tr.mesh]

  // แถบฟีเจอร์วิ่งด้านล่าง
  const tickerItems = data.examples.map((e) => `${e.icon}  ${e.title}`)
  const ticker = makeCanvasPlane(1920, 46, (ctx, w, h, off: number) => {
    ctx.font = `500 17px ${FONT}`
    ctx.textBaseline = 'middle'
    const gap = 70
    const widths = tickerItems.map((s) => ctx.measureText(s).width + gap)
    const total = widths.reduce((a, b) => a + b, 0)
    let x = -(off % total)
    while (x < w) {
      tickerItems.forEach((s, i) => {
        ctx.fillStyle = C.violet
        ctx.beginPath()
        ctx.arc(x - 22, h / 2, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(226, 232, 255, 0.85)'
        ctx.fillText(s, x, h / 2)
        x += widths[i]!
      })
    }
    const fade = ctx.createLinearGradient(0, 0, w, 0)
    fade.addColorStop(0, 'rgba(6,8,24,1)')
    fade.addColorStop(0.12, 'rgba(6,8,24,0)')
    fade.addColorStop(0.88, 'rgba(6,8,24,0)')
    fade.addColorStop(1, 'rgba(6,8,24,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  })
  ticker.mesh.position.set(0, -440, 0)
  hudRoot.add(ticker.mesh)

  updates.push((t) => {
    const p = range(t, 0.6, 1.6) * (1 - range(t, 78.6, 79.6))
    corners.forEach((m) => setOpacity(m, p))
    const idx = SCENES.findIndex((s) => t >= s.start && t < s.end)
    const sc = SCENES[Math.max(0, idx)]!
    const tc = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 30)).padStart(2, '0')}`
    tr.update({ scene: idx + 1, name: sc.name, tc }, tc)
    // แถบวิ่งโผล่เฉพาะฉาก graph และ devices
    setOpacity(ticker.mesh, window4(t, 14.5, 15.1, 21.0, 21.6) + window4(t, 50.5, 51.1, 57.0, 57.6))
    if (ticker.mesh.visible) ticker.update(t * 60, Math.round(t * 60))
  })

  /* ===== 1 PROLOGUE ===== */
  {
    const s = scene('prologue')
    const small = hudText('YURACHI STUDIO  /  PROLOGUE', { size: 15, weight: 500, font: MONO, color: C.muted, letterSpacing: 4, shadow: false }, 0, 120)
    const l1 = hudText('เว็บที่ดี เริ่มจากความเร็ว', { size: 80, weight: 700, color: C.white }, 0, 30)
    const l2 = hudText('แต่ความเร็ว ต้องไม่ยาก', { size: 80, weight: 700, gradient: GRAD }, 0, -80)
    updates.push((t) => {
      show(small, t, 0.8, s.end - 0.3, 10)
      show(l1, t, 1.1, s.end - 0.3, 30, 0.8)
      show(l2, t, 2.5, s.end - 0.3, 30, 0.8)
      l1.scale.setScalar(1 + range(t, 1.1, 6) * 0.03)
      l2.scale.setScalar(1 + range(t, 2.5, 6) * 0.03)
    })
  }

  /* ===== 2 TITLE ===== */
  const icon = makeAppIcon(270)
  world.add(icon)
  {
    const s = scene('title')
    // "Kitsune" สองสี: Kit ขาว · sune ไล่สี
    const kit = makeText('Kit', { size: 160, weight: 700, color: C.white, align: 'right' })
    const sune = makeText('sune', { size: 160, weight: 700, gradient: GRAD, align: 'left' })
    const wordW = kit.userData.width + sune.userData.width
    kit.position.set(-wordW / 2 + kit.userData.width, -40, 0)
    sune.position.set(-wordW / 2 + kit.userData.width, -40, 0)
    kit.userData.y = sune.userData.y = -40
    hudRoot.add(kit, sune)
    const tag = hudText('ว่องไว แสนกล ครบในตัวเดียว', { size: 42, weight: 500, color: '#d6dbff' }, 0, -150)
    const stats = [
      { v: String(data.routes.total), l: 'ROUTES' },
      { v: String(data.examples.length), l: 'EXAMPLES' },
      { v: fmt(data.inprocess[0]!.opsPerSec), l: 'REQ / SEC' },
    ].map((st, i) => {
      const g = new THREE.Group()
      const v = makeText(st.v, { size: 56, weight: 700, color: C.white })
      const l = label(st.l, { size: 14, align: 'center', color: C.muted, spacing: 4 })
      l.position.y = -52
      g.add(v, l)
      g.position.set((i - 1) * 340, -300, 0)
      g.userData.y = -300
      hudRoot.add(g)
      return g
    })
    updates.push((t) => {
      show(kit, t, s.start + 1.0, s.end - 0.3, 40, 0.7)
      show(sune, t, s.start + 1.15, s.end - 0.3, 40, 0.7)
      show(tag, t, s.start + 1.8, s.end - 0.3, 20)
      stats.forEach((g, i) => show(g, t, s.start + 2.6 + i * 0.25, s.end - 0.3, 20))
    })
  }

  /* ===== 3 GRAPH: ครบในโปรเจกต์เดียว ===== */
  const graph = new THREE.Group()
  world.add(graph)
  {
    const s = scene('graph')
    headline('ครบทุกอย่าง', 'ในโปรเจกต์เดียว', s.start + 0.3, s.end - 0.3)
    const hub = makeChip('🦊', 'Kitsune', true)
    hub.scale.setScalar(1.25)
    graph.add(hub)
    const n = data.examples.length
    const nodes = data.examples.map((ex, i) => {
      const a = (i / n) * Math.PI * 2 + 0.3
      const chip = makeChip(ex.icon, ex.title)
      const target = new THREE.Vector3(Math.cos(a) * 800, Math.sin(a) * 285 - 30, -260 - (i % 3) * 230)
      chip.position.copy(target)
      graph.add(chip)
      // เส้นเชื่อมจาก hub (ไล่สีชมพู → ม่วง)
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
      geo.setAttribute('color', new THREE.Float32BufferAttribute([0.98, 0.6, 0.85, 0.5, 0.55, 0.98], 3))
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }))
      line.renderOrder = -1
      graph.add(line)
      return { chip, target, line, at: s.start + 0.9 + i * 0.14 }
    })
    const counter = makeCanvasPlane(320, 190, (ctx, w, _h, v: number) => {
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.font = `700 132px ${FONT}`
      ctx.fillStyle = C.white
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 20
      ctx.fillText(String(v), w - 10, 80)
      ctx.shadowBlur = 0
      ctx.font = `500 15px ${MONO}`
      ctx.letterSpacing = '4px'
      ctx.fillStyle = C.muted
      ctx.fillText('EXAMPLES', w - 10, 165)
    })
    counter.mesh.position.set(740, 300, 0)
    counter.mesh.userData.y = 300
    hudRoot.add(counter.mesh)
    updates.push((t) => {
      // HUD ต้องอัปเดตทุกเฟรม (ไม่งั้นค้างอยู่บนจอหลังจบฉาก)
      show(counter.mesh, t, s.start + 0.8, s.end - 0.3, 0)
      if (counter.mesh.visible) counter.update(Math.round(n * ease.outCubic(range(t, s.start + 0.9, s.start + 0.9 + n * 0.14))))
      graph.visible = t > s.start - 0.1 && t < s.end + 0.1
      if (!graph.visible) return
      const out = 1 - ease.inCubic(range(t, s.end - 0.6, s.end))
      setOpacity(hub, ease.outCubic(range(t, s.start + 0.4, s.start + 1.0)) * out)
      hub.position.z = (1 - ease.outBack(range(t, s.start + 0.4, s.start + 1.1))) * -600
      nodes.forEach(({ chip, target, line, at }) => {
        const p = ease.outCubic(range(t, at, at + 0.6))
        const pos = (line.geometry.attributes.position as THREE.BufferAttribute)
        pos.setXYZ(1, target.x * p, target.y * p, target.z * p)
        pos.needsUpdate = true
        setOpacity(line, range(t, at, at + 0.2) * out)
        const pop = ease.outBack(range(t, at + 0.4, at + 0.85))
        chip.scale.setScalar(Math.max(0.001, pop))
        setOpacity(chip, range(t, at + 0.4, at + 0.6) * out)
        chip.lookAt(camera.position)
      })
      graph.rotation.y = Math.sin((t - s.start) * 0.35) * 0.22
      graph.rotation.x = 0.06
      graph.position.set(130, -120, 0)
    })
  }

  /* ===== 4 SPEED ===== */
  const rings = new THREE.Group()
  world.add(rings)
  {
    const s = scene('speed')
    const ringMat = new THREE.MeshBasicMaterial({ color: '#8b7cf6', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    const ringList = Array.from({ length: 16 }, (_, i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1050, 2.4, 8, 160), ringMat)
      r.userData.z = -i * 600
      rings.add(r)
      return r
    })
    headline('เร็วจัด', 'โดยไม่ต้องจูนอะไรเลย', s.start + 0.3, s.end - 0.3)
    const best = data.inprocess[0]!
    const counter = makeCanvasPlane(1500, 260, (ctx, w, h, v: number) => {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `700 210px ${FONT}`
      const text = fmt(v)
      const tw = ctx.measureText(text).width
      ctx.fillStyle = gradientFill(ctx, w / 2 - tw / 2, w / 2 + tw / 2)
      ctx.shadowColor = 'rgba(2,3,12,0.7)'
      ctx.shadowBlur = 30
      ctx.fillText(text, w / 2, h / 2)
    })
    counter.mesh.position.set(0, 10, 0)
    counter.mesh.userData.y = 10
    hudRoot.add(counter.mesh)
    const unit = hudText('REQUESTS / SECOND  ·  1 CPU CORE  ·  MEASURED LIVE', { size: 17, weight: 500, font: MONO, color: '#c7cdf5', letterSpacing: 5 }, 0, -130)
    const metricV = hudText(`${(best.nsPerOp / 1000).toFixed(2)} µs`, { size: 64, weight: 700, color: C.mint, align: 'right' }, 900, 320)
    const metricL = label('PER REQUEST', { size: 14, align: 'right', spacing: 4 })
    metricL.position.set(900, 268, 0)
    metricL.userData.y = 268
    hudRoot.add(metricL)
    const maxOps = Math.max(...data.inprocess.map((r) => r.opsPerSec))
    const cases = data.inprocess.map((r, i) => {
      const g = new THREE.Group()
      const v = makeText(fmt(r.opsPerSec), { size: 40, weight: 700, color: C.white })
      const l = label(r.route, { size: 14, align: 'center', spacing: 2 })
      l.position.y = -42
      const bar = makeCanvasPlane(300, 10, (ctx, w, h, p: number) => {
        roundRect(ctx, 0, 0, w, h, 5)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()
        roundRect(ctx, 0, 0, Math.max(6, w * p * (r.opsPerSec / maxOps)), h, 5)
        ctx.fillStyle = gradientFill(ctx, 0, w)
        ctx.fill()
      })
      bar.mesh.position.y = -72
      g.add(v, l, bar.mesh)
      g.position.set((i - 1.5) * 400, -280, 0)
      g.userData.y = -280
      hudRoot.add(g)
      return { g, bar, at: s.start + 4.2 + i * 0.25 }
    })
    updates.push((t) => {
      rings.visible = t > s.start - 0.2 && t < s.end + 0.2
      if (rings.visible) {
        const fade = window4(t, s.start, s.start + 0.8, s.end - 0.6, s.end)
        ringList.forEach((r, i) => {
          r.position.z = -9000 + ((r.userData.z + 9000 + (t - s.start) * 2200) % 9600)
          r.rotation.z = t * 0.2 + i
          ;(r.material as THREE.MeshBasicMaterial).opacity = 0.5 * fade
        })
      }
      show(counter.mesh, t, s.start + 0.8, s.end - 0.3, 0, 0.4)
      counter.mesh.scale.setScalar(lerp(1.08, 1, ease.outCubic(range(t, s.start + 0.8, s.start + 1.6))))
      counter.update(best.opsPerSec * ease.outExpo(range(t, s.start + 0.9, s.start + 3.6)), Math.round(best.opsPerSec * ease.outExpo(range(t, s.start + 0.9, s.start + 3.6)) / 73))
      show(unit, t, s.start + 1.6, s.end - 0.3, 10)
      show(metricV, t, s.start + 3.6, s.end - 0.3, 16)
      show(metricL, t, s.start + 3.8, s.end - 0.3, 10)
      cases.forEach(({ g, bar, at }) => {
        show(g, t, at, s.end - 0.3, 16)
        if (g.visible) bar.update(ease.outCubic(range(t, at + 0.2, at + 1.4)), Math.round(range(t, at + 0.2, at + 1.4) * 60))
      })
    })
  }

  /* ===== 5 CODE: โน้ตบุ๊ก 3D ===== */
  const snippet1 = `// src/pages/hello.tsx  →  /hello
import { Layout } from '@components'

export default () => (
  <Layout title="Hello">
    <h1>สวัสดี!</h1>
  </Layout>
)`
  const snippet2 = `// cache ทั้งหน้า 60 วินาที (brotli + ETag)
export const cache = 60

// validation + type จาก schema เดียว
export const POST = defineRoute({
  body: t.Object({ name: t.String() }),
  handler: ({ body }) => body.name,
})`
  const laptopScreen = makeCanvasPlane(1280, 800, (ctx, w, h, st: { mode: 'code1' | 'code2' | 'browser'; n: number; cursor: boolean }) => {
    if (st.mode === 'browser') {
      drawWindow(ctx, w, h, 'localhost:3000/hello', true)
      const g = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.6)
      g.addColorStop(0, '#1e1b4b')
      g.addColorStop(1, '#0c0e22')
      ctx.fillStyle = g
      ctx.fillRect(2, 45, w - 4, h - 47)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `700 150px ${FONT}`
      ctx.fillStyle = gradientFill(ctx, w / 2 - 300, w / 2 + 300)
      ctx.fillText('สวัสดี!', w / 2, h / 2 - 20)
      ctx.font = `500 34px ${FONT}`
      ctx.fillStyle = C.muted
      ctx.fillText('ไม่ต้องลงทะเบียน route ที่ไหนเลย', w / 2, h / 2 + 110)
      return
    }
    drawWindow(ctx, w, h, st.mode === 'code1' ? 'src/pages/hello.tsx' : 'src/pages/about.tsx')
    drawCode(ctx, st.mode === 'code1' ? snippet1 : snippet2, st.n, 110, 90, 34, st.cursor)
  }, { depthWrite: true })
  const laptop = makeLaptop(laptopScreen.mesh, 1000)
  world.add(laptop.group)
  {
    const s = scene('code')
    headline('สร้างไฟล์', 'ได้หน้าเว็บทันที', s.start + 0.3, s.end - 0.3)
    const bullets = [
      ['📁', 'file-based routing · เพิ่มไฟล์ = เพิ่ม route'],
      ['✅', 'validation + TypeScript type อัตโนมัติ'],
      ['⚡', 'export const cache = 60 · cache ทั้งหน้า'],
      ['🔐', 'guard ทั้งโฟลเดอร์ด้วย _guard.ts'],
    ].map(([ic, txt], i) => {
      const g = makeCanvasPlane(720, 64, (ctx, _w, h) => {
        roundRect(ctx, 0, 6, 52, 52, 14)
        ctx.fillStyle = 'rgba(129, 140, 248, 0.18)'
        ctx.fill()
        ctx.font = `28px ${EMOJI}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff' // ไม่งั้น emoji จางตามสีพื้นที่เพิ่งใช้
        ctx.fillText(ic!, 26, h / 2 + 1)
        ctx.font = `500 27px ${FONT}`
        ctx.fillStyle = '#e2e6ff'
        ctx.textAlign = 'left'
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 10
        ctx.fillText(txt!, 72, h / 2 + 1)
      })
      g.update(null)
      g.mesh.position.set(-860 + 360, 60 - i * 86, 0)
      g.mesh.userData.y = 60 - i * 86
      hudRoot.add(g.mesh)
      return { m: g.mesh, at: s.start + 2.2 + i * 0.3 }
    })
    updates.push((t) => {
      const on = t > s.start - 0.1 && t < s.end + 0.1
      laptop.group.visible = on
      if (on) {
        const enter = ease.outCubic(range(t, s.start, s.start + 1.0))
        setOpacity(laptop.group, enter * (1 - ease.inCubic(range(t, s.end - 0.6, s.end))))
        laptop.group.position.set(380, -230 + (1 - enter) * -200, -150)
        laptop.group.rotation.set(0.32, -0.42 + Math.sin(t * 0.4) * 0.05, 0)
        laptop.setOpen(ease.inOutCubic(range(t, s.start + 0.5, s.start + 1.8)))
        const lt = t - s.start
        const st =
          lt < 4.8
            ? { mode: 'code1' as const, n: Math.floor(range(lt, 1.8, 4.6) * snippet1.length), cursor: Math.floor(t * 3) % 2 === 0 }
            : lt < 6.6
              ? { mode: 'browser' as const, n: 0, cursor: false }
              : { mode: 'code2' as const, n: Math.floor(range(lt, 6.8, 9.2) * snippet2.length), cursor: Math.floor(t * 3) % 2 === 0 }
        laptopScreen.update(st)
      }
      bullets.forEach(({ m, at }) => show(m, t, at, s.end - 0.3, 16))
    })
  }

  /* ===== 6 SCREENS: หน้าต่างเว็บลอยแบบ 3D ===== */
  const windows = new THREE.Group()
  world.add(windows)
  {
    const s = scene('screens')
    headline('ของจริง', 'ทุกหน้าใช้งานได้', s.start + 0.3, s.end - 0.3)
    const list: { key: ShotKey; url: string; title: string }[] = [
      { key: 'landing', url: 'localhost:3000', title: 'หน้าแรก · วัดความเร็วสดทุกครั้งที่เปิด' },
      { key: 'examples', url: 'localhost:3000/examples', title: `ตัวอย่าง ${data.examples.length} หมวด · พร้อมโค้ดจริง` },
      { key: 'benchmark', url: 'localhost:3000/benchmark', title: 'ทดสอบความเร็ว · req/s · p50 / p95 / p99' },
      { key: 'cache', url: 'localhost:3000/examples/cache', title: `In-memory cache · ${data.cacheMB} MB · LRU + TTL` },
    ]
    // ตำแหน่งพื้นหลังของแต่ละหน้าต่าง + ตำแหน่ง "พระเอก" ด้านหน้า (หน้าต่างที่ caption กำลังพูดถึง)
    const layout = [
      { x: -470, y: 30, z: -800, ry: 0.3 },
      { x: 980, y: 150, z: -1300, ry: -0.42 },
      { x: -60, y: 230, z: -1900, ry: 0.1 },
      { x: -980, y: -170, z: -1500, ry: 0.36 },
    ]
    const hero = { x: 420, y: -90, z: 0, ry: -0.3 }
    const SLOT = 1.9 // วินาทีต่อหน้าต่าง
    const wins = list.map((item, i) => {
      const win = makeBrowserWindow(shots[item.key], item.url, 1150)
      windows.add(win)
      return { win, ...layout[i]!, at: s.start + 0.4 + i * 0.3 }
    })
    const caption = makeCanvasPlane(900, 70, (ctx, _w, h, i: number) => {
      ctx.textBaseline = 'middle'
      ctx.font = `500 16px ${MONO}`
      ctx.letterSpacing = '3px'
      ctx.fillStyle = C.muted
      ctx.fillText(`0${i + 1} / 0${list.length}`, 0, h / 2)
      ctx.letterSpacing = '0px'
      ctx.font = `600 28px ${FONT}`
      ctx.fillStyle = C.white
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = 12
      ctx.fillText(list[i]!.title, 120, h / 2)
    })
    caption.mesh.position.set(-860 + 450, -380, 0)
    caption.mesh.userData.y = -380
    hudRoot.add(caption.mesh)
    updates.push((t) => {
      const focusAt = clamp(Math.floor((t - s.start - 0.4) / SLOT), 0, list.length - 1)
      show(caption.mesh, t, s.start + 0.8, s.end - 0.3, 10)
      if (caption.mesh.visible) caption.update(focusAt, focusAt)
      const on = t > s.start - 0.1 && t < s.end + 0.1
      windows.visible = on
      if (!on) return
      const out = 1 - ease.inCubic(range(t, s.end - 0.6, s.end))
      wins.forEach(({ win, x, y, z, ry, at }, i) => {
        const p = ease.outQuint(range(t, at, at + 1.2))
        // ช่วงที่หน้าต่างนี้เป็นพระเอก: เลื่อนขึ้นมาด้านหน้า แล้วถอยกลับเมื่อถึงคิวหน้าต่างถัดไป
        const slotA = s.start + 0.4 + i * SLOT
        const slotB = i === list.length - 1 ? s.end + 1 : slotA + SLOT
        const h = ease.inOutCubic(i === 0 ? 1 - range(t, slotB - 0.35, slotB + 0.35) : window4(t, slotA - 0.35, slotA + 0.35, slotB - 0.35, slotB + 0.35))
        const bx = lerp(x, hero.x, h)
        const by = lerp(y, hero.y, h)
        const bz = lerp(z, hero.z, h)
        win.position.set(lerp(bx + 1600, bx, p), by + Math.sin(t * 0.6 + i) * 10, bz)
        win.rotation.set(0.04, lerp(-0.9, lerp(ry, hero.ry, h), p), 0)
        win.scale.setScalar(0.9 + h * 0.08)
        setOpacity(win, range(t, at, at + 0.4) * out)
      })
      windows.position.set(Math.sin(t * 0.3) * 30, 0, 0)
    })
  }

  /* ===== 7 DEVICES: โน้ตบุ๊ก + มือถือ ===== */
  const devices = new THREE.Group()
  world.add(devices)
  {
    const s = scene('devices')
    headline('มือถือ · คอม', 'ใช้ได้ทุกหน้าจอ', s.start + 0.3, s.end - 0.3)
    const deskScreen = makeCanvasPlane(1280, 800, (ctx, w, h) => {
      const img = shots.landing
      ctx.fillStyle = '#05060f'
      ctx.fillRect(0, 0, w, h)
      if (img) ctx.drawImage(img, 0, 0, w, (w * img.naturalHeight) / img.naturalWidth)
    }, { depthWrite: true })
    deskScreen.update(null)
    const desk = makeLaptop(deskScreen.mesh, 820)
    desk.setOpen(1)
    devices.add(desk.group)
    const phones = (['m-landing', 'm-examples', 'm-cache'] as const).map((k, i) => {
      const ph = makePhone(shots[k], 560)
      devices.add(ph)
      return { ph, i }
    })
    const pct = Math.round((1 - data.compression.br / data.compression.raw) * 100)
    const chips = ['📱 Responsive', '🌗 Dark / Light', '🖱️ Prefetch ตอนกดเมาส์', `🗜️ Brotli −${pct}%`].map((txt, i) => {
      const c = makeCanvasPlane(330, 60, (ctx, w, h) => {
        roundRect(ctx, 1, 1, w - 2, h - 2, 30)
        ctx.fillStyle = 'rgba(15, 18, 48, 0.9)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(165, 180, 252, 0.4)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.font = `500 22px ${FONT}, ${EMOJI}`
        ctx.fillStyle = C.text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(txt, w / 2, h / 2 + 1)
      })
      c.update(null)
      c.mesh.position.set((i - 1.5) * 360, -345, 0)
      c.mesh.userData.y = -345
      hudRoot.add(c.mesh)
      return { m: c.mesh, at: s.start + 2.2 + i * 0.2 }
    })
    updates.push((t) => {
      const on = t > s.start - 0.1 && t < s.end + 0.1
      devices.visible = on
      if (on) {
        const out = 1 - ease.inCubic(range(t, s.end - 0.6, s.end))
        const lp = ease.outQuint(range(t, s.start + 0.2, s.start + 1.4))
        desk.group.position.set(lerp(-1400, -400, lp), -290, -250)
        desk.group.rotation.set(0.3, 0.42 + Math.sin(t * 0.4) * 0.03, 0)
        setOpacity(desk.group, range(t, s.start + 0.2, s.start + 0.6) * out)
        phones.forEach(({ ph, i }) => {
          const p = ease.outBack(range(t, s.start + 0.6 + i * 0.22, s.start + 1.6 + i * 0.22))
          ph.position.set(280 + i * 250, lerp(-900, -20 + Math.sin(t * 0.9 + i) * 14, p), 60 - i * 120)
          ph.rotation.set(0.05, -0.38 + i * 0.06, (1 - p) * 0.6 - 0.04)
          setOpacity(ph, range(t, s.start + 0.6 + i * 0.22, s.start + 1.0 + i * 0.22) * out)
        })
        devices.position.set(0, 0, range(t, s.start, s.end) * 120)
      }
      chips.forEach(({ m, at }) => show(m, t, at, s.end - 0.3, 14))
    })
  }

  /* ===== 8 TERMINAL ===== */
  const termGroup = new THREE.Group()
  world.add(termGroup)
  {
    const s = scene('terminal')
    headline('ดูทุก request', 'สวย และอ่านง่าย', s.start + 0.3, s.end - 0.3)
    const r = data.routes
    type Seg = [string, string]
    const lines: Seg[][] = []
    lines.push([[`  🦊 Kitsune  ·  production  ·  Bun ${data.info.bun}`, '#ffffff']])
    lines.push([['  cache      ', '#7a83ad'], [`${data.cacheMB} MB in-memory LRU`, '#ffffff']])
    lines.push([['  route      ', '#7a83ad'], [`${r.total} ทั้งหมด · หน้าเว็บ ${r.pages} · API ${r.api} · ⚡ ${r.cached}`, '#ffffff']])
    lines.push([['', '']])
    r.sample
      .filter((x) => x.method === 'GET')
      .slice(0, 6)
      .forEach((x) =>
        lines.push([
          ['   ', ''],
          [x.kind === 'api' ? 'api ' : 'page', x.kind === 'api' ? '#ff6ac1' : '#5af78e'],
          ['  ' + x.path.padEnd(24), '#5af78e'],
          [x.cache ? `⚡${x.cache}s` : '', '#facc15'],
        ]),
      )
    lines.push([['', '']])
    const head = lines.length
    const lr = prng(9)
    const paths = r.sample.filter((x) => x.method === 'GET' && !/[:*]|^\/trailer|^\/api\/bench/.test(x.path)).map((x) => x.path)
    for (let i = 0; i < 46; i++) {
      const p = paths[Math.floor(lr() * paths.length)] ?? '/'
      const hit = lr() < 0.6
      const kind: Seg = p.startsWith('/api') ? ['api', '#ff6ac1'] : lr() < 0.5 ? ['nav', '#9aedfe'] : ['htmx', '#ff5fd7']
      const us = hit ? 180 + lr() * 260 : 900 + lr() * 3800
      lines.push([
        [`21:${String(30 + Math.floor(i / 25))}:${String(10 + (i % 45)).padStart(2, '0')}  `, '#6b7299'],
        [' GET ', 'BADGE'],
        ['  200 ', '#5af78e'],
        [(us < 1000 ? `${Math.round(us)}µs` : `${(us / 1000).toFixed(1)}ms`).padStart(7) + '  ', '#ffffff'],
        [p.padEnd(26), '#ffffff'],
        [kind[0] + ' ', kind[1]],
        [hit ? 'cache' : '', '#5af78e'],
      ])
    }
    const VISIBLE = 19
    const term = makeCanvasPlane(1180, 760, (ctx, w, h, n: number) => {
      drawWindow(ctx, w, h, 'bun start')
      ctx.font = `500 21px ${MONO}`
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      const shown = lines.slice(0, n)
      shown.slice(Math.max(0, shown.length - VISIBLE)).forEach((line, i) => {
        let x = 30
        const y = 66 + i * 35
        for (const [text, color] of line) {
          if (color === 'BADGE') {
            ctx.fillStyle = '#5af78e'
            ctx.fillRect(x, y - 3, ctx.measureText(text).width, 29)
            ctx.fillStyle = '#04060f'
          } else ctx.fillStyle = color || '#fff'
          ctx.fillText(text, x, y)
          x += ctx.measureText(text).width
        }
      })
    }, { depthWrite: true })
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(1196, 776, 18),
      new THREE.MeshPhysicalMaterial({ color: '#141738', metalness: 0.6, roughness: 0.3, clearcoat: 1, transparent: true }),
    )
    slab.position.z = -10
    termGroup.add(slab, term.mesh)
    const pct = Math.round((1 - data.compression.br / data.compression.raw) * 100)
    const panel = makeCanvasPlane(470, 420, (ctx, w) => {
      ctx.font = `500 15px ${MONO}`
      ctx.letterSpacing = '4px'
      ctx.fillStyle = C.muted
      ctx.textBaseline = 'middle'
      ctx.fillText('IN-MEMORY CACHE', 0, 20)
      ctx.letterSpacing = '0px'
      const rows: [string, string][] = [
        [`${data.cacheMB} MB`, 'จำกัดหน่วยความจำ · LRU'],
        [`${r.cached}`, 'route cache ทั้งหน้า'],
        [`−${pct}%`, 'ขนาดหน้า (brotli)'],
        ['304', 'ETag · ไม่ต้องส่งซ้ำ'],
      ]
      rows.forEach(([v, l], i) => {
        const y = 90 + i * 88
        ctx.font = `700 52px ${FONT}`
        ctx.fillStyle = gradientFill(ctx, 0, 200)
        ctx.fillText(v, 0, y)
        ctx.font = `500 22px ${FONT}`
        ctx.fillStyle = '#d6dbff'
        ctx.fillText(l, 0, y + 38, w)
      })
    })
    panel.update(null)
    panel.mesh.position.set(720, -40, 0)
    panel.mesh.userData.y = -40
    hudRoot.add(panel.mesh)
    updates.push((t) => {
      const on = t > s.start - 0.1 && t < s.end + 0.1
      termGroup.visible = on
      if (on) {
        const p = ease.outQuint(range(t, s.start + 0.3, s.start + 1.4))
        termGroup.position.set(-130, -150 + (1 - p) * -300, lerp(-900, -160, p) + range(t, s.start, s.end) * 60)
        termGroup.rotation.set(-0.06, 0.2 - range(t, s.start, s.end) * 0.08, 0)
        setOpacity(termGroup, range(t, s.start + 0.3, s.start + 0.8) * (1 - ease.inCubic(range(t, s.end - 0.6, s.end))))
        const lt = t - s.start
        const n = lt < 2.4 ? Math.floor(range(lt, 0.8, 2.2) * head) : head + Math.floor(range(lt, 2.4, 9.4) * (lines.length - head))
        term.update(n, n)
      }
      show(panel.mesh, t, s.start + 2.0, s.end - 0.3, 20)
    })
  }

  /* ===== 9 FINALE ===== */
  const finaleRings = new THREE.Group()
  world.add(finaleRings)
  {
    const s = scene('finale')
    const ringMats = [C.violet, C.pink, C.indigo].map(
      (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: 0.2, emissive: c, emissiveIntensity: 0.35, transparent: true }),
    )
    const ringMeshes = ringMats.map((m, i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(205 + i * 38, 3.5, 16, 200), m)
      finaleRings.add(r)
      return r
    })
    const kit = makeText('Kit', { size: 150, weight: 700, color: C.white, align: 'right' })
    const sune = makeText('sune', { size: 150, weight: 700, gradient: GRAD, align: 'left' })
    const wordW = kit.userData.width + sune.userData.width
    kit.position.set(-wordW / 2 + kit.userData.width, -60, 0)
    sune.position.set(-wordW / 2 + kit.userData.width, -60, 0)
    kit.userData.y = sune.userData.y = -60
    hudRoot.add(kit, sune)
    const tag = hudText('ว่องไว แสนกล ครบในตัวเดียว', { size: 40, weight: 500, color: '#d6dbff' }, 0, -165)
    const chips = ['Bun', 'Elysia', 'htmx', 'TypeScript', 'SQLite'].map((txt, i, all) => {
      const c = makeCanvasPlane(170, 50, (ctx, w, h) => {
        roundRect(ctx, 1, 1, w - 2, h - 2, 25)
        ctx.fillStyle = 'rgba(15, 18, 48, 0.9)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(165, 180, 252, 0.45)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.font = `600 21px ${FONT}`
        ctx.fillStyle = C.text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(txt, w / 2, h / 2 + 1)
      })
      c.update(null)
      c.mesh.position.set((i - (all.length - 1) / 2) * 186, -250, 0)
      c.mesh.userData.y = -250
      hudRoot.add(c.mesh)
      return c.mesh
    })
    const cmd = makeCanvasPlane(420, 70, (ctx, w, h) => {
      roundRect(ctx, 1, 1, w - 2, h - 2, 35)
      ctx.fillStyle = 'rgba(30, 27, 75, 0.95)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.7)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.font = `500 28px ${MONO}`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillStyle = C.green
      ctx.fillText('❯', w / 2 - 92, h / 2)
      ctx.fillStyle = C.white
      ctx.fillText('bun dev', w / 2 + 16, h / 2)
    })
    cmd.update(null)
    cmd.mesh.position.set(0, -335, 0)
    cmd.mesh.userData.y = -335
    hudRoot.add(cmd.mesh)
    const made = hudText('MADE BY  YURACHI STUDIO', { size: 13, weight: 500, font: MONO, color: C.dim, letterSpacing: 5, shadow: false }, 0, -405)
    updates.push((t) => {
      const on = t > s.start - 0.1
      finaleRings.visible = on
      if (on) {
        ringMeshes.forEach((r, i) => {
          r.rotation.set(1.3 + Math.sin(t * 0.5 + i) * 0.18, t * (0.4 + i * 0.15), i * 0.5)
          setOpacity(r, ease.outCubic(range(t, s.start + 0.4 + i * 0.15, s.start + 1.2 + i * 0.15)) * (1 - range(t, 78.6, 79.6)))
        })
        finaleRings.position.set(0, 190, 0)
      }
      show(kit, t, s.start + 0.9, 79.6, 40, 0.7)
      show(sune, t, s.start + 1.05, 79.6, 40, 0.7)
      show(tag, t, s.start + 1.7, 79.6, 16)
      chips.forEach((m, i) => show(m, t, s.start + 2.3 + i * 0.12, 79.6, 12))
      show(cmd.mesh, t, s.start + 3.2, 79.6, 12)
      show(made, t, s.start + 3.8, 79.6, 8)
    })
  }

  /* ===== ไอคอน 3D: ใช้ทั้งฉาก title และ finale ===== */
  updates.push((t) => {
    const T = scene('title')
    const F = scene('finale')
    const inTitle = t > T.start && t < T.end + 0.1
    const inFinale = t > F.start
    icon.visible = inTitle || inFinale
    if (!icon.visible) return
    const at = inTitle ? T.start : F.start
    const p = ease.outQuint(range(t, at + 0.1, at + 1.5))
    const spin = (1 - p) * Math.PI * 3
    const y = inTitle ? 200 : 190
    const out = inTitle ? 1 - ease.inCubic(range(t, T.end - 0.6, T.end)) : 1 - range(t, 78.6, 79.6)
    icon.position.set(0, lerp(-600, y, p) + Math.sin(t * 1.3) * 10 + (inTitle ? ease.inCubic(range(t, T.end - 0.6, T.end)) * 400 : 0), lerp(-1200, 0, p))
    icon.rotation.set(Math.sin(t * 0.7) * 0.12, spin + Math.sin(t * 0.5) * 0.35, Math.sin(t * 0.9) * 0.05)
    icon.scale.setScalar(inFinale ? 0.9 : 1)
    setOpacity(icon, range(t, at + 0.1, at + 0.5) * out)
  })

  /* ===== render เฟรมที่เวลา t ===== */
  return function update(t: number) {
    for (const fn of updates) fn(t)
    setOpacity(scrim.mesh, scrimLevel)

    // ฉากหลังตามฉาก
    const inSpeed = t > 22 && t < 32
    bg.uniforms.uTime!.value = t
    bg.uniforms.uStreak!.value = range(t, 0, 2.5) * (inSpeed ? 0.35 : 1) * (1 - range(t, 78.8, 80))
    bg.uniforms.uAurora!.value = window4(t, 22, 23, 31.2, 32) + window4(t, 58, 59, 67.2, 68) * 0.6
    bg.uniforms.uStreakY!.value = t < 14 ? 0.08 : t > 68 ? 0.1 : 0.16
    stars.uniforms.uTime!.value = t
    stars.uniforms.uOpacity!.value = range(t, 0, 2) * (1 - range(t, 78.8, 80))
    // ดาวบินเข้าหากล้องเร็วขึ้นในฉากความเร็ว
    stars.uniforms.uSpeed!.value = t * 60 + Math.max(0, Math.min(t, 32) - 22) * 1600
    terrain.update(t * (inSpeed ? 3 : 1))
    ;(terrain.mesh.material as THREE.MeshBasicMaterial).opacity = 0.2 * range(t, 1, 4) * (1 - range(t, 78.6, 80))

    // แฟลช + สั่น + glitch ตามจังหวะ
    let flash = 0
    let shake = 0
    for (const at of IMPACTS) {
      if (t >= at && t < at + 0.5) {
        const k = 1 - (t - at) / 0.5
        flash = Math.max(flash, k ** 3 * 0.22)
        shake = Math.max(shake, k ** 2)
      }
    }
    let glitch = 0
    for (const at of GLITCHES) glitch = Math.max(glitch, window4(t, at, at + 0.06, at + 0.16, at + 0.24))
    final.uFlash.value = flash
    final.uGlitch.value = glitch
    final.uTime.value = t
    final.uAberration.value = 0.25 + (inSpeed ? 0.5 : 0) + shake * 0.6
    final.uFade.value = Math.min(range(t, 0, 0.8), 1 - range(t, 78.8, 80))
    bloom.strength = 0.5 + (inSpeed ? 0.25 : 0) + flash
    hudRoot.visible = t < 79.9 // ทุกชิ้นใน HUD fade ออกเองก่อนถึงตรงนี้

    // กล้อง: ลอยช้าๆ + สั่นตอน impact
    const sr = prng(Math.floor(t * 60))
    camera.position.set(
      Math.sin(t * 0.23) * 50 + (sr() - 0.5) * 18 * shake,
      Math.cos(t * 0.19) * 26 + (sr() - 0.5) * 18 * shake,
      DIST + Math.sin(t * 0.12) * 40 - (inSpeed ? 160 : 0),
    )
    camera.lookAt(0, 0, 0)
  }
}
