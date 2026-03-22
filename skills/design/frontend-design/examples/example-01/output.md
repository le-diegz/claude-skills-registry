Direction chosen: quiet editorial dark — Pulsar is a real-time data tool for engineers and PMs who live in terminals and dashboards. The interface should feel like something built by designers who actually use the product: dense, confident, no stock imagery, no gradient backgrounds. I'm using Bricolage Grotesque for display headings (variable weight, slightly condensed, high personality) and Geist for body and UI text. The palette is near-black with a deep amber accent — data tools should feel warm and precise, not cold and corporate.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pulsar — Real-time product analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,800&family=Geist:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:            #0c0b09;
    --surface:       #141210;
    --surface-hi:    #1c1a17;
    --border:        #252218;
    --border-hi:     #3a3526;
    --text:          #ede8df;
    --text-secondary:#7a7266;
    --accent:        #e8a030;
    --accent-dim:    #b87d24;
    --green:         #4ade80;
    --red:           #f87171;
    --font-display:  'Bricolage Grotesque', system-ui, sans-serif;
    --font-body:     'Geist', system-ui, sans-serif;
    --space-xs:      0.25rem;
    --space-sm:      0.5rem;
    --space-md:      1rem;
    --space-lg:      1.5rem;
    --space-xl:      2.5rem;
    --space-2xl:     4rem;
    --space-3xl:     7rem;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  body {
    background-color: var(--bg);
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
    background-size: 256px 256px;
    color: var(--text);
    font-family: var(--font-body);
    font-weight: 300;
    -webkit-font-smoothing: antialiased;
  }

  /* ── NAV ── */
  nav {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-xl);
    background: rgba(12, 11, 9, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    animation: fadeDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .nav-logo {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.1rem;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .nav-logo span { color: var(--accent); }

  .nav-links {
    display: flex;
    gap: var(--space-xl);
    list-style: none;
    font-size: 0.82rem;
    font-weight: 400;
    color: var(--text-secondary);
  }

  .nav-links a {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .nav-links a:hover { color: var(--text); }

  .nav-cta {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.5rem 1.1rem;
    background: var(--accent);
    color: #0c0b09;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: var(--font-body);
  }

  .nav-cta:hover {
    background: var(--accent-dim);
    transform: translateY(-1px);
  }

  /* ── HERO ── */
  .hero {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 0;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-3xl) var(--space-xl) var(--space-2xl);
    align-items: start;
  }

  .hero-left {
    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: var(--space-lg);
  }

  .hero-eyebrow::before {
    content: '';
    display: block;
    width: 20px;
    height: 1px;
    background: var(--accent);
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 6vw, 5.5rem);
    font-weight: 800;
    line-height: 0.92;
    letter-spacing: -0.04em;
    margin-bottom: var(--space-xl);
  }

  h1 em {
    font-style: normal;
    color: var(--accent);
  }

  .hero-sub {
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--text-secondary);
    max-width: 38ch;
    margin-bottom: var(--space-2xl);
    font-weight: 300;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
  }

  .btn-primary {
    padding: 0.8rem 1.8rem;
    background: var(--accent);
    color: #0c0b09;
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-primary:hover {
    background: var(--accent-dim);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(232, 160, 48, 0.2);
  }

  .btn-ghost {
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-ghost:hover { color: var(--text); }

  .btn-ghost::after {
    content: '→';
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-ghost:hover::after { transform: translateX(3px); }

  /* ── LIVE TICKER (right column) ── */
  .hero-right {
    padding-top: 1rem;
    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
  }

  .ticker-card {
    border: 1px solid var(--border);
    background: var(--surface);
    overflow: hidden;
  }

  .ticker-header {
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }

  .live-dot {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--green);
  }

  .live-dot::before {
    content: '';
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
    animation: pulse 2s infinite;
  }

  .ticker-row {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 1rem;
    transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ticker-row:last-child { border-bottom: none; }
  .ticker-row:hover { background: var(--surface-hi); }

  .ticker-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .ticker-value {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.6rem;
    letter-spacing: -0.03em;
    color: var(--text);
  }

  .ticker-value.up   { color: var(--green); }
  .ticker-value.down { color: var(--red); }

  /* ── LOGOS ── */
  .logos {
    border-top: 1px solid var(--border);
    padding: var(--space-2xl) var(--space-xl);
    max-width: 1200px;
    margin: 0 auto;
    animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
  }

  .logos-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    margin-bottom: var(--space-lg);
  }

  .logos-row {
    display: flex;
    gap: var(--space-2xl);
    align-items: center;
    flex-wrap: wrap;
  }

  .logo-item {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: -0.02em;
    color: var(--border-hi);
    text-transform: uppercase;
    transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .logo-item:hover { color: var(--text-secondary); }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (max-width: 768px) {
    .hero { grid-template-columns: 1fr; }
    .nav-links { display: none; }
  }
</style>
</head>
<body>

  <nav>
    <span class="nav-logo">Puls<span>●</span>r</span>
    <ul class="nav-links">
      <li><a href="#">Product</a></li>
      <li><a href="#">Docs</a></li>
      <li><a href="#">Pricing</a></li>
      <li><a href="#">Blog</a></li>
    </ul>
    <a href="#" class="nav-cta">Start free</a>
  </nav>

  <section class="hero">
    <div class="hero-left">
      <p class="hero-eyebrow">Real-time analytics</p>
      <h1>Know what<br>users do,<br><em>as it happens.</em></h1>
      <p class="hero-sub">
        Pulsar streams behavioral data from your product to your team in under 200ms.
        No warehouse required. No waiting until tomorrow to see today.
      </p>
      <div class="hero-actions">
        <a href="#" class="btn-primary">Get started free</a>
        <a href="#" class="btn-ghost">See live demo</a>
      </div>
    </div>

    <div class="hero-right">
      <div class="ticker-card">
        <div class="ticker-header">
          <span>Live feed</span>
          <span class="live-dot">Live</span>
        </div>
        <div class="ticker-row">
          <span class="ticker-label">Active users</span>
          <span class="ticker-value up">2,847</span>
        </div>
        <div class="ticker-row">
          <span class="ticker-label">Events / min</span>
          <span class="ticker-value">14,203</span>
        </div>
        <div class="ticker-row">
          <span class="ticker-label">Conversion (24h)</span>
          <span class="ticker-value up">4.7%</span>
        </div>
        <div class="ticker-row">
          <span class="ticker-label">Error rate</span>
          <span class="ticker-value down">0.03%</span>
        </div>
      </div>
    </div>
  </section>

  <div class="logos">
    <p class="logos-label">Used by teams at</p>
    <div class="logos-row">
      <span class="logo-item">Vercel</span>
      <span class="logo-item">Linear</span>
      <span class="logo-item">Loom</span>
      <span class="logo-item">Retool</span>
      <span class="logo-item">Supabase</span>
    </div>
  </div>

</body>
</html>
```
