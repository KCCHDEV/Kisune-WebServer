// GET /api/bench/info — ข้อมูลเครื่อง/runtime ที่ใช้ทดสอบ
import { serverInfo } from '../../lib/bench'

export const GET = () => serverInfo()
