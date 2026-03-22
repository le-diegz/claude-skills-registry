import SkillRow from './SkillRow.jsx'

export default function SkillList({ plugins }) {
  return (
    <div className="skill-list">
      <div className="skill-list-header">
        <span className="col-name">Skill</span>
        <span className="col-source">Source</span>
        <span className="col-status">Status</span>
        <span className="col-action"></span>
      </div>
      {plugins.map((plugin, i) => (
        <SkillRow key={plugin.name ?? i} plugin={plugin} />
      ))}
    </div>
  )
}
