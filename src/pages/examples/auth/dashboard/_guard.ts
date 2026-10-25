// ใช้กับทุก route ใน src/pages/examples/auth/dashboard/** อัตโนมัติ
import { defineGuard } from '@core/route'

export default defineGuard({
  // อ่านชื่อจาก cookie (ถ้าลายเซ็นไม่ตรง = ถูกแก้ไข จะไม่ผ่าน)
  derive: ({ cookie }) => ({ user: cookie.session?.value as string | undefined }),

  beforeHandle: ({ user, redirect }) => {
    if (!user) return redirect('/examples/auth')
  },
})
