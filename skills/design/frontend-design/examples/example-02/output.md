Direction chosen: cold precision — Beacon is used by backend engineers who care about correctness, not aesthetics. The dashboard should feel like a well-designed terminal: monospace numerics, extremely high information density, razor-thin borders, no decorative elements. I'm using IBM Plex Mono for all data values (engineers trust monospace numbers) and Geist for labels. The palette is near-black with a single electric blue accent reserved for the "healthy" state, and red for errors — exactly what engineers expect from a monitoring tool.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Beacon — Metrics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Geist:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:        #080b0f;
    --surface:   #0e1218;
    --surface-hi:#141b24;
    --border:    #1a2230;
    --text:      #c8d4e0;
    --muted:     #4a5568;
    --accent:    #3b9eff;
    --accent-dim:#2178cc;
    --green:     #34d399;
    --red:       #f87171;
    --yellow:    #fbbf24;
    --font-mono: 'IBM Plex Mono', monospace;
    --font-ui:   'Geist', system-ui, sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    background-image:
      linear-gradient(rgba(59, 158, 255, 0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59, 158, 255, 0.015) 1px, transparent 1px);
    background-size: 32px 32px;
    color: var(--text);
    font-family: var(--font-ui);
    font-weight: 300;
    padding: 2rem;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  /* ── DASHBOARD WRAPPER ── */
  .dashboard {
    max-width: 860px;
    margin: 0 auto;
    animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  /* ── HEADER ── */
  .dash-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .dash-title {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .dash-timestamp {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--muted);
  }

  /* ── STAT GRID ── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr) 0.8fr;
    gap: 1px;
    background: var(--border);
    margin-bottom: 1px;
  }

  .stat-card {
    background: var(--surface);
    padding: 1.4rem 1.5rem;
    transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    animation: fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .stat-card:nth-child(1) { animation-delay: 0.05s; }
  .stat-card:nth-child(2) { animation-delay: 0.10s; }
  .stat-card:nth-child(3) { animation-delay: 0.15s; }
  .stat-card:nth-child(4) { animation-delay: 0.20s; }

  .stat-card:hover { background: var(--surface-hi); }

  .stat-label {
    font-size: 0.68rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.75rem;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 2.4rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .stat-value--up     { color: var(--green); }
  .stat-value--warn   { color: var(--yellow); }
  .stat-value--alert  { color: var(--red); }
  .stat-value--accent { color: var(--accent); }

  .stat-delta {
    margin-top: 0.6rem;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--muted);
  }

  .stat-delta.positive { color: var(--green); }
  .stat-delta.negative { color: var(--red); }

  /* ── SPARKLINE CARD ── */
  .sparkline-card {
    background: var(--surface);
    padding: 1.4rem 1.5rem;
    animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
  }

  .sparkline-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .sparkline-title {
    font-size: 0.68rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .sparkline-range {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--muted);
  }

  .sparkline-svg {
    width: 100%;
    height: 64px;
    overflow: visible;
  }

  /* Sparkline drawn as an inline SVG polyline */
  .sparkline-line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .sparkline-area {
    fill: url(#spark-grad);
    opacity: 0.4;
  }

  .sparkline-dot {
    fill: var(--accent);
    r: 3;
  }

  /* ── STATUS BAR ── */
  .status-bar {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 0.6rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--muted);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
    animation: pulse 2.5s ease-in-out infinite;
  }

  .status-dot--warn { background: var(--yellow); animation: none; }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  @media (max-width: 600px) {
    .stat-grid { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>
  <div class="dashboard">

    <div class="dash-header">
      <span class="dash-title">beacon / user metrics</span>
      <span class="dash-timestamp">updated 2s ago · UTC 14:32:07</span>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <p class="stat-label">Active users</p>
        <p class="stat-value stat-value--accent">3,241</p>
        <p class="stat-delta positive">↑ 12% vs yesterday</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Events today</p>
        <p class="stat-value">847k</p>
        <p class="stat-delta positive">↑ 4.2% vs avg</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Error rate</p>
        <p class="stat-value stat-value--alert">0.87%</p>
        <p class="stat-delta negative">↑ 0.3pp — investigate</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">p99 latency</p>
        <p class="stat-value stat-value--up">142ms</p>
        <p class="stat-delta positive">↓ 18ms</p>
      </div>
    </div>

    <div class="sparkline-card">
      <div class="sparkline-header">
        <span class="sparkline-title">Activity — last 7 days</span>
        <span class="sparkline-range">Mon → Sun</span>
      </div>

      <svg class="sparkline-svg" viewBox="0 0 800 64" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#3b9eff"/>
            <stop offset="100%" stop-color="#3b9eff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Area fill -->
        <polygon
          class="sparkline-area"
          points="0,64 0,42 133,38 267,28 400,35 533,18 667,22 800,10 800,64"
        />
        <!-- Line -->
        <polyline
          class="sparkline-line"
          points="0,42 133,38 267,28 400,35 533,18 667,22 800,10"
        />
        <!-- Final data point dot -->
        <circle class="sparkline-dot" cx="800" cy="10"/>
      </svg>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-dot"></span>
        API healthy
      </div>
      <div class="status-item">
        <span class="status-dot"></span>
        Ingest pipeline nominal
      </div>
      <div class="status-item">
        <span class="status-dot status-dot--warn"></span>
        EU-WEST-1 elevated latency
      </div>
    </div>

  </div>
</body>
</html>
```
