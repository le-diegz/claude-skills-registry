import { useParams, useNavigate, Link } from 'react-router-dom'
import CopyButton from './CopyButton.jsx'

const DOMAIN_COLORS = {
  design:  { color: 'var(--design)',  dim: 'var(--design-dim)'  },
  code:    { color: 'var(--code)',    dim: 'var(--code-dim)'    },
  content: { color: 'var(--content)', dim: 'var(--content-dim)' },
  data:    { color: 'var(--data)',    dim: 'var(--data-dim)'    },
  meta:    { color: 'var(--meta)',    dim: 'var(--meta-dim)'    },
}

function fmt(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  } catch { return dateStr }
}

export default function SkillDetail({ skills, loading }) {
  const { name }   = useParams()
  const navigate   = useNavigate()
  const skill      = skills.find(s => s.name === name)
  const installCmd = `/plugin install ${name}@le-diegz`

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-nav container">
          <button className="back-button" onClick={() => navigate('/')}>
            <ArrowLeft /> Back
          </button>
        </div>
        <div className="loading-state">Loading…</div>
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="detail-page">
        <div className="detail-nav container">
          <button className="back-button" onClick={() => navigate('/')}>
            <ArrowLeft /> Back to registry
          </button>
        </div>
        <div className="error-state">
          Skill <code>{name}</code> not found.
        </div>
      </div>
    )
  }

  const dc      = DOMAIN_COLORS[skill.domain] ?? DOMAIN_COLORS.meta
  const ghBase  = `https://github.com/le-diegz/claude-skills-registry`
  const ghPath  = `${ghBase}/tree/main/${skill.path}`

  return (
    <div className="detail-page">
      {/* Nav */}
      <div className="detail-nav">
        <div className="container">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft /> Back to registry
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="detail-hero">
        <div className="container">
          <div className="detail-header-top">
            <span
              className="skill-domain-badge"
              style={{ '--badge-color': dc.color, '--badge-bg': dc.dim }}
            >
              {skill.domain}
            </span>
            <span className="detail-version">v{skill.version}</span>
          </div>

          <h1 className="detail-title">{skill.name}</h1>
          <p className="detail-description">{skill.description}</p>

          <div className="detail-actions">
            <div className="install-command">
              <code>{installCmd}</code>
            </div>
            <CopyButton text={installCmd} prominent />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container">
        <div className="detail-body">
          <div className="detail-main">

            {/* Tags */}
            <div className="detail-section">
              <p className="detail-section-title">Tags</p>
              <div className="detail-tags">
                {skill.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/?q=${encodeURIComponent(tag)}`}
                    className="detail-tag"
                    title={`Search for "${tag}"`}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Trigger */}
            <div className="detail-section">
              <p className="detail-section-title">When Claude activates this skill</p>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
                {skill.trigger}
              </p>
            </div>

            {/* Last commit */}
            <div className="detail-section">
              <p className="detail-section-title">Last commit</p>
              {skill.last_commit ? (
                <div className="commit-block">
                  <span className="commit-sha">{skill.last_commit.sha?.slice(0, 7)}</span>
                  <p className="commit-message">{skill.last_commit.message}</p>
                  <p className="commit-date">{fmt(skill.last_commit.date)}</p>
                </div>
              ) : (
                <p className="no-commit">No commit history available yet.</p>
              )}
            </div>

            {/* GitHub link */}
            <a
              href={ghPath}
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
            >
              <GitHubIcon />
              View skill folder on GitHub
              <ExternalLink />
            </a>
          </div>

          {/* Sidebar */}
          <div className="detail-sidebar">
            <div className="sidebar-card">
              <p className="sidebar-card-title">Metadata</p>
              <div className="meta-list">
                <div className="meta-row">
                  <span className="meta-label">Author</span>
                  <span className="meta-value">
                    <a
                      href={`https://github.com/${skill.author}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)' }}
                    >
                      @{skill.author}
                    </a>
                  </span>
                </div>

                <div className="meta-row">
                  <span className="meta-label">License</span>
                  <span className="meta-value">{skill.license}</span>
                </div>

                <div className="meta-row">
                  <span className="meta-label">Version</span>
                  <span className="meta-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {skill.version}
                  </span>
                </div>

                <div className="meta-row">
                  <span className="meta-label">Examples</span>
                  <span className="meta-value">
                    {skill.has_examples ? '✓ yes' : '—'}
                  </span>
                </div>

                <div className="meta-row">
                  <span className="meta-label">Evals</span>
                  <span className="meta-value">
                    {skill.has_evals ? '✓ yes' : '—'}
                  </span>
                </div>

                <div className="meta-row">
                  <span className="meta-label">Tools</span>
                  <span className="meta-value">
                    {skill.requires_tools.length
                      ? skill.requires_tools.map(t => <code key={t}>{t}</code>)
                      : <span style={{ color: 'var(--text-3)' }}>none</span>
                    }
                  </span>
                </div>
              </div>

              <p className="sidebar-card-title" style={{ marginTop: 'var(--s5)' }}>
                Model compatibility
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {skill.model_compatibility.map(m => (
                  <span key={m} className="model-chip">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline SVG icons ──────────────────────────────────────────────────────

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.56 7h8.69a.75.75 0 0 1 0 1.5H4.56l3.22 3.22a.75.75 0 0 1 0 1.06Z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
    </svg>
  )
}

function ExternalLink() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{marginLeft: 4}}>
      <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"/>
    </svg>
  )
}
