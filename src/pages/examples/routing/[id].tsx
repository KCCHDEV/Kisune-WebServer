// GET /examples/routing/:id  — อ่าน params และ query
import { defineRoute, t } from '@core/route'
import { Example, Card } from '@components'

export const cache = 60 // cache ทั้งหน้า 60 วินาที (แยกตาม URL รวม query)

export const GET = defineRoute({
  params: t.Object({ id: t.String() }),
  query: t.Object({
    sort: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
    tab: t.Optional(t.String()),
  }),
  handler: ({ params, query, path }) => (
    <Example title={`🧭 /examples/routing/${params.id}`} desc="ค่าจาก URL ถูกแยกและตรวจชนิดให้แล้ว" file={import.meta.path}>
      <Card>
        <dl class="dl">
          <dt>path</dt><dd><code safe>{decodeURIComponent(path)}</code></dd>
          <dt>params.id</dt><dd><code safe>{params.id}</code></dd>
          <dt>query.sort</dt><dd><code>{query.sort ?? '(ไม่มี)'}</code></dd>
          <dt>query.tab</dt><dd><code safe>{query.tab ?? '(ไม่มี)'}</code></dd>
        </dl>
        <p class="muted small" style="margin-top:12px">
          ลอง <a href={`/examples/routing/${encodeURIComponent(params.id)}?sort=oops`}>?sort=oops</a> จะได้ 422
          เพราะ sort รับแค่ asc หรือ desc
        </p>
      </Card>
      <p><a href="/examples/routing">← กลับ</a></p>
    </Example>
  ),
})
