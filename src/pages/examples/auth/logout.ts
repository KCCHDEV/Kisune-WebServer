// POST /examples/auth/logout — ลบ cookie แล้วกลับหน้า login
import type { RouteContext } from '@core/route'

export const POST = ({ cookie, set }: RouteContext) => {
  cookie.session?.remove()
  set.headers['HX-Redirect'] = '/examples/auth'
  return ''
}
