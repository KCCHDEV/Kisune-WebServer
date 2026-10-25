// GET /examples/routing/files/*  — wildcard: รับ path ที่เหลือทั้งหมด
import { Example, Card } from '@components'

export const cache = 60 // cache ทั้งหน้า 60 วินาที

export default function Files({ params }: { params: { '*': string } }) {
  const parts = decodeURIComponent(params['*']).split('/').filter(Boolean)

  return (
    <Example title="🧭 Wildcard route" desc="[...path].tsx รับทุกอย่างที่ตามหลังมาเป็นค่าเดียว" file={import.meta.path}>
      <Card title="params['*']">
        <ol class="breadcrumbs">
          {parts.map((p) => (
            <li safe>{p}</li>
          ))}
        </ol>
      </Card>
      <p><a href="/examples/routing">← กลับ</a></p>
    </Example>
  )
}
