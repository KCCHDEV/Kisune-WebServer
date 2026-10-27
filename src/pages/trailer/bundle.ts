// GET /trailer/bundle — โค้ด WebGL ของ trailer (trailer/main.ts) เป็น JS ไฟล์เดียว
import { bundle } from './_bundle'

export const GET = bundle('trailer/main.ts')
