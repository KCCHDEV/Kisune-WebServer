// /api/users/:id
import { defineRoute, t } from '@core/route'
import { users } from '../../lib/db'

const params = t.Object({ id: t.Numeric() })

// GET /api/users/:id
export const GET = defineRoute({
  params,
  handler: ({ params, status }) => users.find(params.id) ?? status(404, { error: 'ไม่พบผู้ใช้' }),
})

// DELETE /api/users/:id
export const DELETE = defineRoute({
  params,
  handler: ({ params, status }) =>
    users.remove(params.id) ? { ok: true } : status(404, { error: 'ไม่พบผู้ใช้' }),
})
