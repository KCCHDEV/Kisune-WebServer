#!/usr/bin/env bun
/**
 * create-kitsune — สร้างโปรเจกต์ Kitsune ใหม่ (แบบ create-next-app)
 *
 *   bunx create-kitsune my-app
 *   bun create kitsune my-app
 *   bunx create-kitsune my-app --template minimal --yes
 *
 * ดาวน์โหลดแม่แบบล่าสุดจาก GitHub แล้วรัน scripts/setup ในโปรเจกต์ใหม่ (ถามชื่อแอพ, แม่แบบ, ติดตั้ง, git)
 * ตัวเลือกอื่นทั้งหมดส่งต่อให้ setup: --name, --template full|minimal, --trailer, --no-install, --no-git, --yes
 */
import { existsSync, mkdirSync, readdirSync, cpSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'

const REPO = 'KCCHDEV/Kisune-WebServer'
const BRANCH = process.env.KITSUNE_BRANCH ?? 'main'

const color = !process.env.NO_COLOR && !!process.stdout.isTTY
const paint = (code: string) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)
const c = { bold: paint('1'), gray: paint('90'), red: paint('91'), green: paint('92'), cyan: paint('96'), pink: paint('38;5;205') }
const fail = (msg: string): never => {
  console.error(`\n  ${c.red('✖')} ${msg}\n`)
  process.exit(1)
}

const args = Bun.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  ${c.pink('🦊')} ${c.bold('create-kitsune')} ${c.gray('· by Yurachi Studio')}

  ${c.bold('ใช้งาน')}   bunx create-kitsune ${c.cyan('<โฟลเดอร์>')} [ตัวเลือก]

  ${c.bold('ตัวเลือก')}
    --template full|minimal   full = ตัวอย่างครบ · minimal = โครงเปล่า
    --name "My App"           ชื่อแอพที่แสดงในเว็บ
    --trailer                 เก็บวิดีโอ trailer (WebGL) ไว้ด้วย
    --no-install / --no-git   ไม่ติดตั้ง dependency / ไม่สร้าง git
    -y, --yes                 ใช้ค่าเริ่มต้น ไม่ถาม
`)
  process.exit(0)
}

/* ---------- โฟลเดอร์ปลายทาง ---------- */
let dir = args.find((a) => !a.startsWith('-') && !args[args.indexOf(a) - 1]?.match(/^--(name|template)$/))
if (!dir) {
  if (!process.stdin.isTTY || args.includes('-y') || args.includes('--yes')) dir = 'my-kitsune-app'
  else {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    dir = (await rl.question(`${c.cyan('?')} ${c.bold('ตั้งชื่อโฟลเดอร์โปรเจกต์')} ${c.gray('(my-kitsune-app)')} `)).trim() || 'my-kitsune-app'
    rl.close()
  }
}
const target = resolve(dir)
if (existsSync(target) && readdirSync(target).length > 0) fail(`โฟลเดอร์ ${c.bold(dir)} มีไฟล์อยู่แล้ว — เลือกชื่ออื่น หรือลบโฟลเดอร์นั้นก่อน`)
mkdirSync(target, { recursive: true })

console.log(`\n  ${c.pink('🦊')} ${c.bold('create-kitsune')} ${c.gray(`→ ${target}`)}\n`)

/* ---------- ดาวน์โหลดแม่แบบ ---------- */
const local = process.env.KITSUNE_SOURCE // ไว้ทดสอบ: ใช้โฟลเดอร์ในเครื่องแทน GitHub
if (local) {
  for (const entry of readdirSync(local)) {
    if (['node_modules', '.git', 'dist'].includes(entry) || entry.endsWith('.sqlite') || entry.includes('.sqlite-')) continue
    cpSync(join(local, entry), join(target, entry), { recursive: true })
  }
  console.log(`  ${c.green('✓')} คัดลอกแม่แบบจาก ${local}`)
} else {
  process.stdout.write(`  ${c.gray('…')} ดาวน์โหลดแม่แบบล่าสุดจาก github.com/${REPO}`)
  const res = await fetch(`https://codeload.github.com/${REPO}/tar.gz/refs/heads/${BRANCH}`)
  if (!res.ok) fail(`ดาวน์โหลดไม่สำเร็จ (HTTP ${res.status}) — ตรวจการเชื่อมต่ออินเทอร์เน็ต`)
  // เก็บไฟล์ไว้ในโฟลเดอร์ปลายทางแล้วแตกด้วย path สั้นๆ — GNU tar (เช่นใน Git Bash) อ่าน "C:\..." เป็นชื่อเครื่องปลายทาง
  const archive = '.kitsune-template.tar.gz'
  await Bun.write(join(target, archive), res)
  // tar มีในตัวทั้ง macOS, Linux และ Windows 10 ขึ้นไป
  const tar = Bun.spawnSync(['tar', '-xzf', archive, '--strip-components=1'], { cwd: target, stderr: 'pipe' })
  rmSync(join(target, archive), { force: true })
  if (tar.exitCode !== 0) fail(`แตกไฟล์ไม่สำเร็จ: ${tar.stderr.toString()}`)
  console.log(`\r  ${c.green('✓')} ดาวน์โหลดแม่แบบล่าสุดจาก github.com/${REPO}   `)
}

if (!existsSync(join(target, 'scripts/setup/index.ts'))) fail('แม่แบบไม่มี scripts/setup — ลองใหม่อีกครั้งภายหลัง')

/* ---------- ตั้งค่าต่อ (ถามคำถาม, ติดตั้ง, git) ---------- */
const passthrough = args.filter((a) => a !== dir)
const setup = Bun.spawn(['bun', 'scripts/setup/index.ts', ...passthrough], {
  cwd: target,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})
process.exit(await setup.exited)
