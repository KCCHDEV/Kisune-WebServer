// /examples/validation — t.Object: ได้ทั้ง validation และ TypeScript type จาก schema เดียว
import { defineRoute, t } from '@core/route'
import { Example, Card, Button } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที (เฉพาะ GET — POST ไม่ถูก cache)

const schema = t.Object({
  name: t.String({ minLength: 2, maxLength: 40, error: 'ชื่อต้องยาว 2–40 ตัวอักษร' }),
  email: t.String({ format: 'email', error: 'รูปแบบอีเมลไม่ถูกต้อง' }),
  age: t.Numeric({ minimum: 1, maximum: 120, error: 'อายุต้องเป็นตัวเลข 1–120' }),
  plan: t.Union([t.Literal('free'), t.Literal('pro')], { error: 'เลือกแพ็กเกจ free หรือ pro' }),
})

export default function ValidationExample() {
  return (
    <Example
      title="✅ Validation"
      desc="ประกาศ schema ครั้งเดียว Elysia ตรวจข้อมูลให้ก่อนเข้า handler และ body มี type ทันที"
      file={import.meta.path}
    >
      <Card title="ลองส่งข้อมูลผิดดู">
        <p class="muted">
          ปิดการตรวจฝั่ง browser ไว้ (<code>novalidate</code>) เพื่อให้เห็นว่าเซิร์ฟเวอร์ตอบ 422 พร้อมรายการ error
        </p>
        <form class="form form-stack" hx-post="/examples/validation" hx-target="#validation-result" novalidate>
          <input name="name" placeholder="ชื่อ (2–40 ตัว)" value="ก" />
          <input name="email" placeholder="อีเมล" value="not-an-email" />
          <input name="age" placeholder="อายุ" value="200" />
          <select name="plan">
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise (ไม่อนุญาต)</option>
          </select>
          <Button type="submit">ส่ง</Button>
        </form>
        <div id="validation-result" class="result-area"></div>
      </Card>

      <Card title="ใช้กับ JSON API ก็ได้">
        <pre>{`curl -X POST localhost:3000/api/users \
  -H "content-type: application/json" \
  -d '{"name":"","email":"x"}'
# → 422 { "error": "ข้อมูลไม่ถูกต้อง", "issues": [...] }`}</pre>
      </Card>
    </Example>
  )
}

// POST /examples/validation — มาถึงตรงนี้ได้ = ข้อมูลผ่านแล้วทุกข้อ
export const POST = defineRoute({
  body: schema,
  handler: ({ body }) => (
    // body: { name: string; email: string; age: number; plan: 'free' | 'pro' }
    <div class="alert alert-ok">
      <strong>ผ่าน ✅</strong> สวัสดีคุณ <span safe>{body.name}</span> อายุ {body.age} ปี แพ็กเกจ{' '}
      <code>{body.plan}</code>
    </div>
  ),
})
