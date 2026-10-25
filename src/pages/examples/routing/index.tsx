// GET /examples/routing
import { Example, Card } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที

const table = [
  ['src/pages/examples/routing/index.tsx', '/examples/routing'],
  ['src/pages/examples/routing/[id].tsx', '/examples/routing/:id'],
  ['src/pages/examples/routing/files/[...path].tsx', '/examples/routing/files/*'],
  ['src/pages/(group)/page.tsx', '/page  (วงเล็บไม่ขึ้นใน URL)'],
  ['src/pages/_private.tsx', 'ไม่เป็น route (ขึ้นต้นด้วย _)'],
]

const demos = [
  '/examples/routing/42',
  '/examples/routing/42?sort=desc&tab=info',
  '/examples/routing/สวัสดี',
  '/examples/routing/files/docs/2026/report.pdf',
]

export default function RoutingExample() {
  return (
    <Example
      title="🧭 Routing ตามไฟล์"
      desc="ไม่ต้องลงทะเบียน route ที่ไหน ตำแหน่งไฟล์คือ URL"
      file={import.meta.path}
      related={[
        import.meta.dir + '/[id].tsx',
        import.meta.dir + '/files/[...path].tsx',
      ]}
    >
      <Card title="ไฟล์ → URL">
        <table class="table">
          <thead>
            <tr><th>ไฟล์</th><th>URL</th></tr>
          </thead>
          <tbody>
            {table.map(([file, url]) => (
              <tr>
                <td><code safe>{file}</code></td>
                <td><code safe>{url}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="ลองกดดู">
        <ul class="link-list">
          {demos.map((href) => (
            <li><a href={href} safe>{href}</a></li>
          ))}
        </ul>
      </Card>
    </Example>
  )
}
