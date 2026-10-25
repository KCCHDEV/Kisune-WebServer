import type { PropsWithChildren } from '@kitajs/html'
import Layout from './Layout'
import Source from './Source'
import PageHeader from './PageHeader'

type Props = PropsWithChildren<{
  title: string
  /** คำอธิบายสั้นๆ ใต้หัวข้อ */
  desc: string
  /** import.meta.path ของหน้านั้น — แสดงโค้ดจริงท้ายหน้า */
  file: string
  /** path ปัจจุบัน (สำหรับเมนู) */
  path?: string
  /** ไฟล์อื่นที่เกี่ยวข้อง เช่น API หรือ _guard.ts */
  related?: string[]
}>

/** โครงหน้าของทุกตัวอย่าง: หัวเรื่อง → demo → โค้ด */
export default function Example({ title, desc, file, path = '/examples', related = [], children }: Props) {
  return (
    <Layout title={title} path={path}>
      <PageHeader eyebrow="ตัวอย่าง" title={title} lead={desc} back={{ href: '/examples', label: 'ตัวอย่างทั้งหมด' }} />
      <div class="stack">{children}</div>
      <section class="sources">
        <h2 class="sources-title">โค้ดที่ใช้ในหน้านี้</h2>
        <Source file={file} />
        {related.map((f) => (
          <Source file={f} />
        ))}
      </section>
    </Layout>
  )
}
