// /examples/upload — รับไฟล์ multipart พร้อมจำกัดขนาด แล้วคำนวณ SHA-256
import { defineRoute, t } from '@core/route'
import { Example, Card, Button } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที (เฉพาะ GET)

const MAX = '5m'

export default function UploadExample() {
  return (
    <Example
      title="📤 อัปโหลดไฟล์"
      desc="t.File() ตรวจขนาดให้ก่อนถึง handler แล้วอ่านไฟล์ด้วย Web API มาตรฐาน (File / Blob)"
      file={import.meta.path}
    >
      <Card title="เลือกไฟล์ (ไม่เกิน 5 MB)">
        <form
          class="form"
          hx-post="/examples/upload"
          hx-encoding="multipart/form-data"
          hx-target="#upload-result"
          hx-disabled-elt="find button"
        >
          <input type="file" name="file" required />
          <Button type="submit">อัปโหลด</Button>
          <span class="htmx-indicator muted">กำลังส่ง…</span>
        </form>
        <div id="upload-result" class="result-area"></div>
        <p class="muted small">ไฟล์ไม่ถูกบันทึกลงดิสก์ ถ้าจะเก็บจริงใช้ <code>await Bun.write(`uploads/${'${name}'}`, file)</code></p>
      </Card>
    </Example>
  )
}

// POST /examples/upload
export const POST = defineRoute({
  body: t.Object({ file: t.File({ maxSize: MAX, error: 'ต้องเลือกไฟล์ ขนาดไม่เกิน 5 MB' }) }),
  handler: async ({ body: { file } }) => {
    const start = Bun.nanoseconds()
    const bytes = await file.arrayBuffer()
    const sha256 = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
    const ms = ((Bun.nanoseconds() - start) / 1e6).toFixed(2)

    // รูปเล็กๆ แสดงตัวอย่างกลับไปได้เลย (data URL)
    const preview =
      file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024
        ? `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`
        : null

    return (
      <div class="alert alert-ok">
        <dl class="dl">
          <dt>ชื่อไฟล์</dt><dd safe>{file.name}</dd>
          <dt>ชนิด</dt><dd safe>{file.type || '(ไม่ทราบ)'}</dd>
          <dt>ขนาด</dt><dd safe>{`${file.size.toLocaleString('en-US')} bytes`}</dd>
          <dt>SHA-256</dt><dd><code class="break" safe>{sha256}</code></dd>
          <dt>อ่าน + hash</dt><dd safe>{`${ms} ms`}</dd>
        </dl>
        {preview ? <img src={preview} alt="ตัวอย่างรูป" class="preview" /> : ''}
      </div>
    )
  },
})
