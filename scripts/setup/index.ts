#!/usr/bin/env bun
/**
 * 🦊 Kitsune setup — เปลี่ยน repo นี้ให้เป็นโปรเจกต์ใหม่ของคุณ (แบบ create-next-app)
 *
 * เรียกอัตโนมัติจาก:
 *   bun create KCCHDEV/Kisune-WebServer my-app     (ผ่าน "bun-create" ใน package.json)
 *   bunx create-kitsune my-app                      (packages/create-kitsune)
 * หรือรันเองในโฟลเดอร์ที่ clone มา:
 *   bun run setup
 *
 * ตัวเลือก (ข้ามคำถาม):
 *   --yes / -y               ใช้ค่าเริ่มต้นทั้งหมด
 *   --name "My App"          ชื่อแอพที่แสดงในเว็บ
 *   --template full|minimal  full = ตัวอย่างครบ + benchmark · minimal = โครงเปล่าพร้อมเริ่มงาน
 *   --trailer / --no-trailer เก็บวิดีโอ trailer (WebGL) ไว้ไหม (เฉพาะ full)
 *   --no-install --no-git    ไม่ติดตั้ง dependency / ไม่ git init
 *   --from-create            ถูกเรียกจาก bun create (bun จัดการ git ให้เอง)
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'

const ROOT = resolve(import.meta.dir, '../..')
const REPO = 'https://github.com/KCCHDEV/Kisune-WebServer'
/** ไฟล์ของแม่แบบ minimal (*.tpl — ไม่ถูก type check / ไม่ถูก bun test หยิบไปรัน) */
const MINIMAL_DIR = join(import.meta.dir, 'minimal')

const ENV_EXAMPLE = `# พอร์ตของเซิร์ฟเวอร์
PORT=3000

# ไฟล์ฐานข้อมูล SQLite
DB_FILE=data.sqlite

# ใช้เซ็น cookie — ต้องเป็นค่าสุ่มยาวๆ และเก็บเป็นความลับ
COOKIE_SECRET=change-me

# รหัสสำหรับ /api/admin/* (ส่งใน header x-api-key)
ADMIN_KEY=change-me

# หน่วยความจำสูงสุดของ in-memory cache (MB)
CACHE_MAX_MB=128
`

const MINIMAL_FOOTER_COLUMNS = `const columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: 'แอพ',
    links: [{ href: '/', label: 'หน้าแรก' }],
  },
  {
    title: 'API',
    links: [
      { href: '/api/hello', label: '/api/hello', external: true },
      { href: '/api/health', label: '/api/health', external: true },
      { href: '/openapi', label: 'เอกสาร API', external: true },
    ],
  },
  {
    title: 'Kitsune',
    links: [{ href: '${REPO}', label: 'คู่มือ Kitsune', external: true }],
  },
]
`

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    yes: { type: 'boolean', short: 'y', default: false },
    name: { type: 'string' },
    template: { type: 'string' },
    trailer: { type: 'boolean' },
    'no-trailer': { type: 'boolean' },
    'no-install': { type: 'boolean', default: false },
    'no-git': { type: 'boolean', default: false },
    'from-create': { type: 'boolean', default: false },
  },
  allowPositionals: true,
})

/* ---------- หน้าตา ---------- */

const color = !process.env.NO_COLOR && !!process.stdout.isTTY
const paint = (code: string) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)
const c = {
  bold: paint('1'),
  dim: paint('2'),
  gray: paint('90'),
  green: paint('92'),
  cyan: paint('96'),
  violet: paint('38;5;141'),
  pink: paint('38;5;205'),
  yellow: paint('93'),
}
const ok = (msg: string) => console.log(`  ${c.green('✓')} ${msg}`)
const step = (msg: string) => console.log(`\n${c.violet('◆')} ${c.bold(msg)}`)

/* ---------- คำถาม ---------- */

const interactive = !values.yes && !!process.stdin.isTTY
const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null

async function ask(question: string, def: string) {
  if (!rl) return def
  const answer = (await rl.question(`${c.cyan('?')} ${c.bold(question)} ${c.gray(`(${def})`)} `)).trim()
  return answer || def
}
async function confirm(question: string, def: boolean) {
  if (!rl) return def
  const answer = (await rl.question(`${c.cyan('?')} ${c.bold(question)} ${c.gray(def ? '(Y/n)' : '(y/N)')} `)).trim().toLowerCase()
  return answer ? answer.startsWith('y') : def
}
async function choose<T extends string>(question: string, options: { value: T; label: string; hint: string }[], def: T) {
  if (!rl) return def
  console.log(`${c.cyan('?')} ${c.bold(question)}`)
  options.forEach((o, i) => console.log(`  ${c.violet(String(i + 1))}. ${o.label} ${c.gray('— ' + o.hint)}`))
  const defIndex = options.findIndex((o) => o.value === def) + 1
  const answer = (await rl.question(`  ${c.gray(`เลือก 1-${options.length}`)} ${c.gray(`(${defIndex})`)} `)).trim()
  return options[Number(answer) - 1]?.value ?? def
}

