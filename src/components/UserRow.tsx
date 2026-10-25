import type { User } from '../lib/db'
import Button from './ui/Button'

/** แถวผู้ใช้ 1 แถว — ใช้ทั้งตอน render ทั้งหน้า และตอน htmx ส่งกลับมาแค่แถวเดียว */
export default function UserRow({ user }: { user: User }) {
  return (
    <li class="row" id={`user-${user.id}`}>
      <a href={`/users/${user.id}`} class="row-main">
        <strong safe>{user.name}</strong>
        <span class="muted" safe>{user.email}</span>
      </a>
      <Button
        variant="ghost"
        hx-delete={`/users/${user.id}`}
        hx-target={`#user-${user.id}`}
        hx-swap="outerHTML"
        hx-confirm="ลบผู้ใช้นี้?"
      >
        ลบ
      </Button>
    </li>
  )
}
