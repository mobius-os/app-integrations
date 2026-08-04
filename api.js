// Same-origin fetch helpers for the platform's connection registry.
// The app token authorizes this surface through permissions.connections_manage.
// Stored API keys never reach this app: responses carry row metadata only, and
// the platform's probe/broker hold every secret server-side.

const GENERATION_HEADER = 'X-Mobius-Connector-Generation'

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
    timeoutMs: 25000,
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
