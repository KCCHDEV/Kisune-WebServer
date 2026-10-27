/**
 * บทของวิดีโอสอนใช้ Kitsune — ทุกฉาก, ทุกคำสั่ง, ทุกคำบรรยาย อยู่ในไฟล์นี้
 *
 * โค้ด คำสั่ง และผลลัพธ์ทั้งหมดมาจากโปรเจกต์จริงที่สร้างด้วย  bun create KCCHDEV/Kisune-WebServer my-app
 * (แม่แบบ Minimal) แล้วเพิ่มไฟล์ตามที่สอน · ภาพหน้าจออยู่ใน public/tutorial/
 *
 * เวลาในแต่ละฉากนับจากต้นฉาก (วินาที) · คำสั่งใน terminal ต่อคิวกันเอง ไม่ต้องกำหนดเวลาทีละบรรทัด
 * ข้อความใน terminal ใส่สีได้ด้วย §g เขียว §c ฟ้า §v ม่วง §p ชมพู §y เหลือง §m มิ้นต์ §d จาง §b ตัวหนา §r ปกติ
 */

/* ---------- ชนิดข้อมูล ---------- */

export type Rect = { x: number; y: number; w: number; h: number }
type Timing = { in: number; out?: number }

export type TermStep =
  | { cmd: string; prompt?: string; say?: string; wait?: number }
  | { out: string; say?: string; wait?: number; gap?: number }
  | { ask: string; answer: string; say?: string; wait?: number }

export type Mark = { at: number; until: number; lines: [number, number]; say?: string }
export type Box = { at: number; until: number; x: number; y: number; w: number; h: number; label?: string }

export type Panel = Rect &
  Timing &
  (
    | { kind: 'term'; title: string; prompt: string; steps: TermStep[]; font?: number }
    | { kind: 'code'; file: string; code: string; typeAt?: number; prefill?: number; cps?: number; marks?: Mark[]; font?: number }
    | { kind: 'browser'; url: string; img: string; typeUrl?: boolean; swaps?: { at: number; img: string }[]; boxes?: Box[] }
    | { kind: 'table'; title?: string; rows: [string, string][]; stagger?: number; hl?: { at: number; until: number; row: number }[] }
    | { kind: 'tree'; steps: { at: number; row: number }[] }
    | { kind: 'flow' }
    | { kind: 'intro' }
    | { kind: 'outro' }
  )

export type Scene = { chapter: number; dur: number; panels: Panel[]; captions?: [number, string][] }

/* ---------- บท ---------- */

export const CHAPTERS = [
  { title: 'ติดตั้ง Bun', sub: 'ติดตั้งครั้งเดียว ใช้ได้ตลอด' },
  { title: 'สร้างโปรเจกต์', sub: 'คำสั่งเดียว ได้โปรเจกต์พร้อมใช้' },
  { title: 'รันเซิร์ฟเวอร์', sub: 'bun dev แล้วเปิดเว็บได้เลย' },
  { title: 'โครงสร้างโปรเจกต์', sub: 'แต่ละโฟลเดอร์ทำหน้าที่อะไร' },
  { title: 'สร้างหน้าเว็บ', sub: 'ไฟล์เดียว = หน้าเว็บหนึ่งหน้า' },
  { title: 'ฐานข้อมูล + API', sub: 'SQLite + JSON API พร้อมตรวจข้อมูล' },
  { title: 'htmx', sub: 'หน้าเว็บโต้ตอบได้ โดยไม่ต้องเขียน JavaScript' },
  { title: 'Cache', sub: 'ตอบกลับเร็วระดับไมโครวินาที' },
  { title: 'เทส + ตรวจโค้ด', sub: 'มั่นใจก่อนส่งงาน' },
  { title: 'ขึ้น Production', sub: 'พร้อมใช้งานจริง' },
  { title: 'แม่แบบ Full', sub: 'ตัวอย่างครบ 12 หมวด ไว้ลอกไปใช้' },
]

/** ช่วงเวลาที่การ์ดชื่อบทแสดงตอนต้นบท */
export const CARD = 2.2

/* ---------- ตำแหน่งบนจอ (1920×1080) ---------- */

const FULL = { x: 160, y: 118, w: 1600, h: 792 }
const LEFT = { x: 96, y: 118, w: 856, h: 792 }
const RIGHT = { x: 968, y: 118, w: 856, h: 792 }
const WIDE_L = { x: 96, y: 118, w: 1010, h: 792 }
const TOP = { x: 160, y: 112, w: 1600, h: 472 }
const BOTTOM = { x: 160, y: 596, w: 1600, h: 318 }

/* ---------- โค้ดที่สอน (ตรงกับไฟล์จริงทุกตัวอักษร) ---------- */

