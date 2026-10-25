/**
 * Components loader — สแกน src/components แล้วสร้างไฟล์ index.ts ให้อัตโนมัติ
 *
 *   src/components/Card.tsx         (export default function Card...)
 *   src/components/ui/Button.tsx    (export default function Button...)
 *
 * แล้วที่ไหนก็ import ได้บรรทัดเดียว พร้อม type ครบ:
 *   import { Card, Button } from '@components'
 *
 * ชื่อ component = ชื่อไฟล์ ; ไฟล์/โฟลเดอร์ที่ขึ้นต้นด้วย _ จะถูกข้าม
 * ไฟล์ index.ts ถูกเขียนใหม่เฉพาะตอนมีการเปลี่ยนแปลง (ไม่ทำให้ --watch รีสตาร์ทวน)
 */
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { c, logEvent } from './logger'

const glob = new Bun.Glob('**/*.tsx')

export async function generateComponents(dir = 'src/components') {
  const root = resolve(dir)
  if (!existsSync(root)) return []

  const files = [...glob.scanSync({ cwd: root })]
    .map((f) => f.replaceAll('\\', '/'))
    .filter((f) => !f.split('/').some((s) => s.startsWith('_')))
    .sort()

  const seen = new Map<string, string>()
  const lines: string[] = []

  for (const file of files) {
    const name = file.split('/').pop()!.replace(/\.tsx$/, '')
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
      logEvent(c.yellow('!'), `components/${file} ${c.gray('ชื่อไฟล์ควรเป็น PascalCase เช่น UserCard.tsx — ข้ามไป')}`)
      continue
    }
    if (seen.has(name)) {
      logEvent(c.yellow('!'), `component ชื่อซ้ำ ${c.white(name)} ${c.gray(`${seen.get(name)} กับ ${file} — ใช้ตัวแรก`)}`)
      continue
    }
    seen.set(name, file)
    lines.push(`export { default as ${name} } from './${file.replace(/\.tsx$/, '')}'`)
  }

  const content =
    `// ⚠️ ไฟล์นี้สร้างอัตโนมัติโดย core/components.ts — ห้ามแก้เอง\n` +
    `// เพิ่ม component ใหม่แค่สร้างไฟล์ .tsx ในโฟลเดอร์นี้ แล้วรีสตาร์ท (หรือ bun dev จะทำให้เอง)\n\n` +
    lines.join('\n') +
    '\n'

  const indexFile = join(root, 'index.ts')
  const current = existsSync(indexFile) ? await Bun.file(indexFile).text() : ''
  if (current !== content) {
    await Bun.write(indexFile, content)
    logEvent(c.violet('◆'), `อัปเดต components/index.ts ${c.gray(`(${seen.size} components)`)}`)
  }

  return [...seen.keys()]
}
