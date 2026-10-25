// /users/:id
import { defineRoute, t } from '@core/route'
import { Layout, Card } from '@components'
import { users } from '../../lib/db'
import NotFound from '../_404'

const params = t.Object({ id: t.Numeric() })

export const GET = defineRoute({
  params,
  handler: ({ params, set }) => {
    const user = users.find(params.id)
    if (!user) {
      set.status = 404
      return <NotFound />
    }

    return (
      <Layout title={user.name} path="/users">
        <p><a href="/users">← กลับ</a></p>
        <Card title={user.name}>
          <dl class="dl">
            <dt>ID</dt><dd>{user.id}</dd>
            <dt>อีเมล</dt><dd safe>{user.email}</dd>
            <dt>สร้างเมื่อ</dt><dd safe>{user.created_at}</dd>
          </dl>
        </Card>
      </Layout>
    )
  },
})

// DELETE /users/:id  — htmx จะเอาค่าว่างไปแทนแถว = แถวหายไป
export const DELETE = defineRoute({
  params,
  handler: ({ params }) => {
    users.remove(params.id)
    return ''
  },
})