/* ---------- ตัวช่วยไฟล์ ---------- */

const path = (p: string) => join(ROOT, p)
const read = (p: string) => readFileSync(path(p), 'utf8')
const write = (p: string, s: string) => writeFileSync(path(p), s)
const remove = (...ps: string[]) => ps.forEach((p) => rmSync(path(p), { recursive: true, force: true }))
/** แทนข้อความในไฟล์ — ถ้าไม่เจอให้เตือน (template อาจถูกแก้ไปแล้ว) */
function patch(p: string, pairs: [string | RegExp, string][]) {
  if (!existsSync(path(p))) return
  let s = read(p)
  for (const [a, b] of pairs) {
    const next = s.replace(a, b)
    if (next === s) console.log(`  ${c.yellow('!')} ${c.gray(`${p}: ไม่พบข้อความที่จะแก้ — ข้าม`)}`)
    s = next
  }
  write(p, s)
}
const run = (cmd: string[], quiet = false) =>
  Bun.spawnSync(cmd, { cwd: ROOT, stdout: quiet ? 'ignore' : 'inherit', stderr: quiet ? 'ignore' : 'inherit' }).exitCode === 0

/* ---------- เริ่ม ---------- */

console.log()
console.log(`  ${c.pink('🦊')} ${c.bold('Kitsune')} ${c.gray('· ว่องไว แสนกล ครบในตัวเดียว')}`)
console.log(`  ${c.gray('ตั้งค่าโปรเจกต์ใหม่ · by')} ${c.violet('Yurachi Studio')}`)
console.log()

const folder = basename(ROOT)
const slug = folder.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-app'
const pretty = slug.replace(/(^|-)([a-z])/g, (_, sep: string, ch: string) => (sep ? ' ' : '') + ch.toUpperCase())

// ชื่อแอพ: เก็บเฉพาะตัวอักษรปลอดภัย (ใช้แทรกลงในโค้ด) · \p{M} = สระ/วรรณยุกต์ไทย
const appName =
  (values.name ?? (await ask('ชื่อแอพ (แสดงในเว็บ)', pretty))).replace(/[^\p{L}\p{M}\p{N} ._-]/gu, '').trim() || pretty

const template = (values.template as 'full' | 'minimal' | undefined) ??
  (await choose('เลือกแม่แบบ', [
    { value: 'full', label: 'Full', hint: 'ตัวอย่างครบ 12 หมวด + benchmark + cache demo' },
    { value: 'minimal', label: 'Minimal', hint: 'โครงเปล่า สะอาด พร้อมเริ่มงานจริง' },
  ], 'full'))

let keepTrailer = false
if (template === 'full')
  keepTrailer = values.trailer ?? (values['no-trailer'] ? false : await confirm('เก็บวิดีโอ trailer (WebGL + three.js) ไว้ด้วยไหม', false))

const install = !values['no-install'] && (await confirm('ติดตั้ง dependencies ตอนนี้เลยไหม', true))
const git = !values['no-git'] && !values['from-create'] && !existsSync(path('.git/HEAD'))
  ? await confirm('สร้าง git repository ใหม่ไหม', true)
  : false
rl?.close()

/* ---------- 1) ไฟล์ของ repo ต้นฉบับ (ไม่ใช่ของโปรเจกต์ใหม่) ---------- */
step('จัดเตรียมไฟล์')
remove('.github/ISSUE_TEMPLATE', '.github/PULL_REQUEST_TEMPLATE.md', '.github/assets', 'CONTRIBUTING.md', 'SECURITY.md', 'LICENSE', 'packages', 'dist')
ok('ลบไฟล์เฉพาะของ repo Kitsune (issue template, license, ภาพ README)')

/* ---------- 2) ตัด trailer ---------- */
if (!keepTrailer) {
  remove('trailer', 'tutorial', 'src/pages/trailer', 'src/pages/tutorial', 'scripts/trailer.ts', 'public/trailer', 'public/tutorial')
  ok('ตัดวิดีโอ trailer + คลิปสอนออก (ลด dependency ได้หลายตัว)')
}

