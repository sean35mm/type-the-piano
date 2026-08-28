import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const manifestName = 'ASSET_CHECKSUMS.sha256'
const manifest = await readFile(path.join(root, manifestName), 'utf8')
const entries = new Map()

for (const [index, line] of manifest.trim().split('\n').entries()) {
  const match = line.match(/^([a-f0-9]{64})  (public\/assets\/(?:midi\/[^/]+\.mid|piano\/salamander\/[^/]+\.mp3))$/)
  if (!match) throw new Error(`${manifestName}:${index + 1}: invalid checksum entry`)
  if (entries.has(match[2])) throw new Error(`${manifestName}:${index + 1}: duplicate path ${match[2]}`)
  entries.set(match[2], match[1])
}

const assetPaths = [
  ...(await readdir(path.join(root, 'public/assets/midi')))
    .filter((name) => name.endsWith('.mid'))
    .map((name) => `public/assets/midi/${name}`),
  ...(await readdir(path.join(root, 'public/assets/piano/salamander')))
    .filter((name) => name.endsWith('.mp3'))
    .map((name) => `public/assets/piano/salamander/${name}`),
]

for (const assetPath of assetPaths) {
  if (!entries.has(assetPath)) throw new Error(`Asset is missing from ${manifestName}: ${assetPath}`)
}
if (entries.size !== assetPaths.length) throw new Error(`${manifestName} contains a missing or unsupported asset path`)

for (const [assetPath, expected] of entries) {
  const actual = createHash('sha256').update(await readFile(path.join(root, assetPath))).digest('hex')
  if (actual !== expected) throw new Error(`Checksum mismatch: ${assetPath}`)
}

console.log(`Verified ${entries.size} bundled assets.`)
