/**
 * ฐานข้อมูลตัวอย่างด้วย bun:sqlite (มากับ Bun ไม่ต้องติดตั้งเพิ่ม)
 * อยากเปลี่ยนเป็น Postgres/Drizzle ภายหลัง แก้แค่ไฟล์นี้
 */
import { Database } from 'bun:sqlite'
import { cache } from '@core/cache'

export const db = new Database(process.env.DB_FILE ?? 'data.sqlite', { create: true })
// ตั้งค่าให้เร็ว: WAL อ่าน/เขียนพร้อมกันได้ · NORMAL ไม่ต้องรอ fsync ทุก commit (ยังปลอดภัยกับ WAL)
// เก็บตารางชั่วคราวในแรม · cache หน้า DB 64MB · อ่านไฟล์ผ่าน mmap 256MB
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -65536;
  PRAGMA mmap_size = 268435456;
  PRAGMA busy_timeout = 5000;
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

export type User = { id: number; name: string; email: string; created_at: string }

if ((db.query('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n === 0) {
  const seed = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  seed.run('สมชาย ใจดี', 'somchai@example.com')
  seed.run('Bun Bun', 'bun@example.com')
}

// อ่านผ่าน cache · เขียนแล้วล้าง cache ที่เกี่ยวข้อง (cache-aside แบบที่ใช้กับ Redis)
export const users = {
  all: () => cache.rememberSync('users:all', 60, () => db.query('SELECT * FROM users ORDER BY id DESC').all() as User[]),
  find: (id: number) =>
    cache.rememberSync(`users:${id}`, 60, () => db.query('SELECT * FROM users WHERE id = ?').get(id) as User | null),
  create: (name: string, email: string) => {
    const user = db.query('INSERT INTO users (name, email) VALUES (?, ?) RETURNING *').get(name, email) as User
    cache.delPattern('users:*')
    return user
  },
  remove: (id: number) => {
    const ok = db.query('DELETE FROM users WHERE id = ?').run(id).changes > 0
    cache.delPattern('users:*')
    return ok
  },
}

/* ---------- สินค้าตัวอย่าง 10,000 แถว (ใช้ในตัวอย่างค้นหา / infinite scroll / benchmark) ---------- */

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id       INTEGER PRIMARY KEY,
    name     TEXT NOT NULL,
    category TEXT NOT NULL,
    price    INTEGER NOT NULL
  )
`)

export type Product = { id: number; name: string; category: string; price: number }

export const PRODUCT_COUNT = 10_000

if ((db.query('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n === 0) {
  const kinds = ['คีย์บอร์ด', 'เมาส์', 'จอ', 'หูฟัง', 'ลำโพง', 'SSD', 'การ์ดจอ', 'เก้าอี้', 'โต๊ะ', 'ไมโครโฟน']
  const models = ['Pro', 'Max', 'Mini', 'Ultra', 'Lite', 'RGB', 'Wireless', 'X', 'S', 'Plus']
  const insert = db.prepare('INSERT INTO products (id, name, category, price) VALUES (?, ?, ?, ?)')
  // ใส่ทีละหมื่นแถวใน transaction เดียว — bun:sqlite ใช้เวลาแค่ไม่กี่สิบ ms
  db.transaction(() => {
    for (let i = 1; i <= PRODUCT_COUNT; i++) {
      const kind = kinds[i % kinds.length]!
      insert.run(i, `${kind} ${models[Math.floor(i / kinds.length) % models.length]} ${1000 + (i % 900)}`, kind, 990 + ((i * 7919) % 49000))
    }
  })()
}

// prepared statement สร้างครั้งเดียว ใช้ซ้ำทุก request = เร็วที่สุด
const q = {
  find: db.query('SELECT * FROM products WHERE id = ?'),
  // keyset pagination: WHERE id > ? เร็วเท่ากันทุกหน้า (OFFSET ต้องไล่ข้ามแถวทีละแถว)
  page: db.query('SELECT * FROM products WHERE id > ? ORDER BY id LIMIT ?'),
  search: db.query("SELECT * FROM products WHERE name LIKE '%' || ? || '%' ORDER BY id LIMIT ?"),
  count: db.query("SELECT COUNT(*) AS n FROM products WHERE name LIKE '%' || ? || '%'"),
}

export const products = {
  find: (id: number) => q.find.get(id) as Product | null,
  /** แถวที่ id มากกว่า afterId จำนวน limit แถว */
  page: (limit: number, afterId = 0) => q.page.all(afterId, limit) as Product[],
  // ผลค้นหาเดิมซ้ำบ่อย (พิมพ์/ลบ) → จำไว้ 5 นาที ข้อมูลสินค้าไม่เปลี่ยน
  search: (text: string, limit = 20) =>
    cache.rememberSync(`products:search:${limit}:${text.toLowerCase()}`, 300, () => ({
      items: q.search.all(text, limit) as Product[],
      total: (q.count.get(text) as { n: number }).n,
    })),
}
