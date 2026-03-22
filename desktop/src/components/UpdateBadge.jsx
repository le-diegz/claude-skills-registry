export default function UpdateBadge({ status }) {
  if (status === null || status === undefined) {
    return <span className="badge badge--checking">Checking…</span>
  }
  if (status === 'up-to-date') {
    return <span className="badge badge--ok">À jour</span>
  }
  if (status === 'update-available') {
    return <span className="badge badge--update">Mise à jour disponible</span>
  }
  return <span className="badge badge--unknown">Impossible de vérifier</span>
}