const ABOUT = `import { Layout, PageHeader, Card } from '@components'

export const cache = 60 // cache ทั้งหน้า 60 วินาที

export default function About() {
  return (
    <Layout title="เกี่ยวกับเรา" path="/about">
      <PageHeader title="👋 เกี่ยวกับเรา" lead="หน้านี้มาจากไฟล์เดียว" />
      <Card title="My App">
        <p>สร้างด้วย Kitsune — Bun + Elysia + htmx</p>
      </Card>
    </Layout>
  )
}`

const LIB_TODOS = `import { db } from './db'

db.exec(\`CREATE TABLE IF NOT EXISTS todos (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL
)\`)

export type Todo = { id: number; title: string }

export const todos = {
  all: () => db.query('SELECT * FROM todos ORDER BY id DESC').all() as Todo[],
  add: (title: string) =>
    db.query('INSERT INTO todos (title) VALUES (?) RETURNING *').get(title) as Todo,
}`

const API_TODOS = `import { defineRoute, t } from '@core/route'
import { todos } from '../lib/todos'

export const GET = () => todos.all()

export const POST = defineRoute({
  body: t.Object({ title: t.String({ minLength: 1 }) }),
  handler: ({ body }) => todos.add(body.title),
})`

const PAGE_TODOS = `import { Layout, PageHeader, Card, Button } from '@components'
import { defineRoute, t } from '@core/route'
import { todos, type Todo } from '../lib/todos'

const Item = ({ todo }: { todo: Todo }) => (
  <li class="row" safe>{todo.title}</li>
)

export default function Todos() {
  return (
    <Layout title="งานของฉัน" path="/todos">
      <PageHeader title="✅ งานของฉัน" />
      <Card>
        <form class="form" hx-post="/todos" hx-target="#list"
              hx-swap="afterbegin" hx-on--after-request="this.reset()">
          <input name="title" placeholder="ต้องทำอะไร?" required />
          <Button type="submit">เพิ่ม</Button>
        </form>
      </Card>
      <ul id="list" class="list">
        {todos.all().map((todo) => <Item todo={todo} />)}
      </ul>
    </Layout>
  )
}

export const POST = defineRoute({
  body: t.Object({ title: t.String({ minLength: 1 }) }),
  handler: ({ body }) => <Item todo={todos.add(body.title)} />,
})`
const PAGE_TODOS_SPLIT = PAGE_TODOS.indexOf('export const POST')

const CACHE_API = `import { cache } from '@core/cache'

cache.set('user:1', user, { ttl: 60 })   // ttl = วินาที
cache.get('user:1')
cache.incr('views')
cache.delPattern('user:*')

// คำนวณครั้งเดียวแล้วจำไว้ 30 วินาที
const list = await cache.remember('todos', 30, () => todos.all())`

const ENV = `# .env — สร้างให้แล้วตอน bun create (ค่าสุ่ม)
PORT=3000
DB_FILE=data.sqlite

# ก่อนขึ้นจริง: ใช้ค่าสุ่มยาวๆ และเก็บเป็นความลับ
COOKIE_SECRET=x9Kq…สุ่มให้แล้ว
ADMIN_KEY=Vb3r…สุ่มให้แล้ว

# หน่วยความจำสูงสุดของ cache (MB)
CACHE_MAX_MB=128`

/* ---------- ผลลัพธ์ใน terminal (จากการรันจริง) ---------- */

const PS = '§mPS C:\\dev>§r '
const PS_APP = '§mPS C:\\dev\\my-app>§r '

const SETUP_HEADER = `§d  … ดาวน์โหลดแม่แบบจาก GitHub§r

  🦊 §bKitsune§r §d· ว่องไว แสนกล ครบในตัวเดียว§r
  §dตั้งค่าโปรเจกต์ใหม่ · by§r §vYurachi Studio§r
`

const SETUP_FILES = `
§v◆§r §bจัดเตรียมไฟล์§r
  §g✓§r ตัดวิดีโอ trailer + คลิปสอนออก (ลด dependency ได้หลายตัว)
  §g✓§r ใช้แม่แบบ Minimal: หน้าแรก + /api/hello + /api/health + เทส
  §g✓§r ตั้งชื่อแอพเป็น My App
  §g✓§r อัปเดต package.json
  §g✓§r สร้าง .env พร้อม COOKIE_SECRET และ ADMIN_KEY แบบสุ่ม
  §g✓§r สร้าง README.md`

const SETUP_DONE = `
§v◆§r §bติดตั้ง dependencies§r
§g47 packages installed§r §d[4.75s]§r

  §g●§r §bMy App พร้อมแล้ว!§r §d(minimal)§r

  §dเริ่มเลย:§r
    §ccd§r my-app
    §cbun dev§r          §d→ http://localhost:3000§r`

const RULE = '§d' + '─'.repeat(64) + '§r'

const DEV_BANNER = `§d$ bun --watch index.tsx§r

${RULE}
  🦊 §bMy App§r  §d·§r  §ydev§r  §d·  Bun 1.4.4  ·§r  §vYurachi Studio§r
  §dเว็บ§r        §chttp://localhost:3000§r
  §dAPI doc§r    §chttp://localhost:3000/openapi§r
  §dcache§r      128 MB §d(in-memory LRU · ตั้งด้วย CACHE_MAX_MB)§r
  §droute§r      6 ทั้งหมด  §d·§r  หน้าเว็บ 1  §d·§r  API 5
${RULE}`

