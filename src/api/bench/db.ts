// GET /api/bench/db — อ่าน 1 แถวจาก SQLite ด้วย prepared statement (สุ่ม id จาก 10,000 แถว)
import { products, PRODUCT_COUNT } from '../../lib/db'

export const GET = () => products.find(1 + Math.floor(Math.random() * PRODUCT_COUNT))
