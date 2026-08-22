// Integrations — remote MCP services shared by both agent runtimes.
// The platform owns keys, health probes, and per-turn wiring; this app is the
// owner's management surface: list, add, re-check, toggle, remove, and a
// curated set of suggestions worth adding.
//
// Screens are module-level components taking a `ctx` prop (the parent's state
// and actions). They must NOT be nested inside the parent component: a nested
// function is a fresh component type on every parent render, which makes React
// remount the screen and wipe its local state — the parent re-renders on every
// background list refresh (window focus), so form fields would clear the
// moment the owner returned from another tab.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, WebsiteNetwork } from '@openai/apps-sdk-ui/components/Icon'
import { CSS } from './theme.js'
import {
  addConnection,
  clearOAuthClient,
  completeGoogleSignIn,
  getRedirectUri,
  listConnections,
  listGoogleProjects,
  listReusableGoogle,
  recheckConnection,
  removeConnection,
  reuseGoogleSignIn,
  setGoogleProject,
  setOAuthClient,
  signOut,
  startGoogleSignIn,
  startSignIn,
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

// A Google Cloud connection uses the link-and-code Google sign-in, not the
// standard popup. The platform flags it with oauth_flavor === 'gcloud'.
function isGoogleCloud(connection) {
  return connection.auth_kind === 'oauth' && connection.oauth_flavor === 'gcloud'
}

// Signed in with Google but no billing project chosen yet: usable only once a
// project is set, so the platform withholds it (status oauth_required) until
// then. This is a "finish setup" state, distinct from a lapsed sign-in.
function needsProject(connection) {
  return isGoogleCloud(connection) && connection.signed_in && !connection.user_project
}

function healthText(connection) {
  if (needsProject(connection)) return 'Choose a project'
  if (connection.status === 'oauth_required') {
    return connection.signed_in ? 'Sign-in expired' : 'Needs sign-in'
  }
  if (connection.status === 'error') return 'Needs attention'
  if (connection.status_detail) return 'Unreachable at last check'
  return 'Reachable'
}

function dotColor(connection) {
  if (connection.status === 'error') return 'danger'
  if (connection.status === 'oauth_required') return 'muted'
  return connection.enabled ? 'green' : 'muted'
}

function normalizedUrl(value) {
  return displayEndpoint(value).replace(/\/+$/, '').toLowerCase()
}

function preopenOAuthPopup() {
  try {
    return window.open(
      'about:blank', 'mobius-connector-signin', 'width=520,height=680',
    )
  } catch {
    return null
  }
}

function closePopup(popup) {
  try { popup?.close() } catch { /* already closed or cross-origin */ }
}

// ── screens (module-level; see header comment) ─────────────────────────────

function Header({ ctx, title, subtitle, back, right }) {
  const [iconFailed, setIconFailed] = useState(false)
  return (
    <header className="cx-header">
      <div className="cx-brand">
        {back ? (
          <button type="button" className="cx-back" aria-label="Back"
            onClick={() => ctx.open(back)}>
            <ArrowLeft width={18} height={18} aria-hidden="true" />
          </button>
        ) : !iconFailed ? (
          <img className="cx-brand-icon" src={`/api/apps/${ctx.appId}/icon?size=64`}
            width={34} height={34} alt="" onError={() => setIconFailed(true)} />
        ) : (
          <span className="cx-brand-fallback" aria-hidden="true">
            <WebsiteNetwork width={19} height={19} />
          </span>
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

function ListScreen({ ctx }) {
  const {
    rows, connections, loadError, permissionBlocked, enabledCount, pending,
    actionError, view, iconByUrl, signingInId, open, load, toggle, signIn,
  } = ctx
  return (
    <>
      <Header
        ctx={ctx}
        title="Integrations"
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
            This app's access to integrations isn't active yet — a platform
            restart applies it. Everything else here works read-only until
            then.
          </div>
        ) : loadError && connections === null ? (
          <div className="cx-notice cx-notice--danger">
            Couldn't load integrations
            {loadError.message ? ` — ${loadError.message}` : ''}.{' '}
            <button type="button" className="cx-linklike" onClick={load}>
              Try again
            </button>
          </div>
        ) : connections === null ? (
          <div className="cx-notice" role="status">Loading integrations…</div>
        ) : rows.length === 0 ? (
          <div className="cx-empty">
            <div className="cx-empty-glyph" aria-hidden="true">
              <WebsiteNetwork width={30} height={30} />
            </div>
            <p className="cx-empty-title">No integrations yet</p>
            <p>
              An integration gives your agent a new remote capability — search,
              docs, scraping — usable from every chat on both runtimes.
            </p>
            <button type="button" className="cx-btn cx-btn--primary"
              onClick={() => open({ name: 'suggestions' })}>
              Browse suggestions
            </button>
          </div>
        ) : (
          rows.map(connection => (
            <div key={connection.id}
              className={`cx-card${connection.enabled ? '' : ' is-off'}`}>
              <button type="button" className="cx-card-open"
                aria-label={`Open ${connection.name}`}
                onClick={() => open({ name: 'detail', id: connection.id })}>
                <span className={`cx-dot cx-dot--${dotColor(connection)}`} />
                {iconByUrl.has(normalizedUrl(connection.url)) && (
                  <img className="cx-card-icon" alt="" aria-hidden="true"
                    src={iconByUrl.get(normalizedUrl(connection.url))} />
                )}
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
              </button>
              {connection.status === 'oauth_required' ? (
                <button type="button" className="cx-btn cx-btn--primary cx-signin-btn"
                  disabled={pending || signingInId === connection.id}
                  onClick={() => signIn(connection)}>
                  {signingInId === connection.id ? 'Starting…'
                    : needsProject(connection) ? 'Choose project'
                    : isGoogleCloud(connection) ? 'Sign in with Google'
                    : 'Sign in'}
                </button>
              ) : (
                <button type="button"
                  role="switch"
                  aria-checked={connection.enabled}
                  aria-label={`${connection.name} available to your agent`}
                  className={`cx-switch${connection.enabled ? ' is-on' : ''}`}
                  disabled={pending || (!connection.enabled && connection.status === 'error')}
                  title={!connection.enabled && connection.status === 'error'
                    ? 'Refresh status successfully before turning on'
                    : undefined}
                  onClick={() => toggle(connection)}>
                  <span aria-hidden="true" />
                </button>
              )}
            </div>
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

function DetailScreen({ ctx }) {
  const {
    view, byId, pending, actionError, confirmRemove, setConfirmRemove,
    probingId, signingInId, open, toggle, recheck, signIn, disconnect, remove,
    autoProbe,
  } = ctx
  const connection = byId.get(view.id)
  useEffect(() => {
    autoProbe(connection)
    // Entry-time freshen only; autoProbe's own throttle absorbs re-entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.id])
  if (!connection) {
    // Removed under us (another surface, or our own remove) — go home.
    return <ListScreen ctx={ctx} />
  }
  const removing = confirmRemove === connection.generation
  const checking = probingId === connection.id
  return (
    <>
      <Header
        ctx={ctx}
        title={connection.name}
        subtitle={displayEndpoint(connection.url)}
        back={{ name: 'list' }}
        right={connection.status === 'oauth_required' ? null : (
          <button type="button"
            role="switch"
            aria-checked={connection.enabled}
            aria-label={`${connection.name} available to your agent`}
            className={`cx-switch${connection.enabled ? ' is-on' : ''}`}
            disabled={pending || (!connection.enabled && connection.status === 'error')}
            title={!connection.enabled && connection.status === 'error'
              ? 'Refresh status successfully before turning on'
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
              {checking ? ' · Checking…' : ''}
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
          {connection.auth_kind === 'oauth' ? (
            <div className="cx-kv-row">
              <span className="cx-kv-key">Sign-in</span>
              <span className="cx-kv-value">
                {connection.signed_in ? 'Connected' : 'Not signed in'}
              </span>
            </div>
          ) : (
            <div className="cx-kv-row">
              <span className="cx-kv-key">API key</span>
              <span className="cx-kv-value">
                {connection.has_auth ? 'Saved (encrypted)' : 'None'}
              </span>
            </div>
          )}
          {isGoogleCloud(connection) && connection.signed_in && (
            <div className="cx-kv-row">
              <span className="cx-kv-key">Billing project</span>
              <span className={`cx-kv-value${needsProject(connection) ? ' is-warn' : ''}`}>
                {connection.user_project || 'Not chosen yet'}
              </span>
            </div>
          )}
          {connection.auth_kind === 'oauth' && connection.scopes?.length > 0 && (
            <div className="cx-kv-row">
              <span className="cx-kv-key">Access</span>
              <span className="cx-kv-value">{connection.scopes.join(', ')}</span>
            </div>
          )}
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
              Remove integration
            </button>
            <button type="button" className="cx-btn"
              disabled={pending} onClick={() => setConfirmRemove(null)}>
              Keep
            </button>
          </div>
        ) : (
          <div className="cx-detail-actions">
            {connection.status === 'oauth_required' && (
              <button type="button" className="cx-btn cx-btn--primary"
                disabled={pending || signingInId === connection.id}
                onClick={() => signIn(connection)}>
                {signingInId === connection.id ? 'Starting…'
                  : needsProject(connection) ? 'Choose project'
                  : isGoogleCloud(connection)
                    ? (connection.signed_in ? 'Sign in with Google again'
                       : 'Sign in with Google')
                  : (connection.signed_in ? 'Sign in again' : 'Sign in')}
              </button>
            )}
            {/* Google Cloud's easy path IS the Google sign-in above. Other
                providers can supply or replace issuer-scoped app credentials
                even while an existing sign-in is healthy. */}
            {connection.auth_kind === 'oauth' && !isGoogleCloud(connection) && (
              <button type="button" className="cx-btn cx-btn--ghost"
                disabled={pending}
                onClick={() => open({
                  name: 'client-setup', id: connection.id, manage: true,
                })}>
                {connection.status === 'oauth_required'
                  ? 'Use your own app credentials'
                  : 'Manage app credentials'}
              </button>
            )}
            {isGoogleCloud(connection) && connection.signed_in
              && connection.status !== 'oauth_required' && (
              <button type="button" className="cx-btn"
                disabled={pending}
                onClick={() => open({ name: 'google-signin', id: connection.id })}>
                Change project
              </button>
            )}
            {connection.auth_kind === 'oauth' && connection.signed_in
              && connection.status !== 'oauth_required' && (
              <button type="button" className="cx-btn"
                disabled={pending}
                onClick={() => disconnect(connection)}>
                Sign out
              </button>
            )}
            {connection.status === 'error' && (
              <button type="button" className="cx-btn"
                disabled={pending || checking}
                onClick={() => recheck(connection)}>
                {pending || checking ? 'Checking…' : 'Check again'}
              </button>
            )}
            <button type="button" className="cx-btn cx-btn--danger"
              disabled={pending}
              onClick={() => setConfirmRemove(connection.generation)}>
              Remove
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function AddScreen({ ctx }) {
  const { token, view, open, load } = ctx
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
      setError(submitError.message || 'Could not add the integration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header
        ctx={ctx}
        title={prefill ? `Add ${prefill.name}` : 'Add an integration'}
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
          {prefill?.signIn ? (
            <p className="cx-support-note">
              After you add this, a <strong>Sign in</strong> button appears on
              its card — you approve access in {prefill.name}'s own window.
            </p>
          ) : (
            <button type="button" className="cx-btn cx-btn--ghost"
              aria-expanded={usesKey}
              onClick={() => setUsesKey(current => {
                if (current) { setAuthValue(''); setAuthHeader('Authorization') }
                return !current
              })}>
              {usesKey ? 'Remove API key' : 'Add API key'}
            </button>
          )}
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

function ClientSetupScreen({ ctx }) {
  const {
    token, view, byId, pending, actionError, open, load, signIn,
    removeClientCredentials,
  } = ctx
  const connection = byId.get(view.id)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState(view.redirectUri || '')
  const [redirectFailed, setRedirectFailed] = useState(false)
  const [copyState, setCopyState] = useState('') // '' | 'copied' | 'manual'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemoveClient, setConfirmRemoveClient] = useState(false)
  const redirectInput = useRef(null)

  function fetchRedirect() {
    setRedirectFailed(false)
    getRedirectUri(token)
      .then(setRedirectUri)
      .catch(() => setRedirectFailed(true))
  }

  useEffect(() => {
    if (!redirectUri) fetchRedirect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!connection) return <ListScreen ctx={ctx} />

  function flashCopied() {
    setCopyState('copied')
    setTimeout(() => setCopyState(current =>
      current === 'copied' ? '' : current), 1500)
  }

  // iOS Safari's select() creates no real selection — the standard
  // setSelectionRange pairing makes the selection (and execCommand) work.
  function selectAll(node) {
    if (!node) return
    node.focus()
    node.select()
    node.setSelectionRange(0, node.value.length)
  }

  async function copyRedirect() {
    // The modern clipboard call can be withheld from an embedded app; fall
    // back to the selection-based command, and never fail silently — worst
    // case the address is left selected with a visible hint.
    try {
      await navigator.clipboard.writeText(redirectUri)
      flashCopied()
      return
    } catch { /* fall through */ }
    try {
      selectAll(redirectInput.current)
      if (document.execCommand('copy')) {
        flashCopied()
        return
      }
    } catch { /* fall through */ }
    selectAll(redirectInput.current)
    setCopyState('manual')
  }

  async function save(event) {
    event.preventDefault()
    if (saving || !clientId.trim()) return
    // Reserve the popup while this submit still has user activation. Saving,
    // reloading and OAuth discovery can outlive Safari's popup allowance.
    const popup = preopenOAuthPopup()
    setError('')
    setSaving(true)
    try {
      await setOAuthClient(
        token, connection.id, connection.generation,
        clientId.trim(), clientSecret.trim(),
      )
      const refreshed = await load()
      const current = refreshed?.find(row =>
        row.id === connection.id && row.generation === connection.generation)
      setClientId('')
      setClientSecret('')
      // Credentials stored — start the real sign-in immediately.
      open({ name: 'detail', id: connection.id })
      await signIn(current || connection, popup)
    } catch (saveError) {
      closePopup(popup)
      setError(saveError.message || 'Could not save the credentials')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header
        ctx={ctx}
        title={view.manage
          ? `App credentials for ${connection.name}`
          : `Set up ${connection.name}`}
        subtitle={view.manage ? 'Manage provider app credentials' : 'Use your own OAuth app'}
        back={{ name: 'detail', id: connection.id }}
      />
      <div className="cx-scroll">
        <div className="cx-notice cx-notice--accent">
          {view.manage
            ? "Enter OAuth app credentials for this provider to save or replace them. You can also remove any saved credentials for every connection that shares them below."
            : "This service needs your own OAuth app. Create one in the provider's developer console, add the redirect address below, then paste the client ID (and secret, if it gives one) here."}
          {view.issuer ? ` Provider: ${displayEndpoint(view.issuer)}.` : ''}
        </div>
        <form className="cx-form" onSubmit={save} aria-busy={saving}>
          <label className="cx-field">
            <span>Redirect address — paste this into your OAuth app</span>
            <div className="cx-copy-row">
              <input type="text" readOnly value={redirectUri} ref={redirectInput}
                onFocus={event => selectAll(event.target)} />
              <button type="button" className="cx-btn"
                onClick={copyRedirect} disabled={!redirectUri}>
                {copyState === 'copied' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </label>
          {copyState === 'manual' && (
            <p className="cx-support-note">
              Automatic copy is blocked here — the address is highlighted, so
              copy it with your device's usual copy action.
            </p>
          )}
          {!redirectUri && redirectFailed && (
            <p className="cx-support-note">
              Couldn't load the redirect address.{' '}
              <button type="button" className="cx-linklike"
                onClick={fetchRedirect}>
                Try again
              </button>
            </p>
          )}
          <label className="cx-field">
            <span>Client ID</span>
            <input type="text" required autoFocus value={clientId}
              onChange={event => setClientId(event.target.value)} />
          </label>
          <label className="cx-field">
            <span>Client secret <small>if your app has one</small></span>
            <input type="password" autoComplete="off" value={clientSecret}
              onChange={event => setClientSecret(event.target.value)} />
          </label>
          <p className="cx-support-note">
            Your secret is stored encrypted by the platform and never shown
            again. These credentials are reused by every connection to the
            same provider.
          </p>
          <div className="cx-form-actions">
            <button type="submit" className="cx-btn cx-btn--primary"
              disabled={saving || !clientId.trim()}>
              {saving ? 'Saving…' : 'Save and sign in'}
            </button>
          </div>
          {error && <div className="cx-notice cx-notice--danger">{error}</div>}
        </form>
        {actionError && (
          <div className="cx-notice cx-notice--danger">{actionError}</div>
        )}
        {view.manage && !confirmRemoveClient && (
          <button type="button" className="cx-btn cx-btn--danger"
            disabled={pending}
            onClick={() => setConfirmRemoveClient(true)}>
            Remove saved credentials
          </button>
        )}
        {view.manage && confirmRemoveClient && (
          <>
            <div className="cx-notice cx-notice--danger">
              These OAuth app credentials are shared by every connection to
              this provider. Removing them does not revoke active provider
              grants: signed-in connections can keep working until you sign
              them out or their current grants expire. Remove the saved
              credentials?
            </div>
            <div className="cx-confirm">
              <button type="button" className="cx-btn cx-btn--danger"
                disabled={pending}
                onClick={() => removeClientCredentials(connection)}>
                Remove for this provider
              </button>
              <button type="button" className="cx-btn"
                disabled={pending}
                onClick={() => setConfirmRemoveClient(false)}>
                Keep credentials
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function BrowserSignInScreen({ ctx }) {
  const { view, byId } = ctx
  const connection = byId.get(view.id)
  if (!connection) return <ListScreen ctx={ctx} />
  return (
    <>
      <Header
        ctx={ctx}
        title={`Sign in to ${connection.name}`}
        subtitle="Open the provider's approval page"
        back={{ name: 'detail', id: connection.id }}
      />
      <div className="cx-scroll">
        <div className="cx-notice cx-notice--accent">
          Your browser blocked the automatic sign-in window. Open it directly,
          approve access, then return here.
        </div>
        <a className="cx-btn cx-btn--primary cx-google-open"
          href={view.authorizeUrl} target="_blank" rel="noopener noreferrer">
          Open sign-in
        </a>
      </div>
    </>
  )
}

// Google-account sign-in: open a link, approve in Google's own page, paste the
// code it shows, then pick the billing project. No console app, no callback.
// One screen, two phases — 'link' (sign in) then 'project' (choose) — so a
// signed-in owner who just needs a project jumps straight to the picker.
function GoogleSignInScreen({ ctx }) {
  const { token, view, byId, open, load } = ctx
  const connection = byId.get(view.id)
  const alreadySignedIn = Boolean(connection?.signed_in)
  const [phase, setPhase] = useState(alreadySignedIn ? 'project' : 'link')
  const [authUrl, setAuthUrl] = useState('')
  const [flowState, setFlowState] = useState('')
  const [startError, setStartError] = useState('')
  const [startAttempt, setStartAttempt] = useState(0)
  const [code, setCode] = useState('')
  const [projects, setProjects] = useState([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectInput, setProjectInput] = useState('')
  const [reuseSources, setReuseSources] = useState([])
  const [showFresh, setShowFresh] = useState(false)
  const [reusingId, setReusingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const connId = connection?.id
  const connGen = connection?.generation
  const currentProject = connection?.user_project || ''

  // Fetch the consent link once when we actually need to sign in.
  useEffect(() => {
    if (phase !== 'link' || !connId) return
    let alive = true
    setAuthUrl('')
    setFlowState('')
    setStartError('')
    startGoogleSignIn(token, connId, connGen)
      .then(res => {
        if (!alive) return
        setAuthUrl(res.authorize_url || '')
        setFlowState(res.state || '')
      })
      .catch(err => {
        if (alive) setStartError(err.message || 'Could not start Google sign-in')
      })
    return () => { alive = false }
  }, [phase, token, connId, connGen, startAttempt])

  // In the sign-in step, also look for an existing Google sign-in to adopt so
  // the owner needn't approve again for a second Google Cloud service. Silent
  // on failure — the fresh sign-in below always remains available.
  useEffect(() => {
    if (phase !== 'link' || !connId) return
    let alive = true
    listReusableGoogle(token, connId, connGen)
      .then(res => {
        if (alive) setReuseSources(Array.isArray(res.sources) ? res.sources : [])
      })
      .catch(() => {})
    return () => { alive = false }
  }, [phase, token, connId, connGen])

  async function reuse(source) {
    if (busy || !source?.connector_id || !source?.generation) return
    setError('')
    setReusingId(source.connector_id)
    setBusy(true)
    try {
      const res = await reuseGoogleSignIn(
        token, connection.id, connection.generation,
        source.connector_id, source.generation,
      )
      await load()
      if (res.needs_project) {
        setProjects(Array.isArray(res.projects) ? res.projects : [])
        setProjectsLoaded(true)
        setPhase('project')
      } else {
        open({ name: 'detail', id: connection.id })
      }
    } catch (err) {
      const current = await refreshCurrentConnection()
      if (current?.signed_in) {
        if (current.user_project) open({ name: 'detail', id: connection.id })
        else {
          setProjectsLoaded(false)
          setPhase('project')
        }
        return
      }
      setError(err.message || 'Could not reuse your Google sign-in')
    } finally {
      setReusingId(null)
      setBusy(false)
    }
  }

  // Entering the project step without a list already in hand (the "change
  // project" path, where the owner is signed in but we skipped sign-in) — fetch
  // their live projects so we can offer a picker. Any failure leaves the list
  // empty and the manual-entry field below is the fallback.
  useEffect(() => {
    if (phase !== 'project' || projectsLoaded || !connId) return
    let alive = true
    setLoadingProjects(true)
    listGoogleProjects(token, connId, connGen)
      .then(res => {
        if (!alive) return
        setProjects(Array.isArray(res.projects) ? res.projects : [])
      })
      .catch(err => {
        if (!alive) return
        if (err?.status === 409) {
          setProjects([])
          setError(err.message || 'Sign in with Google again.')
          setShowFresh(true)
          setPhase('link')
          setStartAttempt(current => current + 1)
          load()
        }
        // Other failures fall through to manual project entry.
      })
      .finally(() => {
        if (!alive) return
        setProjectsLoaded(true)
        setLoadingProjects(false)
      })
    return () => { alive = false }
  }, [phase, projectsLoaded, token, connId, connGen])

  if (!connection) return <ListScreen ctx={ctx} />

  async function refreshCurrentConnection() {
    const refreshed = await load()
    return refreshed?.find(row =>
      row.id === connection.id && row.generation === connection.generation)
  }

  async function connect(event) {
    event.preventDefault()
    if (busy || !code.trim() || !flowState) return
    setError('')
    setBusy(true)
    try {
      const res = await completeGoogleSignIn(
        token, connection.id, connection.generation, flowState, code.trim(),
      )
      await load()
      if (res.needs_project) {
        setProjects(Array.isArray(res.projects) ? res.projects : [])
        setProjectsLoaded(true)  // complete already returned the live list
        setPhase('project')
      } else {
        open({ name: 'detail', id: connection.id })
      }
    } catch (err) {
      const current = await refreshCurrentConnection()
      if (current?.signed_in) {
        if (current.user_project) open({ name: 'detail', id: connection.id })
        else {
          setProjectsLoaded(false)
          setPhase('project')
        }
        return
      }
      setError(err.message || 'Could not finish sign-in')
    } finally {
      setBusy(false)
    }
  }

  async function choose(projectId) {
    const chosen = (projectId || '').trim()
    if (busy || !chosen) return
    setError('')
    setBusy(true)
    try {
      await setGoogleProject(token, connection.id, connection.generation, chosen)
      await load()
      open({ name: 'detail', id: connection.id })
    } catch (err) {
      const current = await refreshCurrentConnection()
      if (current?.user_project === chosen) {
        open({ name: 'detail', id: connection.id })
        return
      }
      if (err?.status === 409) {
        setShowFresh(true)
        setPhase('link')
        setStartAttempt(current => current + 1)
      }
      setError(err.message || 'Could not set the project')
    } finally {
      setBusy(false)
    }
  }

  function restartFreshSignIn() {
    setCode('')
    setError('')
    setShowFresh(true)
    setPhase('link')
    setStartAttempt(current => current + 1)
  }

  return (
    <>
      <Header
        ctx={ctx}
        title={phase === 'project' ? 'Choose a project' : 'Sign in with Google'}
        subtitle={connection.name}
        back={{ name: 'detail', id: connection.id }}
      />
      <div className="cx-scroll">
        {phase === 'link' && reuseSources.length > 0 && !showFresh ? (
          // Reuse stays one tap when there is one source. Multiple sources may
          // hold different credentials, so let the owner choose explicitly.
          <>
            <div className="cx-notice cx-notice--accent">
              {reuseSources.length === 1
                ? "You're already signed in to Google — reuse it for this service too. No approval needed; just pick a project next."
                : "You have more than one Google sign-in available. Choose which connection to reuse from; no new approval is needed."}
            </div>
            {reuseSources.length === 1 ? (
              <button type="button"
                className="cx-btn cx-btn--primary cx-google-open"
                disabled={busy}
                onClick={() => reuse(reuseSources[0])}>
                {reusingId === reuseSources[0].connector_id
                  ? 'Connecting…' : 'Use your Google account'}
              </button>
            ) : (
              <div className="cx-project-list">
                {reuseSources.map(source => {
                  const sourceProject = byId.get(source.connector_id)?.user_project
                  return (
                    <button key={source.connector_id} type="button"
                      className="cx-btn cx-btn--primary"
                      disabled={busy}
                      onClick={() => reuse(source)}>
                      {reusingId === source.connector_id
                        ? 'Connecting…'
                        : `Reuse sign-in from ${source.name}${sourceProject
                          ? ` · ${sourceProject}` : ''}`}
                    </button>
                  )
                })}
              </div>
            )}
            <button type="button" className="cx-linklike cx-fresh-toggle"
              disabled={busy}
              onClick={() => setShowFresh(true)}>
              Use a different Google account
            </button>
          </>
        ) : phase === 'link' ? (
          <>
            {reuseSources.length > 0 && (
              <button type="button" className="cx-linklike cx-fresh-toggle"
                onClick={() => setShowFresh(false)}>
                ← Reuse an existing Google sign-in
              </button>
            )}
            <div className="cx-notice cx-notice--accent">
              Open the Google sign-in page, approve access, then paste the code
              Google shows you here. There is no OAuth app to create — this
              uses Google's own sign-in.
            </div>
            {startError ? (
              <div className="cx-notice cx-notice--danger">
                {startError}{' '}
                <button type="button" className="cx-linklike"
                  onClick={() => {
                    setStartError('')
                    setStartAttempt(current => current + 1)
                  }}>
                  Try again
                </button>
              </div>
            ) : (
              <a className={`cx-btn cx-btn--primary cx-google-open${authUrl ? '' : ' is-disabled'}`}
                href={authUrl || undefined}
                target="_blank" rel="noopener noreferrer"
                aria-disabled={!authUrl}
                onClick={event => {
                  if (!authUrl) event.preventDefault()
                  else setShowFresh(true)
                }}>
                {authUrl ? 'Open Google sign-in' : 'Preparing…'}
              </a>
            )}
            <form className="cx-form" onSubmit={connect}>
              <label className="cx-field">
                <span>Code from Google</span>
                <input type="text" inputMode="text" autoComplete="off"
                  placeholder="Paste the code here"
                  value={code}
                  onChange={event => setCode(event.target.value)} />
              </label>
              <div className="cx-form-actions">
                <button type="submit" className="cx-btn cx-btn--primary"
                  disabled={busy || !code.trim() || !flowState}>
                  {busy ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="cx-notice cx-notice--accent">
              Choose the Google Cloud project used for API quota and billing.
              The service's API may need enabling there, and your Google
              account needs access. You can change this later.
            </div>
            {loadingProjects && (
              <p className="cx-support-note" role="status">Loading your projects…</p>
            )}
            {projects.length > 0 && (
              <div className="cx-project-list">
                {projects.map(project => {
                  const isCurrent = project.project_id === currentProject
                  return (
                    <button key={project.project_id} type="button"
                      className="cx-project-option"
                      disabled={busy || isCurrent}
                      aria-current={isCurrent || undefined}
                      onClick={() => choose(project.project_id)}>
                      <span className="cx-project-name">
                        {project.name}
                        {isCurrent && <span className="cx-pill cx-pill--added">Current</span>}
                      </span>
                      <span className="cx-project-id">{project.project_id}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {projectsLoaded && projects.length === 0 && !loadingProjects && (
              <p className="cx-support-note">
                Couldn't list your projects automatically — enter the project ID
                below (you'll find it in the Google Cloud console).
              </p>
            )}
            <form className="cx-form"
              onSubmit={event => { event.preventDefault(); choose(projectInput) }}>
              <label className="cx-field">
                <span>
                  {projects.length > 0 ? 'Or enter a project ID' : 'Project ID'}
                </span>
                <input type="text" inputMode="text" autoComplete="off"
                  placeholder="my-project-123"
                  value={projectInput}
                  onChange={event => setProjectInput(event.target.value)} />
              </label>
              <div className="cx-form-actions">
                <button type="submit" className="cx-btn cx-btn--primary"
                  disabled={busy || !projectInput.trim()}>
                  {busy ? 'Saving…' : 'Use this project'}
                </button>
              </div>
            </form>
          </>
        )}
        {error && (
          <div className="cx-notice cx-notice--danger">
            {error}
            {phase === 'link' && (
              <>
                {' '}
                <button type="button" className="cx-linklike"
                  onClick={restartFreshSignIn}>
                  Restart sign-in
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function SuggestionsScreen({ ctx }) {
  const { pending, permissionBlocked, addedUrls, open } = ctx
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = [...SUGGESTIONS]
    .filter(suggestion => !needle || (
      `${suggestion.name} ${suggestion.tagline} ${suggestion.detail}`
        .toLowerCase()
        .includes(needle)
    ))
    .sort((a, b) =>
      Number(addedUrls.has(normalizedUrl(a.url)))
      - Number(addedUrls.has(normalizedUrl(b.url))))
  return (
    <>
      <Header
        ctx={ctx}
        title="Suggestions"
        subtitle="Provider-published services, checked when added"
        back={{ name: 'list' }}
      />
      <div className="cx-scroll">
        <input
          type="search"
          className="cx-search"
          placeholder="Search suggestions…"
          aria-label="Search suggestions"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        {visible.length === 0 && (
          <div className="cx-notice" role="status">
            Nothing matches "{query.trim()}" — the agent can also add any
            service by address from the main screen.
          </div>
        )}
        {visible.map(suggestion => {
          const added = addedUrls.has(normalizedUrl(suggestion.url))
          return (
            <div key={suggestion.id} className="cx-suggestion">
              <div className="cx-suggestion-top">
                <div className="cx-suggestion-id">
                  {suggestion.icon && (
                    <img className="cx-suggestion-icon" src={suggestion.icon}
                      alt="" aria-hidden="true" />
                  )}
                  <div>
                    <h2 className="cx-suggestion-name">{suggestion.name}</h2>
                    <span className="cx-suggestion-tagline">
                      {suggestion.tagline}
                    </span>
                  </div>
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
                  {suggestion.signIn
                    ? 'Sign-in required'
                    : (suggestion.needsKey ? 'Needs an API key' : 'No key needed')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function Integrations({ appId, token }) {
  const [connections, setConnections] = useState(null) // null = first load
  const [loadError, setLoadError] = useState(null)
  const [view, setView] = useState({ name: 'list' })
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [signingInId, setSigningInId] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [probingId, setProbingId] = useState(null)
  const mutationPending = useRef(false)
  const signInPending = useRef(false)
  const oauthMessageCleanup = useRef(null)
  const readySignalled = useRef(false)
  const probedAt = useRef(new Map())

  const load = useCallback(async () => {
    try {
      const rows = await listConnections(token)
      setConnections(rows)
      setLoadError(null)
      if (!readySignalled.current) {
        readySignalled.current = true
        window.mobius?.signal?.('app_ready', { item_count: rows.length })
      }
      return rows
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

  useEffect(() => () => {
    oauthMessageCleanup.current?.()
    oauthMessageCleanup.current = null
  }, [])

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
  const iconByUrl = useMemo(
    () => new Map(SUGGESTIONS
      .filter(s => s.icon)
      .map(s => [normalizedUrl(s.url), s.icon])),
    [],
  )
  const enabledCount = rows.filter(
    row => row.enabled && row.status === 'ok',
  ).length

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

  // Sign-in opens the provider's consent screen in a popup. The platform holds
  // the tokens; this app only learns success via the callback page's postMessage
  // (or, if the popup is blocked from messaging back, the next list refresh).
  // If the provider can't self-register, start reports needs_client_setup and
  // we open the setup screen to collect the owner's own app credentials first.
  async function signIn(connection, reservedPopup = null) {
    setActionError('')
    // Google Cloud connections use the link-and-code flow (no popup, no
    // callback): route to the dedicated screen, which also handles picking the
    // billing project when the owner is already signed in but hasn't chosen one.
    if (isGoogleCloud(connection)) {
      closePopup(reservedPopup)
      open({ name: 'google-signin', id: connection.id })
      return
    }
    if (signInPending.current) {
      closePopup(reservedPopup)
      setActionError('Another sign-in is still starting.')
      return
    }
    // Reserve the window synchronously while a direct tap still carries user
    // activation. Discovery/registration can take longer than popup blockers
    // allow; if even this reservation is blocked we render a direct link.
    const popup = reservedPopup || preopenOAuthPopup()
    signInPending.current = true
    setSigningInId(connection.id)
    let started
    try {
      started = await startSignIn(token, connection.id, connection.generation)
    } catch (error) {
      closePopup(popup)
      setActionError(error.message || 'Could not start sign-in')
      return
    } finally {
      signInPending.current = false
      setSigningInId(null)
    }
    if (started.needs_client_setup) {
      closePopup(popup)
      open({
        name: 'client-setup', id: connection.id,
        issuer: started.issuer, redirectUri: started.redirect_uri,
      })
      return
    }
    const authorizeUrl = started.authorize_url
    if (!authorizeUrl) {
      closePopup(popup)
      setActionError('The provider did not return a sign-in address.')
      return
    }
    oauthMessageCleanup.current?.()
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (popup && event.source !== popup) return
      if (event?.data?.type !== 'mobius-connector-oauth') return
      oauthMessageCleanup.current?.()
      oauthMessageCleanup.current = null
      if (event.data.ok === false) {
        setActionError('Sign-in did not complete. Try again.')
      }
      load()
    }
    window.addEventListener('message', onMessage)
    oauthMessageCleanup.current = () => {
      window.removeEventListener('message', onMessage)
    }
    let navigated = false
    if (popup && !popup.closed) {
      try {
        popup.location.href = authorizeUrl
        navigated = true
      } catch { /* use the direct-link fallback below */ }
    }
    if (!navigated) {
      closePopup(popup)
      oauthMessageCleanup.current?.()
      oauthMessageCleanup.current = null
      open({
        name: 'browser-signin', id: connection.id, authorizeUrl,
      })
    }
  }

  async function disconnect(connection) {
    await perform(() => signOut(token, connection.id, connection.generation))
  }

  async function removeClientCredentials(connection) {
    const removed = await perform(() => clearOAuthClient(
      token, connection.id, connection.generation,
    ))
    if (removed !== null) open({ name: 'detail', id: connection.id })
  }

  // Opening a card freshens its status quietly. Safe by construction: a
  // transient failure keeps last known health server-side, and a toggle that
  // races this probe rotates the row generation so the stale write misses.
  // Throttled so hopping between cards doesn't hammer the remote service;
  // deliberately outside perform() so the toggle stays live while checking.
  async function autoProbe(connection) {
    if (!connection) return
    const last = probedAt.current.get(connection.id) || 0
    if (Date.now() - last < 60000) return
    probedAt.current.set(connection.id, Date.now())
    setProbingId(connection.id)
    try {
      await recheckConnection(token, connection.id, connection.generation)
    } catch {
      // Quiet freshen: the row's own status tells the story after reload.
    } finally {
      setProbingId(current => (current === connection.id ? null : current))
      load()
    }
  }

  async function remove(connection) {
    const done = await perform(() => removeConnection(
      token, connection.id, connection.generation,
    ))
    setConfirmRemove(null)
    if (done !== null) open({ name: 'list' })
  }

  const permissionBlocked = loadError && loadError.status === 403

  const ctx = {
    appId, token, rows, connections, loadError, permissionBlocked, enabledCount,
    view, open, load, pending, actionError, confirmRemove, setConfirmRemove,
    probingId, signingInId, byId, addedUrls, iconByUrl,
    toggle, recheck, signIn, disconnect, removeClientCredentials,
    autoProbe, remove,
  }

  return (
    <div className="cx-root">
      <style>{CSS}</style>
      {/* Identity-scoped screens use id + generation: a parent re-render
          keeps the instance (typed state survives the window-focus refresh),
          but a deleted/recreated row that reuses a numeric id remounts before
          old credentials or Google flow state can reach the replacement. */}
      {view.name === 'detail' ? (
        <DetailScreen key={`${view.id}:${byId.get(view.id)?.generation || ''}`} ctx={ctx} />
      )
        : view.name === 'add' ? <AddScreen ctx={ctx} />
        : view.name === 'client-setup' ? (
          <ClientSetupScreen
            key={`${view.id}:${byId.get(view.id)?.generation || ''}`} ctx={ctx} />
        )
        : view.name === 'browser-signin' ? (
          <BrowserSignInScreen
            key={`${view.id}:${byId.get(view.id)?.generation || ''}`} ctx={ctx} />
        )
        : view.name === 'google-signin' ? (
          <GoogleSignInScreen
            key={`${view.id}:${byId.get(view.id)?.generation || ''}`} ctx={ctx} />
        )
        : view.name === 'suggestions' ? <SuggestionsScreen ctx={ctx} />
        : <ListScreen ctx={ctx} />}
    </div>
  )
}
