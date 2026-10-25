// GET /examples/testing — ทดสอบแอพด้วย bun test + app.handle()
import { join } from 'node:path'
import { Example, Card, CodeBlock, Source } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที

export default function TestingExample() {
  return (
    <Example
      title="🧪 Testing ด้วย bun test"
      desc="createApp() คืนแอพที่ยังไม่เปิดพอร์ต เรียก app.handle(new Request(...)) ได้ตรงๆ เร็วและไม่ชนพอร์ตไหน"
      file={import.meta.path}
    >
      <Card title="รันเทส">
        <CodeBlock label="terminal" code={'bun test\nbun test --watch'} />
        <p class="muted small">
          ตอนเทสใช้ฐานข้อมูลในหน่วยความจำ (<code>DB_FILE=:memory:</code>) ตั้งค่าไว้ใน <code>tests/setup.ts</code> ผ่าน{' '}
          <code>bunfig.toml</code>
        </p>
      </Card>
      <Source file={join(process.cwd(), 'tests/app.test.ts')} open />
    </Example>
  )
}
