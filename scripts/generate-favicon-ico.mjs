/**
 * Rasterize public/favicon.svg into:
 *   - favicon.ico  (32x32 + 16x16) — browsers fetch this regardless of <link> tags
 *   - logo192.png  (192x192)        — PWA manifest + apple-touch-icon
 *   - logo512.png  (512x512)        — PWA manifest
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')
const svgPath = path.join(publicDir, 'favicon.svg')

const svg = fs.readFileSync(svgPath)

const [png16, png32, png192, png512] = await Promise.all([
  sharp(svg).resize(16, 16).png().toBuffer(),
  sharp(svg).resize(32, 32).png().toBuffer(),
  sharp(svg).resize(192, 192).png().toBuffer(),
  sharp(svg).resize(512, 512).png().toBuffer(),
])

const ico = await toIco([png32, png16])

await Promise.all([
  fs.promises.writeFile(path.join(publicDir, 'favicon.ico'), ico),
  fs.promises.writeFile(path.join(publicDir, 'logo192.png'), png192),
  fs.promises.writeFile(path.join(publicDir, 'logo512.png'), png512),
])
