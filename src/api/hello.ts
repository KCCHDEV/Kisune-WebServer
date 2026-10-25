// GET /api/hello?name=xxx
import { defineRoute, t } from '@core/route'

export const GET = defineRoute({
  query: t.Object({ name: t.Optional(t.String()) }),
  handler: ({ query }) => ({
    message: `สวัสดี ${query.name ?? 'ชาวโลก'} 👋`,
    time: new Date().toISOString(),
  }),
})
