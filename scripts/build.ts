/**
 * Build สำหรับ production — แบบ Next.js `output: 'standalone'`
 *
 *   bun run build                                  → dist/standalone/  server.js ไฟล์เดียว + ไฟล์ที่จำเป็น (ไม่ต้องมี node_modules)
 *   bun run build:compile                          → dist/<ชื่อแอพ>     executable ไฟล์เดียว ฝังทุกอย่างไว้ (ไม่ต้องลง Bun)
 *   bun run build:compile -- --target bun-linux-x64   cross-compile ไปเครื่องอื่น (bun-linux-arm64, bun-darwin-arm64, bun-windows-x64 …)
 *
 * ขั้นตอน
 *   1. สร้าง .kitsune/entry.ts — import ทุก route ไว้ล่วงหน้า (แทนการสแกนโฟลเดอร์ตอนรัน) และไฟล์ที่ต้องฝัง
 *   2. build โค้ดวิดีโอ (trailer/tutorial) ฝั่ง browser ไว้ก่อน
 *   3. Bun.build → bundle เดียว minify แล้ว
 *   4. standalone: คัดลอกเฉพาะไฟล์ที่ใช้จริง (public, htmx, ฟอนต์ ฯลฯ) · compile: ฝังทุกไฟล์ไว้ในตัวโปรแกรม
 *   5. สรุป route แบบ next build
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { c } from '../core/logger'
import { fileToPath } from '../core/router'
import { VENDOR } from '../core/static'
import { METHODS } from '../core/route'

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    compile: { type: 'boolean', default: false },
    target: { type: 'string' },
    outdir: { type: 'string', default: 'dist' },
  },
})

const ROOT = resolve(import.meta.dir, '..')
process.chdir(ROOT)
const GEN = join(ROOT, '.kitsune')
const OUT = resolve(values.outdir!)
const STANDALONE = join(OUT, 'standalone')
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { name?: string }
const started = performance.now()

const step = (msg: string) => console.log(`${c.violet('◆')} ${c.bold(msg)}`)
const ok = (msg: string) => console.log(`  ${c.green('✓')} ${msg}`)
const fail = (msg: string): never => {
  console.error(`\n  ${c.red('✖')} ${msg}\n`)
  process.exit(1)
}
const size = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} kB` : `${bytes} B`
const scan = (pattern: string, cwd: string) =>
  existsSync(cwd) ? [...new Bun.Glob(pattern).scanSync({ cwd, dot: true })].map((f) => f.replaceAll('\\', '/')).sort() : []

console.log(`\n  ${c.pink('🦊')} ${c.bold('Kitsune build')} ${c.gray(values.compile ? '· executable ไฟล์เดียว' : '· standalone')}\n`)

/* ---------- 1) route ทั้งหมด ---------- */
type RouteFile = { rel: string; path: string; kind: 'api' | 'page'; methods: string[]; ws: boolean; cache?: number }

const isPrivate = (f: string) => f.split('/').some((s) => s.startsWith('_'))
const isGuard = (f: string) => /(^|\/)_guard\.tsx?$/.test(f)
const transpiler = new Bun.Transpiler({ loader: 'tsx' })

const routes: RouteFile[] = []
const modules: string[] = [] // route + _guard ที่ต้อง import ไว้ล่วงหน้า
for (const [dir, kind, prefix] of [
  ['src/api', 'api', '/api'],
  ['src/pages', 'page', ''],
] as const) {
  for (const f of scan('**/*.{ts,tsx}', dir)) {
    if (f.endsWith('.d.ts') || /\.(test|spec)\.tsx?$/.test(f)) continue
    if (isGuard(f)) modules.push(`${dir}/${f}`)
    if (isPrivate(f)) continue
    const code = readFileSync(join(dir, f), 'utf8')
    const exports = transpiler.scan(code).exports
    const methods = METHODS.filter((m) => exports.includes(m))
    if (kind === 'page' && exports.includes('default') && !methods.includes('GET')) methods.unshift('GET')
    const ttl = Number(/export const cache\s*=\s*(\d+)/.exec(code)?.[1] ?? 0)
    modules.push(`${dir}/${f}`)
    routes.push({ rel: `${dir}/${f}`, path: fileToPath(f, prefix), kind, methods, ws: exports.includes('WS'), cache: ttl || undefined })
  }
}
step('รวบรวม route')
ok(`${routes.length} ไฟล์ · ${routes.reduce((n, r) => n + r.methods.length + (r.ws ? 1 : 0), 0)} route`)

/* ---------- 2) ไฟล์ที่ต้องไปกับแอพ ---------- */
step('รวบรวมไฟล์ที่ใช้ตอนรัน')
const assets = new Set<string>()
for (const f of scan('**/*', 'public')) assets.add(`public/${f}`)
for (const file of Object.values(VENDOR)) assets.add(`node_modules/${file}`)