const DEV_ROUTES = `
§g[GET]§r §d5 route§r
   §ppage§r  /                 §y⚡60s§r §dsrc/pages/index.tsx§r
   §capi§r   /api/cache        §dsrc/api/cache.ts§r
   §capi§r   /api/health       §dsrc/api/health.ts§r
   §capi§r   /api/hello        §dsrc/api/hello.ts§r
   §capi§r   /api/admin/stats  §dsrc/api/admin/stats.ts§r

§d19:52:31§r §g[GET   ] 200§r   §d4.1ms§r  /
§d19:52:31§r §g[GET   ] 200§r   §d212µs§r  /  §ycache§r`

/* ---------- ฉาก ---------- */

export const SCENES: Scene[] = [
  /* ===== เปิด ===== */
  {
    chapter: 0,
    dur: 10,
    panels: [{ kind: 'intro', ...FULL, in: 0 }],
    captions: [
      [0.6, 'คลิปนี้สอนใช้ Kitsune ตั้งแต่ติดตั้ง จนขึ้นใช้งานจริง'],
      [5, 'ทำตามได้ทีละขั้น — 11 บท ประมาณ 6 นาที'],
    ],
  },

  /* ===== 1) ติดตั้ง Bun ===== */
  {
    chapter: 1,
    dur: 17.5,
    panels: [
      {
        kind: 'term',
        ...FULL,
        in: 2,
        title: 'Windows PowerShell',
        prompt: PS,
        steps: [
          { cmd: 'powershell -c "irm bun.sh/install.ps1 | iex"', say: 'Kitsune ทำงานบน Bun — บน Windows ติดตั้งด้วยคำสั่งนี้ใน PowerShell' },
          {
            out: `§d######################################################################## 100.0%§r
§g✓§r Bun was installed successfully!
§dThe binary is located at C:\\Users\\you\\.bun\\bin\\bun.exe§r
§dRestart your terminal to use bun§r
`,
            gap: 0.25,
          },
          { cmd: '# macOS / Linux ใช้คำสั่งนี้แทน', prompt: '§m~ $§r ', say: 'ถ้าใช้ macOS หรือ Linux ใช้ curl แทน (ติดตั้งแบบเดียวกัน)' },
          { cmd: 'curl -fsSL https://bun.sh/install | bash', prompt: '§m~ $§r ' },
          { out: '§g✓§r bun was installed successfully to §c~/.bun/bin/bun§r\n', gap: 0.2 },
          { cmd: 'bun --version', say: 'ปิดแล้วเปิด terminal ใหม่ แล้วเช็กเวอร์ชัน — ต้องเป็น 1.4 ขึ้นไป', wait: 0.6 },
          { out: '§b1.4.4§r' },
        ],
      },
    ],
  },

  /* ===== 2) สร้างโปรเจกต์ ===== */
  {
    chapter: 2,
    dur: 23,
    panels: [
      {
        kind: 'term',
        ...FULL,
        in: 2,
        title: 'Windows PowerShell — C:\\dev',
        prompt: PS,
        steps: [
          { cmd: 'bun create KCCHDEV/Kisune-WebServer my-app', say: 'สร้างโปรเจกต์ใหม่ด้วยคำสั่งเดียว — แบบเดียวกับ create-next-app' },
          { out: SETUP_HEADER, gap: 0.12 },
          { ask: '§c?§r §bชื่อแอพ (แสดงในเว็บ)§r §d(My App)§r ', answer: '', say: 'ตั้งชื่อแอพ — จะไปขึ้นที่เมนู, title และ footer (กด Enter ใช้ค่าในวงเล็บ)' },
          {
            out: `§c?§r §bเลือกแม่แบบ§r
  §v1§r. Full §d— ตัวอย่างครบ 12 หมวด + benchmark + cache demo§r
  §v2§r. Minimal §d— โครงเปล่า สะอาด พร้อมเริ่มงานจริง§r`,
            gap: 0.15,
            say: 'เลือกแม่แบบ: Full = มีตัวอย่างครบไว้ศึกษา · Minimal = โครงเปล่าไว้เริ่มงานจริง',
          },
          { ask: '  §dเลือก 1-2 (1)§r ', answer: '2', wait: 0.8 },
          { ask: '§c?§r §bติดตั้ง dependencies ตอนนี้เลยไหม§r §d(Y/n)§r ', answer: 'y' },
          { out: SETUP_FILES, gap: 0.22, say: 'ระบบจัดเตรียมให้หมด: ตั้งชื่อ, สร้าง .env พร้อมรหัสลับแบบสุ่ม, README' },
          { out: SETUP_DONE, gap: 0.15, wait: 0.4, say: 'ติดตั้ง dependency และสร้าง git ให้เลย — พร้อมเริ่มงานทันที' },
        ],
      },
    ],
  },

  /* ===== 3) รันเซิร์ฟเวอร์ ===== */
  {
    chapter: 3,
    dur: 23,
    panels: [
      {
        kind: 'term',
        ...WIDE_L,
        in: 2,
        out: 13,
        title: 'Windows PowerShell — my-app',
        prompt: PS,
        font: 21,
        steps: [
          { cmd: 'cd my-app' },
          { cmd: 'bun dev', prompt: PS_APP, say: 'เข้าโฟลเดอร์โปรเจกต์ แล้วสั่ง bun dev (โหมดพัฒนา)' },
          { out: DEV_BANNER, gap: 0.08, say: 'console บอกที่อยู่เว็บ, เอกสาร API และขนาด cache' },
          { out: DEV_ROUTES, gap: 0.1, wait: 0.6, say: 'มีตาราง route บอกว่า URL ไหนมาจากไฟล์ไหน + log ทุก request' },
        ],
      },
      {
        kind: 'browser',
        x: 260,
        y: 118,
        w: 1400,
        h: 792,
        in: 13.2,
        url: 'localhost:3000',
        img: 'home',
        typeUrl: true,
      },
    ],
    captions: [
      [13.6, 'เปิด http://localhost:3000 — แอพของเราพร้อมใช้งานแล้ว 🎉'],
      [18.6, 'แก้ไฟล์แล้วกดบันทึก เซิร์ฟเวอร์รีโหลดเองทันที'],
    ],
  },

  /* ===== 4) โครงสร้างโปรเจกต์ ===== */
  {
    chapter: 4,
    dur: 24,
    panels: [
      {
        kind: 'tree',
        ...FULL,
        in: 1.9,
        steps: [
          { at: 2.6, row: 7 },
          { at: 5.4, row: 4 },
          { at: 8.2, row: 5 },
          { at: 10.8, row: 6 },
          { at: 13.2, row: 2 },
          { at: 15.6, row: 1 },
          { at: 18, row: 8 },
          { at: 20.4, row: 9 },
        ],
      },
    ],
    captions: [
      [2.6, 'src/pages — หน้าเว็บ: ชื่อไฟล์คือ URL'],
      [5.4, 'src/api — JSON API: ได้ /api/... อัตโนมัติ'],
      [8.2, 'src/components — ชิ้นส่วน UI ใช้ซ้ำได้ทุกหน้า'],
      [10.8, 'src/lib — ฐานข้อมูลและฟังก์ชันช่วย'],
      [13.2, 'public — ไฟล์ static เช่น CSS รูปภาพ'],
      [15.6, 'core — ระบบเบื้องหลังของ Kitsune (ปกติไม่ต้องแตะ)'],
      [18, 'tests — เทสด้วย bun test'],
      [20.4, '.env — ค่าตั้งค่าและรหัสลับ (ห้าม commit)'],
    ],
  },

  /* ===== 5) สร้างหน้าเว็บ ===== */
  {
    chapter: 5,
    dur: 24,
    panels: [
      {
        kind: 'code',
        ...LEFT,
        in: 1.9,
        file: 'src/pages/about.tsx',
        code: ABOUT,
        typeAt: 2.6,
        cps: 48,
        font: 19,
        marks: [
          { at: 11.2, until: 14.4, lines: [1, 1], say: 'Layout, PageHeader, Card — import จาก @components ได้เลย' },
          { at: 14.4, until: 17.6, lines: [3, 3], say: 'export const cache = 60 → เก็บทั้งหน้าไว้ในหน่วยความจำ 60 วินาที' },
          { at: 17.6, until: 24, lines: [5, 14], say: 'export default = หน้าเว็บ (GET /about) เขียนด้วย JSX' },
        ],
      },
      { kind: 'browser', ...RIGHT, in: 18.4, url: 'localhost:3000/about', img: 'about', typeUrl: true },
    ],
    captions: [
      [2.6, 'สร้างไฟล์ src/pages/about.tsx — ได้หน้า /about ทันที ไม่ต้องตั้ง route'],
      [20.6, 'บันทึกไฟล์ แล้วเปิด /about — หน้าใหม่พร้อมเมนูและธีมครบ'],
    ],
  },
  {
    chapter: 5,
    dur: 11,
    panels: [
      {
        kind: 'table',
        ...FULL,
        in: 0.2,
        title: 'ชื่อไฟล์ = URL',
        stagger: 0.6,
        rows: [
          ['src/pages/index.tsx', '/'],
          ['src/pages/about.tsx', '/about'],
          ['src/pages/users/[id].tsx', '/users/:id   (ได้ params.id)'],
          ['src/pages/docs/[...slug].tsx', '/docs/*'],
          ['src/pages/(shop)/cart.tsx', '/cart   (วงเล็บ = จัดกลุ่ม ไม่ขึ้นใน URL)'],
          ['src/api/todos.ts', '/api/todos'],
          ['_ชื่อไฟล์.ts', 'ขึ้นต้นด้วย _ = ไม่เป็น route'],
        ],
      },
    ],
    captions: [
      [0.4, 'กฎเดียวที่ต้องจำ: ตำแหน่งไฟล์ = URL'],
      [5.2, '[id] = ค่าใน URL · (กลุ่ม) = จัดโฟลเดอร์ · _ไฟล์ = ไฟล์ช่วย ไม่เป็นหน้า'],
    ],
  },

  /* ===== 6) ฐานข้อมูล + API ===== */
  {
    chapter: 6,
    dur: 28.5,
    panels: [
      {
        kind: 'code',
        ...TOP,
        in: 1.9,
        file: 'src/lib/todos.ts',
        code: LIB_TODOS,
        typeAt: 2.5,
        cps: 58,
        font: 17,
        marks: [
          { at: 9.5, until: 13, lines: [3, 6], say: 'สร้างตาราง todos — ใช้ bun:sqlite ที่มากับ Bun ไม่ต้องติดตั้งเพิ่ม' },
          { at: 13, until: 28.5, lines: [10, 14], say: 'ฟังก์ชันอ่าน/เขียนข้อมูล ใช้ได้ทั้งจาก API และหน้าเว็บ' },
        ],
      },
      {
        kind: 'code',
        ...BOTTOM,
        in: 14.4,
        file: 'src/api/todos.ts',
        code: API_TODOS,
        typeAt: 15,
        cps: 46,
        font: 16.5,
        marks: [
          { at: 21, until: 24.6, lines: [4, 4], say: 'export const GET → GET /api/todos (คืน object = ตอบเป็น JSON)' },
          { at: 24.6, until: 28.5, lines: [6, 9], say: 'POST + t.Object → ตรวจข้อมูลให้ และ body มี type อัตโนมัติ' },
        ],
      },
    ],
    captions: [[2.5, 'เริ่มจากฐานข้อมูล: สร้าง src/lib/todos.ts']],
  },
  {
    chapter: 6,
    dur: 15.5,
    panels: [
      {
        kind: 'term',
        ...FULL,
        in: 0.2,
        title: 'Terminal — ทดสอบ API',
        prompt: '§m❯§r ',
        steps: [
          { cmd: 'curl localhost:3000/api/todos', say: 'ลองเรียก API ด้วย curl — ยังไม่มีข้อมูล ได้ array ว่าง' },
          { out: '§y[]§r\n' },
          {
            cmd: `curl localhost:3000/api/todos -H "content-type: application/json" -d '{"title":"ซื้อกาแฟ"}'`,
            say: 'POST ข้อมูลใหม่ → บันทึกลง SQLite แล้วตอบกลับเป็น JSON',
          },
          { out: '{§c"id"§r:§y1§r,§c"title"§r:§g"ซื้อกาแฟ"§r}\n' },
          { cmd: `curl localhost:3000/api/todos -H "content-type: application/json" -d '{"title":""}'`, say: 'ส่งข้อมูลผิด (title ว่าง) → ได้ 422 พร้อมบอกว่าช่องไหนผิด' },
          {
            out: `§d# HTTP 422§r
{§c"error"§r:§g"ข้อมูลไม่ถูกต้อง"§r,§c"issues"§r:[{§c"field"§r:§g"title"§r,
  §c"message"§r:§g"Expected string length greater or equal to 1"§r}]}`,
            gap: 0.2,
          },
        ],
      },
    ],
  },
  {
    chapter: 6,
    dur: 9,
    panels: [
      {
        kind: 'browser',
        x: 260,
        y: 118,
        w: 1400,
        h: 792,
        in: 0.2,
        url: 'localhost:3000/openapi',
        img: 'openapi',
        boxes: [{ at: 2.4, until: 9, x: 10, y: 190, w: 268, h: 60, label: 'API ใหม่ของเรา' }],
      },
    ],
    captions: [
      [0.4, 'เอกสาร API สร้างให้อัตโนมัติที่ /openapi'],
      [4.6, 'ทุก route ที่เพิ่ม ขึ้นที่นี่เอง พร้อมปุ่มทดลองยิง request'],
    ],
  },

  /* ===== 7) htmx ===== */
  {
    chapter: 7,
    dur: 28,
    panels: [
      {
        kind: 'code',
        ...FULL,
        in: 1.9,
        file: 'src/pages/todos.tsx',
        code: PAGE_TODOS.slice(0, PAGE_TODOS_SPLIT).trimEnd(),
        typeAt: 2.5,
        cps: 72,
        font: 20,
        marks: [
          { at: 14, until: 17.2, lines: [5, 7], say: 'Item = component เล็กๆ แสดงงาน 1 แถว · safe = กัน XSS ให้' },
          { at: 17.2, until: 24, lines: [14, 18], say: 'ฟอร์มนี้ส่งด้วย htmx: hx-post ส่งไปที่ /todos แล้วเอาผลมาใส่ใน #list' },
          { at: 24, until: 28, lines: [20, 22], say: 'ตอนเปิดหน้า แสดงงานทั้งหมดจากฐานข้อมูล' },
        ],
      },
    ],
    captions: [[2.5, 'สร้างหน้า /todos — ฟอร์มเพิ่มงาน + รายการงาน']],
  },
  {
    chapter: 7,
    dur: 10.5,
    panels: [
      {
        kind: 'code',
        ...FULL,
        in: 0.2,
        file: 'src/pages/todos.tsx',
        code: PAGE_TODOS,
        prefill: PAGE_TODOS_SPLIT,
        typeAt: 0.8,
        cps: 40,
        font: 20,
        marks: [{ at: 5.2, until: 10.5, lines: [27, 30], say: 'POST /todos ตอบกลับเป็น HTML แค่แถวเดียว (<Item />) ไม่ใช่ JSON' }],
      },
    ],
    captions: [[0.8, 'ไฟล์เดียวกันรับ POST ได้ด้วย — export const POST']],
  },
  {
    chapter: 7,
    dur: 17,
    panels: [{ kind: 'flow', ...FULL, in: 0.2 }],
    captions: [
      [0.5, 'htmx ทำงานแบบนี้: กดปุ่ม → ส่งฟอร์มไปเซิร์ฟเวอร์'],
      [4.6, 'เซิร์ฟเวอร์บันทึกลงฐานข้อมูล แล้วส่ง HTML แถวใหม่กลับมา'],
      [8.6, 'htmx แทรกแถวนั้นไว้บนสุดของ #list — ไม่รีโหลดทั้งหน้า'],
      [12.6, 'ทั้งหมดนี้ใช้แค่ attribute hx-* ไม่ต้องเขียน JavaScript สักบรรทัด'],
    ],
  },
  {
    chapter: 7,
    dur: 10,
    panels: [
      {
        kind: 'browser',
        x: 260,
        y: 118,
        w: 1400,
        h: 792,
        in: 0.2,
        url: 'localhost:3000/todos',
        img: 'todos-empty',
        swaps: [{ at: 2.6, img: 'todos' }],
        boxes: [
          { at: 3.2, until: 6.6, x: 244, y: 306, w: 952, h: 168, label: 'แถวใหม่โผล่ทันที' },
          { at: 6.6, until: 10, x: 1104, y: 210, w: 72, h: 52, label: 'กดเพิ่ม' },
        ],
      },
    ],
    captions: [
      [0.4, 'ลองใช้จริงที่ /todos'],
      [3.2, 'พิมพ์แล้วกดเพิ่ม — รายการอัปเดตทันที และข้อมูลอยู่ในฐานข้อมูลแล้ว'],
    ],
  },

  /* ===== 8) Cache ===== */
  {
    chapter: 8,
    dur: 17.5,
    panels: [
      {
        kind: 'term',
        ...FULL,
        in: 1.9,
        title: 'Terminal — ความเร็วของ cache',
        prompt: '§m❯§r ',
        steps: [
          { cmd: 'curl -sI localhost:3000/about', say: 'หน้า /about มี export const cache = 60 — ลองขอหน้าดู 2 ครั้ง' },
          { out: '§dHTTP/1.1 200 OK§r\n§bx-cache: §yMISS§r\n§bServer-Timing:§r app;dur=§y5.498§r §d(ms)§r\n', gap: 0.15, say: 'ครั้งแรก MISS: render หน้าใหม่ ใช้เวลา 5.5 ms' },
          { cmd: 'curl -sI localhost:3000/about', wait: 1.2 },
          {
            out: '§dHTTP/1.1 200 OK§r\n§bx-cache: §gHIT§r\n§bServer-Timing:§r app;dur=§g0.068§r §d(ms)§r',
            gap: 0.15,
            say: 'ครั้งต่อไป HIT: ตอบจากหน่วยความจำใน 0.07 ms — เร็วขึ้นราว 80 เท่า',
          },
        ],
      },
    ],
    captions: [[13.6, 'หน้าที่ cache ไว้ยังถูกบีบอัด brotli/gzip ให้ด้วย ส่งเร็ว ประหยัด bandwidth']],
  },
  {
    chapter: 8,
    dur: 15,
    panels: [
      {
        kind: 'code',
        ...FULL,
        in: 0.2,
        file: 'ใช้ cache เองในโค้ด',
        code: CACHE_API,
        font: 24,
        marks: [
          { at: 1, until: 5, lines: [3, 6], say: 'ใช้ cache เองได้ทุกที่ คำสั่งคล้าย Redis: set · get · incr · delPattern' },
          { at: 5, until: 10, lines: [8, 9], say: 'cache.remember: คำนวณครั้งเดียวแล้วจำไว้ — request ที่มาพร้อมกันรอผลเดียวกัน' },
          { at: 10, until: 15, lines: [1, 1], say: 'จำกัดไว้ 128 MB — เต็มแล้วไล่ตัวที่ไม่ได้ใช้นานที่สุดออกเอง (LRU)' },
        ],
      },
    ],
  },

  /* ===== 9) เทส + ตรวจโค้ด ===== */
  {
    chapter: 9,
    dur: 14,
    panels: [
      {
        kind: 'term',
        ...FULL,
        in: 1.9,
        title: 'Windows PowerShell — my-app',
        prompt: PS_APP,
        steps: [
          { cmd: 'bun test', say: 'bun test — รันเทสทั้งหมด (มีเทสตัวอย่างให้แล้วใน tests/)' },
          {
            out: `§dbun test v1.4.4§r

tests/app.test.ts:
§g✓§r แอพ > หน้าแรก render ได้ และถูก cache
§g✓§r แอพ > GET /api/hello ตอบ JSON
§g✓§r แอพ > guard กัน /api/admin ถ้าไม่มี key
§d  …§r
tests/cache.test.ts:
§g✓§r MemoryCache > ไล่ตัวที่ไม่ได้ใช้นานที่สุดออกเมื่อเกิน limit (LRU)
§g✓§r MemoryCache > remember() เรียก fn ครั้งเดียวแม้มี request พร้อมกัน
§d  …§r

 §g12 pass§r
 §d0 fail§r
§dRan 12 tests across 2 files. [362.00ms]§r
`,
            gap: 0.09,
          },
          { cmd: 'bun run check', say: 'bun run check — ตรวจ TypeScript และหาช่องโหว่ XSS ทั้งโปรเจกต์' },
          { out: '§d$ tsc --noEmit && xss-scan§r\n§gNo XSS vulnerabilities found in 39 files!§r', gap: 0.5 },
        ],
      },
    ],
    captions: [[10, 'ผ่านทั้งคู่ = พร้อมส่งงาน · ใน GitHub ก็มี CI รันให้ทุกครั้งที่ push']],
  },

  /* ===== 10) Production ===== */
  {
    chapter: 10,
    dur: 20.5,
    panels: [
      {
        kind: 'code',
        ...LEFT,
        in: 1.9,
        file: '.env',
        code: ENV,
        font: 19,
        marks: [{ at: 2.4, until: 9, lines: [5, 7], say: 'ก่อนขึ้นจริง ตั้ง COOKIE_SECRET และ ADMIN_KEY เป็นค่าลับของเราเอง' }],
      },
      {
        kind: 'term',
        ...RIGHT,
        in: 8.6,
        title: 'Server',
        prompt: '§m❯§r ',
        font: 19,
        steps: [
          { cmd: 'bun start', say: 'bun start = โหมด production (เร็วที่สุด ไม่ watch ไฟล์)' },
          { out: `  🦊 §bMy App§r  §d·§r  §gproduction§r\n  §dเว็บ§r  §chttp://localhost:3000§r\n`, gap: 0.15 },
          { cmd: 'bun run start:cluster', say: 'start:cluster = รันทุก CPU core (บน Linux)', wait: 1.6 },
        ],
      },
    ],
    captions: [[16.4, 'แนะนำวาง Caddy หรือ nginx ไว้ด้านหน้าเพื่อทำ HTTPS']],
  },

  /* ===== 11) แม่แบบ Full ===== */
  {
    chapter: 11,
    dur: 16,
    panels: [
      { kind: 'browser', x: 96, y: 150, w: 856, h: 700, in: 1.9, url: 'localhost:3000/examples', img: 'examples' },
      { kind: 'browser', x: 968, y: 150, w: 856, h: 700, in: 3.2, url: 'localhost:3000/benchmark', img: 'benchmark' },
    ],
    captions: [
      [2, 'เลือกแม่แบบ Full ตอนสร้างโปรเจกต์ จะได้ตัวอย่างครบ 12 หมวด'],
      [7, 'htmx, WebSocket, SSE, Login + Guard, อัปโหลดไฟล์, CRUD, Cache และอื่นๆ'],
      [11.5, 'พร้อมหน้าทดสอบความเร็ว — เปิดดูโค้ดแล้วลอกไปใช้ได้เลย'],
    ],
  },

  /* ===== ปิด ===== */
  {
    chapter: 0,
    dur: 13,
    panels: [{ kind: 'outro', ...FULL, in: 0 }],
    captions: [
      [0.5, 'สรุปคำสั่งที่ใช้บ่อย — เก็บไว้ดูได้เลย'],
      [7, 'ขอบคุณที่รับชม · Kitsune โดย Yurachi Studio 🦊'],
    ],
  },
]

