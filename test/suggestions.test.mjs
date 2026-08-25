import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../suggestions.js', import.meta.url), 'utf8')

function suggestionBlock(id) {
  const marker = `id: '${id}'`
  const markerIndex = source.indexOf(marker)
  assert.notEqual(markerIndex, -1, `${id} should be present in the catalog`)
  const start = source.lastIndexOf('\n  {', markerIndex)
  const end = source.indexOf('\n  },', markerIndex)
  return source.slice(start, end)
}

test('Mobbin is a discoverable OAuth integration at its official endpoint', () => {
  const mobbin = suggestionBlock('mobbin')
  assert.match(mobbin, /name: 'Mobbin'/)
  assert.match(mobbin, /url: 'https:\/\/api\.mobbin\.com\/mcp'/)
  assert.match(mobbin, /signIn: true/)
  assert.match(mobbin, /icon: "data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+"/)
})