// ฟอนต์ของวิดีโอ (ถ้ามีหน้า trailer)
const fontRoute = 'src/pages/trailer/fonts/[file].ts'
if (existsSync(fontRoute)) {
  const { ALLOWED } = (await import(`../${fontRoute}`)) as { ALLOWED: RegExp }
  for (const family of ['ibm-plex-sans-thai', 'jetbrains-mono'])
    for (const f of scan('*.woff2', `node_modules/@fontsource/${family}/files`))
      if (ALLOWED.test(f)) assets.add(`node_modules/@fontsource/${family}/files/${f}`)
}

// ซอร์สโค้ดสำหรับ <Source /> (หน้าตัวอย่างแสดงโค้ดจริงของตัวเอง)
if (existsSync('src/components/Source.tsx'))
  for (const [dir, pattern] of [
    ['src', '**/*.{ts,tsx}'],
    ['core', '*.ts'],
    ['tests', '*.ts'],
  ] as const)
    for (const f of scan(pattern, dir)) if (!f.endsWith('.gen.ts')) assets.add(`${dir}/${f}`)
ok(`${assets.size} ไฟล์`)

// โค้ดวิดีโอฝั่ง browser — build ไว้ก่อน ตอนรันจะได้ไม่ต้องมีซอร์ส/three.js
rmSync(GEN, { recursive: true, force: true })
mkdirSync(join(GEN, 'bundles'), { recursive: true })
// path อยู่ในตัวแปร: แม่แบบที่ตัดวิดีโอออกจะได้ type check ผ่าน
const bundleRoute = 'src/pages/trailer/_bundle.ts'
if (existsSync(bundleRoute)) {
  const { prebuiltName } = (await import(`../${bundleRoute}`)) as { prebuiltName: (e: string) => string }
  for (const entry of ['trailer/main.ts', 'tutorial/main.ts']) {
    if (!existsSync(entry)) continue
    step(`build วิดีโอ ${entry.split('/')[0]} (browser)`)
    const r = await Bun.build({ entrypoints: [entry], target: 'browser', minify: true })
    if (!r.success) fail(r.logs.map(String).join('\n'))
    const out = prebuiltName(entry)
    await Bun.write(out, r.outputs[0]!)
    assets.add(out)
    ok(`${out} ${c.gray(size(statSync(out).size))}`)
  }
}

/* ---------- 3) entry ที่ import ทุกอย่างไว้ล่วงหน้า ---------- */
const id = Date.now().toString(36)
const fromGen = (rel: string) => {
  const p = relative(GEN, rel).replaceAll('\\', '/')
  return JSON.stringify(p.startsWith('.') ? p : `./${p}`)
}
const files = [...assets].sort()

// ฝังไฟล์ .ts/.tsx ตรงๆ ไม่ได้ (Bun จะมองเป็นโค้ดที่ bundle อยู่) → ฝังสำเนา .txt แทน แต่ยังใช้ชื่อเดิมเป็น key
const embedFrom = (f: string) => {
  if (!/\.tsx?$/.test(f)) return f
  const copy = join(GEN, 'sources', `${f}.txt`)
  mkdirSync(dirname(copy), { recursive: true })
  cpSync(f, copy)
  return copy
}

// โมดูลแรกที่ถูกประเมิน: ตั้ง __KITSUNE_BUILD__ ก่อน route ใดๆ จะ import core/files
writeFileSync(
  join(GEN, 'build-info.ts'),
  `// สร้างโดย scripts/build.ts — ห้ามแก้เอง
${values.compile ? files.map((f, i) => `import f${i} from ${fromGen(embedFrom(f))} with { type: 'file' }`).join('\n') : ''}

;(globalThis as any).__KITSUNE_BUILD__ = {
  id: ${JSON.stringify(id)},
  root: import.meta.dir,
  modules: {},
  files: {${values.compile ? files.map((f, i) => `\n    ${JSON.stringify(f)}: f${i},`).join('') + '\n  ' : ''}},
}
`,
)
writeFileSync(
  join(GEN, 'entry.ts'),
  `// สร้างโดย scripts/build.ts — ห้ามแก้เอง
import './build-info'
${modules.map((m, i) => `import * as m${i} from ${fromGen(m)}`).join('\n')}

Object.assign((globalThis as any).__KITSUNE_BUILD__.modules, {
${modules.map((m, i) => `  ${JSON.stringify(m)}: m${i},`).join('\n')}
})

await import('../index.tsx')
`,
)

/* ---------- 4) bundle ---------- */
step(values.compile ? 'compile เป็น executable' : 'bundle เซิร์ฟเวอร์')

