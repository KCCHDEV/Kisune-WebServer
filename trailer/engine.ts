/**
 * แกนของ trailer
 *
 *  - world: ฉาก 3D (โมเดล, ดาว, ภูเขา wireframe) → bloom + aberration + grain
 *  - hud:   ตัวหนังสือ/ป้ายทั้งหมด วาดทับหลัง post-processing → คมชัด อ่านง่ายเสมอ
 *
 * ทุกอย่างเป็นฟังก์ชันของเวลา t (วินาที) — render เฟรมไหนก็ได้ ผลเหมือนเดิม (export วิดีโอได้แม่นยำ)
 */
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export { THREE }

export const W = 1920
export const H = 1080
const FOV = 30
/** ระยะกล้องที่ทำให้ 1 หน่วย = 1 พิกเซลที่ z = 0 */
export const DIST = H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180)

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

/* ---------- เวที ---------- */

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.3 },
    uGlitch: { value: 0 },
    uFlash: { value: 0 },
    uFade: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uGlitch, uFlash, uFade;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      if (uGlitch > 0.0) {
        float band = floor(uv.y * 30.0);
        float n = hash(vec2(band, floor(uTime * 24.0)));
        if (n < uGlitch * 0.5) uv.x += (hash(vec2(band, floor(uTime * 24.0) + 7.0)) - 0.5) * 0.07 * uGlitch;
      }
      vec2 d = uv - 0.5;
      float ab = uAberration * 0.003 + uGlitch * 0.01;
      vec3 col = vec3(texture2D(tDiffuse, uv + d * ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d * ab).b);
      col *= smoothstep(1.05, 0.25, length(d * vec2(1.0, 1.15)));   // vignette
      col += (hash(uv * 1024.0 + fract(uTime * 7.13)) - 0.5) * 0.025; // grain
      col += vec3(0.75, 0.7, 1.0) * uFlash;
      gl_FragColor = vec4(col * uFade, 1.0);
    }
  `,
}

export type Stage = ReturnType<typeof createStage>

export function createStage(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(1)
  renderer.setSize(W, H, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // world: ฉาก 3D
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(C.navy)
  scene.fog = new THREE.FogExp2(C.navy, 0.00006)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.55

  const key = new THREE.DirectionalLight('#ffffff', 1.0)
  key.position.set(600, 900, 1400)
  const rimA = new THREE.PointLight(C.violet, 3.2, 0, 0)
  rimA.position.set(-1400, 400, 400)
  const rimB = new THREE.PointLight(C.pink, 2.6, 0, 0)
  rimB.position.set(1400, -300, 300)
  scene.add(key, rimA, rimB, new THREE.AmbientLight('#3b3f7a', 0.6))

  const camera = new THREE.PerspectiveCamera(FOV, W / H, 10, 30000)
  camera.position.set(0, 0, DIST)

  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(1)
  composer.setSize(W, H)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.6, 0.86)
  composer.addPass(bloom)
  const final = new ShaderPass(FinalShader)
  composer.addPass(final)
  composer.addPass(new OutputPass())

  // hud: ตัวหนังสือ — กล้อง orthographic หน่วยเป็นพิกเซล (0,0 = กลางจอ)
  const hud = new THREE.Scene()
  const hudCamera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -2000, 2000)

  function render() {
    renderer.autoClear = true
    composer.render()
    renderer.autoClear = false
    renderer.clearDepth()
    renderer.render(hud, hudCamera)
  }

  return { renderer, scene, camera, hud, composer, bloom, final: final.uniforms as typeof FinalShader.uniforms, render }
}

/* ---------- ข้อความ / แผ่นที่วาดจาก canvas ---------- */

const SCALE = 2 // วาดละเอียด 2 เท่า

type TextOpts = {
  size?: number
  weight?: number
  font?: string
  color?: string
  gradient?: string[]
  align?: 'center' | 'left' | 'right'
  lineHeight?: number
  letterSpacing?: number
  /** เงาเข้มรอบตัวอักษร ช่วยให้อ่านง่ายบนฉากที่มีลวดลาย (ค่าเริ่มต้นเปิด) */
  shadow?: boolean
}

function canvasMaterial(tex: THREE.Texture, basic = true) {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return basic
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, fog: false })
}

/** แผ่นข้อความ (รองรับหลายบรรทัด) ขนาดเป็นพิกเซลจริง · align กำหนดจุดยึดของแผ่นด้วย */
export function makeText(text: string, o: TextOpts = {}) {
  const size = o.size ?? 64
  const font = `${o.weight ?? 700} ${size * SCALE}px ${o.font ?? FONT}`
  const lines = text.split('\n')
  const lh = size * (o.lineHeight ?? 1.3)
  const m = document.createElement('canvas').getContext('2d')!
  m.font = font
  if (o.letterSpacing) m.letterSpacing = `${o.letterSpacing * SCALE}px`
  const pad = Math.ceil(size * 0.4)
  const textW = Math.ceil(Math.max(...lines.map((l) => m.measureText(l).width)) / SCALE)
  const w = textW + pad * 2
  const h = Math.ceil(lh * lines.length) + pad * 2

  const canvas = document.createElement('canvas')
  canvas.width = w * SCALE
  canvas.height = h * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.font = font
  if (o.letterSpacing) ctx.letterSpacing = `${o.letterSpacing * SCALE}px`
  ctx.textBaseline = 'middle'
  const align = o.align ?? 'center'
  ctx.textAlign = align
  const x = align === 'left' ? pad * SCALE : align === 'right' ? (w - pad) * SCALE : canvas.width / 2
  if (o.gradient) {
    const g = ctx.createLinearGradient(pad * SCALE, 0, (pad + textW) * SCALE, 0)
    o.gradient.forEach((c, i) => g.addColorStop(i / (o.gradient!.length - 1), c))
    ctx.fillStyle = g
  } else ctx.fillStyle = o.color ?? C.text
  if (o.shadow !== false) {
    ctx.shadowColor = 'rgba(2, 3, 12, 0.75)'
    ctx.shadowBlur = size * 0.35 * SCALE
    ctx.shadowOffsetY = size * 0.04 * SCALE
  }
  lines.forEach((line, i) => ctx.fillText(line, x, (pad + lh * (i + 0.5)) * SCALE))

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), canvasMaterial(new THREE.CanvasTexture(canvas)))
  if (align === 'left') mesh.geometry.translate(w / 2 - pad, 0, 0)
  if (align === 'right') mesh.geometry.translate(-w / 2 + pad, 0, 0)
  mesh.userData.width = textW
  return mesh
}

/** แผ่นที่วาดเองและวาดใหม่ได้ (ตัวนับ, โค้ดที่กำลังพิมพ์) — วาดใหม่เฉพาะเมื่อ key เปลี่ยน */
export function makeCanvasPlane<S = unknown>(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, state: S) => void,
  opts: { depthWrite?: boolean } = {},
) {
  const canvas = document.createElement('canvas')
  canvas.width = w * SCALE
  canvas.height = h * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  const tex = new THREE.CanvasTexture(canvas)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), canvasMaterial(tex, !opts.depthWrite))
  let lastKey: unknown = Symbol()
  return {
    mesh,
    canvas,
    texture: tex,
    update(state: S, key: unknown = JSON.stringify(state)) {
      if (key === lastKey) return
      lastKey = key
      ctx.clearRect(0, 0, w, h)
      draw(ctx, w, h, state)
      tex.needsUpdate = true
    },
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function gradientFill(ctx: CanvasRenderingContext2D, x0: number, x1: number, colors = GRAD) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c))
  return g
}

/** กรอบหน้าต่าง editor / terminal / browser แบบมืด */
export function drawWindow(ctx: CanvasRenderingContext2D, w: number, h: number, title: string, url = false) {
  roundRect(ctx, 1, 1, w - 2, h - 2, 16)
  ctx.fillStyle = '#0c0e22'
  ctx.fill()
  ctx.strokeStyle = 'rgba(165, 180, 252, 0.28)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = '#14173a'
  ctx.fillRect(0, 0, w, 44)
  ctx.restore()
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.beginPath()
    ctx.arc(24 + i * 20, 22, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.fill()
  })
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  if (url) {
    roundRect(ctx, 96, 9, w - 120, 26, 13)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.font = `500 15px ${MONO}`
    ctx.fillStyle = C.muted
    ctx.fillText(title, 112, 23)
  } else {
    ctx.font = `500 15px ${MONO}`
    ctx.fillStyle = C.muted
    ctx.fillText(title, 96, 23)
  }
}

/** ตั้งความทึบให้ทั้ง object (รวมลูกๆ) — 0 = ซ่อนไปเลย ไม่เปลือง draw call */
export function setOpacity(obj: THREE.Object3D, opacity: number) {
  obj.visible = opacity > 0.002
  if (!obj.visible) return
  obj.traverse((o) => {
    const mats = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
    for (const m of mats ? ([] as THREE.Material[]).concat(mats) : []) {
      m.userData.base ??= m.opacity
      m.opacity = m.userData.base * opacity
    }
  })
}

/* ---------- พื้นหลัง: กรมท่า + แถบแสงแนวนอน + ออโรร่า ---------- */

export function makeBackground() {
  const depth = 9000
  const h = 2 * (DIST + depth) * Math.tan(((FOV / 2) * Math.PI) / 180) * 1.25
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uStreak: { value: 1 }, uAurora: { value: 0 }, uStreakY: { value: 0.08 }, uBright: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uStreak, uAurora, uStreakY, uBright;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(1.78, 1.0);
        // พื้นกรมท่าไล่เข้มขึ้นด้านล่าง
        vec3 col = mix(vec3(0.012, 0.016, 0.05), vec3(0.03, 0.035, 0.11), smoothstep(-0.5, 0.4, p.y));
        // แถบแสงแนวนอน (lens streak) ชมพู → ม่วง → ฟ้า
        float y = p.y - uStreakY;
        float band = exp(-y * y * 140.0) * smoothstep(1.1, 0.0, abs(p.x));
        float core = exp(-y * y * 2600.0) * smoothstep(0.9, 0.0, abs(p.x));
        vec3 streak = mix(vec3(0.95, 0.35, 0.65), vec3(0.45, 0.4, 1.0), smoothstep(-0.6, 0.6, p.x + sin(uTime * 0.2) * 0.1));
        float flicker = 0.92 + 0.08 * sin(uTime * 3.1) * sin(uTime * 1.7);
        col += streak * band * 0.55 * uStreak * flicker + vec3(0.9, 0.85, 1.0) * core * 0.5 * uStreak;
        // ออโรร่า: ม่านแสงแนวตั้งสีเขียวมิ้นต์ / ม่วง
        float rays = noise(vec2(p.x * 9.0 + uTime * 0.15, 0.0)) * noise(vec2(p.x * 23.0 - uTime * 0.1, 3.0));
        float curtain = smoothstep(-0.25, 0.45, p.y) * smoothstep(0.55, 0.05, p.y);
        vec3 aurora = mix(vec3(0.1, 0.75, 0.6), vec3(0.45, 0.3, 0.95), smoothstep(-0.4, 0.5, p.x));
        col += aurora * rays * curtain * 0.9 * uAurora;
        gl_FragColor = vec4(col * uBright, 1.0);
      }
    `,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(h * (W / H), h), mat)
  mesh.position.z = -depth
  mesh.renderOrder = -10
  return { mesh, uniforms: mat.uniforms }
}

