/**
 * In-memory cache แบบ Redis (อยู่ใน process เดียวกัน — ไม่ต้องมี network round trip)
 *
 *   import { cache } from '@core/cache'
 *
 *   cache.set('user:1', user, { ttl: 60 })        // ttl เป็นวินาที (ไม่ใส่ = ไม่หมดอายุ)
 *   cache.get<User>('user:1')
 *   cache.del('user:1')  · cache.incr('views')  · cache.expire('k', 10)  · cache.ttl('k')
 *   cache.keys('user:*') · cache.delPattern('user:*') · cache.flush()
 *
 *   // คำนวณครั้งเดียว แล้วจำไว้ — request ที่มาพร้อมกันตอน miss จะรอผลเดียวกัน (กัน stampede)
 *   const list = await cache.remember('users:all', 30, () => db.query(...).all())
 *
 * จำกัดหน่วยความจำด้วย CACHE_MAX_MB (ค่าเริ่มต้น 128) — เต็มแล้วจะไล่ตัวที่ไม่ได้ใช้นานที่สุดออก (LRU)
 * หมายเหตุ: แต่ละ process มี cache ของตัวเอง (โหมด cluster ก็แยกกัน) ถ้าต้องแชร์ข้ามเครื่องให้ใช้ Redis จริง
 */

type Entry = { value: unknown; size: number; expires: number } // expires = 0 คือไม่หมดอายุ

export type CacheStats = {
  items: number
  bytes: number
  maxBytes: number
  hits: number
  misses: number
  evictions: number
  expired: number
  hitRate: number
}

/** ประมาณขนาดเป็น byte (string ใน JS เก็บเป็น UTF-16 = 2 byte ต่อตัว) */
function sizeOf(key: string, value: unknown): number {
  const overhead = 64 + key.length * 2
  if (typeof value === 'string') return overhead + value.length * 2
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return overhead + value.byteLength
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) return overhead + 8
  if (value && typeof value === 'object' && 'size' in value && typeof value.size === 'number') return overhead + value.size
  try {
    return overhead + JSON.stringify(value).length * 2
  } catch {
    return overhead + 1024
  }
}

const globToRegex = (pattern: string) =>
  new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')

export class MemoryCache {
  /** Map เก็บตามลำดับการใช้งาน: ตัวแรก = ใช้นานที่สุด (ไล่ออกก่อน) */
  private map = new Map<string, Entry>()
  private pending = new Map<string, Promise<unknown>>()
  private bytes = 0
  private hits = 0
  private misses = 0
  private evictions = 0
  private expired = 0
  readonly maxBytes: number

  constructor({ maxMB = 128, sweepSeconds = 10 }: { maxMB?: number; sweepSeconds?: number } = {}) {
    this.maxBytes = Math.floor(maxMB * 1024 * 1024)
    // ลบตัวที่หมดอายุเป็นระยะ (unref = ไม่ทำให้ process ค้างตอนจะปิด)
    setInterval(() => this.sweep(), sweepSeconds * 1000).unref?.()
  }

  private alive(key: string, e: Entry | undefined): e is Entry {
    if (!e) return false
    if (e.expires && e.expires <= Date.now()) {
      this.remove(key, e)
      this.expired++
      return false
    }
    return true
  }

  private remove(key: string, e: Entry) {
    this.map.delete(key)
    this.bytes -= e.size
  }

  get<T = unknown>(key: string): T | undefined {
    const e = this.map.get(key)
    if (!this.alive(key, e)) {
      this.misses++
      return undefined
    }
    // ย้ายไปท้าย = เพิ่งใช้ล่าสุด
    this.map.delete(key)
    this.map.set(key, e)
    this.hits++
    return e.value as T
  }

  has(key: string): boolean {
    return this.alive(key, this.map.get(key))
  }

