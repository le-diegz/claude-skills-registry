import { useState, useEffect } from 'react'

const INDEX_URL =
  'https://raw.githubusercontent.com/le-diegz/claude-skills-registry/main/index.json'

const CACHE_KEY = 'csr_index_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export default function useSkills() {
  const [skills, setSkills]   = useState([])
  const [meta, setMeta]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    // Try session cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) {
          setSkills(data.skills ?? [])
          setMeta(data.meta ?? null)
          setLoading(false)
          return
        }
      }
    } catch (_) { /* ignore */ }

    let cancelled = false

    fetch(INDEX_URL)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        setSkills(data.skills ?? [])
        setMeta(data.meta ?? null)
        setLoading(false)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
        } catch (_) { /* storage full */ }
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { skills, meta, loading, error }
}
