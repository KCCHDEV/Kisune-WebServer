// /examples/auth — login แล้วเก็บชื่อใน cookie ที่เซ็นลายเซ็น (ตั้งค่า secrets ใน core/app.ts)
import { defineRoute, t, type RouteContext } from '@core/route'
import { Example, Card, Button } from '@components'

export const DEMO_PASSWORD = 'elysia'

export default function AuthExample({ cookie }: RouteContext) {
  const user = cookie.session?.value as string | undefined

  return (
    <Example
      title="🔐 Login + Cookie + Guard"
      desc="หน้า /examples/auth/dashboard ถูกกันด้วย _guard.ts ถ้ายังไม่ login จะถูกส่งกลับมาหน้านี้"
      file={import.meta.path}
      related={[`${import.meta.dir}/dashboard/_guard.ts`, `${import.meta.dir}/dashboard/index.tsx`]}
    >
      {user ? (
        <Card title="login อยู่แล้ว">
          <p>
            สวัสดีคุณ <strong safe>{user}</strong> · <a href="/examples/auth/dashboard">ไปที่ dashboard →</a>
          </p>
        </Card>
      ) : (
        <Card title="เข้าสู่ระบบ">
          <form class="form" hx-post="/examples/auth" hx-target="#login-error">
            <input name="username" placeholder="ชื่อผู้ใช้ (อะไรก็ได้)" required />
            <input name="password" type="password" placeholder="รหัสผ่าน" required />
            <Button type="submit">เข้าสู่ระบบ</Button>
          </form>
          <p id="login-error" class="error"></p>
          <p class="muted small">
            รหัสผ่านของ demo คือ <code>{DEMO_PASSWORD}</code> · หรือลองเปิด{' '}
            <a href="/examples/auth/dashboard">dashboard</a> ตรงๆ ตอนยังไม่ login
          </p>
        </Card>
      )}
    </Example>
  )
}

// POST /examples/auth — ตรวจรหัสผ่าน แล้วตั้ง cookie
export const POST = defineRoute({
  body: t.Object({ username: t.String({ minLength: 1, maxLength: 30 }), password: t.String() }),
  handler: ({ body, cookie, set }) => {
    if (body.password !== DEMO_PASSWORD) return 'รหัสผ่านไม่ถูกต้อง'

    cookie.session!.set({
      value: body.username.trim(),
      httpOnly: true, // JavaScript ฝั่ง browser อ่านไม่ได้
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 ชั่วโมง
    })
    set.headers['HX-Redirect'] = '/examples/auth/dashboard' // ให้ htmx เปลี่ยนหน้า
    return ''
  },
})
