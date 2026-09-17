# Managing MCP integrations

Read this when the partner asks to add, check, disable, remove, or reason
about a remote MCP connection ("connect Context7", "why is Firecrawl missing
tools", "what is this costing me"), or when a chat would clearly benefit from
a capability a known MCP service provides.

## What an integration is

An integration is a remote MCP service the owner added once, made available to
BOTH agent runtimes in the owner's own chats. The platform holds any API key
encrypted, probes the service before saving, and wires enabled+healthy
integrations into each turn. App-attributed chats and delegated sub-runs never
receive them. The Integrations app (slug `integrations`) is the owner's
management surface; open it in the workspace when the partner wants to look.

## Inspecting and managing from chat

The registry API works with the agent token. Responses never contain stored
keys.

```bash
mapi /api/connectors | python3 -m json.tool
```

Each row: `name`, `url`, `enabled`, `status` (`ok`/`error`), `status_detail`,
`tools` (names), `est_tokens`, and a `generation` value. Mutations must echo
the generation in a header — re-list first, then:

```bash
# Toggle / rename
mapi -X PATCH /api/connectors/<id> \
  -H "X-Mobius-Connector-Generation: <generation>" \
  -H "Content-Type: application/json" -d '{"enabled": false}'

# Re-check health (also refreshes tools and the cost estimate)
mapi -X POST /api/connectors/<id>/refresh \
  -H "X-Mobius-Connector-Generation: <generation>"

# Add a keyless service (the platform probes it live before saving)
mapi -X POST /api/connectors \
  -H "Content-Type: application/json" \
  -d '{"url": "https://mcp.example.com/mcp", "name": ""}'
```

## Rules

- **Keys never travel through chat.** When a service needs an API key, open
  the Integrations app for the partner and have them enter it there — the add
  form stores it encrypted. Do not ask the partner to paste a key into the
  conversation.
- **Removing an integration is destructive** — confirm in the partner's own
  words first. Disabling is safe and reversible; prefer it when unsure.
- **Read the cost signal before recommending.** `est_tokens` estimates the
  tool-schema size. One runtime (Codex) pays roughly that many tokens EVERY
  message while the integration is enabled; Claude defers loading. A
  large-catalog integration left enabled is a recurring cost even when unused.
- **Health states:** `status: "error"` means the last check definitively
  failed (bad key, rejected, gone) — the integration is withheld from turns
  until a successful check (open its card and press Check again); it cannot be enabled while unhealthy. A row
  with `status: "ok"` but a `status_detail` message was merely unreachable at
  the last check (network blip) and keeps working; a re-check clears the note.
- **Sign-in services** (`auth_kind: "oauth"`) connect in the app with a
  secure sign-in, never a pasted key. Google Cloud services use Google's
  link-and-code sign-in and then a project picker — there is no OAuth app to
  create. Later Google connections can reuse an existing sign-in or use a
  different Google account. The selected project may still need that service's
  API enabled and appropriate IAM permissions before real tool calls work.
  Other providers that cannot register automatically may still need the
  partner's own OAuth app; the Integrations app guides that setup. Point the
  partner at the app: sign-in codes and OAuth client credentials never travel
  through chat.
- **A newly added or re-enabled connection applies from the NEXT chat turn**,
  not mid-turn.
- If every management call answers 403, the platform likely needs a restart
  to activate the connections permission — say so instead of retrying.
