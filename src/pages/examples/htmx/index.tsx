// /examples/htmx — รูปแบบที่ใช้บ่อยของ htmx โดยไม่ต้องเขียน JavaScript
import { Example, Card, Button, ProductRows } from '@components'
import { products } from '../../../lib/db'

let clicks = 0 // เก็บในหน่วยความจำ (รีสตาร์ทแล้วหาย)

export default function HtmxExample() {
  return (
    <Example
      title="🔁 htmx patterns"
      desc="เซิร์ฟเวอร์ส่ง HTML ชิ้นเล็กๆ กลับมา htmx เอาไปแปะในหน้า ไม่มี JSON และไม่ต้องมี framework ฝั่ง client"
      file={import.meta.path}
      related={['search.tsx', 'lazy.tsx', 'more.tsx'].map((f) => `${import.meta.dir}/${f}`)}
    >
      <div class="grid">
        <Card title="1 · Counter (hx-post)">
          <p class="muted">กดแล้ว POST ไปที่ไฟล์นี้เอง เซิร์ฟเวอร์ตอบแค่ตัวเลขกลับมา</p>
          <Button hx-post="/examples/htmx" hx-target="#clicks">+1</Button>
          <strong id="clicks" class="counter">{clicks}</strong>
        </Card>

        <Card title="2 · Lazy load (hx-trigger=load)">
          <p class="muted">หน้าโหลดเสร็จก่อน ส่วนที่ช้า (หน่วง 800ms) ค่อยตามมาทีหลัง</p>
          <div hx-get="/examples/htmx/lazy" hx-trigger="load">
            <span class="spinner"></span> กำลังโหลด…
          </div>
        </Card>
      </div>

      <Card title="3 · ค้นหาสด 10,000 รายการ (hx-trigger=input changed delay)">
        <input
          class="search"
          type="search"
          name="q"
          placeholder="ลองพิมพ์ เมาส์ RGB, จอ Pro, 1234 …"
          hx-get="/examples/htmx/search"
          hx-trigger="input changed delay:150ms, search"
          hx-target="#search-result"
          autocomplete="off"
        />
        <div id="search-result" class="result-area">
          <p class="muted small">พิมพ์เพื่อค้นหา</p>
        </div>
      </Card>

      <Card title="4 · Infinite scroll (hx-trigger=intersect)">
        <p class="muted">เลื่อนลงในกล่องนี้ แถวสุดท้ายมองเห็นเมื่อไหร่ก็โหลดหน้าถัดไปมาต่อ</p>
        <div class="scroll-box">
          <table class="table">
            <tbody>
              <ProductRows items={products.page(20, 0)} />
              <tr hx-get="/examples/htmx/more?after=20" hx-trigger="intersect once" hx-swap="outerHTML">
                <td colspan="4" class="muted">กำลังโหลด…</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </Example>
  )
}

// POST /examples/htmx — counter
export const POST = () => String(++clicks)
