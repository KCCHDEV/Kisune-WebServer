// /examples/cache/keys — set / ลบ key ของ demo (จำกัดไว้ที่ demo:key:* ไม่แตะ cache ส่วนอื่น)
import { defineRoute, t } from '@core/route'
import { cache } from '@core/cache'
import { Button } from '@components'

const PREFIX = 'demo:key:'

/** รายการ key ของ demo พร้อมเวลาที่เหลือ */
export function DemoKeys() {
  const keys = cache.keys(`${PREFIX}*`).slice(0, 20)
  return (
    <div id="demo-keys" class="result-area">
      {keys.length ? (
        <table class="table">
          <tbody>
            {keys.map((k) => (
              <tr>
                <td>
                  <code safe>{k.slice(PREFIX.length)}</code>
                </td>
                <td safe>{String(cache.get(k))}</td>
                <td class="num muted" safe>{`${cache.ttl(k)}s`}</td>
                <td class="num">
                  <Button
                    variant="ghost"
                    class="btn-sm"
                    hx-delete={`/examples/cache/keys?key=${encodeURIComponent(k.slice(PREFIX.length))}`}
                    hx-target="#demo-keys"
                    hx-swap="outerHTML"
                  >
                    ลบ
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="muted small">ยังไม่มี key — ลอง set ดู</p>
      )}
    </div>
  )
}

export const POST = defineRoute({
  body: t.Object({
    key: t.String({ minLength: 1, maxLength: 40 }),
    value: t.String({ maxLength: 200 }),
    ttl: t.Numeric({ minimum: 1, maximum: 3600 }),
  }),
  handler: ({ body }) => {
    cache.set(PREFIX + body.key, body.value, { ttl: body.ttl })
    return <DemoKeys />
  },
})

export const DELETE = defineRoute({
  query: t.Object({ key: t.String() }),
  handler: ({ query }) => {
    cache.del(PREFIX + query.key)
    return <DemoKeys />
  },
})
