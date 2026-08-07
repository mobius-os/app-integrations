// Same-origin fetch helpers for the platform's connection registry.
// The app token authorizes this surface through permissions.connections_manage.
// Stored API keys never reach this app: responses carry row metadata only, and
// the platform's probe/broker hold every secret server-side.

const GENERATION_HEADER = 'X-Mobius-Connector-Generation'

// OAuth discovery can legally walk several protected-resource and issuer
// metadata candidates before dynamic registration. Google Cloud operations
// can additionally page through project batches of up to 500 before probing the MCP
// service. These budgets cover the backend's bounded valid paths instead of
// aborting a request that may still commit server-side.
const OAUTH_DISCOVERY_TIMEOUT_MS = 160000
const GCLOUD_OPERATION_TIMEOUT_MS = 540000

async function request(url, { token, timeoutMs = 12000, ...options } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: 'Bearer ' + token,
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function jsonOrThrow(res, fallback) {
  let body = null
  try {
    body = await res.json()
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    const detail = body && typeof body.detail === 'string' ? body.detail : ''
    const error = new Error(detail || fallback)
    error.status = res.status
    throw error
  }
  return body
}

export async function listConnections(token) {
  const res = await request('/api/connectors', { token })
  const body = await jsonOrThrow(res, 'Could not load connections')
  return Array.isArray(body?.connectors) ? body.connectors : []
}

export async function addConnection(token, payload) {
  // The platform probes the endpoint before saving; allow the full handshake.
  const res = await request('/api/connectors', {
    token,
    method: 'POST',
    timeoutMs: OAUTH_DISCOVERY_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return jsonOrThrow(res, 'Could not add the connection')
}

export async function updateConnection(token, id, generation, patch) {
  const res = await request(`/api/connectors/${id}`, {
    token,
    method: 'PATCH',
    timeoutMs: 15000,
    headers: {
      'Content-Type': 'application/json',
      [GENERATION_HEADER]: generation,
    },
    body: JSON.stringify(patch),
  })
  return jsonOrThrow(res, 'Could not update the connection')
}

export async function recheckConnection(token, id, generation) {
  const res = await request(`/api/connectors/${id}/refresh`, {
    token,
    method: 'POST',
    timeoutMs: 25000,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not re-check the connection')
}

export async function removeConnection(token, id, generation) {
  const res = await request(`/api/connectors/${id}`, {
    token,
    method: 'DELETE',
    timeoutMs: 15000,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not remove the connection')
}

// Sign-in: the platform builds the provider authorization URL (tokens never
// reach this app). Returns the whole response: either {authorize_url} to open
// in a popup, or {needs_client_setup, issuer, redirect_uri} when the provider
// requires the owner's own OAuth app credentials first.
export async function startSignIn(token, id, generation) {
  const res = await request(`/api/connectors/${id}/oauth/start`, {
    token,
    method: 'POST',
    timeoutMs: OAUTH_DISCOVERY_TIMEOUT_MS,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not start sign-in')
}

// Store the owner's own OAuth client (client_id + optional secret) for a
// connection whose provider can't self-register. The secret is sealed
// server-side and never returned.
export async function setOAuthClient(token, id, generation, clientId, clientSecret) {
  const res = await request(`/api/connectors/${id}/oauth/client`, {
    token,
    method: 'POST',
    timeoutMs: 15000,
    headers: { 'Content-Type': 'application/json', [GENERATION_HEADER]: generation },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret || '' }),
  })
  return jsonOrThrow(res, 'Could not save the credentials')
}

// The redirect URI the owner must register in their provider app — the
// server's authoritative value (from its public client-metadata document), so
// it always matches what the callback validates.
export async function getRedirectUri(token) {
  const res = await request('/api/connectors/oauth/client-metadata.json', { token })
  const body = await jsonOrThrow(res, 'Could not read the redirect address')
  return (body.redirect_uris && body.redirect_uris[0]) || ''
}

export async function clearOAuthClient(token, id, generation) {
  const res = await request(`/api/connectors/${id}/oauth/client`, {
    token,
    method: 'DELETE',
    timeoutMs: 15000,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not remove the credentials')
}

export async function signOut(token, id, generation) {
  const res = await request(`/api/connectors/${id}/oauth/disconnect`, {
    token,
    method: 'POST',
    timeoutMs: 15000,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not sign out')
}

// Google-account sign-in (Google Cloud connections). No popup and no callback:
// the platform returns a consent link and a sealed `state`; the owner approves
// in Google's own page, which shows a code to paste back. Tokens never reach
// this app. Returns {authorize_url, state}.
export async function startGoogleSignIn(token, id, generation) {
  const res = await request(`/api/connectors/${id}/oauth/gcloud/start`, {
    token,
    method: 'POST',
    timeoutMs: 20000,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not start Google sign-in')
}

// Finish Google sign-in from the pasted code. Returns
// {connection, projects, needs_project}. The billing project auto-selects when
// the account has exactly one; otherwise the owner picks from `projects`.
export async function completeGoogleSignIn(token, id, generation, state, code, projectId) {
  const res = await request(`/api/connectors/${id}/oauth/gcloud/complete`, {
    token,
    method: 'POST',
    // Token exchange + project discovery + MCP probe are sequential server
    // operations. Keep the browser budget above their combined valid window
    // so a one-use authorization code cannot look failed while the server is
    // still committing it.
    timeoutMs: GCLOUD_OPERATION_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json', [GENERATION_HEADER]: generation },
    body: JSON.stringify({ state, code, project_id: projectId || '' }),
  })
  return jsonOrThrow(res, 'Could not finish Google sign-in')
}

// List the owner's Google Cloud projects for a signed-in connection, so the
// app can offer a picker when changing the billing project. Returns
// {projects, current}; an empty list means the lookup was unavailable.
export async function listGoogleProjects(token, id, generation) {
  const res = await request(`/api/connectors/${id}/oauth/gcloud/projects`, {
    token,
    timeoutMs: GCLOUD_OPERATION_TIMEOUT_MS,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not load your Google projects')
}

// List the owner's other signed-in Google connections whose sign-in this one
// can adopt (no re-approval). Returns
// {sources: [{connector_id, generation, name}]}.
export async function listReusableGoogle(token, id, generation) {
  const res = await request(`/api/connectors/${id}/oauth/gcloud/reusable`, {
    token,
    timeoutMs: 15000,
    headers: { [GENERATION_HEADER]: generation },
  })
  return jsonOrThrow(res, 'Could not check your Google sign-ins')
}

// Adopt an existing Google sign-in for this connection — no re-approval. Copies
// the sealed credential from the source connection and resolves the project.
// Returns {connection, projects, needs_project}.
export async function reuseGoogleSignIn(
  token, id, generation, sourceId, sourceGeneration, projectId,
) {
  const res = await request(`/api/connectors/${id}/oauth/gcloud/reuse`, {
    token,
    method: 'POST',
    timeoutMs: GCLOUD_OPERATION_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json', [GENERATION_HEADER]: generation },
    body: JSON.stringify({
      source_connector_id: sourceId,
      source_generation: sourceGeneration,
      project_id: projectId || '',
    }),
  })
  return jsonOrThrow(res, 'Could not reuse your Google sign-in')
}

// Set or change the billing project for a signed-in Google connection.
// Returns {connection, projects}.
export async function setGoogleProject(token, id, generation, projectId) {
  const res = await request(`/api/connectors/${id}/oauth/gcloud/project`, {
    token,
    method: 'POST',
    timeoutMs: GCLOUD_OPERATION_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json', [GENERATION_HEADER]: generation },
    body: JSON.stringify({ project_id: projectId }),
  })
  return jsonOrThrow(res, 'Could not set the project')
}
