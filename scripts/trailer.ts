/**
 * สร้างวิดีโอ trailer เป็นไฟล์ MP4 (1080p 30fps) — ใช้ Edge/Chrome ที่มีในเครื่องแบบ headless
 *
 *   bun run trailer                      ถ่ายภาพหน้าจอจริง → render → dist/kitsune-trailer.mp4
 *   bun run trailer -- --frames 3,8,20   render เฉพาะบางวินาทีเป็น PNG (ไว้ตรวจงาน) → dist/frames/
 *   bun run trailer -- --frames 11 --jpg --out .github/assets   ภาพนิ่ง JPG ไว้ใช้ใน README
 *   bun run trailer -- --no-shots        ใช้ภาพหน้าจอเดิมใน public/trailer/
 *   BROWSER="C:/path/to/chrome.exe" bun run trailer
 *
 * สคริปต์จะเปิดเซิร์ฟเวอร์ production ของตัวเองที่พอร์ต 3123 แล้วปิดให้เมื่อเสร็จ
 */
import puppeteer, { type Browser, type Page } from 'puppeteer-core'
import { existsSync, mkdirSync, statSync, renameSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    frames: { type: 'string' },
    out: { type: 'string' },
    jpg: { type: 'boolean', default: false },
    'no-shots': { type: 'boolean', default: false },
    port: { type: 'string', default: '3123' },
  },
})

const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/microsoft-edge',
].filter(Boolean) as string[]

const browserPath = BROWSERS.find((p) => existsSync(p))
if (!browserPath) {
  console.error('❌ ไม่พบ Chrome / Edge — ระบุเองด้วย BROWSER="path/to/chrome"')
  process.exit(1)
}

const ROOT = resolve(import.meta.dir, '..')
const DIST = join(ROOT, 'dist')
const SHOTS = join(ROOT, 'public', 'trailer')
mkdirSync(DIST, { recursive: true })
mkdirSync(SHOTS, { recursive: true })

const base = `http://localhost:${values.port}`
const step = (msg: string) => console.log(`\x1b[95m▸\x1b[0m ${msg}`)

/* ---------- เปิดเซิร์ฟเวอร์ของตัวเอง ---------- */
step(`เปิดเซิร์ฟเวอร์ที่ ${base}`)
const server = Bun.spawn(['bun', 'index.tsx'], {
  cwd: ROOT,
  env: { ...process.env, PORT: values.port, NODE_ENV: 'production', LOG: '0' },
  stdout: 'ignore',
  stderr: 'inherit',
})
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(base + '/api/hello')).ok) break
  } catch {}
  await Bun.sleep(100)
}

let browser: Browser | undefined
try {
  browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
    defaultViewport: { width: 1920, height: 1080 },
  })

  if (!values['no-shots'] && !values.frames) await captureShots(browser)
  else if (!existsSync(join(SHOTS, 'landing.jpg'))) await captureShots(browser)

  const page = await browser.newPage()
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && console.log('  [browser]', m.text()))
  await page.goto(base + '/trailer?export=1', { waitUntil: 'networkidle0' })
  await page.waitForFunction('window.trailer', { timeout: 60_000 })

  if (values.frames) await renderStills(page, values.frames)
  else await renderVideo(page)
} finally {
  await browser?.close()
  server.kill()
}

