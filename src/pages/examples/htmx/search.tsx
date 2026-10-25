// GET /examples/htmx/search?q=... — ค้นหาใน SQLite แล้วส่งกลับเป็นตาราง
import { defineRoute, t } from '@core/route'
import { ProductRows } from '@components'
import { products } from '../../../lib/db'

export const GET = defineRoute({
  query: t.Object({ q: t.Optional(t.String({ maxLength: 50 })) }),
  handler: ({ query }) => {
    const q = query.q?.trim() ?? ''
    if (!q) return <p class="muted small">พิมพ์เพื่อค้นหา</p>

    const start = Bun.nanoseconds()
    const { items, total } = products.search(q, 20)
    const us = ((Bun.nanoseconds() - start) / 1000).toFixed(0)

    return (
      <>
        <p class="muted small" safe>
          {`พบ ${total.toLocaleString('en-US')} รายการ (แสดง ${items.length}) · ใช้ ${us} µs (คำค้นซ้ำมาจาก cache)`}
        </p>
        {items.length ? (
          <table class="table">
            <tbody>
              <ProductRows items={items} />
            </tbody>
          </table>
        ) : (
          ''
        )}
      </>
    )
  },
})
