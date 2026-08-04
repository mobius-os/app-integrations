// Connections — remote MCP services shared by both agent runtimes.
// The platform owns keys, health probes, and per-turn wiring; this app is the
// owner's management surface: list, add, re-check, toggle, remove, and a
// curated set of suggestions worth adding.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CSS } from './theme.js'
import {
  addConnection,
  listConnections,
  recheckConnection,
  removeConnection,
  updateConnection,
} from './api.js'
import { SUGGESTIONS } from './suggestions.js'

function displayEndpoint(value) {
  try {
    const endpoint = new URL(value)
    return `${endpoint.origin}${endpoint.pathname}`
  } catch {
    return String(value || '').split(/[?#]/, 1)[0]
  }
}

// Same-count catalogs differ severalfold in schema size, and one runtime pays
// that cost on every message — show the estimate, not just the count.
function costLabel(estTokens) {
  if (!estTokens) return ''
  const value = estTokens >= 1000
    ? `${(estTokens / 1000).toFixed(estTokens >= 10000 ? 0 : 1)}k`
    : String(estTokens)
  return `~${value} tokens/message`
}

function healthText(connection) {
  if (connection.status === 'error') return 'Needs attention'
  if (connection.status_detail) return 'Unreachable at last check'
  return 'Reachable'
}

function dotColor(connection) {
  if (connection.status === 'error') return 'danger'
  return connection.enabled ? 'green' : 'muted'
}

function normalizedUrl(value) {
  return displayEndpoint(value).replace(/\/+$/, '').toLowerCase()
}

export default function Connections({ appId, token }) {
  const [connections, setConnections] = useState(null) // null = first load
  const [loadError, setLoadError] = useState(null)
  const [view, setView] = useState({ name: 'list' })
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)
  const mutationPending = useRef(false)
  const readySignalled = useRef(false)

  const load = useCallback(async () => {
    try {
      const rows = await listConnections(token)
      setConnections(rows)
      setLoadError(null)
      if (!readySignalled.current) {
        readySignalled.current = true
        window.mobius?.signal?.('app_ready', { item_count: rows.length })
      }
    } catch (error) {
      setLoadError(error)
      if (!readySignalled.current) {
        readySignalled.current = true
        window.mobius?.signal?.('error', { message: error.message })
      }
    }
  }, [token])

  useEffect(() => {
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  async function perform(action) {
    if (mutationPending.current) {
      setActionError('Another change is still finishing.')
      return null
    }
    mutationPending.current = true
    setPending(true)
    setActionError('')
    try {
      const result = await action()
      await load()
      return result
    } catch (error) {
      // The change may have committed server-side (lost response) or hit a
      // stale generation — resync so a row cannot wedge behind stale state.
      load()
      setActionError(error.message || 'Could not update the connection')
      return null
    } finally {
      mutationPending.current = false
      setPending(false)
    }
  }

  const rows = connections || []
  const byId = useMemo(() => {
    const map = new Map()
    rows.forEach(row => map.set(row.id, row))
    return map
  }, [rows])
  const addedUrls = useMemo(
    () => new Set(rows.map(row => normalizedUrl(row.url))),
    [rows],
  )
  const enabledCount = rows.filter(row => row.enabled).length

  function open(next) {
    setActionError('')
    setConfirmRemove(null)
    setView(next)
  }

  async function toggle(connection) {
    await perform(() => updateConnection(
      token, connection.id, connection.generation,
      { enabled: !connection.enabled },
    ))
  }

  async function recheck(connection) {
    await perform(() => recheckConnection(
      token, connection.id, connection.generation,
    ))
  }

  async function remove(connection) {
    const done = await perform(() => removeConnection(
      token, connection.id, connection.generation,
    ))
    setConfirmRemove(null)
    if (done !== null) open({ name: 'list' })
  }

  // ── screens ──────────────────────────────────────────────────────────

  const permissionBlocked = loadError && loadError.status === 403

  function Header({ title, subtitle, back, right }) {
    return (
      <header className="cx-header">
        <div className="cx-brand">
          {back && (
            <button type="button" className="cx-back" aria-label="Back"
              onClick={() => open(back)}>‹</button>
          )}
          <div className="cx-brand-text">
            <h1 className="cx-title">{title}</h1>
            {subtitle && <span className="cx-subtitle">{subtitle}</span>}
          </div>
        </div>
        <div className="cx-header-right">{right}</div>
      </header>
    )
  }

  function ListScreen() {
    return (
      <>
        <Header
          title="Connections"
          subtitle={rows.length
            ? `${enabledCount} of ${rows.length} available to your agent`
            : 'Remote services for your agent'}
          right={(
            <>
              <button type="button" className="cx-btn cx-btn--ghost"
                disabled={pending}
                onClick={() => open({ name: 'suggestions' })}>
                Suggestions
              </button>
              <button type="button" className="cx-btn cx-btn--primary"
                disabled={pending || permissionBlocked}
                onClick={() => open({ name: 'add' })}>
                Add
              </button>
            </>
          )}
        />
        <div className="cx-scroll">
          {permissionBlocked ? (
            <div className="cx-notice cx-notice--accent">
              This app's access to connections isn't active yet — a platform
              restart applies it. Everything else here works read-only until
              then.
            </div>
          ) : loadError && connections === null ? (
            <div className="cx-notice cx-notice--danger">
              Couldn't load connections
              {loadError.message ? ` — ${loadError.message}` : ''}.{' '}
              <button type="button" className="cx-linklike" onClick={load}>
                Try again
              </button>
            </div>
          ) : connections === null ? (
            <div className="cx-notice" role="status">Loading connections…</div>
          ) : rows.length === 0 ? (
            <div className="cx-empty">
              <div className="cx-empty-glyph">⚯</div>
              <p className="cx-empty-title">No connections yet</p>
              <p>
                A connection gives your agent a new remote capability — search,
                docs, scraping — usable from every chat on both runtimes.
              </p>
              <button type="button" className="cx-btn cx-btn--primary"
                onClick={() => open({ name: 'suggestions' })}>
                Browse suggestions
              </button>
            </div>
          ) : (
            rows.map(connection => (
              <button type="button" key={connection.id}
                className={`cx-card${connection.enabled ? '' : ' is-off'}`}
                onClick={() => open({ name: 'detail', id: connection.id })}>
                <span className={`cx-dot cx-dot--${dotColor(connection)}`} />
                <span className="cx-card-main">
                  <span className="cx-card-name">{connection.name}</span>
                  <span className="cx-card-endpoint">
                    {displayEndpoint(connection.url)}
                  </span>
                  <span className="cx-card-meta">
                    {connection.enabled ? 'On' : 'Off'}
                    {' · '}
                    <span className={connection.status === 'error' ? 'is-warn' : ''}>
                      {healthText(connection)}
                    </span>
                    {' · '}{connection.tool_count} tool{connection.tool_count === 1 ? '' : 's'}
                    {connection.est_tokens ? ` · ${costLabel(connection.est_tokens)}` : ''}
                  </span>
                </span>
                <span className="cx-chevron">›</span>
              </button>
            ))
          )}
          {actionError && view.name === 'list' && (
            <div className="cx-notice cx-notice--danger">{actionError}</div>
          )}
          {loadError && connections !== null && !permissionBlocked && (
            <div className="cx-notice">
              The list may be out of date.{' '}
              <button type="button" className="cx-linklike" onClick={load}>
                Refresh
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  function DetailScreen() {
    const connection = byId.get(view.id)
    if (!connection) {
      // Removed under us (another surface, or our own remove) — go home.
      return <ListScreen />
    }
    const removing = confirmRemove === connection.generation
    return (
      <>
        <Header
          title={connection.name}
          subtitle={displayEndpoint(connection.url)}
          back={{ name: 'list' }}
          right={(
            <button type="button"
              role="switch"
              aria-checked={connection.enabled}
              aria-label={`${connection.name} available to your agent`}
              className={`cx-switch${connection.enabled ? ' is-on' : ''}`}
              disabled={pending || (!connection.enabled && connection.status === 'error')}
              title={!connection.enabled && connection.status === 'error'
                ? 'Re-check successfully before turning on'
                : undefined}
              onClick={() => toggle(connection)}>
              <span aria-hidden="true" />
            </button>
          )}
        />
        <div className="cx-scroll cx-detail">
          <div className="cx-kv">
            <div className="cx-kv-row">
              <span className="cx-kv-key">Status</span>
              <span className={`cx-kv-value${connection.status === 'error' ? ' is-warn' : ''}`}>
                {connection.enabled ? 'On' : 'Off'} · {healthText(connection)}
              </span>
            </div>
            {connection.status_detail && (
              <div className="cx-kv-row">
                <span className="cx-kv-key">Last check</span>
                <span className={`cx-kv-value${connection.status === 'error' ? ' is-warn' : ''}`}>
                  {connection.status_detail}
                </span>
              </div>
            )}
            <div className="cx-kv-row">
              <span className="cx-kv-key">Tools</span>
              <span className="cx-kv-value">{connection.tool_count}</span>
            </div>
            {connection.est_tokens > 0 && (
              <div className="cx-kv-row">
                <span className="cx-kv-key">Cost</span>
                <span className="cx-kv-value">{costLabel(connection.est_tokens)}</span>
              </div>
            )}
            <div className="cx-kv-row">
              <span className="cx-kv-key">API key</span>
              <span className="cx-kv-value">
                {connection.has_auth ? 'Saved (encrypted)' : 'None'}
              </span>
            </div>
          </div>

          {connection.tools?.length > 0 && (
            <>
              <div className="cx-section-label">What it can do</div>
              <div className="cx-tools">
                {connection.tools.map(name => (
                  <span key={name} className="cx-tool-chip">{name}</span>
                ))}
              </div>
            </>
          )}

          {actionError && (
            <div className="cx-notice cx-notice--danger">{actionError}</div>
          )}

          {removing ? (
            <div className="cx-confirm">
              <button type="button" className="cx-btn cx-btn--danger"
                disabled={pending} onClick={() => remove(connection)}>
                Remove connection
              </button>
              <button type="button" className="cx-btn"
                disabled={pending} onClick={() => setConfirmRemove(null)}>
                Keep
              </button>
            </div>
          ) : (
            <div className="cx-detail-actions">
              <button type="button" className="cx-btn"
                disabled={pending} onClick={() => recheck(connection)}>
                {pending ? 'Working…' : 'Re-check now'}
              </button>
              <button type="button" className="cx-btn cx-btn--danger"
                disabled={pending}
                onClick={() => setConfirmRemove(connection.generation)}>
                Remove…
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  function AddScreen() {
    const prefill = view.prefill || null
    const [url, setUrl] = useState(prefill?.url || '')
    const [name, setName] = useState(prefill?.name || '')
    const [usesKey, setUsesKey] = useState(Boolean(prefill?.needsKey))
    const [authValue, setAuthValue] = useState('')
    const [authHeader, setAuthHeader] = useState('Authorization')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    async function submit(event) {
      event.preventDefault()
      if (saving || !url.trim()) return
      setError('')
      setSaving(true)
      try {
        await addConnection(token, {
          url: url.trim(),
          name: name.trim(),
          auth_header: usesKey ? authHeader.trim() : '',
          auth_value: usesKey ? authValue.trim() : '',
        })
        await load()
        open({ name: 'list' })
      } catch (submitError) {
        setError(submitError.message || 'Could not add the connection')
      } finally {
        setSaving(false)
      }
    }

    return (
      <>
        <Header
          title={prefill ? `Add ${prefill.name}` : 'Add a connection'}
          subtitle="Checked live before it saves"
          back={prefill ? { name: 'suggestions' } : { name: 'list' }}
        />
        <div className="cx-scroll">
          <form className="cx-form" onSubmit={submit} aria-busy={saving}>
            <label className="cx-field">
              <span>Service address</span>
              <input type="url" inputMode="url" required autoFocus={!prefill}
                placeholder="https://example.com/mcp"
                value={url} onChange={event => setUrl(event.target.value)} />
            </label>
            <label className="cx-field">
              <span>Name (optional)</span>
              <input type="text" maxLength={128}
                placeholder="Use the service's own name"
                value={name} onChange={event => setName(event.target.value)} />
            </label>
            <button type="button" className="cx-btn cx-btn--ghost"
              aria-expanded={usesKey}
              onClick={() => setUsesKey(current => {
                if (current) { setAuthValue(''); setAuthHeader('Authorization') }
                return !current
              })}>
              {usesKey ? 'Remove API key' : 'Add API key'}
            </button>
            {usesKey && (
              <>
                <label className="cx-field">
                  <span>API key</span>
                  <input type="password" autoComplete="off" required
                    autoFocus={Boolean(prefill?.needsKey)}
                    value={authValue}
                    onChange={event => setAuthValue(event.target.value)} />
                </label>
                <label className="cx-field">
                  <span>Header</span>
                  <input type="text" required placeholder="Authorization"
                    value={authHeader}
                    onChange={event => setAuthHeader(event.target.value)} />
                </label>
              </>
            )}
            <p className="cx-support-note">
              Public HTTPS services with no sign-in or one static key. The key
              is stored encrypted by the platform and never shown again.
            </p>
            <div className="cx-form-actions">
              <button type="submit" className="cx-btn cx-btn--primary"
                disabled={saving || !url.trim() || (usesKey && !authValue.trim())}>
                {saving ? 'Checking…' : 'Check and add'}
              </button>
            </div>
            {error && <div className="cx-notice cx-notice--danger">{error}</div>}
          </form>
        </div>
      </>
    )
  }

  function SuggestionsScreen() {
    return (
      <>
        <Header
          title="Suggestions"
          subtitle="Known-good services, verified before shipping"
          back={{ name: 'list' }}
        />
        <div className="cx-scroll">
          {SUGGESTIONS.map(suggestion => {
            const added = addedUrls.has(normalizedUrl(suggestion.url))
            return (
              <div key={suggestion.id} className="cx-suggestion">
                <div className="cx-suggestion-top">
                  <div>
                    <h2 className="cx-suggestion-name">{suggestion.name}</h2>
                    <span className="cx-suggestion-tagline">
                      {suggestion.tagline}
                    </span>
                  </div>
                  {added ? (
                    <span className="cx-pill cx-pill--added">Added</span>
                  ) : (
                    <button type="button" className="cx-btn cx-btn--primary"
                      disabled={pending || permissionBlocked}
                      onClick={() => open({ name: 'add', prefill: suggestion })}>
                      Add
                    </button>
                  )}
                </div>
                <p className="cx-suggestion-detail">{suggestion.detail}</p>
                <div className="cx-suggestion-foot">
                  <span>{suggestion.costNote}</span>
                  <span className="cx-pill">
                    {suggestion.needsKey ? 'Needs an API key' : 'No key needed'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div className="cx-root">
      <style>{CSS}</style>
      {view.name === 'detail' ? <DetailScreen />
        : view.name === 'add' ? <AddScreen />
        : view.name === 'suggestions' ? <SuggestionsScreen />
        : <ListScreen />}
    </div>
  )
}