/* ---------- ภาพหน้าจอจริงของเว็บ (ธีมมืด) ---------- */
async function captureShots(browser: Browser) {
  step('ถ่ายภาพหน้าจอจริงของเว็บ')
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  const shot = async (name: string) => {
    await Bun.sleep(400) // ให้ animation จบ
    await page.screenshot({ path: join(SHOTS, `${name}.jpg`) as `${string}.jpg`, type: 'jpeg', quality: 90 })
    console.log(`  ✓ ${name}.jpg`)
  }

  await page.goto(base + '/', { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => !document.querySelector('#live-stats .skeleton'), { timeout: 30_000 })
  await shot('landing')

  await page.goto(base + '/examples', { waitUntil: 'networkidle0' })
  await shot('examples')

  await page.goto(base + '/benchmark', { waitUntil: 'networkidle0' })
  await page.select('select[name=n]', '20000')
  await page.click('form[hx-post="/benchmark"] button[type=submit]')
  await page.waitForSelector('#inproc .hbars', { timeout: 60_000 })
  await page.evaluate(() => document.querySelector('.card')?.scrollIntoView({ block: 'start' }))
  await page.evaluate(() => window.scrollBy(0, -90))
  await shot('benchmark')

  await page.goto(base + '/examples/cache', { waitUntil: 'networkidle0' })
  await page.click('button[hx-post="/examples/cache/slow"]')
  await Bun.sleep(700)
  await page.click('button[hx-post="/examples/cache/slow"]')
  await page.type('input[name=key]', 'hello')
  await page.type('input[name=value]', 'สวัสดี Kitsune 🦊')
  await page.click('form[hx-post="/examples/cache/keys"] button[type=submit]')
  await Bun.sleep(600)
  await page.evaluate(() => window.scrollTo(0, 120))
  await shot('cache')

  // หน้าจอมือถือ (ใช้บนโมเดลมือถือ 3D)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(base + '/', { waitUntil: 'networkidle0' })
  await Bun.sleep(800)
  await shot('m-landing')
  await page.goto(base + '/examples', { waitUntil: 'networkidle0' })
  await shot('m-examples')
  await page.goto(base + '/examples/cache', { waitUntil: 'networkidle0' })
  await shot('m-cache')
  await page.close()
}

/* ---------- PNG บางวินาที (ตรวจงาน) ---------- */
async function renderStills(page: Page, list: string) {
  const dir = values.out ? resolve(ROOT, values.out) : join(DIST, 'frames')
  mkdirSync(dir, { recursive: true })
  const canvas = (await page.$('canvas'))!
  const ext = values.jpg ? 'jpg' : 'png'
  for (const t of list.split(',').map(Number)) {
    await page.evaluate((t) => (window as any).trailer.renderFrame(t), t)
    const file = join(dir, `t${String(t).padStart(5, '0')}.${ext}`)
    await canvas.screenshot(values.jpg ? { path: file as `${string}.jpg`, type: 'jpeg', quality: 86 } : { path: file as `${string}.png` })
    console.log(`  ✓ ${file}`)
  }
}

/* ---------- วิดีโอเต็ม ---------- */
async function renderVideo(page: Page) {
  const tmp = join(DIST, '.download')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const cdp = await page.createCDPSession()
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: tmp })

  step('render วิดีโอ (ทีละเฟรม)')
  const started = performance.now()
  const done = page.evaluate(() => (window as any).trailer.export() as Promise<number>)
  let last = -1
  const timer = setInterval(async () => {
    const p = await page.evaluate(() => (window as any).__exportProgress ?? 0).catch(() => last)
    const pct = Math.floor(p * 100)
    if (pct !== last) {
      last = pct
      process.stdout.write(`\r  ${'█'.repeat(Math.floor(pct / 4)).padEnd(25, '░')} ${pct}%`)
    }
  }, 500)
  const size = await done
  clearInterval(timer)
  process.stdout.write(`\r  ${'█'.repeat(25)} 100%\n`)

  // รอไฟล์ดาวน์โหลดเขียนเสร็จ
  let file = ''
  for (let i = 0; i < 200; i++) {
    file = readdirSync(tmp).find((f) => f.endsWith('.mp4')) ?? ''
    if (file && statSync(join(tmp, file)).size === size) break
    await Bun.sleep(100)
  }
  const out = join(DIST, 'kitsune-trailer.mp4')
  renameSync(join(tmp, file), out)
  rmSync(tmp, { recursive: true, force: true })
  const secs = ((performance.now() - started) / 1000).toFixed(0)
  console.log(`\n\x1b[92m✓\x1b[0m ${out}  (${(size / 1024 / 1024).toFixed(1)} MB · ใช้เวลา ${secs} วินาที)\n`)
}
