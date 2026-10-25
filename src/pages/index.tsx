// GET /   — Landing page
import { Layout, CodeBlock, ExampleGrid } from '@components'

export const cache = 60 // cache ทั้งหน้า 60 วินาที (หน้าแรก)

const heroCode = `
import { Elysia, t } from 'elysia'

new Elysia()
  .get('/', () => 'สวัสดี Elysia 🦊')
  .post('/users', ({ body }) => body, {
    body: t.Object({ name: t.String() })
  })
  .listen(3000)
`

const reasons = [
  {
    icon: '🥟',
    title: 'Bun runtime',
    text: 'ใช้ JavaScriptCore และ HTTP server ที่เขียนด้วย Zig ทำให้สตาร์ทไวและใช้หน่วยความจำน้อย มี TypeScript, test runner และ SQLite มาในตัว',
  },
  {
    icon: '🔬',
    title: 'Static code analysis',
    text: 'Elysia อ่านโค้ด handler ก่อน แล้วทำเฉพาะสิ่งที่ใช้จริง ถ้า handler ไม่แตะ body ก็จะไม่ parse body เลย',
  },
  {
    icon: '⚙️',
    title: 'คอมไพล์ handler ล่วงหน้า',
    text: 'แต่ละ route ถูกประกอบเป็นฟังก์ชันเดียว ไม่ต้องวนผ่าน middleware ทีละชั้นตอนมี request เข้ามา',
  },
  {
    icon: '🌲',
    title: 'Router แบบ radix tree',
    text: 'ค้นหา route ด้วย tree ไม่ใช่วนเทียบ regex ทีละตัว จะมี 10 หรือ 1,000 route ก็เร็วพอๆ กัน',
  },
  {
    icon: '🧪',
    title: 'Validation ที่ถูกคอมไพล์',
    text: 'schema จาก t.Object ถูกแปลงเป็นฟังก์ชันตรวจข้อมูลครั้งเดียว และให้ TypeScript type มาด้วยโดยไม่ต้องเขียนซ้ำ',
  },
  {
    icon: '📦',
    title: 'HTML ล้วน ไม่มี virtual DOM',
    text: 'JSX ถูกแปลงเป็น string ตรงๆ แล้ว htmx ส่งแค่ HTML ชิ้นเล็กๆ ไปมา ไม่ต้องโหลด JavaScript framework ฝั่ง client',
  },
]

const steps = [
  { label: 'ติดตั้ง', code: 'bun install\nbun dev' },
  {
    label: 'src/pages/hello.tsx → /hello',
    code: `import { Layout } from '@components'

export default () => (
  <Layout title="Hello">
    <h1>สวัสดี!</h1>
  </Layout>
)`,
  },
  {
    label: 'src/api/time.ts → /api/time',
    code: `export const GET = () => ({
  now: new Date().toISOString(),
})`,
  },
]

const tech = ['Bun', 'Elysia', 'TypeScript', 'htmx', 'SQLite', 'JSX']