/* ---------- คำนวณเวลาจริงของทุกอย่าง (ทำครั้งเดียว) ---------- */

export const TYPE_CPS = 24 // ความเร็วพิมพ์คำสั่งใน terminal (ตัวอักษร/วินาที)
export const ANSWER_CPS = 8
/** คำบรรยายแต่ละอันแสดงอย่างน้อยกี่วินาทีก่อนขั้นถัดไปจะเริ่ม */
const MIN_SAY = 3.4

export type TermEvent =
  | { kind: 'cmd'; t: number; end: number; prompt: string; text: string }
  | { kind: 'out'; t: number; text: string }
  | { kind: 'ask'; t: number; typeAt: number; end: number; text: string; answer: string }

/** แปลงขั้นตอนใน terminal เป็นเหตุการณ์ที่มีเวลาแน่นอน (เวลานับจากต้นฉาก) + คำบรรยายจาก say */
export function resolveTerm(panel: Extract<Panel, { kind: 'term' }>) {
  const events: TermEvent[] = []
  const says: [number, string][] = []
  let t = panel.in + 0.8
  let lastSay = -Infinity
  for (const step of panel.steps) {
    t += step.wait ?? 0
    if (step.say) {
      t = Math.max(t, lastSay + MIN_SAY) // ให้อ่านคำบรรยายก่อนหน้าทันก่อนไปขั้นต่อไป
      says.push([t, step.say])
      lastSay = t
    }
    if ('cmd' in step) {
      const end = t + step.cmd.length / TYPE_CPS
      events.push({ kind: 'cmd', t, end, prompt: step.prompt ?? panel.prompt, text: step.cmd })
      t = end + 0.55
    } else if ('ask' in step) {
      const typeAt = t + 0.7
      const end = typeAt + step.answer.length / ANSWER_CPS + 0.25
      events.push({ kind: 'ask', t, typeAt, end, text: step.ask, answer: step.answer })
      t = end + 0.35
    } else {
      const lines = step.out.split('\n')
      const gap = step.gap ?? 0.05
      lines.forEach((text, i) => events.push({ kind: 'out', t: t + i * gap, text }))
      t += lines.length * gap + 0.45
    }
  }
  return { events, says, end: t }
}

