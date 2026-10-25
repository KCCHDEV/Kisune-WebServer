// เทส in-memory cache (core/cache.ts)
import { describe, expect, it } from 'bun:test'
import { MemoryCache } from '../core/cache'

describe('MemoryCache', () => {
  it('set / get / del / has', () => {
    const c = new MemoryCache()
    c.set('a', { n: 1 })
    expect(c.get('a')).toEqual({ n: 1 })
    expect(c.has('a')).toBe(true)
    expect(c.del('a')).toBe(1)
    expect(c.get('a')).toBeUndefined()
  })

  it('หมดอายุตาม ttl และ ttl() ตอบแบบ Redis', async () => {
    const c = new MemoryCache()
    c.set('x', 1, { ttl: 0.05 })
    c.set('forever', 1)
    expect(c.ttl('x')).toBe(1)
    expect(c.ttl('forever')).toBe(-1)
    expect(c.ttl('none')).toBe(-2)
    await Bun.sleep(80)
    expect(c.get('x')).toBeUndefined()
    expect(c.stats().expired).toBe(1)
  })

  it('ไล่ตัวที่ไม่ได้ใช้นานที่สุดออกเมื่อเกิน limit (LRU)', () => {
    const c = new MemoryCache({ maxMB: 1 })
    const big = 'x'.repeat(200_000) // ~400KB ต่อตัว (UTF-16)
    c.set('a', big)
    c.set('b', big)
    c.get('a') // a เพิ่งถูกใช้ → b เก่าสุด
    c.set('c', big)
    expect(c.has('a')).toBe(true)
    expect(c.has('b')).toBe(false)
    expect(c.has('c')).toBe(true)
    expect(c.stats().bytes).toBeLessThanOrEqual(c.maxBytes)
    expect(c.stats().evictions).toBe(1)
  })

  it('ไม่เก็บค่าที่ใหญ่กว่าทั้ง cache', () => {
    const c = new MemoryCache({ maxMB: 0.1 })
    c.set('huge', 'x'.repeat(100_000))
    expect(c.has('huge')).toBe(false)
  })

  it('incr / keys / delPattern', () => {
    const c = new MemoryCache()
    expect(c.incr('views')).toBe(1)
    expect(c.incr('views', 5)).toBe(6)
    c.set('user:1', 1)
    c.set('user:2', 2)
    c.set('post:1', 3)
    expect(c.keys('user:*').sort()).toEqual(['user:1', 'user:2'])
    expect(c.delPattern('user:*')).toBe(2)
    expect(c.keys()).toEqual(['views', 'post:1'])
  })

  it('remember() เรียก fn ครั้งเดียวแม้มี request พร้อมกัน (กัน stampede)', async () => {
    const c = new MemoryCache()
    let calls = 0
    const slow = async () => {
      calls++
      await Bun.sleep(20)
      return 'value'
    }
    const results = await Promise.all(Array.from({ length: 10 }, () => c.remember('k', 60, slow)))
    expect(results.every((r) => r === 'value')).toBe(true)
    expect(calls).toBe(1)
    expect(await c.remember('k', 60, slow)).toBe('value')
    expect(calls).toBe(1)
  })
})
