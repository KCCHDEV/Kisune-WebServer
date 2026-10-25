// HTTP load test ฝั่ง browser สำหรับหน้า /benchmark
// ห่อด้วย IIFE เพราะ htmx (hx-boost) จะรันสคริปต์นี้ใหม่ทุกครั้งที่เข้าหน้า
;(() => {
  const root = document.getElementById('http-bench')
  if (!root) return

  const $ = (sel) => root.querySelector(sel)
  const form = $('form')
  const runBtn = $('[data-run]')
  const stopBtn = $('[data-stop]')
  const progress = $('[data-progress]')
  const plot = $('[data-plot]')
  const tooltip = $('[data-tooltip]')
  const note = $('[data-hist-note]')
  const history = $('[data-history]')
  const stat = (key) => $(`[data-stat="${key}"]`)

  let stopped = false
  stopBtn.addEventListener('click', () => (stopped = true))
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    run()
  })

  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]

  async function run() {
    const url = form.endpoint.value
    const total = Number(form.total.value)
    const concurrency = Number(form.concurrency.value)

    const latencies = []
    let next = 0
    let errors = 0
    let serverSum = 0
    let serverCount = 0
    stopped = false
    runBtn.disabled = true
    stopBtn.disabled = false
    for (const el of root.querySelectorAll('[data-stat]')) el.textContent = '…'

    // ยิง warm-up 50 ครั้งก่อน ให้ JIT ฝั่งเซิร์ฟเวอร์อุ่นเครื่อง
    await Promise.all(Array.from({ length: 50 }, () => fetch(url, { cache: 'no-store' }).then((r) => r.arrayBuffer()).catch(() => {})))

    const worker = async () => {
      while (!stopped) {
        if (next++ >= total) return
        const start = performance.now()
        try {
          const res = await fetch(url, { cache: 'no-store' })
          await res.arrayBuffer()
          if (!res.ok) errors++
          const m = /dur=([\d.]+)/.exec(res.headers.get('server-timing') ?? '')
          if (m) {
            serverSum += Number(m[1])
            serverCount++
          }
        } catch {
          errors++
        }
        latencies.push(performance.now() - start)
      }
    }

    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      progress.style.width = `${(latencies.length / total) * 100}%`
      const elapsed = (performance.now() - t0) / 1000
      stat('rps').textContent = fmt(latencies.length / elapsed, 0)
      raf = requestAnimationFrame(tick)
    }
    tick()

    await Promise.all(Array.from({ length: concurrency }, worker))
    cancelAnimationFrame(raf)
    const seconds = (performance.now() - t0) / 1000

    runBtn.disabled = false
    stopBtn.disabled = true
    progress.style.width = `${(latencies.length / total) * 100}%`
    if (!latencies.length) return

    const sorted = Float64Array.from(latencies).sort()
    const r = {
      url,
      total: sorted.length,
      concurrency,
      rps: sorted.length / seconds,
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: pct(sorted, 50),
      p95: pct(sorted, 95),
      p99: pct(sorted, 99),
      server: serverCount ? serverSum / serverCount : NaN,
      errors,
    }

    stat('rps').textContent = fmt(r.rps, 0)
    for (const k of ['avg', 'p50', 'p95', 'p99']) stat(k).textContent = fmt(r[k])
    stat('server').textContent = Number.isNaN(r.server) ? '–' : fmt(r.server, 3)

    drawHistogram(sorted, r)
    addHistory(r)
  }

  function addHistory(r) {
    history.hidden = false
    const tr = document.createElement('tr')
    const cells = [
      r.url,
      r.total.toLocaleString('en-US'),
      r.concurrency,
      fmt(r.rps, 0),
      fmt(r.p50),
      fmt(r.p95),
      fmt(r.p99),
      Number.isNaN(r.server) ? '–' : fmt(r.server, 3),
      r.errors,
    ]
    cells.forEach((v, i) => {
      const td = document.createElement('td')
      td.textContent = String(v)
      if (i > 0) td.className = 'num'
      tr.append(td)
    })
    history.tBodies[0].prepend(tr)
  }

  // ---------- histogram (SVG) ----------
  function drawHistogram(sorted, r) {
    const BUCKETS = 32
    const lo = sorted[0]
    const hi = Math.max(r.p99, lo + 0.01) // ตัดหาง > p99 รวมไว้ที่แท่งสุดท้าย
    const width = (hi - lo) / BUCKETS
    const counts = new Array(BUCKETS).fill(0)
    for (const v of sorted) counts[Math.min(BUCKETS - 1, Math.floor((v - lo) / width))]++
    const maxCount = Math.max(...counts)

    const W = 720
    const H = 200
    const pad = { top: 16, right: 8, bottom: 28, left: 8 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom
    const barW = plotW / BUCKETS
    const x = (ms) => pad.left + ((ms - lo) / (hi - lo)) * plotW
    const baseline = pad.top + plotH
    const ns = 'http://www.w3.org/2000/svg'

    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', `latency p50 ${fmt(r.p50)} ms, p95 ${fmt(r.p95)} ms, p99 ${fmt(r.p99)} ms`)

    const el = (tag, attrs) => {
      const node = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
      svg.append(node)
      return node
    }

    el('line', { x1: pad.left, x2: W - pad.right, y1: baseline, y2: baseline, class: 'axis' })

    counts.forEach((c, i) => {
      const bx = pad.left + i * barW + 1 // ช่องว่าง 2px ระหว่างแท่ง
      const bw = Math.max(1, barW - 2)
      const h = c ? Math.max(2, (c / maxCount) * plotH) : 0
      const rad = Math.min(4, bw / 2, h)
      const top = baseline - h
      if (h) {
        // มุมโค้งเฉพาะด้านบน ฐานติดเส้นแกน
        el('path', {
          class: 'bar',
          d: `M${bx},${baseline}V${top + rad}Q${bx},${top} ${bx + rad},${top}H${bx + bw - rad}Q${bx + bw},${top} ${bx + bw},${top + rad}V${baseline}Z`,
        })
      }
      // พื้นที่ hover ใหญ่กว่าแท่ง (เต็มความสูง)
      const hit = el('rect', { class: 'hit', x: pad.left + i * barW, y: pad.top, width: barW, height: plotH })
      const from = lo + i * width
      const label =
        i === BUCKETS - 1
          ? `≥ ${fmt(from)} ms`
          : `${fmt(from)}–${fmt(from + width)} ms`
      hit.addEventListener('mouseenter', () => showTip(hit, `<strong>${label}</strong><br>${c.toLocaleString('en-US')} request (${fmt((c / sorted.length) * 100, 1)}%)`))
      hit.addEventListener('mouseleave', () => (tooltip.hidden = true))
    })

    // เส้นบอก p50 / p95
    for (const [name, v] of [['p50', r.p50], ['p95', r.p95]]) {
      const px = x(v)
      el('line', { x1: px, x2: px, y1: pad.top - 4, y2: baseline, class: 'marker' })
      const t = el('text', { x: px + 4, y: pad.top + 6, class: 'marker-label' })
      t.textContent = `${name} ${fmt(v)}`
    }

    // ป้ายแกน x: ค่าต่ำสุด / ค่ากลาง / p99
    ;[
      [lo, 'start'],
      [(lo + hi) / 2, 'middle'],
      [hi, 'end'],
    ].forEach(([v, anchor]) => {
      const t = el('text', { x: x(v), y: H - 8, 'text-anchor': anchor, class: 'tick' })
      t.textContent = `${fmt(v)} ms`
    })

    plot.replaceChildren(svg)
    note.textContent = `(${sorted.length.toLocaleString('en-US')} request · แกนนอน = ms, ตัดที่ p99)`
  }

  function showTip(target, html) {
    tooltip.innerHTML = html
    tooltip.hidden = false
    const box = target.getBoundingClientRect()
    const host = plot.getBoundingClientRect()
    const left = box.left - host.left + box.width / 2
    tooltip.style.left = `${Math.min(Math.max(left, 70), host.width - 70)}px`
    tooltip.style.top = `${box.top - host.top + 8}px`
  }
})()
