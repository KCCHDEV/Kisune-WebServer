// GET /examples/auth/dashboard — ต้อง login ก่อน (ดู ./_guard.ts)
import type { RouteContext } from '@core/route'
import { Example, Card, Button } from '@components'

export default function Dashboard({ user, cookie }: RouteContext) {
  return (
    <Example title="🔐 Dashboard" desc="หน้านี้เห็นได้เฉพาะคนที่ login แล้ว" file={import.meta.path}>
      <Card title={`สวัสดี ${user}`}>
        <p>
          ค่า <code>user</code> มาจาก <code>derive</code> ใน <code>_guard.ts</code> ส่งต่อมาให้ทุกหน้าในโฟลเดอร์นี้
        </p>
        <dl class="dl">
          <dt>cookie.session</dt>
          <dd><code safe>{String(cookie.session?.value)}</code></dd>
          <dt>ใน browser จริง</dt>
          <dd class="muted">ค่าเดียวกัน + ลายเซ็น (HMAC) ต่อท้าย แก้เองไม่ได้</dd>
        </dl>
        <Button variant="ghost" hx-post="/examples/auth/logout" style="margin-top:12px">
          ออกจากระบบ
        </Button>
      </Card>
    </Example>
  )
}
