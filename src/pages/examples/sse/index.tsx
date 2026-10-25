// GET /examples/sse — รับข้อมูลสดจากเซิร์ฟเวอร์ด้วย htmx sse extension
import { Example, Card } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที

export default function SseExample() {
  return (
    <Example
      title="📡 Server-Sent Events"
      desc="เซิร์ฟเวอร์ push HTML ชิ้นเล็กๆ มาทุกวินาทีผ่าน connection เดียว ฝั่ง browser ไม่ต้องเขียน JavaScript"
      file={import.meta.path}
      related={[`${import.meta.dir}/stream.ts`]}
    >
      <div hx-ext="sse" sse-connect="/examples/sse/stream">
        <div class="stat-row">
          <div class="stat">
            <span class="stat-value" sse-swap="clock">--:--:--</span>
            <span class="stat-label">เวลาเซิร์ฟเวอร์</span>
          </div>
          <div class="stat">
            <span class="stat-value" sse-swap="memory">–</span>
            <span class="stat-label">หน่วยความจำ (MB)</span>
          </div>
          <div class="stat">
            <span class="stat-value" sse-swap="clients">–</span>
            <span class="stat-label">คนที่เปิดหน้านี้อยู่</span>
          </div>
          <div class="stat">
            <span class="stat-value" sse-swap="price">–</span>
            <span class="stat-label">ราคาจำลอง (สุ่ม)</span>
          </div>
        </div>
      </div>

      <Card title="ทำงานยังไง">
        <ol>
          <li>
            <code>sse-connect</code> เปิด <code>EventSource</code> ไปที่ <code>/examples/sse/stream</code>
          </li>
          <li>
            เซิร์ฟเวอร์ใช้ <code>async function*</code> แล้ว <code>yield sse({'{'} event, data {'}'})</code> ทุกวินาที
          </li>
          <li>
            element ที่มี <code>sse-swap="ชื่อ event"</code> ถูกแทนที่ด้วย data ของ event นั้น
          </li>
          <li>เปลี่ยนหน้าหรือปิดแท็บ connection ก็ปิดเอง และ generator ฝั่งเซิร์ฟเวอร์ก็หยุดตาม</li>
        </ol>
        <p class="muted small">ลองเปิดหน้านี้หลายแท็บ แล้วดูตัวเลข "คนที่เปิดหน้านี้อยู่"</p>
      </Card>
    </Example>
  )
}
