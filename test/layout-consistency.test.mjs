import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const theme = readFileSync(new URL('../theme.js', import.meta.url), 'utf8')
const index = readFileSync(new URL('../index.jsx', import.meta.url), 'utf8')

test('management screens use a full-width header with centered content', () => {
  assert.match(theme, /\.cx-root[^}]*width:\s*100%/s)
  assert.match(theme, /\.cx-header[^}]*background:\s*var\(--bg\)[^}]*border-bottom:\s*1px solid var\(--border\)/s)
  assert.match(theme, /\.cx-header-inner[^}]*max-width:\s*760px[^}]*margin-inline:\s*auto/s)
  assert.match(theme, /\.cx-scroll[^}]*max-width:\s*760px[^}]*margin-inline:\s*auto/s)
  assert.match(index, /cx-brand-icon/)
  assert.match(index, /<ArrowLeft/)
})
