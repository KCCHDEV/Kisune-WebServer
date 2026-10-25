import Logo from './Logo'

const links = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/examples', label: 'ตัวอย่าง' },
  { href: '/benchmark', label: 'ทดสอบความเร็ว' },
  { href: '/about', label: 'โครงสร้าง' },
]

export default function Nav({ path }: { path: string }) {
  return (
    <header class="nav">
      <div class="container nav-inner">
        <a href="/" class="brand">
          <Logo />
          <span class="brand-name">Kitsune</span>
        </a>
        <nav class="nav-links" preload>
          {links.map((l) => (
            <a
              href={l.href}
              class={l.href === path || (l.href !== '/' && path.startsWith(l.href)) ? 'active' : ''}
              safe
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div class="nav-actions">
          <button class="icon-btn" type="button" onclick="toggleTheme()" aria-label="สลับธีมสว่าง/มืด" title="สลับธีม">
            <svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
            <svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          </button>
          <a href="/openapi" class="btn btn-sm btn-primary nav-cta" hx-boost="false">
            API Docs
          </a>
        </div>
      </div>
    </header>
  )
}
