# Managing MCP connections

Read this when the partner asks to add, check, disable, remove, or reason
about a remote MCP connection ("connect Context7", "why is Firecrawl missing
tools", "what is this costing me"), or when a chat would clearly benefit from
a capability a known MCP service provides.

## What a connection is

A connection is a remote MCP service the owner added once, made available to
BOTH agent runtimes in the owner's own chats. The platform holds any API key
encrypted, probes the service before saving, and wires enabled+healthy
connections into each turn. App-attributed chats and delegated sub-runs never
receive them. The Connections app (slug `connections`) is the owner's
management surface; open it in the workspace when the partner wants to look.

## Inspecting and managing from chat

The registry API works with the agent token. Responses never contain stored
keys.

```bash
curl -s -H "Authorization: Bearer $AGENT_TOKEN" "$API_BASE_URL/api/connectors" | python3 -m json.tool
```

Each row: `name`, `url`, `enabled`, `status` (`ok`/`error`), `status_detail`,
`tools` (names), `est_tokens`, and a `generation` value. Mutations must echo
the generation in a header — re-list first, then:

```bash
# Toggle / rename
curl -s -X PATCH "$API_BASE_URL/api/connectors/<id>" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "X-Mobius-Connector-Generation: <generation>" \
  -H "Content-Type: application/json" -d '{"enabled": false}'

# Re-check health (also refreshes tools and the cost estimate)
curl -s -X POST "$API_BASE_URL/api/connectors/<id>/refresh" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "X-Mobius-Connector-Generation: <generation>"

# Add a keyless service (the platform probes it live before saving)
curl -s -X POST "$API_BASE_URL/api/connectors" \
  -H "Authorization: Bearer $AGENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"url": "https://mcp.example.com/mcp", "name": ""}'
```

## Rules

- **Keys never travel through chat.** When a service needs an API key, open
  the Connections app for the partner and have them enter it there — the add
  form stores it encrypted. Do not ask the partner to paste a key into the
  conversation.
- **Removing a connection is destructive** — confirm in the partner's own
  words first. Disabling is safe and reversible; prefer it when unsure.
- **Read the cost signal before recommending.** `est_tokens` estimates the
  tool-schema size. One runtime (Codex) pays roughly that many tokens EVERY
  message while the connection is enabled; Claude defers loading. A
  large-catalog connection left enabled is a recurring cost even when unused.
- **Health states:** `status: "error"` means the last check definitively
  failed (bad key, rejected, gone) — the connection is withheld from turns
  until a successful check (open its card and press Check again); it cannot be enabled while unhealthy. A row
  with `status: "ok"` but a `status_detail` message was merely unreachable at
  the last check (network blip) and keeps working; a re-check clears the note.
- **A newly added or re-enabled connection applies from the NEXT chat turn**,
  not mid-turn.
- If every management call answers 403, the platform likely needs a restart
  to activate the connections permission — say so instead of retrying.