/** ดาวเล็กๆ กระพริบ */
export function makeStars(count: number) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const rnd = prng(11)
  for (let i = 0; i < count; i++) {
    pos.set([(rnd() - 0.5) * 9000, (rnd() - 0.5) * 5200, -800 - rnd() * 6000], i * 3)
    seed[i] = rnd()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uSpeed: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime, uSpeed;
      varying float vA;
      void main() {
        vec3 p = position;
        p.z = -6800.0 + mod(p.z + 6800.0 + uSpeed, 6800.0); // บินเข้าหากล้อง
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.0 + seed * 3.0) + seed * 40.0));
        gl_PointSize = (1.2 + seed * 2.6) * (${DIST.toFixed(1)} / -mv.z) * 1.6;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(0.85, 0.88, 1.0), smoothstep(0.5, 0.0, d) * vA * uOpacity);
      }
    `,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  return { points, uniforms: mat.uniforms }
}

/** ภูเขา wireframe ด้านล่าง (คลื่นเลื่อนไปเรื่อยๆ) */
export function makeTerrain() {
  const geo = new THREE.PlaneGeometry(9000, 3600, 90, 36)
  geo.rotateX(-Math.PI / 2)
  const base = (geo.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array
  const mat = new THREE.MeshBasicMaterial({ color: '#4f46e5', wireframe: true, transparent: true, opacity: 0.22, fog: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(0, -620, -1800)
  const attr = geo.attributes.position as THREE.BufferAttribute
  const h = (x: number, z: number) =>
    Math.sin(x * 0.0021 + z * 0.0013) * 70 + Math.sin(x * 0.0057 - z * 0.003) * 40 + Math.max(0, Math.abs(x) - 1400) * 0.22
  return {
    mesh,
    update(t: number) {
      const off = t * 140
      for (let i = 0; i < attr.count; i++) {
        const x = base[i * 3]!
        const z = base[i * 3 + 2]!
        attr.setY(i, h(x, z - off))
      }
      attr.needsUpdate = true
    },
  }
}

/* ---------- โมเดล 3D ---------- */

/** หัวจิ้งจอก (พิกัดแบบโลโก้ 0..32) เป็น THREE.Shape */
function foxShape(s: number) {
  const pts = [[6.5, 6], [13, 11.5], [19, 11.5], [25.5, 6], [24.5, 16.5], [16, 26], [7.5, 16.5]]
  const shape = new THREE.Shape()
  pts.forEach(([x, y], i) => {
    const px = (x! - 16) * s
    const py = -(y! - 16) * s
    if (i === 0) shape.moveTo(px, py)
    else shape.lineTo(px, py)
  })
  shape.closePath()
  return shape
}

function gradientTexture(colors: string[], w = 256, h = 256) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, w, h)
  colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), col))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** ไอคอนแอพ 3D: ลูกบาศก์มุมมนเคลือบเงา + หัวจิ้งจอกนูน */
export function makeAppIcon(size = 300) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(size, size, size * 0.32, 8, size * 0.2),
    new THREE.MeshPhysicalMaterial({
      map: gradientTexture(['#8b5cf6', '#c026d3', '#ec4899']),
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      roughness: 0.28,
      metalness: 0.15,
      transparent: true,
    }),
  )
  g.add(body)
  const s = size / 34
  const fox = new THREE.Mesh(
    new THREE.ExtrudeGeometry(foxShape(s), { depth: size * 0.06, bevelEnabled: true, bevelThickness: size * 0.02, bevelSize: size * 0.012, bevelSegments: 4 }),
    new THREE.MeshPhysicalMaterial({ color: '#ece6ff', clearcoat: 0.6, roughness: 0.38, transparent: true }),
  )
  fox.position.z = size * 0.16
  g.add(fox)
  const dark = new THREE.MeshStandardMaterial({ color: '#2e1065', roughness: 0.3, transparent: true })
  for (const x of [-3.4, 3.4]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 1.3, 24, 16), dark)
    eye.position.set(x * s, -0.4 * s, size * 0.16 + size * 0.085)
    eye.scale.z = 0.5
    g.add(eye)
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(s * 1.1, 24, 16), dark)
  nose.position.set(0, -6.5 * s, size * 0.16 + size * 0.085)
  nose.scale.set(1.2, 0.8, 0.5)
  g.add(nose)
  return g
}

/** โน้ตบุ๊ก 3D: ฐานอลูมิเนียม + คีย์บอร์ด + ฝาจอที่หมุนเปิดได้ (screen = แผ่นภาพบนจอ) */
export function makeLaptop(screen: THREE.Mesh, w = 1000) {
  const d = w * 0.66
  const g = new THREE.Group()
  const alu = new THREE.MeshPhysicalMaterial({ color: '#2b2d48', metalness: 0.85, roughness: 0.32, clearcoat: 0.4, transparent: true })
  const base = new THREE.Mesh(new RoundedBoxGeometry(w, w * 0.028, d, 4, w * 0.02), alu)
  g.add(base)
  // คีย์บอร์ด
  const kb = document.createElement('canvas')
  kb.width = 1024
  kb.height = 420
  const k = kb.getContext('2d')!
  k.fillStyle = '#0d0f22'
  k.fillRect(0, 0, 1024, 420)
  for (let r = 0; r < 5; r++)
    for (let cI = 0; cI < 14; cI++) {
      k.fillStyle = '#1b1e3d'
      k.beginPath()
      k.roundRect(20 + cI * 71.5, 18 + r * 78, 62, 66, 8)
      k.fill()
    }
  const kTex = new THREE.CanvasTexture(kb)
  kTex.colorSpace = THREE.SRGBColorSpace
  const keyboard = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, w * 0.35), new THREE.MeshStandardMaterial({ map: kTex, roughness: 0.6, transparent: true }))
  keyboard.rotation.x = -Math.PI / 2
  keyboard.position.set(0, w * 0.0145, -d * 0.12)
  g.add(keyboard)
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.3, w * 0.16), new THREE.MeshStandardMaterial({ color: '#222443', roughness: 0.35, metalness: 0.5, transparent: true }))
  pad.rotation.x = -Math.PI / 2
  pad.position.set(0, w * 0.0146, d * 0.3)
  g.add(pad)
  // ฝาจอ หมุนรอบขอบหลัง
  const lid = new THREE.Group()
  lid.position.set(0, w * 0.014, -d / 2)
  const lidH = d * 0.98
  const shell = new THREE.Mesh(new RoundedBoxGeometry(w, lidH, w * 0.018, 4, w * 0.02), alu)
  shell.position.set(0, lidH / 2, 0)
  lid.add(shell)
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.985, lidH * 0.975), new THREE.MeshBasicMaterial({ color: '#05060f', transparent: true }))
  bezel.position.set(0, lidH / 2, w * 0.0095)
  lid.add(bezel)
  const sw = w * 0.94
  screen.scale.setScalar(sw / (screen.geometry as THREE.PlaneGeometry).parameters.width)
  screen.position.set(0, lidH / 2 + lidH * 0.01, w * 0.0105)
  lid.add(screen)
  g.add(lid)
  return { group: g, lid, setOpen: (p: number) => (lid.rotation.x = lerp(-Math.PI / 2, 0.22, p)) }
}

/** มือถือ 3D: ขอบโลหะมน + จอ (รูป) + dynamic island */
export function makePhone(img: HTMLImageElement | HTMLCanvasElement | undefined, h = 560) {
  const w = h * 0.47
  const g = new THREE.Group()
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, h * 0.05, 6, w * 0.16),
    new THREE.MeshPhysicalMaterial({ color: '#1d1f38', metalness: 0.9, roughness: 0.25, clearcoat: 1, transparent: true }),
  )
  g.add(frame)
  const sw = w * 0.92
  const sh = h * 0.955
  const sc = document.createElement('canvas')
  sc.width = 600
  sc.height = Math.round((600 * sh) / sw)
  const sctx = sc.getContext('2d')!
  sctx.beginPath()
  sctx.roundRect(0, 0, sc.width, sc.height, 70)
  sctx.clip()
  sctx.fillStyle = '#05060f'
  sctx.fillRect(0, 0, sc.width, sc.height)
  if (img) {
    const iw = 'naturalWidth' in img ? img.naturalWidth : img.width
    const ih = 'naturalHeight' in img ? img.naturalHeight : img.height
    const scale = sc.width / iw
    sctx.drawImage(img, 0, 0, iw, Math.min(ih, sc.height / scale), 0, 0, sc.width, Math.min(sc.height, ih * scale))
  }
  sctx.fillStyle = '#000'
  sctx.beginPath()
  sctx.roundRect(sc.width / 2 - 70, 22, 140, 38, 19)
  sctx.fill()
  const tex = new THREE.CanvasTexture(sc)
  tex.colorSpace = THREE.SRGBColorSpace
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }))
  screen.position.z = h * 0.026
  g.add(screen)
  return g
}

/** หน้าต่างเว็บ 3D: แผ่นกระจกบางๆ + ภาพหน้าจอจริง */
export function makeBrowserWindow(img: HTMLImageElement | undefined, url: string, w = 1100) {
  const iw = img?.naturalWidth ?? 1440
  const ih = img?.naturalHeight ?? 900
  const bodyH = Math.round((w * ih) / iw)
  const h = bodyH + 44
  const plane = makeCanvasPlane(w, h, (ctx) => {
    drawWindow(ctx, w, h, url, true)
    ctx.save()
    roundRect(ctx, 1, 44, w - 2, h - 45, 14)
    ctx.clip()
    if (img) ctx.drawImage(img, 0, 44, w, bodyH)
    ctx.restore()
  }, { depthWrite: true })
  plane.update(null)
  const g = new THREE.Group()
  const slab = new THREE.Mesh(
    new RoundedBoxGeometry(w + 10, h + 10, 14, 4, 14),
    new THREE.MeshPhysicalMaterial({ color: '#1a1d3f', metalness: 0.6, roughness: 0.3, clearcoat: 1, transparent: true }),
  )
  slab.position.z = -8
  g.add(slab, plane.mesh)
  return g
}

/** ชิปฟีเจอร์ 3D (ใช้ในกราฟ node) */
export function makeChip(icon: string, label: string, accent = false) {
  const w = 300
  const h = 76
  const face = makeCanvasPlane(w, h, (ctx) => {
    roundRect(ctx, 1, 1, w - 2, h - 2, 18)
    ctx.fillStyle = accent ? '#1e1b4b' : '#0f1230'
    ctx.fill()
    ctx.strokeStyle = accent ? 'rgba(196, 181, 253, 0.9)' : 'rgba(165, 180, 252, 0.35)'
    ctx.lineWidth = 2
    ctx.stroke()
    roundRect(ctx, 12, 12, 52, 52, 13)
    ctx.fillStyle = accent ? 'rgba(232, 121, 249, 0.25)' : 'rgba(129, 140, 248, 0.16)'
    ctx.fill()
    ctx.font = `30px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff' // emoji สีโดนความโปร่งของ fillStyle ก่อนหน้าด้วย ต้องรีเซ็ตเป็นทึบ
    ctx.fillText(icon, 38, 40)
    ctx.font = `600 ${accent ? 26 : 22}px ${FONT}`
    ctx.fillStyle = C.text
    ctx.textAlign = 'left'
    ctx.fillText(label, 78, 39, w - 92)
  }, { depthWrite: true })
  face.update(null)
  face.mesh.renderOrder = 2
  const g = new THREE.Group()
  const slab = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, 16, 3, 16),
    new THREE.MeshPhysicalMaterial({ color: '#141738', metalness: 0.5, roughness: 0.35, clearcoat: 1, transparent: true }),
  )
  slab.position.z = -9
  g.add(slab, face.mesh)
  return g
}
