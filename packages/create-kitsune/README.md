# create-kitsune

สร้างโปรเจกต์ [🦊 Kitsune](https://github.com/KCCHDEV/Kisune-WebServer) ใหม่ด้วยคำสั่งเดียว — full-stack starter บน Bun + Elysia + htmx โดย **Yurachi Studio**

```bash
bunx create-kitsune my-app
# หรือ
bun create kitsune my-app
```

ระหว่างสร้างจะถามชื่อแอพ, แม่แบบ (Full / Minimal), จะติดตั้ง dependency และสร้าง git repository ให้ไหม แล้วเตรียม `.env` พร้อม secret สุ่มให้เลย

| ตัวเลือก | ความหมาย |
| --- | --- |
| `--template full\|minimal` | full = ตัวอย่างครบ 12 หมวด + benchmark · minimal = โครงเปล่าพร้อมเริ่มงาน |
| `--name "My App"` | ชื่อแอพที่แสดงในเว็บ |
| `--trailer` | เก็บวิดีโอ trailer (WebGL) ไว้ด้วย |
| `--no-install` / `--no-git` | ไม่ติดตั้ง dependency / ไม่สร้าง git |
| `-y`, `--yes` | ใช้ค่าเริ่มต้นทั้งหมด ไม่ถาม |

ต้องมี [Bun](https://bun.sh) 1.4 ขึ้นไป · License MIT © Yurachi Studio
