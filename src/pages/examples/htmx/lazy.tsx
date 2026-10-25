// GET /examples/htmx/lazy — จำลองงานช้า แล้วส่งผลลัพธ์กลับมาทีหลัง
export default async function Lazy() {
  await Bun.sleep(800)
  return (
    <div class="alert alert-ok">
      โหลดเสร็จแล้ว ✅ <span class="muted small" safe>{new Date().toLocaleTimeString('th-TH')}</span>
    </div>
  )
}
