// /examples/cache — in-memory cache แบบ Redis (core/cache.ts)
import { cache } from '@core/cache'
import { Example, Card, Button, CacheStats, CodeBlock } from '@components'
import { DemoKeys } from './keys'

const usage = `
import { cache } from '@core/cache'

cache.set('user:1', user, { ttl: 60 })   // วินาที
cache.get('user:1')
cache.incr('views')
cache.delPattern('user:*')

// คำนวณครั้งเดียวแล้วจำไว้ 30 วินาที
const list = await cache.remember('users:all', 30, () => db.query(...).all())

// cache ทั้งหน้า: ใส่บรรทัดเดียวในไฟล์ route
export const cache = 60
`

export default function CacheExample() {
  return (
    <Example
      title="🧠 In-memory cache"
      desc="cache แบบ Redis อยู่ในตัวแอพ: TTL, LRU, incr, remember และจำกัดหน่วยความจำ 128 MB เป็นค่าเริ่มต้น (CACHE_MAX_MB)"
      file={import.meta.path}
      related={[`${import.meta.dir}/slow.tsx`, `${import.meta.dir}/keys.tsx`, `${process.cwd()}/core/cache.ts`]}
    >
      <CacheStats stats={cache.stats()} />

      <div class="grid">
        <Card title="1 · งานช้า 500ms + remember()">
          <p class="muted">ครั้งแรกรอจริง ครั้งต่อไปภายใน 10 วินาทีได้จาก cache แทบไม่ใช้เวลา</p>
          <Button hx-post="/examples/cache/slow" hx-target="#slow-result" hx-disabled-elt="this">
            เรียกงานช้า
          </Button>
          <div id="slow-result" class="result-area"></div>
        </Card>

        <Card title="2 · เก็บค่าเอง (set / get / ttl)">
          <form class="form" hx-post="/examples/cache/keys" hx-target="#demo-keys" hx-swap="outerHTML">
            <input name="key" placeholder="key เช่น hello" required maxlength="40" />
            <input name="value" placeholder="ค่า" required maxlength="200" />
            <input
              name="ttl"
              type="number"
              placeholder="ttl (วินาที)"
              min="1"
              max="3600"
              value="30"
              style="flex:0 1 120px"
            />
            <Button type="submit">set</Button>
          </form>
          <DemoKeys />
        </Card>
      </div>

      <Card title="วิธีใช้">
        <CodeBlock label="ตัวอย่างโค้ด" code={usage} />
        <p class="muted small">
          ตอนนี้ใช้กับ: รายชื่อผู้ใช้ (ล้างเมื่อเพิ่ม/ลบ), ผลค้นหาสินค้า, ไฟล์ static ที่บีบอัดแล้ว และทุกหน้าที่มี{' '}
          <code>export const cache</code> (ดู ⚡ ในตาราง route ตอนเปิดเซิร์ฟเวอร์)
        </p>
      </Card>
    </Example>
  )
}
