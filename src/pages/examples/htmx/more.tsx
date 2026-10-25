// GET /examples/htmx/more?after=ID — แถวถัดไป + แถว "ตัวกระตุ้น" สำหรับชุดถัดไป
import { defineRoute, t } from '@core/route'
import { ProductRows } from '@components'
import { products, PRODUCT_COUNT } from '../../../lib/db'

const PER_PAGE = 20

export const GET = defineRoute({
  query: t.Object({ after: t.Numeric({ minimum: 0 }) }),
  handler: ({ query }) => {
    const items = products.page(PER_PAGE, query.after)
    const last = items.at(-1)

    return (
      <>
        <ProductRows items={items} />
        {last && items.length === PER_PAGE ? (
          <tr hx-get={`/examples/htmx/more?after=${last.id}`} hx-trigger="intersect once" hx-swap="outerHTML">
            <td colspan="4" class="muted">กำลังโหลด…</td>
          </tr>
        ) : (
          <tr>
            <td colspan="4" class="muted" safe>{`ครบ ${PRODUCT_COUNT.toLocaleString('en-US')} รายการแล้ว`}</td>
          </tr>
        )}
      </>
    )
  },
})
