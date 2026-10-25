import { examples } from '../lib/examples'

/** การ์ดลิงก์ไปทุกตัวอย่าง */
export default function ExampleGrid() {
  return (
    <div class="example-grid" preload>
      {examples.map((e) => (
        <a href={e.href} class="example-card" hx-boost={e.external ? 'false' : undefined}>
          <span class="example-top">
            <span class="example-icon" safe>{e.icon}</span>
            <span class="example-arrow" aria-hidden="true">
              ↗
            </span>
          </span>
          <strong safe>{e.title}</strong>
          <span class="muted" safe>{e.desc}</span>
          <span class="tags">
            {e.tags.map((t) => (
              <code safe>{t}</code>
            ))}
          </span>
        </a>
      ))}
    </div>
  )
}