/* ---------- 3) แม่แบบ minimal ---------- */
if (template === 'minimal') {
  remove(
    'src/pages/examples', 'src/pages/benchmark', 'src/pages/users', 'src/pages/about.tsx',
    'src/api/bench', 'src/api/users',
    'src/lib/bench.ts', 'src/lib/examples.ts',
    'src/components/BenchBars.tsx', 'src/components/CacheStats.tsx', 'src/components/Example.tsx',
    'src/components/ExampleGrid.tsx', 'src/components/ProductRows.tsx', 'src/components/Source.tsx', 'src/components/UserRow.tsx',
    'scripts/bench.ts', 'public/bench.js', 'public/og.jpg',
  )
  // คัดลอกไฟล์ของแม่แบบ (ตัด .tpl ออก) ทับของเดิม
  for (const file of new Bun.Glob('**/*.tpl').scanSync({ cwd: MINIMAL_DIR })) {
    const target = file.replaceAll('\\', '/').replace(/\.tpl$/, '')
    cpSync(join(MINIMAL_DIR, file), path(target))
  }
  patch('src/components/Nav.tsx', [[/const links = \[[\s\S]*?\n\]/, "const links = [{ href: '/', label: 'หน้าแรก' }]"]])
  patch('src/components/Footer.tsx', [[/const columns = \[[\s\S]*?\n\]\n/, MINIMAL_FOOTER_COLUMNS]])
  patch('src/pages/_404.tsx', [['\n          <a href="/examples" class="btn btn-outline">ดูตัวอย่าง</a>', '']])
  patch('src/components/Layout.tsx', [['        <meta property="og:image" content="/public/og.jpg" />\n', '']])
  ok('ใช้แม่แบบ Minimal: หน้าแรก + /api/hello + /api/health + เทส')
} else ok('ใช้แม่แบบ Full: ตัวอย่างครบทุกหมวด')

/* ---------- 4) ชื่อแอพ ---------- */
for (const f of ['src/components/Nav.tsx', 'src/components/Footer.tsx'])
  patch(f, [['<span class="brand-name">Kitsune</span>', `<span class="brand-name">${appName}</span>`]])
patch('src/components/Footer.tsx', [
  [
    /© \{new Date\(\)\.getFullYear\(\)\} <strong>Yurachi Studio<\/strong> · MIT License/,
    `© {new Date().getFullYear()} <strong>${appName}</strong> · สร้างด้วย Kitsune โดย Yurachi Studio`,
  ],
])
patch('src/components/Layout.tsx', [
  ["`${title} · Kitsune` : 'Kitsune — ว่องไว แสนกล ครบในตัวเดียว'", `\`\${title} · ${appName}\` : '${appName}'`],
  ["title ? `${title} · Kitsune` : 'Kitsune — ว่องไว แสนกล ครบในตัวเดียว'} />", `title ? \`\${title} · ${appName}\` : '${appName}'} />`],
  ['<meta name="author" content="Yurachi Studio" />', `<meta name="author" content="${appName}" />`],
])
patch('index.tsx', [["name: '🦊 Kitsune'", `name: '🦊 ${appName}'`]])
ok(`ตั้งชื่อแอพเป็น ${c.bold(appName)}`)

/* ---------- 5) package.json ---------- */
const pkg = JSON.parse(read('package.json'))
pkg.name = slug
pkg.version = '0.1.0'
pkg.private = true
for (const k of ['description', 'author', 'license', 'homepage', 'repository', 'bugs', 'keywords', 'bun-create']) delete pkg[k]
delete pkg.scripts.setup
if (!keepTrailer) {
  delete pkg.scripts.trailer
  delete pkg.scripts.tutorial
  for (const d of ['three', 'mp4-muxer']) delete pkg.dependencies?.[d]
  for (const d of ['@types/three', 'puppeteer-core', '@fontsource/ibm-plex-sans-thai', '@fontsource/jetbrains-mono']) delete pkg.devDependencies?.[d]
}
if (template === 'minimal') delete pkg.scripts.bench
const ordered = { name: pkg.name, version: pkg.version, private: true, ...pkg }
write('package.json', JSON.stringify(ordered, null, 2) + '\n')
ok('อัปเดต package.json')

/* ---------- 6) .env พร้อม secret สุ่ม ---------- */
const secret = () => randomBytes(24).toString('base64url')
write('.env.example', ENV_EXAMPLE)
if (!existsSync(path('.env'))) {
  write('.env', ENV_EXAMPLE.replace('COOKIE_SECRET=change-me', `COOKIE_SECRET=${secret()}`).replace('ADMIN_KEY=change-me', `ADMIN_KEY=${secret()}`))
  ok('สร้าง .env พร้อม COOKIE_SECRET และ ADMIN_KEY แบบสุ่ม')
}

