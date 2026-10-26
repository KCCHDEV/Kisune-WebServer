// GET / — หน้าแรกของแอพ · แก้ไฟล์นี้ได้เลย บันทึกแล้วหน้าเว็บรีโหลดเอง
import { Layout, PageHeader, Card, CodeBlock } from '@components'

export const cache = 60 // cache ทั้งหน้า 60 วินาที (ลบออกได้ถ้าหน้านี้ขึ้นกับผู้ใช้)

const pageCode = `
import { Layout } from '@components'

export default () => (
  <Layout title="Hello">
    <h1>สวัสดี!</h1>
  </Layout>
)`

const apiCode = `
import { defineRoute, t } from '@core/route'

export const POST = defineRoute({
  body: t.Object({ name: t.String() }),
  handler: ({ body }) => ({ hello: body.name }),
})`

export default function Home() {
  return (
    <Layout path="/">
      <PageHeader eyebrow="Kitsune" title="🦊 พร้อมเริ่มงานแล้ว" lead="แก้ไฟล์ src/pages/index.tsx แล้วบันทึก หน้านี้จะรีโหลดเอง" />
      <div class="grid">
        <Card title="📁 หน้าใหม่">
          <p>
            สร้างไฟล์ใน <code>src/pages</code> = ได้หน้าเว็บทันที
          </p>
          <CodeBlock label="src/pages/hello.tsx → /hello" code={pageCode} />
        </Card>
        <Card title="⚡ API ใหม่">
          <p>
            สร้างไฟล์ใน <code>src/api</code> พร้อม validation + type
          </p>
          <CodeBlock label="src/api/greet.ts → /api/greet" code={apiCode} />
        </Card>
      </div>
      <Card title="ลองเปิดดู">
        <ul class="link-list">
          <li>
            <a href="/api/hello?name=Kitsune" hx-boost="false">
              /api/hello
            </a>{' '}
            — JSON API ตัวอย่าง
          </li>
          <li>
            <a href="/api/health" hx-boost="false">
              /api/health
            </a>{' '}
            — health check
          </li>
          <li>
            <a href="/openapi" hx-boost="false">
              /openapi
            </a>{' '}
            — เอกสาร API อัตโนมัติ
          </li>
        </ul>
      </Card>
    </Layout>
  )
}
