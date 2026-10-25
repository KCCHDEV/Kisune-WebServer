// GET /examples/sse/stream — สตรีม event ทุก 1 วินาที จนกว่า client จะตัดการเชื่อมต่อ
import { sse } from 'elysia'

let clients = 0
let price = 1_000

export const GET = async function* () {
  clients++
  try {
    while (true) {
      price = Math.max(1, price + (Math.random() - 0.5) * 20)
      yield sse({ event: 'clock', data: new Date().toLocaleTimeString('th-TH') })
      yield sse({ event: 'memory', data: String(Math.round(process.memoryUsage().rss / 1024 / 1024)) })
      yield sse({ event: 'clients', data: String(clients) })
      yield sse({ event: 'price', data: price.toFixed(2) })
      await Bun.sleep(1000)
    }
  } finally {
    // ทำงานเมื่อ client ปิด connection
    clients--
  }
}
