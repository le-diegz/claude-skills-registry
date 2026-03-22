import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import useSkills from './hooks/useSkills.js'
import Header      from './components/Header.jsx'
import SearchBar   from './components/SearchBar.jsx'
import DomainFilter from './components/DomainFilter.jsx'
import SkillCard   from './components/SkillCard.jsx'
import SkillDetail from './components/SkillDetail.jsx'

// ── Home page ────────────────────────────────────────────────────────────

function HomePage({ skills, meta, loading, error }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Read initial search from URL param ?q=...
  const params   = new URLSearchParams(location.search)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [domain, setDomain] = useState(null)

  // Sync URL when search changes
  useEffect(() => {
    const next = search ? `?q=${encodeURIComponent(search)}` : ''
    if (location.search !== next) {
      navigate({ search: next }, { replace: true })
    }
  }, [search])

  const filtered = useMemo(() => {
    return skills.filter(skill => {
      const matchesDomain = !domain || skill.domain === domain
      const q = search.trim().toLowerCase()
      if (!q) return matchesDomain
      const matchesSearch =
        skill.name.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.tags.some(t => t.toLowerCase().includes(q))
      return matchesDomain && matchesSearch
    })
  }, [skills, search, domain])

  return (
    <div className="home-page">
      <Header meta={meta} />

      <div className="home-main">
        <div className="filters-section">
          <SearchBar value={search} onChange={setSearch} />
          <DomainFilter skills={skills} active={domain} onChange={setDomain} />
        </div>

        {loading && (
          <div className="loading-state">Loading skills…</div>
        )}

        {error && (
          <div className="error-state">
            Could not load skills — {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="results-count">
              {filtered.length} skill{filtered.length !== 1 ? 's' : ''}
              {(search || domain) ? ' found' : ' in registry'}
            </p>

            {filtered.length > 0 ? (
              <div className="skills-grid">
                {filtered.map((skill, i) => (
                  <SkillCard key={skill.name} skill={skill} index={i} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No skills found</strong>
                Try a different search or{' '}
                <button
                  onClick={() => { setSearch(''); setDomain(null) }}
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}
                >
                  clear filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── App root ─────────────────────────────────────────────────────────────

export default function App() {
  const { skills, meta, loading, error } = useSkills()

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              skills={skills}
              meta={meta}
              loading={loading}
              error={error}
            />
          }
        />
        <Route
          path="/skill/:name"
          element={<SkillDetail skills={skills} loading={loading} />}
        />
      </Routes>
    </HashRouter>
  )
}
