// Genera los iconos PNG de la app sin dependencias externas:
// un cuadrado oscuro con un anillo degradado y un punto blanco (el "sitio marcado").
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [11, 17, 32]
const RING_A = [45, 212, 191]   // teal
const RING_B = [167, 139, 250]  // violeta
const DOT = [255, 255, 255]

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const over = (dst, src, alpha) => dst.map((v, i) => Math.round(v + (src[i] - v) * alpha))

function render(size, { padding }) {
  const px = new Uint8Array(size * size * 3)
  const SS = 3 // supermuestreo para bordes suaves
  const cx = size / 2, cy = size / 2
  const usable = size / 2 - padding * size
  const ringOuter = usable
  const ringInner = usable * 0.68
  const dotR = usable * 0.3

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0]
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS
          const fy = y + (sy + 0.5) / SS
          const dx = fx - cx, dy = fy - cy
          const d = Math.hypot(dx, dy)
          let c = BG
          // Halo suave alrededor del anillo.
          if (d < ringOuter * 1.25) {
            const glow = Math.max(0, 1 - Math.abs(d - ringOuter) / (ringOuter * 0.55))
            c = over(c, mix(RING_A, RING_B, (dy / size) + 0.5), glow * 0.16)
          }
          if (d <= ringOuter && d >= ringInner) {
            // Degradado espejado por el ángulo, así no se ve la costura al cerrar el círculo.
            const t = Math.abs(Math.atan2(dy, dx)) / Math.PI
            c = mix(RING_A, RING_B, t)
          }
          if (d <= dotR) c = DOT
          acc = [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]]
        }
      }
      const n = SS * SS
      const o = (y * size + x) * 3
      px[o] = Math.round(acc[0] / n)
      px[o + 1] = Math.round(acc[1] / n)
      px[o + 2] = Math.round(acc[2] / n)
    }
  }
  return px
}

const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return (buf) => {
    let c = -1
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
})()

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(CRC(body))
  return Buffer.concat([len, body, crc])
}

function png(size, rgb) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // sin filtro
    Buffer.from(rgb.subarray(y * size * 3, (y + 1) * size * 3)).copy(raw, y * (size * 3 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bits por canal
  ihdr[9] = 2   // color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const targets = [
  ['public/icon-192.png', 192, 0.14],
  ['public/icon-512.png', 512, 0.14],
  ['public/icon-512-maskable.png', 512, 0.26], // más margen: Android recorta
  ['public/icon-180.png', 180, 0.14],          // apple-touch-icon
]
for (const [file, size, padding] of targets) {
  writeFileSync(file, png(size, render(size, { padding })))
  console.log('escrito', file)
}
