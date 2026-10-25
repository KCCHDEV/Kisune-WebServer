/** โลโก้ Kitsune: หัวจิ้งจอกทรงเรขาคณิตในกรอบ gradient */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg class="logo" width={String(size)} height={String(size)} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#8b5cf6" />
          <stop offset="1" stop-color="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-g)" />
      {/* หู 2 ข้าง + หน้า แหลมลงเป็นปาก */}
      <path d="M6.5 6 13 11.5h6L25.5 6 24.5 16.5 16 26 7.5 16.5z" fill="#fff" />
      {/* ปลายหูด้านใน */}
      <path d="M8.6 9.2 11.6 11.8 9.2 13.6zM23.4 9.2 20.4 11.8 22.8 13.6z" fill="#f9a8d4" />
      {/* ตา + จมูก */}
      <circle cx="12.6" cy="16.4" r="1.35" fill="#3b0764" />
      <circle cx="19.4" cy="16.4" r="1.35" fill="#3b0764" />
      <path d="M14.6 21.6h2.8L16 23.4z" fill="#3b0764" />
    </svg>
  )
}
