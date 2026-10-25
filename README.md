# 🦊 Kitsune

> ว่องไว แสนกล ครบในตัวเดียว

Bun + Elysia + JSX (Kita HTML) + htmx — backend และ frontend อยู่ในโปรเจกต์เดียว

## เริ่มใช้งาน

```bash
bun install
bun dev          # โหมดพัฒนา (auto-reload)
bun start        # โหมด production
bun run start:cluster  # production ทุก CPU core (Linux)
bun test         # รันเทส (tests/)
bun run bench    # ยิงโหลดใส่เซิร์ฟเวอร์ที่เปิดอยู่ (scripts/bench.ts)
bun run check    # ตรวจ type + XSS
```

เปิด http://localhost:3000

| หน้า | มีอะไร |
| --- | --- |
| `/` | Landing page แนะนำ Elysia + วัดความเร็วสดจากเซิร์ฟเวอร์ |
| `/examples` | ตัวอย่างทั้งหมด (routing, validation, htmx, SSE, WebSocket, upload, auth, testing) แต่ละหน้าแสดงโค้ดของตัวเอง |
| `/benchmark` | ทดสอบความเร็ว: in-process, HTTP load test จาก browser (p50/p95/p99 + histogram), คำสั่ง CLI |
| `/openapi` | เอกสาร API อัตโนมัติ (Scalar) จาก schema ของ `src/api` |

## โครงสร้าง

```
index.tsx              จุดเริ่มต้น — รันไฟล์นี้ไฟล์เดียว
core/                  ระบบ loader (ปกติไม่ต้องแก้)
  app.ts               createApp(): plugin, error handler, Server-Timing (ใช้ทั้งเซิร์ฟเวอร์และเทส)
  router.ts            file-based router (+ WebSocket)
  components.ts        components loader
  route.ts             defineRoute / defineGuard / defineSocket
  dev.ts               auto-reload เมื่อเพิ่ม/ลบไฟล์
  logger.ts            console: banner, ตาราง route, request log
  cache.ts             in-memory cache แบบ Redis (LRU + TTL, จำกัด 128 MB)
  http-cache.ts        cache ทั้ง response + บีบอัด brotli/gzip + ETag
  static.ts            เสิร์ฟ /public และ /vendor (htmx) จากหน่วยความจำ
src/
  api/                 JSON API  → /api/...   (api/bench/* = endpoint สำหรับวัดความเร็ว)
  pages/               หน้าเว็บ JSX + htmx → /...
    examples/          ตัวอย่างทั้งหมด
    benchmark/         หน้าทดสอบความเร็ว
  components/          components → import { X } from '@components'
  lib/                 db.ts (users + products 10,000 แถว), bench.ts, examples.ts
public/                ไฟล์ static → /public/...  (bench.js = load test ฝั่ง browser)
tests/                 bun test (app.handle ไม่ต้องเปิดพอร์ต)
scripts/bench.ts       load test จาก CLI
```

## Routing ตามชื่อไฟล์

| ไฟล์                              | URL              |
| --------------------------------- | ---------------- |
| `src/pages/index.tsx`             | `/`              |
| `src/pages/about.tsx`             | `/about`         |
| `src/pages/users/[id].tsx`        | `/users/:id`     |
| `src/pages/docs/[...slug].tsx`    | `/docs/*`        |
| `src/pages/(shop)/cart.tsx`       | `/cart` (วงเล็บ = จัดกลุ่ม ไม่ขึ้น URL) |
| `src/api/users/index.ts`          | `/api/users`     |
| `_ชื่ออะไรก็ได้.ts` / `_folder/`    | ไม่เป็น route    |

### ไฟล์ API

```ts
// src/api/products.ts
import { defineRoute, t } from '@core/route'

export const GET = () => [{ id: 1, name: 'RTX 5090' }]

export const POST = defineRoute({
  body: t.Object({ name: t.String() }),
  handler: ({ body }) => ({ created: body.name }), // body มี type ให้เลย
})
```

### ไฟล์หน้าเว็บ

```tsx
// src/pages/contact.tsx
import { Layout, Card, Button } from '@components'

export default function Contact() {          // export default = GET
  return (
    <Layout title="ติดต่อ" path="/contact">
      <Card title="ติดต่อเรา">
        <Button hx-post="/contact" hx-target="#msg">ส่ง</Button>
        <p id="msg"></p>
      </Card>
    </Layout>
  )
}

export const POST = () => <span>ได้รับแล้ว ✅</span>  // htmx เอาไปแปะใน #msg
```

### WebSocket

ไฟล์ไหน `export const WS = defineSocket({ open, message, close })` จะได้ WebSocket ที่ path ของไฟล์นั้น — ดู `src/pages/examples/websocket/socket.ts`

