// GET /tutorial/bundle — โค้ดวิดีโอสอนใช้ (tutorial/main.ts) เป็น JS ไฟล์เดียว
import { bundle } from '../trailer/_bundle'

export const GET = bundle('tutorial/main.ts')
