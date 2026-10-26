# ร่วมพัฒนา Kitsune

ขอบคุณที่สนใจร่วมพัฒนา 🦊 — ทุก issue, ไอเดีย และ pull request มีค่าเสมอ

## เตรียมเครื่อง

```bash
git clone https://github.com/KCCHDEV/Kisune-WebServer.git
cd Kisune-WebServer
bun install
bun dev
```

ต้องมี [Bun](https://bun.sh) 1.4 ขึ้นไป

## ก่อนส่ง pull request

```bash
bun run check   # TypeScript + ตรวจ XSS
bun test        # เทสทั้งหมดต้องผ่าน
```

CI จะรันสองคำสั่งนี้ให้อัตโนมัติทุก push และ pull request

## แนวทางเขียนโค้ด

- **เขียนให้เหมือนโค้ดรอบข้าง** — ตั้งชื่อ, คอมเมนต์ (ภาษาไทย), รูปแบบเดียวกับไฟล์ที่มีอยู่
- **ข้อมูลจากผู้ใช้ต้อง escape เสมอ** — ใส่ `safe` บน element: `<p safe>{user.name}</p>`
- **route ใหม่** — สร้างไฟล์ใน `src/pages` หรือ `src/api` ไม่ต้องลงทะเบียนที่อื่น ถ้ามี input ให้ใช้ `defineRoute` + `t.Object`
- **cache ทั้งหน้า** (`export const cache = …`) ใส่ได้เฉพาะหน้าที่ไม่ขึ้นกับผู้ใช้หรือ cookie
- **ฟีเจอร์ใหม่ควรมีเทส** ใน `tests/` (ใช้ `app.handle()` ไม่ต้องเปิดพอร์ต)
- **commit message** สั้น กระชับ บอกว่าเปลี่ยนอะไร เช่น `เพิ่มตัวอย่าง rate limit`

## รายงานปัญหา / เสนอไอเดีย

เปิด [issue](https://github.com/KCCHDEV/Kisune-WebServer/issues/new/choose) แล้วเลือกแบบฟอร์มที่ตรงที่สุด
พบช่องโหว่ด้านความปลอดภัย **อย่าเปิด issue สาธารณะ** — ดู [SECURITY.md](SECURITY.md)

---

<sub>Kitsune ดูแลโดย **Yurachi Studio**</sub>
