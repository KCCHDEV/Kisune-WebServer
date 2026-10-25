// ใช้กับทุก route ใน src/api/admin/** อัตโนมัติ
// ตัวอย่าง: ต้องส่ง header  x-api-key: <ADMIN_KEY>
import { defineGuard } from '@core/route'

export default defineGuard({
  derive: ({ headers }) => ({ isAdmin: headers['x-api-key'] === (process.env.ADMIN_KEY ?? 'dev-secret') }),

  beforeHandle: ({ isAdmin, status }) => {
    if (!isAdmin) return status(401, { error: 'ต้องใส่ x-api-key ที่ถูกต้อง' })
  },
})
