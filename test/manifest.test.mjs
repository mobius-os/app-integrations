import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const manifest = JSON.parse(
  readFileSync(new URL('../mobius.json', import.meta.url), 'utf8'),
)

test('Integrations owns its canonical package and repository identity', () => {
  assert.equal(manifest.id, 'integrations')
  assert.equal(manifest.name, 'Integrations')
  assert.equal(manifest.homepage, 'https://github.com/mobius-os/app-integrations')
  assert.equal(manifest.previous_id, 'connections')
  assert.equal(
    manifest.previous_manifest_url,
    'https://raw.githubusercontent.com/mobius-os/app-connections/main/mobius.json',
  )
  assert.deepEqual(manifest.skills, ['integrations.md'])
  assert.ok(manifest.source_files.includes('integrations.md'))
  assert.ok(!manifest.source_files.includes('connections.md'))
})
