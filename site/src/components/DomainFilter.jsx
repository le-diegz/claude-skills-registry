const DOMAINS = [
  { key: 'design',  label: 'design',  color: 'var(--design)',  dim: 'var(--design-dim)'  },
  { key: 'code',    label: 'code',    color: 'var(--code)',    dim: 'var(--code-dim)'    },
  { key: 'content', label: 'content', color: 'var(--content)', dim: 'var(--content-dim)' },
  { key: 'data',    label: 'data',    color: 'var(--data)',    dim: 'var(--data-dim)'    },
  { key: 'meta',    label: 'meta',    color: 'var(--meta)',    dim: 'var(--meta-dim)'    },
]

export default function DomainFilter({ skills, active, onChange }) {
  const counts = DOMAINS.reduce((acc, d) => {
    acc[d.key] = skills.filter(s => s.domain === d.key).length
    return acc
  }, {})

  return (
    <div className="domain-filter">
      <button
        className={`domain-pill${!active ? ' active' : ''}`}
        style={!active ? {} : {}}
        onClick={() => onChange(null)}
      >
        All
        <span className="count">{skills.length}</span>
      </button>

      {DOMAINS.filter(d => counts[d.key] > 0).map(d => (
        <button
          key={d.key}
          className={`domain-pill${active === d.key ? ' active' : ''}`}
          style={{
            '--domain-color': d.color,
            '--domain-color-dim': d.dim,
          }}
          onClick={() => onChange(active === d.key ? null : d.key)}
        >
          {d.label}
          <span className="count">{counts[d.key]}</span>
        </button>
      ))}
    </div>
  )
}
