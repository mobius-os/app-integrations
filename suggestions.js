// Curated, known-good remote MCP services. Every entry shipped here has been
// verified against the platform's own probe before release; adding one still
// runs that probe live, so a stale entry fails safely instead of saving a
// broken row. Keys are entered by the owner in the add form and stored
// encrypted server-side — never in this app.
export const SUGGESTIONS = [
  {
    id: 'context7',
    name: 'Context7',
    url: 'https://mcp.context7.com/mcp',
    needsKey: false,
    tagline: 'Current documentation for thousands of libraries',
    detail:
      'Gives your agent up-to-date docs and code examples whenever it works '
      + 'with a library — useful in almost every coding conversation.',
    costNote: 'Small tool catalog, light per-message cost.',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    url: 'https://mcp.firecrawl.dev/v2/mcp',
    needsKey: true,
    keyHint: 'Needs a Firecrawl API key.',
    tagline: 'Web scraping, crawling, and structured extraction',
    detail:
      'Lets your agent fetch pages, crawl sites, and pull structured content '
      + 'from the web — search, screenshots, extraction.',
    costNote: 'Large tool catalog, noticeable per-message cost.',
  },
]
