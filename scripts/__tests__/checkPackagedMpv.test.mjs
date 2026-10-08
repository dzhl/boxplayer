import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { packagedResourceRoots, PACKAGED_TARGETS, verifyPackagedMpv } from '../check-packaged-mpv.mjs'

function machO(arch) {
  const data = Buffer.alloc(128)
  data.writeUInt32LE(0xfeedfacf, 0)
  data.writeUInt32LE(arch === 'x64' ? 0x01000007 : 0x0100000c, 4)
  return data
}

function macFixture(arch) {
  const releaseDir = mkdtempSync(path.join(tmpdir(), 'boxplayer-packaged-mpv-'))
  const resources = path.join(releaseDir, arch === 'arm64' ? 'mac-arm64' : 'mac', 'BoxPlayer.app', 'Contents', 'Resources')
  const directory = path.join(resources, 'engine', 'darwin', arch, 'mpv-texture')
  mkdirSync(directory, { recursive: true })
  const files = ['mpv_texture.node', 'libmpv.dylib', 'README.md', '.gitignore'].map((name) => {
    const contents = name.endsWith('.node') || name.endsWith('.dylib') ? machO(arch) : Buffer.from(`fixture ${name}`)
    writeFileSync(path.join(directory, name), contents)
    return { name, bytes: contents.length, sha256: createHash('sha256').update(contents).digest('hex') }
  })
  writeFileSync(path.join(directory, 'mpv-bundle-manifest.json'), JSON.stringify({ platform: 'darwin', arch, renderer: 'texture', files }))
  return { releaseDir, resources, directory }
}

function desktopFixture(platform, arch) {
  const releaseDir = mkdtempSync(path.join(tmpdir(), 'boxplayer-packaged-mpv-'))
  const directory = path.join(releaseDir, `${platform}-unpacked`, 'resources', 'engine', platform, arch, 'mpv-texture')
  mkdirSync(directory, { recursive: true })
  const binary = Buffer.alloc(128)
  if (platform === 'linux') {
    binary.write('\x7fELF', 0, 'ascii')
    binary[4] = 2
    binary[5] = 1
    binary.writeUInt16LE(arch === 'x64' ? 62 : 183, 18)
  } else {
    binary.write('MZ', 0, 'ascii')
    binary.writeUInt32LE(64, 0x3c)
    binary.write('PE\0\0', 64, 'ascii')
    binary.writeUInt16LE(0x8664, 68)
  }
  const names = ['mpv_texture.node', platform === 'linux' ? 'libmpv.so.2' : 'libmpv-2.dll', ...(platform === 'linux' ? ['mpv-node-host', 'mpv-host.cjs'] : [])]
  const files = names.map(name => {
    const contents = name === 'mpv-host.cjs' ? Buffer.from('// fixture host') : binary
    writeFileSync(path.join(directory, name), contents)
    return { name, bytes: contents.length, sha256: createHash('sha256').update(contents).digest('hex') }
  })
  writeFileSync(path.join(directory, 'mpv-bundle-manifest.json'), JSON.stringify({ platform, arch, renderer: 'texture-with-software-fallback', files }))
  return { releaseDir, directory }
}

describe('packaged MPV acceptance', () => {
  it.each([['linux', 'x64'], ['linux', 'arm64'], ['win32', 'x64']])('verifies the current %s/%s texture renderer with software fallback', (platform, arch) => {
    const { releaseDir, directory } = desktopFixture(platform, arch)
    expect(verifyPackagedMpv(releaseDir, platform, arch)).toBe(directory)
    writeFileSync(path.join(directory, 'mpv_texture.node'), Buffer.from('corrupted'))
    expect(() => verifyPackagedMpv(releaseDir, platform, arch)).toThrow('Packaged MPV dependency changed')
  })

  it('rejects the obsolete software-only manifest for a current Linux candidate', () => {
    const { releaseDir, directory } = desktopFixture('linux', 'x64')
    const manifestPath = path.join(directory, 'mpv-bundle-manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, renderer: 'software' }))
    expect(() => verifyPackagedMpv(releaseDir, 'linux', 'x64')).toThrow('Wrong packaged MPV manifest target or renderer')
  })

  it('declares every desktop release target', () => {
    expect(PACKAGED_TARGETS).toEqual([
      ['darwin', 'x64'],
      ['darwin', 'arm64'],
      ['win32', 'x64'],
      ['linux', 'x64'],
      ['linux', 'arm64']
    ])
  })

  it.each(['x64', 'arm64'])('finds and verifies a packaged macOS %s app', (arch) => {
    const { releaseDir, resources, directory } = macFixture(arch)
    expect(packagedResourceRoots(releaseDir, 'darwin')).toEqual([resources])
    expect(verifyPackagedMpv(releaseDir, 'darwin', arch)).toBe(directory)
  })

  it('rejects a macOS package with the wrong renderer', () => {
    const { releaseDir, directory } = macFixture('x64')
    const manifestPath = path.join(directory, 'mpv-bundle-manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, renderer: 'software' }))
    expect(() => verifyPackagedMpv(releaseDir, 'darwin', 'x64')).toThrow('Wrong packaged MPV manifest target or renderer')
  })

  it('allows macOS code signing to update native binaries after the bundle manifest was written', () => {
    const { releaseDir, directory } = macFixture('arm64')
    writeFileSync(path.join(directory, 'mpv_texture.node'), Buffer.concat([machO('arm64'), Buffer.from('codesign')]))
    expect(() => verifyPackagedMpv(releaseDir, 'darwin', 'arm64')).toThrow('Packaged MPV dependency changed')
    expect(verifyPackagedMpv(releaseDir, 'darwin', 'arm64', { allowMacCodeSignatureChanges: true })).toBe(directory)
  })

  it('writes texture renderer metadata for generated macOS manifests', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'boxplayer-mpv-manifest-'))
    const bundle = path.join(root, 'bundle')
    const manifestPath = path.join(bundle, 'mpv-bundle-manifest.json')
    const libmpv = path.join(root, 'libmpv.dylib')
    mkdirSync(bundle)
    writeFileSync(path.join(bundle, 'mpv_texture.node'), machO('arm64'))
    writeFileSync(libmpv, machO('arm64'))
    const result = spawnSync('python3', ['native/boxplayer-mpv-texture/scripts/write-bundle-manifest.py', bundle, manifestPath, 'arm64', libmpv], { cwd: path.resolve('.') })
    expect(result.status, result.stderr.toString()).toBe(0)
    expect(JSON.parse(readFileSync(manifestPath, 'utf8'))).toMatchObject({ platform: 'darwin', arch: 'arm64', renderer: 'texture' })
  })
})