export default function Home() {
  return (
    <Layout path="/" wide>
      <section class="hero">
        <div class="hero-bg" aria-hidden="true">
          <span class="blob blob-1"></span>
          <span class="blob blob-2"></span>
          <span class="blob blob-3"></span>
          <span class="grid-bg"></span>
        </div>
        <div class="container hero-inner">
          <div class="hero-copy">
            <a href="/benchmark" class="pill">
              <span class="pill-dot"></span>
              วัดความเร็วสดได้แล้ว
              <span class="pill-arrow">→</span>
            </a>
            <h1 class="hero-title">
              สร้างเว็บที่ <span class="gradient-text">เร็วสุดขีด</span>
              <br />
              ด้วย Elysia
            </h1>
            <p class="hero-lead">
              Backend และ frontend อยู่ในโปรเจกต์เดียว เขียนด้วย TypeScript มี type ครบทุกจุด เพิ่มไฟล์ก็ได้ route
              ใหม่ ตัว framework จัดการ request ได้หลักแสนครั้งต่อวินาทีต่อ CPU core เดียว
            </p>
            <div class="hero-cta">
              <a href="/examples" class="btn btn-primary btn-lg">
                ดูตัวอย่าง <span aria-hidden="true">→</span>
              </a>
              <a href="/benchmark" class="btn btn-outline btn-lg">
                ⚡ ทดสอบความเร็ว
              </a>
            </div>
            <ul class="tech-chips" aria-label="เทคโนโลยีที่ใช้">
              {tech.map((t) => (
                <li safe>{t}</li>
              ))}
            </ul>
          </div>
          <div class="hero-visual">
            <CodeBlock label="server.ts" code={heroCode} />
            <div class="float-badge float-badge-1">
              <span class="float-icon">✓</span>
              <span>
                <strong>Type-safe</strong>
                <small>body มี type อัตโนมัติ</small>
              </span>
            </div>
            <div class="float-badge float-badge-2">
              <span class="float-icon">⚡</span>
              <span>
                <strong>ไม่มี virtual DOM</strong>
                <small>JSX → HTML string</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="container section">
        <div class="section-head">
          <p class="eyebrow">Live benchmark</p>
          <h2 class="section-title">วัดสดจากเซิร์ฟเวอร์นี้</h2>
          <p class="section-sub">
            ยิง request เข้า Elysia ตรงๆ ใน process (ไม่ผ่าน network) เพื่อดูว่าตัว framework รับได้กี่ครั้งต่อวินาที
          </p>
        </div>
        <div id="live-stats" hx-get="/benchmark/live" hx-trigger="load" hx-swap="outerHTML">
          <div class="stat-row">
            {[1, 2, 3, 4].map(() => (
              <div class="stat skeleton">
                <span class="stat-value">000,000</span>
                <span class="stat-label">กำลังวัด…</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section class="container section">
        <div class="section-head">
          <p class="eyebrow">Why so fast</p>
          <h2 class="section-title">ทำไมถึงเร็ว</h2>
          <p class="section-sub">ความเร็วมาจากหลายชั้นทำงานร่วมกัน ตั้งแต่ runtime จนถึงสิ่งที่ส่งไปให้ browser</p>
        </div>
        <div class="feature-grid">
          {reasons.map((r) => (
            <div class="feature">
              <span class="feature-icon" safe>{r.icon}</span>
              <h3 safe>{r.title}</h3>
              <p class="muted" safe>{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section class="container section">
        <div class="section-head">
          <p class="eyebrow">Quick start</p>
          <h2 class="section-title">เริ่มได้ใน 3 ขั้น</h2>
          <p class="section-sub">ไม่ต้องตั้งค่า router ไม่ต้องลงทะเบียน component สร้างไฟล์แล้วใช้ได้เลย</p>
        </div>
        <ol class="steps">
          {steps.map((s, i) => (
            <li class="step">
              <span class="step-num">{i + 1}</span>
              <CodeBlock label={s.label} code={s.code} />
            </li>
          ))}
        </ol>
      </section>

      <section class="container section">
        <div class="section-head">
          <p class="eyebrow">Examples</p>
          <h2 class="section-title">ตัวอย่างพร้อมใช้</h2>
          <p class="section-sub">ทุกหน้ามี demo ที่ใช้งานได้จริง และแสดงโค้ดของตัวเองไว้ท้ายหน้า</p>
        </div>
        <ExampleGrid />
      </section>

      <section class="container section">
        <div class="cta-band">
          <h2>อยากรู้ว่าเร็วแค่ไหนบนเครื่องคุณ?</h2>
          <p>ยิงโหลดจริงจาก browser แล้วดู req/s, p50, p95, p99 ได้ทันที</p>
          <a href="/benchmark" class="btn btn-light btn-lg">
            เริ่มทดสอบ <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </Layout>
  )
}