  /** ttl เป็นวินาที · size ใส่เองได้ถ้ารู้ขนาดจริง */
  set<T>(key: string, value: T, opts: { ttl?: number; size?: number } = {}): T {
    const old = this.map.get(key)
    if (old) this.remove(key, old)

    const size = opts.size ?? sizeOf(key, value)
    if (size > this.maxBytes) return value // ใหญ่เกินทั้ง cache — ไม่เก็บ

    const expires = opts.ttl ? Date.now() + opts.ttl * 1000 : 0
    this.map.set(key, { value, size, expires })
    this.bytes += size

    // เกิน limit → ไล่ตัวที่ไม่ได้ใช้นานที่สุดออกจนพอ
    if (this.bytes > this.maxBytes) {
      for (const [k, e] of this.map) {
        if (this.bytes <= this.maxBytes) break
        if (k === key) continue
        this.remove(k, e)
        this.evictions++
      }
    }
    return value
  }

  del(...keys: string[]): number {
    let n = 0
    for (const key of keys) {
      const e = this.map.get(key)
      if (e) {
        this.remove(key, e)
        n++
      }
    }
    return n
  }

  /** ลบทุก key ที่ตรง pattern เช่น 'users:*' */
  delPattern(pattern: string): number {
    return this.del(...this.keys(pattern))
  }

  keys(pattern = '*'): string[] {
    const re = globToRegex(pattern)
    const out: string[] = []
    for (const [k, e] of this.map) if (re.test(k) && (!e.expires || e.expires > Date.now())) out.push(k)
    return out
  }

  incr(key: string, by = 1): number {
    const e = this.map.get(key)
    if (!this.alive(key, e)) return this.set(key, by)
    e.value = (Number(e.value) || 0) + by
    return e.value as number
  }

  /** ตั้งเวลาหมดอายุใหม่ (วินาที) */
  expire(key: string, seconds: number): boolean {
    const e = this.map.get(key)
    if (!this.alive(key, e)) return false
    e.expires = Date.now() + seconds * 1000
    return true
  }

  /** วินาทีที่เหลือ: -1 = ไม่หมดอายุ, -2 = ไม่มี key (เหมือน Redis) */
  ttl(key: string): number {
    const e = this.map.get(key)
    if (!this.alive(key, e)) return -2
    return e.expires ? Math.ceil((e.expires - Date.now()) / 1000) : -1
  }

  /** อ่านจาก cache ถ้าไม่มีให้เรียก fn แล้วเก็บผลไว้ ttl วินาที */
  async remember<T>(key: string, ttl: number, fn: () => T | Promise<T>): Promise<T> {
    const hit = this.get<T>(key)
    if (hit !== undefined) return hit
    const inflight = this.pending.get(key)
    if (inflight) return inflight as Promise<T>

    const p = (async () => {
      try {
        return this.set(key, await fn(), { ttl })
      } finally {
        this.pending.delete(key)
      }
    })()
    this.pending.set(key, p)
    return p
  }

  /** แบบ sync สำหรับงานที่ไม่ต้อง await (เช่น query SQLite) */
  rememberSync<T>(key: string, ttl: number, fn: () => T): T {
    const hit = this.get<T>(key)
    return hit !== undefined ? hit : this.set(key, fn(), { ttl })
  }

  flush() {
    this.map.clear()
    this.bytes = 0
  }

  sweep(): number {
    const now = Date.now()
    let n = 0
    for (const [k, e] of this.map) {
      if (e.expires && e.expires <= now) {
        this.remove(k, e)
        this.expired++
        n++
      }
    }
    return n
  }

  stats(): CacheStats {
    const total = this.hits + this.misses
    return {
      items: this.map.size,
      bytes: this.bytes,
      maxBytes: this.maxBytes,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expired: this.expired,
      hitRate: total ? this.hits / total : 0,
    }
  }
}

/** cache หลักของแอพ — ใช้ตัวเดียวกันทั้งระบบ */
export const cache = new MemoryCache({ maxMB: Number(process.env.CACHE_MAX_MB ?? 128) })
