// GET /api/bench/html — render JSX → HTML (ตาราง 50 แถวจาก DB) แบบที่หน้าเว็บจริงทำ
import { products } from '../../lib/db'

const num = new Intl.NumberFormat('en-US')

export const GET = () => {
  const afterId = Math.floor(Math.random() * 9_950)
  return (
    <table>
      <tbody>
        {products.page(50, afterId).map((p) => (
          <tr>
            <td>{p.id}</td>
            <td safe>{p.name}</td>
            <td safe>{num.format(p.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
