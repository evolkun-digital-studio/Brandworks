import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const bundleUrl = new URL(
  '../node_modules/@designcodeio/threeui/lib-dist/shaders/neuform-isolated/NeuformBatchEffects.js',
  import.meta.url,
)
const bundlePath = fileURLToPath(bundleUrl)
const opaqueBackground = 'background: (e) => e === "light" ? d : "#070914",'
const transparentBackground = 'background: () => "transparent",'
const bundle = await readFile(bundlePath, 'utf8')

if (bundle.includes(transparentBackground)) process.exit(0)

if (!bundle.includes(opaqueBackground)) {
  throw new Error('Unable to locate the ThreeUI ConstellationField background definition.')
}

await writeFile(bundlePath, bundle.replace(opaqueBackground, transparentBackground))
