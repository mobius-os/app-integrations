import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const theme = readFileSync(new URL('../theme.js', import.meta.url), 'utf8')
const index = readFileSync(new URL('../index.jsx', import.meta.url), 'utf8')

test('management screens use the shared centered task-column layout', () => {
  assert.match(theme, /\.cx-root[^}]*max-width:\s*760px[^}]*margin-inline:\s*auto/s)
  assert.match(index, /cx-brand-icon/)
  assert.match(index, /<ArrowLeft/)
})
