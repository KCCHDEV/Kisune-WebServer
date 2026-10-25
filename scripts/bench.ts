/**
 * ยิงโหลดใส่เซิร์ฟเวอร์ที่รันอยู่ (เปิด bun start ไว้อีกหน้าต่างก่อน)
 *
 *   bun run bench                          ทดสอบทุก endpoint ใน /api/bench
 *   bun run bench -- /api/bench/json       เฉพาะ path นี้
 *   bun run bench -- --c 128 --d 10        ยิงพร้อมกัน 128, นาน 10 วินาทีต่อ endpoint
 *   bun run bench -- --url http://host:3000
 *
 * หมายเหตุ: ตัวยิงกับเซิร์ฟเวอร์อยู่เครื่องเดียวกันจะแย่ง CPU กัน ตัวเลขจริงมักสูงกว่านี้
 */
import { parseArgs } from 'node:util'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    c: { type: 'string', default: '64' },
    d: { type: 'string', default: '5' },
    url: { type: 'string', default: `http://localhost:${process.env.PORT ?? 3000}` },
  },
  allowPositionals: true,
})

const concurrency = Number(values.c)
const seconds = Number(values.d)
const paths = positionals.length
  ? positionals
  : ['/api/bench/text', '/api/bench/json', '/api/bench/db', '/api/bench/html', '/api/bench/cached', '/about']

try {
  await fetch(values.url + '/api/bench/text')
} catch {
  console.error(`❌ ต่อ ${values.url} ไม่ได้ — เปิดเซิร์ฟเวอร์ก่อน: bun start`)
  process.exit(1)
}

async function bench(path: string) {
  const url = values.url + path
  const latencies: number[] = []
  let errors = 0
  const end = performance.now() + seconds * 1000

  const worker = async () => {
    while (performance.now() < end) {
      const start = performance.now()
      try {
        const res = await fetch(url)
        await res.arrayBuffer()
        if (!res.ok) errors++
      } catch {
        errors++
      }
      latencies.push(performance.now() - start)
    }
  }

  const t0 = performance.now()
  await Promise.all(Array.from({ length: concurrency }, worker))
  const elapsed = (performance.now() - t0) / 1000

  latencies.sort((a, b) => a - b)
  const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))]!.toFixed(2)
  return {
    path,
    'req/s': Math.round(latencies.length / elapsed).toLocaleString('en-US'),
    'p50 ms': p(0.5),
    'p95 ms': p(0.95),
    'p99 ms': p(0.99),
    requests: latencies.length.toLocaleString('en-US'),
    errors,
  }
}

console.log(`\n⚡ ${values.url} · ยิงพร้อมกัน ${concurrency} · ${seconds} วินาทีต่อ endpoint\n`)
const rows = []
for (const path of paths) {
  process.stdout.write(`  ${path} …`)
  rows.push(await bench(path))
  process.stdout.write(' เสร็จ\n')
}
console.log()
console.table(rows)
