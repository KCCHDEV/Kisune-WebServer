/**
 * โหมด dev: bun --watch รีสตาร์ทให้เฉพาะตอน "แก้" ไฟล์ที่ถูก import อยู่แล้ว
 * แต่ตอน "เพิ่ม/ลบ/เปลี่ยนชื่อ" ไฟล์ route หรือ component มันไม่รู้
 * ไฟล์นี้จึงคอยดู src/ แล้วสั่งรีสตาร์ทให้เอง
 */
import { watch } from 'node:fs'
import { join } from 'node:path'
import { generateComponents } from './components'
import { c, logEvent } from './logger'

const RELOAD_FILE = join(import.meta.dir, 'reload.gen.ts') // ใช้ได้ทั้ง Windows/Unix

export async function setupDev() {
  // ไฟล์นี้ถูก import โดย index.tsx — เขียนทับเมื่อไหร่ bun --watch ก็รีสตาร์ท
  if (!(await Bun.file(RELOAD_FILE).exists())) await Bun.write(RELOAD_FILE, 'export default 0\n')
  await import(RELOAD_FILE)

  let timer: Timer | undefined
  watch('src', { recursive: true }, (event, file) => {
    if (event !== 'rename' || !file) return
    if (file.replaceAll('\\', '/') === 'components/index.ts') return // ไฟล์ที่เราสร้างเอง
    clearTimeout(timer)
    timer = setTimeout(async () => {
      logEvent(c.yellow('↻'), `พบไฟล์เพิ่ม/ลบ ${c.white(file.replaceAll('\\', '/'))} ${c.gray('— โหลดใหม่…')}`)
      await generateComponents()
      await Bun.write(RELOAD_FILE, `export default ${Date.now()}\n`)
    }, 100)
  })
}
