// GET /examples — รวมตัวอย่างทั้งหมด
import { Layout, ExampleGrid, PageHeader } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที

export default function Examples() {
  return (
    <Layout title="ตัวอย่าง" path="/examples">
      <PageHeader
        eyebrow="Examples"
        title="ตัวอย่างทั้งหมด"
        lead="ทุกตัวอย่างอยู่ใน src/pages/examples เปิดไฟล์แล้วแก้ได้เลย และท้ายแต่ละหน้ามีโค้ดจริงของหน้านั้นให้ดู"
      />
      <ExampleGrid />
    </Layout>
  )
}
