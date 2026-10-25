import type { Product } from '../lib/db'

const baht = new Intl.NumberFormat('en-US')

/** แถวสินค้าในตาราง — ใช้ร่วมกันใน search / infinite scroll */
export default function ProductRows({ items }: { items: Product[] }) {
  return (
    <>
      {items.map((p) => (
        <tr>
          <td class="num muted">{p.id}</td>
          <td safe>{p.name}</td>
          <td safe>{p.category}</td>
          <td class="num" safe>{`฿${baht.format(p.price)}`}</td>
        </tr>
      ))}
    </>
  )
}
