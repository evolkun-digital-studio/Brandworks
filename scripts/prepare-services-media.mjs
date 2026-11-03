import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const names = ['our_stra.jpg', 'graphic_design.jpg', 'content_creation.avif', 'photography.jpg', 'videography.jpg', 'socialmedia.jpg', 'vcvcvcvcv.jpg', 'Artboard 14@3x.png', 'seo.jpg', 'website_dev.jpg']
await mkdir('public/services', { recursive: true })
const images = []
for (const [index, name] of names.entries()) {
  const response = await fetch(`https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/${encodeURIComponent(name)}`)
  if (!response.ok) throw new Error(`${name}: ${response.status}`)
  const source = Buffer.from(await response.arrayBuffer())
  let quality = 78
  let output
  do {
    output = await sharp(source).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality }).toBuffer()
    quality -= 6
  } while (output.length > 150000 && quality >= 30)
  const blur = await sharp(source).rotate().resize(16).webp({ quality: 30 }).toBuffer()
  const src = `/services/${index + 1}.webp`
  await writeFile(`public${src}`, output)
  images.push({ src, blurDataURL: `data:image/webp;base64,${blur.toString('base64')}` })
  console.log(`${src}: ${output.length} bytes`)
}
await writeFile('src/components/Service/service-images.json', JSON.stringify(images, null, 2) + '\n')
