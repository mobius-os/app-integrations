# Integrations

The management surface for Möbius's owner-managed MCP integrations: add a
remote MCP service once and both agent runtimes can use it in the owner's
own chats — with live health, honest per-message cost, and a curated
suggestions catalog built from providers' published endpoints.

The platform keeps what an app structurally cannot hold: API-key custody
(encrypted server-side, never returned), the loopback broker, per-turn
provider injection, and the grant policy. This app is the owner's window
onto that registry, authorized by the `connections_manage` manifest
permission — it manages rows without ever holding what they protect.

## What it does

- **List** every integration with health, tool count, and an estimated
  tool-schema cost per message (one runtime pays that cost on every message
  while a connection is enabled; the other defers loading).
- **Detail view** per integration: tools, cost, last-check outcome. Opening a
  card refreshes its status quietly in the background; a failing integration
  gets an explicit "Check again" as its recovery action.
- **Add** by address, optionally with a static API key entered in the form
  and stored encrypted by the platform. Every add is probed live before it
  saves.
- **Suggestions**: a curated, searchable catalog built from providers'
  published endpoints. Every add is still probed live before it saves, so a
  stale or unavailable entry fails safely; icons are each service's own
  published favicon, fetched at curation time and shipped inline (app frames
  rightly refuse runtime loads from external hosts).
- **Agent skill** (`integrations.md`): how the in-product agent inspects,
  adds, and reasons about integrations conversationally — including the rule
  that keys go through the app's form, never through chat.

## Requirements

A Möbius platform with the `connections_manage` app permission
(`connections_manage` column + `/api/connectors` app-token gate). Fresh
installs bootstrap this app automatically alongside App Store, Skills, Memory,
Reflection, Möbius · You, and Social.

## Development

The catalog lives in `suggestions.js` as plain data. To add an entry, confirm
the endpoint in the provider's current documentation, verify it against the
platform probe when credentials are available, fetch the service's own
favicon, and ship it inline — see the header comment in that file.
`test/` carries the UI test suite inherited from the platform's Settings
section, pending adaptation to the app frame.
