// Curated, known-good remote MCP services. Every entry here was verified
// against the platform's own probe before release (2026-08-04): keyless
// entries returned their full tool catalog; key-required entries answered
// with a live key challenge. Adding one still runs that probe live, so a
// stale entry fails safely instead of saving a broken row. Keys are entered
// by the owner in the add form and stored encrypted server-side — never in
// this app.
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
    costNote: 'Small tool catalog (~1.3k tokens/message).',
  },
  {
    id: 'deepwiki',
    name: 'DeepWiki',
    url: 'https://mcp.deepwiki.com/mcp',
    needsKey: false,
    tagline: 'Ask questions about any public GitHub repository',
    detail:
      'AI-generated documentation over public repos — your agent can read a '
      + 'project’s wiki and ask questions about unfamiliar codebases.',
    costNote: 'Tiny tool catalog (~0.4k tokens/message).',
  },
  {
    id: 'grep-app',
    name: 'Grep by Vercel',
    url: 'https://mcp.grep.app',
    needsKey: false,
    tagline: 'Code search across a million public repositories',
    detail:
      'Sub-second pattern search over public GitHub — how other projects '
      + 'actually use an API, real-world examples on demand.',
    costNote: 'Tiny tool catalog (~0.7k tokens/message).',
  },
  {
    id: 'microsoft-learn',
    name: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/api/mcp',
    needsKey: false,
    tagline: 'Official Microsoft, Azure, and .NET documentation',
    detail:
      'Search and fetch current Microsoft docs and code samples — the '
      + 'authoritative source when your agent works in that ecosystem.',
    costNote: 'Small tool catalog (~1.2k tokens/message).',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    url: 'https://huggingface.co/mcp',
    needsKey: false,
    keyHint: 'Works without a key; add your HF token for private access.',
    tagline: 'Models, datasets, papers, and Spaces on the Hub',
    detail:
      'Lets your agent search Hugging Face models, datasets, and papers — '
      + 'handy for ML work and staying current on releases.',
    costNote: 'Moderate tool catalog (~2.4k tokens/message).',
  },
  {
    id: 'cloudflare-docs',
    name: 'Cloudflare Docs',
    url: 'https://docs.mcp.cloudflare.com/mcp',
    needsKey: false,
    tagline: 'Cloudflare developer documentation search',
    detail:
      'Current reference over Workers, R2, DNS, and Zero Trust — for '
      + 'anything you build or host on Cloudflare.',
    costNote: 'Tiny tool catalog (~0.4k tokens/message).',
  },
  {
    id: 'exa',
    name: 'Exa Search',
    url: 'https://mcp.exa.ai/mcp',
    needsKey: false,
    keyHint: 'Free tier without a key; add an Exa key for higher limits.',
    tagline: 'Neural web search and code-context search',
    detail:
      'Web search built for agents — find pages, code context, and company '
      + 'info with semantic queries rather than keywords.',
    costNote: 'Small tool catalog (~0.5k tokens/message).',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    url: 'https://mcp.tavily.com/mcp/',
    needsKey: true,
    keyHint: 'Needs a Tavily API key.',
    tagline: 'Real-time web search, extraction, and crawling',
    detail:
      'Search the live web, extract page content, map and crawl sites — a '
      + 'strong general research capability for your agent.',
    costNote: 'Catalog size depends on plan; probed live at add time.',
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
    costNote: 'Large tool catalog (~9k tokens/message).',
  },
]
