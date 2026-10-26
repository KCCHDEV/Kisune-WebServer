# นโยบายความปลอดภัย

## รายงานช่องโหว่

ถ้าพบช่องโหว่ด้านความปลอดภัย **กรุณาอย่าเปิด issue สาธารณะ**
ให้รายงานผ่าน [GitHub Security Advisories](https://github.com/KCCHDEV/Kisune-WebServer/security/advisories/new) ของ repo นี้แทน
แล้ว Yurachi Studio จะติดต่อกลับโดยเร็วที่สุด

ช่วยแนบข้อมูลเหล่านี้ด้วย:

- ขั้นตอนทำให้เกิดปัญหา
- ไฟล์หรือ route ที่เกี่ยวข้อง
- ผลกระทบที่อาจเกิดขึ้น

## ก่อนขึ้น production

- ตั้ง `COOKIE_SECRET` และ `ADMIN_KEY` เป็นค่าสุ่มยาวๆ (ค่าเริ่มต้นใช้ได้แค่ตอนพัฒนา)
- อย่าใส่ `export const cache` กับหน้าที่แสดงข้อมูลเฉพาะผู้ใช้
- ใช้ HTTPS ผ่าน reverse proxy (Caddy / nginx)
- รัน `bun run check` เพื่อตรวจ XSS ทั้งโปรเจกต์
