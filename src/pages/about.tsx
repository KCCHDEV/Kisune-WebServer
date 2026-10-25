// GET /about — โครงสร้างโปรเจกต์
import { Layout, Card, CodeBlock, PageHeader } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที

const tree = `
index.tsx              จุดเริ่มต้น: createApp() แล้ว listen
core/                  ระบบ loader (ปกติไม่ต้องแก้)
  app.ts               plugin, error handler, Server-Timing
  router.ts            file-based router (+ WebSocket)
  route.ts             defineRoute / defineGuard / defineSocket
src/
  api/                 JSON API → /api/...
  pages/               หน้าเว็บ JSX + htmx → /...
    examples/          ตัวอย่างทั้งหมด
    benchmark/         หน้าทดสอบความเร็ว
  components/          import { X } from '@components'
  lib/                 db.ts, bench.ts ฯลฯ
public/                ไฟล์ static → /public/...
tests/                 bun test
scripts/bench.ts       ยิงโหลดจาก CLI
`

export default function About() {
  return (
    <Layout title="โครงสร้าง" path="/about">
      <PageHeader eyebrow="Project" title="โครงสร้างโปรเจกต์" lead="เพิ่มไฟล์ = เพิ่ม route · เพิ่ม component = import ได้ทันที" />

      <CodeBlock label="โฟลเดอร์" code={tree} lang="sh" />

      <div class="grid">
        <Card title="📁 Pages">
          <p>สร้างไฟล์ใน <code>src/pages</code> แล้วได้หน้าเว็บทันที</p>
          <pre>src/pages/about.tsx → /about</pre>
        </Card>
        <Card title="⚡ API">
          <p>สร้างไฟล์ใน <code>src/api</code> ได้ JSON API</p>
          <pre>src/api/hello.ts → /api/hello</pre>
          <a href="/api/hello?name=Bun" hx-boost="false">ลองเปิด /api/hello →</a>
        </Card>
        <Card title="🧩 Components">
          <p>วางไฟล์ใน <code>src/components</code> แล้ว import รวม</p>
          <pre>{"import { Card } from '@components'"}</pre>
        </Card>
      </div>

      <Card title="คำสั่ง">
        <CodeBlock
          label="terminal"
          code={`bun dev        # โหมดพัฒนา (auto-reload)
bun start      # โหมด production
bun test       # รันเทส
bun run bench  # ยิงโหลดใส่เซิร์ฟเวอร์ที่เปิดอยู่
bun run check  # ตรวจ type + XSS`}
        />
      </Card>
    </Layout>
  )
}
