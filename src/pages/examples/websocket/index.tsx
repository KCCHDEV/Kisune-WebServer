// GET /examples/websocket — ห้องแชทด้วย htmx ws extension
import { Example, Card, Button } from '@components'

export const cache = 300 // cache ทั้งหน้า 300 วินาที

export default function WebSocketExample() {
  return (
    <Example
      title="💬 WebSocket chat"
      desc="เปิดหน้านี้สองแท็บแล้วคุยกันได้เลย ใช้ pub/sub ในตัวของ Bun ส่งข้อความหาทุกคนในห้อง"
      file={import.meta.path}
      related={[`${import.meta.dir}/socket.ts`]}
    >
      <Card>
        <div hx-ext="ws" ws-connect="/examples/websocket/socket" class="chat">
          <ul id="chat-log" class="chat-log">
            <li class="muted small">กำลังเชื่อมต่อ…</li>
          </ul>
          <form ws-send class="form" hx-on--ws-after-send="this.message.value=''">
            <input name="name" placeholder="ชื่อ" value="ผู้มาเยือน" maxlength="20" style="flex:0 1 140px" />
            <input name="message" placeholder="พิมพ์ข้อความ…" maxlength="200" required autocomplete="off" />
            <Button type="submit">ส่ง</Button>
          </form>
        </div>
      </Card>

      <Card title="ทำงานยังไง">
        <ol>
          <li><code>ws-connect</code> เปิด WebSocket, <code>ws-send</code> ส่งค่าในฟอร์มเป็น JSON</li>
          <li>
            ไฟล์ <code>socket.ts</code> <code>export const WS = defineSocket(...)</code> router ทำเป็น WebSocket ให้
          </li>
          <li>เซิร์ฟเวอร์ส่ง HTML ที่มี <code>hx-swap-oob</code> กลับไป htmx เอาไปต่อท้าย <code>#chat-log</code></li>
        </ol>
      </Card>
    </Example>
  )
}
