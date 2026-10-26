import Logo from './Logo'

const columns = [
  {
    title: 'เริ่มต้น',
    links: [
      { href: '/', label: 'หน้าแรก' },
      { href: '/about', label: 'โครงสร้างโปรเจกต์' },
      { href: '/openapi', label: 'เอกสาร API', external: true },
    ],
  },
  {
    title: 'ตัวอย่าง',
    links: [
      { href: '/examples/htmx', label: 'htmx patterns' },
      { href: '/examples/websocket', label: 'WebSocket chat' },
      { href: '/examples/auth', label: 'Login + Guard' },
    ],
  },
  {
    title: 'ความเร็ว',
    links: [
      { href: '/benchmark', label: 'ทดสอบความเร็ว' },
      { href: '/api/bench/info', label: 'ข้อมูลเครื่อง (JSON)', external: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer class="footer">
      <div class="container footer-inner" preload>
        <div class="footer-brand">
          <a href="/" class="brand">
            <Logo size={24} />
            <span class="brand-name">Kitsune</span>
          </a>
          <p class="muted">ว่องไว แสนกล ครบในตัวเดียว · Bun + Elysia + htmx backend และ frontend ในโปรเจกต์เดียว</p>
        </div>
        {columns.map((c) => (
          <div class="footer-col">
            <h4 safe>{c.title}</h4>
            {c.links.map((l) => (
              <a href={l.href} hx-boost={l.external ? 'false' : undefined} safe>
                {l.label}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div class="container footer-bottom">
        <span>
          © {new Date().getFullYear()} <strong>Yurachi Studio</strong> · MIT License
        </span>
        <a href="https://github.com/KCCHDEV/Kisune-WebServer" target="_blank" rel="noopener" hx-boost="false">
          GitHub ↗
        </a>
      </div>
    </footer>
  )
}