/* ---------- 7) README ของโปรเจกต์ ---------- */
write('README.md', projectReadme(appName, template, keepTrailer))
ok('สร้าง README.md')

/* ---------- 8) components/index.ts ให้ตรงกับไฟล์ที่เหลือ ---------- */
const { generateComponents } = await import(join(ROOT, 'core/components.ts'))
await generateComponents(join(ROOT, 'src/components'))

/* ---------- 9) ลบตัวเอง (ใช้ครั้งเดียว) ---------- */
remove(relative(ROOT, import.meta.dir))

/* ---------- 10) ติดตั้ง + git ---------- */
if (install || values['from-create']) {
  step('ติดตั้ง dependencies')
  if (!run(['bun', 'install'])) console.log(`  ${c.yellow('!')} ติดตั้งไม่สำเร็จ — ลองรัน ${c.bold('bun install')} เอง`)
}
if (git) {
  step('สร้าง git repository')
  // quiet: ไม่ให้คำเตือน CRLF ของ Windows รก
  const done =
    run(['git', 'init', '-q'], true) &&
    run(['git', 'add', '-A'], true) &&
    run(['git', 'commit', '-q', '-m', `เริ่มโปรเจกต์ ${appName} ด้วย Kitsune`], true)
  if (done) ok('git init + commit แรก')
  else console.log(`  ${c.yellow('!')} สร้าง git ไม่สำเร็จ (ตั้ง git config user.name / user.email แล้วหรือยัง?)`)
}

/* ---------- เสร็จ ---------- */
const rel = values['from-create'] || ROOT !== process.cwd() ? folder : '.'
console.log()
console.log(`  ${c.green('●')} ${c.bold(`${appName} พร้อมแล้ว!`)} ${c.gray(`(${template}${keepTrailer ? ' + trailer' : ''})`)}`)
console.log()
console.log(`  ${c.gray('เริ่มเลย:')}`)
if (rel !== '.') console.log(`    ${c.cyan('cd')} ${rel}`)
if (!install && !values['from-create']) console.log(`    ${c.cyan('bun install')}`)
console.log(`    ${c.cyan('bun dev')}          ${c.gray('→ http://localhost:3000')}`)
console.log()
console.log(`  ${c.gray('คำสั่งอื่น:')} ${c.cyan('bun test')} ${c.gray('·')} ${c.cyan('bun run check')} ${c.gray('·')} ${c.cyan('bun start')}`)
console.log(`  ${c.gray('คู่มือ:')} ${REPO}#readme`)
console.log()

/* ======================================================================
   แม่แบบไฟล์
   ====================================================================== */

function projectReadme(name: string, tpl: string, trailer: boolean) {
  return `# ${name}

สร้างด้วย [🦊 Kitsune](${REPO}) — full-stack starter บน Bun + Elysia + htmx โดย Yurachi Studio

## เริ่มใช้งาน

\`\`\`bash
bun install
bun dev          # โหมดพัฒนา → http://localhost:3000
\`\`\`

## คำสั่ง

| คำสั่ง | ทำอะไร |
| --- | --- |
| \`bun dev\` | โหมดพัฒนา (auto-reload) |
| \`bun start\` | โหมด production |
| \`bun run build\` | build แบบ standalone → \`dist/standalone/server.js\` (ไม่ต้องมี node_modules) |
| \`bun run build:compile\` | build เป็น executable ไฟล์เดียว → \`dist/\` |
| \`bun test\` | รันเทส |
| \`bun run check\` | ตรวจ TypeScript + XSS |${tpl === 'full' ? '\n| `bun run bench` | ยิงโหลดใส่เซิร์ฟเวอร์ที่เปิดอยู่ |' : ''}${trailer ? '\n| `bun run trailer` | สร้างวิดีโอ trailer เป็น MP4 |\n| `bun run tutorial` | สร้างคลิปสอนใช้เป็น MP4 |' : ''}

## โครงสร้าง

\`\`\`
src/pages/       หน้าเว็บ — สร้างไฟล์ = ได้ route  (src/pages/about.tsx → /about)
src/api/         JSON API → /api/...
src/components/  import { X } from '@components'
src/lib/         db.ts และโค้ดอื่นๆ
public/          ไฟล์ static → /public/...
core/            ระบบเบื้องหลังของ Kitsune (ปกติไม่ต้องแก้)
tests/           bun test
\`\`\`

## Environment

ตั้งค่าใน \`.env\` (สร้างให้แล้วพร้อม secret สุ่ม · ตัวอย่างอยู่ใน \`.env.example\`)

คู่มือเต็ม: ${REPO}#readme
`
}

