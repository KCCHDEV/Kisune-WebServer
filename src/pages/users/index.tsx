// /users
import { defineRoute, t } from '@core/route'
import { Layout, Card, Button, UserRow, PageHeader } from '@components'
import { users } from '../../lib/db'

export default function UsersPage() {
  const list = users.all()

  return (
    <Layout title="ผู้ใช้" path="/users">
      <PageHeader
        eyebrow="ตัวอย่าง · CRUD + SQLite"
        title="🗃️ ผู้ใช้"
        lead="เพิ่ม/ลบด้วย htmx ข้อมูลเก็บใน bun:sqlite · มี REST API คู่กันที่ /api/users"
        back={{ href: '/examples', label: 'ตัวอย่างทั้งหมด' }}
      />

      <Card title="เพิ่มผู้ใช้">
        <form
          class="form"
          hx-post="/users"
          hx-target="#user-list"
          hx-swap="afterbegin"
          hx-on--after-request="if(event.detail.successful && !event.detail.xhr.getResponseHeader('HX-Retarget')) this.reset()"
        >
          <input name="name" placeholder="ชื่อ" required />
          <input name="email" type="email" placeholder="อีเมล" required />
          <Button type="submit">เพิ่ม</Button>
        </form>
        <p id="form-error" class="error"></p>
      </Card>

      <ul id="user-list" class="list">
        {list.map((u) => <UserRow user={u} />)}
      </ul>
    </Layout>
  )
}

// POST /users  — รับ form จาก htmx แล้วส่งกลับแถวใหม่ 1 แถว
export const POST = defineRoute({
  body: t.Object({ name: t.String({ minLength: 1 }), email: t.String() }),
  handler: ({ body, set }) => {
    try {
      return <UserRow user={users.create(body.name.trim(), body.email.trim())} />
    } catch {
      // ส่ง error ไปแสดงที่ #form-error แทน
      set.headers['HX-Retarget'] = '#form-error'
      set.headers['HX-Reswap'] = 'innerHTML'
      return <span>อีเมลนี้มีอยู่แล้ว</span>
    }
  },
})
