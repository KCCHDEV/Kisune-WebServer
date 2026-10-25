// GET /api/bench/cached — ตาราง 50 แถวเหมือน /api/bench/html แต่ cache ทั้ง response ไว้
// เทียบกับ html ดูว่า render + query ทุกครั้ง กับดึงจาก cache (บีบอัดไว้แล้ว) ต่างกันแค่ไหน
import { products } from '../../lib/db'

export const cache = 60

const num = new Intl.NumberFormat('en-US')

export const GET = () => (
  <table>
    <tbody>
      {products.page(50, 0).map((p) => (
        <tr>
          <td>{p.id}</td>
          <td safe>{p.name}</td>
          <td safe>{num.format(p.price)}</td>
        </tr>
      ))}
    </tbody>
  </table>
)
