# Kitsune — image สำหรับ production (ใช้ผลจาก bun run build แบบ standalone)
#
#   docker build -t my-app .
#   docker run -p 3000:3000 -v kitsune-data:/data --env-file .env my-app
#
# image สุดท้ายมีแค่ Bun + dist/standalone (ไม่มีซอร์ส ไม่มี node_modules)

# ---- build ----
FROM oven/bun:1.4.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ---- run ----
FROM oven/bun:1.4.4-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_FILE=/data/data.sqlite
COPY --from=build /app/dist/standalone ./
# ฐานข้อมูลอยู่ใน volume /data (ไม่หายตอนอัปเดต image)
RUN mkdir -p /data && chown bun:bun /data
VOLUME /data
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