const termCache = new WeakMap<object, ReturnType<typeof resolveTerm>>()
export const termOf = (p: Extract<Panel, { kind: 'term' }>) => {
  let r = termCache.get(p)
  if (!r) termCache.set(p, (r = resolveTerm(p)))
  return r
}

export const TIMELINE = (() => {
  let start = 0
  return SCENES.map((s) => {
    const item = { ...s, start, end: start + s.dur }
    start += s.dur
    return item
  })
})()
export const DURATION = TIMELINE[TIMELINE.length - 1]!.end

/** เวลาเริ่มของแต่ละบท (ใช้กับแถบความคืบหน้า และเสียงกระดิ่งตอนขึ้นบทใหม่) */
export const CHAPTER_STARTS = CHAPTERS.map((_, i) => TIMELINE.find((s) => s.chapter === i + 1)!.start)

/** คำบรรยายทั้งหมด (เวลาจริง) — แสดงจนถึงคำถัดไป หรือจนจบฉาก */
export const CAPTIONS = TIMELINE.flatMap((s) => {
  const list: [number, string][] = [...(s.captions ?? [])]
  for (const p of s.panels) {
    if (p.kind === 'term') list.push(...termOf(p).says)
    if (p.kind === 'code') for (const m of p.marks ?? []) if (m.say) list.push([m.at, m.say])
  }
  return list
    .sort((a, b) => a[0] - b[0])
    .map(([at, text], i, all) => ({ start: s.start + at, end: s.start + (all[i + 1]?.[0] ?? s.dur), text }))
})