### Guard (เหมือน middleware ของโฟลเดอร์)

สร้าง `_guard.ts` ในโฟลเดอร์ไหน ก็ใช้กับทุก route ในโฟลเดอร์นั้นและโฟลเดอร์ลูก — ดูตัวอย่างที่ `src/api/admin/_guard.ts`

```bash
curl localhost:3000/api/admin/stats -H "x-api-key: dev-secret"
```

## ความเร็ว & Cache

### In-memory cache (แบบ Redis ในตัวแอพ)

```ts
import { cache } from '@core/cache'

cache.set('user:1', user, { ttl: 60 })      // ttl = วินาที
cache.get('user:1')
cache.incr('views')
cache.delPattern('user:*')
const list = await cache.remember('users:all', 30, () => db.query('...').all())
```

- จำกัดหน่วยความจำ **128 MB** เป็นค่าเริ่มต้น (`CACHE_MAX_MB`) เต็มแล้วไล่ตัวที่ไม่ได้ใช้นานที่สุดออก (LRU)
- `remember()` กัน stampede: request ที่ miss พร้อมกันจะรอผลเดียวกัน คำนวณครั้งเดียว
- ดูสถิติได้ที่ `/examples/cache` หรือ `GET /api/cache` · ล้างทั้งหมด `DELETE /api/admin/cache` (ต้องมี x-api-key)

### Cache ทั้งหน้า: บรรทัดเดียว

```ts
// src/pages/about.tsx
export const cache = 300   // วินาที — เฉพาะ GET, เฉพาะสถานะ 200
```

HTML ถูกบีบอัด brotli/gzip ไว้ครั้งเดียว ส่งพร้อม ETag (ได้ 304 ถ้า browser มีอยู่แล้ว) และ `X-Cache: HIT/MISS`
**อย่าใส่กับหน้าที่ขึ้นกับผู้ใช้หรือ cookie** · route ที่ cache จะมี ⚡ ในตาราง route ตอนเปิดเซิร์ฟเวอร์

### อย่างอื่นที่ทำให้เร็ว

- ไฟล์ `/public` และ htmx (`/vendor`) เสิร์ฟจากหน่วยความจำ บีบอัดแล้ว · URL มี `?v=` จาก `asset()` → browser cache 1 ปี
- ไม่พึ่ง CDN สำหรับ JavaScript · ฟอนต์โหลดแบบไม่บล็อกการแสดงผล
- กดเมาส์ลงบนลิงก์เมนู/การ์ด = เริ่มโหลดหน้าทันที (htmx preload) ก่อนปล่อยนิ้ว
- SQLite: WAL + `synchronous=NORMAL` + mmap · prepared statement · keyset pagination
- `bun run start:cluster` รันหลาย process บนพอร์ตเดียว (Linux) — แต่ละ process มี cache ของตัวเอง

## Components

วางไฟล์ `.tsx` (ชื่อ PascalCase, `export default`) ใน `src/components` หรือโฟลเดอร์ย่อย
ระบบจะสร้าง `src/components/index.ts` ให้เอง แล้ว import ได้เลย:

```tsx
import { Layout, Card, Button } from '@components'
```

## ความปลอดภัย (XSS)

ข้อมูลที่มาจาก user ต้องใส่ `safe` เสมอ: `<p safe>{user.name}</p>`
เช็กทั้งโปรเจกต์ได้ด้วย `bunx xss-scan` (และ editor ที่ใช้ TypeScript ของ workspace จะเตือนให้)

## Environment

| ตัวแปร     | ค่าเริ่มต้น     |
| ---------- | -------------- |
| `PORT`     | `3000`         |
| `DB_FILE`  | `data.sqlite`  |
| `ADMIN_KEY`| `dev-secret`   |
| `COOKIE_SECRET` | `dev-cookie-secret` (เปลี่ยนใน production!) |
| `CACHE_MAX_MB` | `128` — หน่วยความจำสูงสุดของ in-memory cache |
| `WORKERS` | จำนวน core — ใช้กับ `start:cluster` |
| `LOG` | `1` — ใส่ `0` เพื่อปิด request log (เร็วขึ้นเล็กน้อยตอนโหลดหนัก) |
| `LOG_STATIC` | `0` — ใส่ `1` เพื่อ log ไฟล์ใน `/public` ด้วย |
| `LOG_BENCH` | `0` — ใส่ `1` เพื่อ log `/api/bench/*` (ระวังรกตอนยิงโหลด) |
| `NO_COLOR` / `FORCE_COLOR` | ปิด / บังคับสีใน console |