// import.meta.dir/path ในซอร์สชี้ไปที่ตำแหน่งของ bundle ไม่ใช่ไฟล์เดิม → แทนด้วย path จริงจากรากโปรเจกต์
// (หน้าตัวอย่างใช้หาไฟล์ซอร์สมาแสดง · core/files.ts จะหาไฟล์ที่คัดลอก/ฝังไว้ให้)
const sourcePaths: Bun.BunPlugin = {
  name: 'kitsune-source-paths',
  setup(b) {
    // เฉพาะไฟล์ใน src/ ของโปรเจกต์นี้ (ไม่แตะ node_modules)
    const own = new RegExp(`^${ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\\\/]src[\\\\/].*\\.tsx?$`)
    b.onLoad({ filter: own }, async (args) => {
      const code = await Bun.file(args.path).text()
      const loader = args.path.endsWith('x') ? 'tsx' : 'ts'
      if (!code.includes('import.meta.')) return { contents: code, loader }
      const rel = relative(ROOT, args.path).replaceAll('\\', '/')
      return {
        contents: code
          .replaceAll('import.meta.dir', `(process.cwd() + ${JSON.stringify('/' + dirname(rel))})`)
          .replaceAll('import.meta.path', `(process.cwd() + ${JSON.stringify('/' + rel)})`),
        loader,
      }
    })
  },
}

const name = (pkg.name ?? 'kitsune').replace(/^@.*\//, '')
// cross-compile ตั้งชื่อตามเครื่องปลายทาง เช่น dist/kitsune-linux-x64
const outfile = join(OUT, values.target ? `${name}-${values.target.replace(/^bun-/, '')}` : name)
if (!values.compile) rmSync(STANDALONE, { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: [join(GEN, 'entry.ts')],
  target: 'bun',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [sourcePaths],
  ...(values.compile
    ? { compile: { outfile, ...(values.target ? { target: values.target as Bun.Build.CompileTarget } : {}) } }
    : { outdir: STANDALONE, naming: 'server.js', sourcemap: 'linked' as const }),
})
if (!result.success) fail(result.logs.map(String).join('\n'))
for (const log of result.logs) console.log(`  ${c.yellow('!')} ${c.gray(String(log))}`)

const main = result.outputs.find((o) => o.kind === 'entry-point')?.path ?? result.outputs[0]!.path
ok(`${relative(ROOT, main).replaceAll('\\', '/')} ${c.gray(size(statSync(main).size))}`)

/* ---------- 5) standalone: คัดลอกไฟล์ที่ใช้ตอนรัน ---------- */
let assetBytes = 0
for (const f of files) assetBytes += statSync(f).size
if (!values.compile) {
  for (const f of files) {
    mkdirSync(dirname(join(STANDALONE, f)), { recursive: true })
    cpSync(f, join(STANDALONE, f))
  }
  if (existsSync('.env.example')) cpSync('.env.example', join(STANDALONE, '.env.example'))
  ok(`คัดลอก ${files.length} ไฟล์ ${c.gray(size(assetBytes))}`)
} else ok(`ฝัง ${files.length} ไฟล์ไว้ในตัวโปรแกรม ${c.gray(size(assetBytes))}`)

/* ---------- สรุป ---------- */
console.log(`\n  ${c.bold('Route')}${' '.repeat(36)}${c.bold('Method')}`)
const rows = routes.sort((a, b) => a.path.localeCompare(b.path))
rows.forEach((r, i) => {
  const corner = rows.length === 1 ? '─' : i === 0 ? '┌' : i === rows.length - 1 ? '└' : '├'
  const icon = r.ws ? c.cyan('⇄') : r.cache ? c.green('○') : c.violet('ƒ')
  const methods = [...r.methods, ...(r.ws ? ['WS'] : [])].join(' ')
  const ttl = r.cache ? c.yellow(` ⚡${r.cache}s`) : ''
  console.log(`  ${c.gray(corner)} ${icon} ${r.path.padEnd(38)} ${c.gray(methods)}${ttl}`)
})
console.log(`\n  ${c.green('○')} ${c.gray('cache ทั้งหน้าในหน่วยความจำ')}   ${c.violet('ƒ')} ${c.gray('render ทุก request')}   ${c.cyan('⇄')} ${c.gray('WebSocket')}`)

const secs = ((performance.now() - started) / 1000).toFixed(1)
console.log(`\n  ${c.green('●')} ${c.bold('build เสร็จ')} ${c.gray(`ใน ${secs} วินาที`)}\n`)
const rel = (p: string) => relative(process.cwd(), p).replaceAll('\\', '/')
if (values.compile) {
  console.log(`  ${c.gray('รัน:')}  ${c.cyan(`./${rel(main)}`)}`)
  console.log(`  ${c.gray('ไฟล์เดียวจบ — คัดลอกไปเครื่องไหนก็รันได้ (ระบบเดียวกัน) ไม่ต้องลง Bun · อ่าน .env จากโฟลเดอร์ที่รัน')}\n`)
} else {
  console.log(`  ${c.gray('รัน:')}  ${c.cyan(`bun ${rel(main)}`)}`)
  console.log(`  ${c.gray(`คัดลอกทั้งโฟลเดอร์ ${rel(STANDALONE)}/ ไปเซิร์ฟเวอร์ได้เลย — ไม่ต้อง bun install · อ่าน .env จากโฟลเดอร์ที่รัน`)}\n`)
}
process.exit(0)
