// หน้า 404 (ไฟล์ที่ขึ้นต้นด้วย _ ไม่ถูกทำเป็น route — index.tsx เรียกใช้เอง)
import { Layout } from '@components'

export default function NotFound() {
  return (
    <Layout title="ไม่พบหน้า">
      <div class="not-found">
        <p class="not-found-code gradient-text">404</p>
        <h1>ไม่พบหน้าที่ต้องการ</h1>
        <p class="muted">ลิงก์อาจผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
        <div class="hero-cta">
          <a href="/" class="btn btn-primary">กลับหน้าแรก</a>
          <a href="/examples" class="btn btn-outline">ดูตัวอย่าง</a>
        </div>
      </div>
    </Layout>
  )
}
