// POST /examples/cache/slow — งานช้า 500ms ห่อด้วย cache.remember()
import { cache } from '@core/cache'

export const POST = async () => {
  const start = performance.now()
  const fromCache = cache.has('demo:slow')
  const value = await cache.remember('demo:slow', 10, async () => {
    await Bun.sleep(500) // สมมติว่าเป็น query หนัก หรือเรียก API ภายนอก
    return new Date().toLocaleTimeString('th-TH')
  })
  const ms = performance.now() - start
  const took = ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : `${ms.toFixed(1)} ms`

  return (
    <div class={fromCache ? 'alert alert-ok' : 'alert'}>
      <strong>{fromCache ? '⚡ จาก cache' : '🐢 คำนวณใหม่'}</strong>{' '}
      <span safe>{`ใช้ ${took} · ผลลัพธ์ ${value} · หมดอายุใน ${cache.ttl('demo:slow')} วินาที`}</span>
    </div>
  )
}