/** เวลาของการกดแป้นทุกครั้ง (ใช้ทำเสียงพิมพ์) · enter = กด Enter */
export const KEYSTROKES = TIMELINE.flatMap((s) =>
  s.panels.flatMap((p) => {
    const keys: { t: number; enter?: boolean }[] = []
    if (p.kind === 'term')
      for (const e of termOf(p).events) {
        if (e.kind === 'cmd') {
          for (let i = 0; i < e.text.length; i++) if (e.text[i] !== ' ') keys.push({ t: s.start + e.t + i / TYPE_CPS })
          keys.push({ t: s.start + e.end + 0.2, enter: true })
        }
        if (e.kind === 'ask') {
          for (let i = 0; i < e.answer.length; i++) keys.push({ t: s.start + e.typeAt + i / ANSWER_CPS })
          keys.push({ t: s.start + e.end, enter: true })
        }
      }
    if (p.kind === 'code' && p.typeAt !== undefined) {
      const cps = p.cps ?? 50
      const from = p.prefill ?? 0
      // เสียงพิมพ์โค้ดเบาและห่างกว่า (ทุก 2 ตัวอักษร) ไม่ให้รก
      for (let i = from; i < p.code.length; i += 2) if (p.code[i]!.trim()) keys.push({ t: s.start + p.typeAt + (i - from) / cps })
    }
    if (p.kind === 'browser' && p.typeUrl) for (let i = 0; i < p.url.length; i++) keys.push({ t: s.start + p.in + 0.5 + i / 30 })
    return keys
  }),
).sort((a, b) => a.t - b.t)
