/**
 * Browsers often fetch /favicon.ico regardless of <link> tags, so we rasterize
 * public/favicon.svg into a multi-size ICO and write public/favicon.ico.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const svgPath = path.join(root, 'public', 'favicon.svg')
const icoPath = path.join(root, 'public', 'favicon.ico')

const svg = fs.readFileSync(svgPath)

const [png32, png16] = await Promise.all([
  sharp(svg).resize(32, 32).png().toBuffer(),
  sharp(svg).resize(16, 16).png().toBuffer(),
])

const ico = await toIco([png32, png16])
fs.writeFileSync(icoPath, ico)
