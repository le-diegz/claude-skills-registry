# Changelog

All notable changes to this registry are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Initial registry structure (`skills/`, `docs/`, `scripts/`, `.github/`)
- `docs/skill-spec.md` — authoritative specification for all skill contributors
- `docs/meta-schema.json` — JSON Schema (draft-07) for `meta.json` validation
- `scripts/validate-skill.js` — single-skill validator (used by CI and locally)
- `scripts/validate-all.js` — batch validator for all skills in the registry
- `scripts/build-index.js` — index builder with GitHub API enrichment
- `scripts/build-watch.js` — file watcher that rebuilds `index.json` on changes
- Five demo skills: `frontend-design`, `code-reviewer`, `doc-writer`, `data-analyst`, `skill-creator`
- GitHub Actions workflows: `validate-skill.yml`, `build-index.yml`, `release.yml`
- GitHub issue templates: new skill proposal, skill improvement
- Pull request template with validation checklist
- `CONTRIBUTING.md` — full contributor guide
