import { useState, useEffect } from 'react'
import SkillList from './components/SkillList.jsx'

export default function App() {
  const [plugins, setPlugins]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastRefresh, setRefresh] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const raw = await window.skillsAPI?.getInstalledPlugins()
      console.log('getInstalledPlugins raw:', raw, typeof raw)
      setPlugins(Array.isArray(raw) ? raw : [])
      setRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="app">
      {/* Title bar drag region */}
      <div className="titlebar">
        <span className="titlebar-title">Skills Manager</span>
        <button className="titlebar-refresh" onClick={load} title="Refresh" aria-label="Refresh">
          <RefreshIcon spinning={loading} />
        </button>
      </div>

      <div className="content">
        {loading && plugins.length === 0 ? (
          <div className="empty-state">
            <Spinner />
            <span>Loading installed skills…</span>
          </div>
        ) : plugins.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No skills installed</p>
            <p className="empty-sub">
              Install skills with{' '}
              <code>/plugin install name@source</code>{' '}
              in Claude Code.
            </p>
          </div>
        ) : (
          <SkillList plugins={plugins} />
        )}
      </div>

      {lastRefresh && (
        <div className="statusbar">
          {plugins.length} skill{plugins.length !== 1 ? 's' : ''} installed
          <span className="statusbar-sep">·</span>
          refreshed {lastRefresh.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}
    >
      <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text-3)" strokeWidth="2">
      <circle cx="10" cy="10" r="8" strokeDasharray="40" strokeDashoffset="30"
        style={{ animation: 'spin 0.8s linear infinite', transformOrigin: 'center' }} />
    </svg>
  )
}
