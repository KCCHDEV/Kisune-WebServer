// GET /api/bench/inprocess?n=50000 — วัดความเร็ว Elysia ในตัว process (ดู src/lib/bench.ts)
import { defineRoute, t } from '@core/route'
import { runInProcess } from '../../lib/bench'

export const GET = defineRoute({
  query: t.Object({ n: t.Optional(t.Numeric({ minimum: 1_000, maximum: 200_000 })) }),
  handler: ({ query }) => runInProcess(query.n ?? 50_000),
  detail: { summary: 'วัด req/s ของ Elysia แบบ in-process (ไม่ผ่าน network)' },
})
