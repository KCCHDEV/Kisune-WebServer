// /api/users
import { defineRoute, t } from '@core/route'
import { users } from '../../lib/db'

// GET /api/users
export const GET = () => users.all()

// POST /api/users   { "name": "...", "email": "..." }
export const POST = defineRoute({
  body: t.Object({
    name: t.String({ minLength: 1 }),
    email: t.String({ format: 'email' }),
  }),
  handler: ({ body, set }) => {
    try {
      set.status = 201
      return users.create(body.name, body.email)
    } catch {
      set.status = 409
      return { error: 'อีเมลนี้มีอยู่แล้ว' }
    }
  },
})
