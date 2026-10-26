/**
 * ฐานข้อมูลด้วย bun:sqlite (มากับ Bun ไม่ต้องติดตั้งเพิ่ม)
 * อยากเปลี่ยนเป็น Postgres / Drizzle ภายหลัง แก้แค่ไฟล์นี้
 */
import { Database } from 'bun:sqlite'
import { cache } from '@core/cache'

export const db = new Database(process.env.DB_FILE ?? 'data.sqlite', { create: true })

// ตั้งค่าให้เร็ว: WAL อ่าน/เขียนพร้อมกันได้ · NORMAL ไม่ต้องรอ fsync ทุก commit (ยังปลอดภัยกับ WAL)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;
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

// อ่านผ่าน cache · เขียนแล้วล้าง cache ที่เกี่ยวข้อง (cache-aside)
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
