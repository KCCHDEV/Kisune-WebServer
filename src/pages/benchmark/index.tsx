// /benchmark — หน้าทดสอบความเร็ว
import { defineRoute, t } from '@core/route'
import { Layout, Card, Button, BenchBars, CodeBlock, Source, PageHeader } from '@components'
import { runInProcess, serverInfo } from '../../lib/bench'
import { asset } from '../../lib/asset'

export const cache = 10 // cache ทั้งหน้า 10 วินาที (ข้อมูลเครื่องอัปเดตทุก 10 วินาที)

const endpoints = [
  { value: '/api/bench/text', label: 'ข้อความล้วน — /api/bench/text' },
  { value: '/api/bench/json', label: 'JSON — /api/bench/json' },
  { value: '/api/bench/db', label: 'อ่าน SQLite 1 แถว — /api/bench/db' },
  { value: '/api/bench/html', label: 'Render JSX ตาราง 50 แถว — /api/bench/html' },
  { value: '/api/bench/cached', label: 'ตารางเดียวกันจาก cache — /api/bench/cached' },
  { value: '/about', label: 'หน้าเว็บเต็มจาก cache — /about' },
]

const cliCode = `
# ใช้สคริปต์ในโปรเจกต์ (Bun fetch, ทดสอบทุก endpoint)
bun run bench
bun run bench -- --c 128 --d 10 /api/bench/json

# หรือเครื่องมือมาตรฐาน
bunx autocannon -c 100 -d 10 http://localhost:3000/api/bench/text
oha -c 100 -z 10s http://localhost:3000/api/bench/text
`

export default function BenchmarkPage() {
  const info = serverInfo()

  return (
    <Layout title="ทดสอบความเร็ว" path="/benchmark">
      <PageHeader
        eyebrow="Benchmark"
        title="⚡ ทดสอบความเร็ว"
        lead="วัดความเร็วของเซิร์ฟเวอร์นี้ 3 แบบ ตั้งแต่ตัว framework ล้วนๆ จนถึงยิง HTTP จริง"
      />

      <dl class="info-grid">
        <div><dt>Bun</dt><dd safe>{info.bun}</dd></div>
        <div><dt>Elysia</dt><dd safe>{info.elysia}</dd></div>
        <div><dt>ระบบ</dt><dd safe>{info.platform}</dd></div>
        <div><dt>CPU</dt><dd safe>{`${info.cpu} (${info.cores} cores)`}</dd></div>
        <div><dt>หน่วยความจำ</dt><dd>{info.memoryMB} MB</dd></div>
        <div><dt>โหมด</dt><dd safe>{info.mode}</dd></div>
      </dl>

      <Card title="1 · In-process: ความเร็วของ Elysia ล้วนๆ">
        <p class="muted">
          สร้าง <code>Request</code> แล้วส่งเข้า <code>app.handle()</code> ตรงๆ ไม่ผ่าน TCP เลยเห็นต้นทุนของ router,
          validation และ handler อย่างเดียว
        </p>
        <form class="form" hx-post="/benchmark" hx-target="#inproc" hx-disabled-elt="find button">
          <select name="n">
            <option value="20000">20,000 request ต่อรายการ</option>
            <option value="50000" selected>50,000 request ต่อรายการ</option>
            <option value="200000">200,000 request ต่อรายการ</option>
          </select>
          <Button type="submit">เริ่มวัด</Button>
          <span class="htmx-indicator muted">กำลังวัด…</span>
        </form>
        <div id="inproc" class="result-area">
          <p class="muted small">กด "เริ่มวัด" เพื่อดูผล</p>
        </div>
      </Card>

      <Card title="2 · HTTP load test จาก browser">
        <p class="muted">
          ยิง <code>fetch()</code> พร้อมกันหลายตัวจาก browser นี้ แล้วเก็บ latency ทุก request ตัวเลขจะต่ำกว่าความจริง
          เพราะ browser เปิด connection ไปที่ host เดียวกันได้ราว 6 เส้น แต่ใช้เทียบ endpoint กันเองได้ดี
        </p>
        <div id="http-bench">
          {/* hx-boost=false: ฟอร์มนี้ให้ public/bench.js จัดการเอง ไม่ใช่ htmx */}
          <form class="form bench-form" hx-boost="false">
            <label>
              Endpoint
              <select name="endpoint">
                {endpoints.map((e) => (
                  <option value={e.value} safe>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              จำนวน request
              <select name="total">
                <option value="1000">1,000</option>
                <option value="5000" selected>5,000</option>
                <option value="20000">20,000</option>
              </select>
            </label>
            <label>
              ยิงพร้อมกัน
              <select name="concurrency">
                <option value="1">1</option>
                <option value="6">6</option>
                <option value="16" selected>16</option>
                <option value="64">64</option>
              </select>
            </label>
            <div class="bench-actions">
              <Button type="submit" data-run>เริ่มยิง</Button>
              <Button type="button" variant="ghost" data-stop disabled>หยุด</Button>
            </div>
          </form>

          <div class="progress" aria-hidden="true"><span data-progress></span></div>

          <div class="stat-row" data-stats>
            {[
              ['rps', 'req/s'],
              ['avg', 'เฉลี่ย (ms)'],
              ['p50', 'p50 (ms)'],
              ['p95', 'p95 (ms)'],
              ['p99', 'p99 (ms)'],
              ['server', 'เวลาในเซิร์ฟเวอร์ (ms)'],
            ].map(([key, label]) => (
              <div class="stat">
                <span class="stat-value" data-stat={key}>–</span>
                <span class="stat-label" safe>{label}</span>
              </div>
            ))}
          </div>

          <div class="histogram" data-histogram>
            <p class="chart-title">
              การกระจายของ latency <span class="muted" data-hist-note>(ยังไม่มีข้อมูล)</span>
            </p>
            <div class="histogram-plot" data-plot></div>
            <div class="chart-tooltip" data-tooltip hidden></div>
          </div>

          <table class="table" data-history hidden>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th class="num">request</th>
                <th class="num">พร้อมกัน</th>
                <th class="num">req/s</th>
                <th class="num">p50</th>
                <th class="num">p95</th>
                <th class="num">p99</th>
                <th class="num">server</th>
                <th class="num">error</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </Card>

      <Card title="3 · CLI: ยิงโหลดเต็มกำลัง">
        <p class="muted">
          ถ้าอยากได้ตัวเลขจริง ให้รันเซิร์ฟเวอร์โหมด production (<code>bun start</code>) แล้วยิงจาก terminal
          อีกหน้าต่าง ซึ่งไม่ติดข้อจำกัดของ browser
        </p>
        <CodeBlock label="terminal" code={cliCode} />
      </Card>

      <Source file={import.meta.path} />
      <script src={asset('/public/bench.js')}></script>
    </Layout>
  )
}

// POST /benchmark — วัด in-process แล้วส่งกราฟกลับเป็น HTML
export const POST = defineRoute({
  body: t.Object({ n: t.Numeric({ minimum: 1_000, maximum: 200_000 }) }),
  handler: async ({ body }) => <BenchBars results={await runInProcess(body.n)} />,
})
