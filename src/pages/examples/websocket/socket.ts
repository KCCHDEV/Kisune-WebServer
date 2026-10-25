// ws://host/examples/websocket/socket — ข้อความของทุกคนส่งผ่าน topic "chat"
import { Html } from '@kitajs/html'
import { defineSocket, t } from '@core/route'

const ROOM = 'chat'
let online = 0

/** ชิ้น HTML ที่ htmx จะเอาไปต่อท้าย #chat-log */
const line = (html: string) => `<ul hx-swap-oob="beforeend:#chat-log"><li>${html}</li></ul>`
const system = (text: string) => line(`<span class="muted small">${Html.escapeHtml(text)}</span>`)

export const WS = defineSocket({
  body: t.Object(
    { name: t.String({ maxLength: 20 }), message: t.String({ minLength: 1, maxLength: 200 }) },
    { additionalProperties: true }, // htmx ws แนบ HEADERS มาด้วยทุกข้อความ
  ),

  open(ws) {
    online++
    ws.subscribe(ROOM)
    ws.send(`<ul id="chat-log" class="chat-log" hx-swap-oob="outerHTML"></ul>`) // ล้าง "กำลังเชื่อมต่อ…"
    ws.send(system(`เชื่อมต่อแล้ว · ออนไลน์ ${online} คน`))
    ws.publish(ROOM, system(`มีคนเข้ามาใหม่ · ออนไลน์ ${online} คน`))
  },

  message(ws, { name, message }) {
    const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const html = line(
      `<span class="muted small">${time}</span> <strong>${Html.escapeHtml(name || 'ไม่ระบุชื่อ')}</strong> ${Html.escapeHtml(message)}`,
    )
    ws.send(html) // ตัวเอง
    ws.publish(ROOM, html) // คนอื่นในห้อง
  },

  close(ws) {
    online--
    ws.publish(ROOM, system(`มีคนออกไป · ออนไลน์ ${online} คน`))
  },
})
