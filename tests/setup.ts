// โหลดก่อนทุกเทส (ดู bunfig.toml) — ใช้ฐานข้อมูลในหน่วยความจำ ไม่แตะ data.sqlite
process.env.DB_FILE = ':memory:'
process.env.NODE_ENV = 'test'
