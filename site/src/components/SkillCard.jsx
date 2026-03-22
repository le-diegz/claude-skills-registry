import { Link } from 'react-router-dom'
import CopyButton from './CopyButton.jsx'

const DOMAIN_COLORS = {
  design:  { color: 'var(--design)',  dim: 'var(--design-dim)'  },
  code:    { color: 'var(--code)',    dim: 'var(--code-dim)'    },
  content: { color: 'var(--content)', dim: 'var(--content-dim)' },
  data:    { color: 'var(--data)',    dim: 'var(--data-dim)'    },
  meta:    { color: 'var(--meta)',    dim: 'var(--meta-dim)'    },
}

function getFreshness(last_commit) {
  if (!last_commit?.date) return { label: 'no history', color: 'var(--stale)' }
  const days = (Date.now() - new Date(last_commit.date)) / 86_400_000
  if (days < 30)  return { label: `${Math.floor(days)}d ago`, color: 'var(--fresh)' }
  if (days < 90)  return { label: `${Math.floor(days)}d ago`, color: 'var(--aging)' }
  return { label: `${Math.floor(days)}d ago`, color: 'var(--stale)' }
}

export default function SkillCard({ skill, index = 0 }) {
  const dc        = DOMAIN_COLORS[skill.domain] ?? DOMAIN_COLORS.meta
  const freshness = getFreshness(skill.last_commit)
  const visibleTags  = skill.tags.slice(0, 3)
  const hiddenCount  = skill.tags.length - visibleTags.length
  const installCmd   = `/plugin install ${skill.name}@le-diegz`

  return (
    <Link
      to={`/skill/${skill.name}`}
      className="skill-card"
      style={{
        '--card-domain-color': dc.color,
        animationDelay: `${index * 35}ms`,
      }}
    >
      <div className="skill-card-top">
        <span
          className="skill-domain-badge"
          style={{
            '--badge-color': dc.color,
            '--badge-bg': dc.dim,
          }}
        >
          {skill.domain}
        </span>
      </div>

      <p className="skill-name">{skill.name}</p>

      <p className="skill-description">{skill.description}</p>

      <div className="skill-tags">
        {visibleTags.map(tag => (
          <span key={tag} className="skill-tag">{tag}</span>
        ))}
        {hiddenCount > 0 && (
          <span className="skill-tag-more">+{hiddenCount}</span>
        )}
      </div>

      <div className="skill-meta-row">
        <span
          className="freshness-dot"
          style={{ background: freshness.color }}
          title={`Last updated: ${freshness.label}`}
        />
        <span className="freshness-label">{freshness.label}</span>

        {skill.has_examples && (
          <span className="badge" title="Has examples">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Z"/>
            </svg>
            examples
          </span>
        )}

        {skill.has_evals && (
          <span className="badge" title="Has evals">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm10.28-1.72-4.5 4.5a.75.75 0 0 1-1.06 0l-2-2a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018l1.47 1.47 3.97-3.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"/>
            </svg>
            evals
          </span>
        )}
      </div>

      <div className="skill-card-footer">
        <CopyButton text={installCmd} label="Copy install" />
      </div>
    </Link>
  )
}
