import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const index = readFileSync(new URL('../index.jsx', import.meta.url), 'utf8')

test('opening suggestions puts the catalog search under the keyboard', () => {
  assert.match(
    index,
    /aria-label="Search suggestions"\s+autoFocus/,
    'the suggestions search should receive focus when its screen mounts',
  )
})
