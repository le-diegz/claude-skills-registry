# claude-skills-registry

An open-source registry of reusable Claude skills — modular instruction sets that extend Claude's capabilities across design, code, content, and data domains.

## What is a skill?

A **skill** is a folder containing a `SKILL.md` (instructions for Claude) and a `meta.json` (metadata). When installed in Claude Code, the skill is automatically loaded into Claude's context and activated when relevant.

```
skills/
└── design/
    └── frontend-design/
        ├── meta.json       ← name, description, domain, tags, version…
        ├── SKILL.md        ← instructions Claude will follow
        ├── examples/       ← input/output pairs
        └── evals/          ← evaluation criteria
```

## Install a skill

```bash
/plugin install frontend-design@le-diegz
```

> Requires [Claude Code](https://claude.ai/code) CLI.

## Browse skills

The registry includes a discovery website and a desktop manager.

### Web — skill browser

Live at: **https://le-diegz.github.io/claude-skills-registry**

Run locally:

```bash
cd site
npm install
npm run dev
```

Opens at `http://localhost:5173`. Features: search by name/description/tag, filter by domain, copy install command in one click.

### Desktop — Skills Manager

A native Electron app (macOS / Windows) that shows your installed skills and tells you which ones have updates available.

```bash
cd desktop
npm install
npm start
```

> **Note:** if you launch from a terminal where `ELECTRON_RUN_AS_NODE=1` is set (e.g. inside Claude Code), the start script handles it automatically via `env -u ELECTRON_RUN_AS_NODE`.

![Skills Manager showing installed skills with update status](docs/screenshot-desktop.png)

The app reads `~/.claude/plugins/installed_plugins.json` and compares each skill's commit SHA against the local marketplace git cache — no GitHub API calls, no rate limits.

## Validate & build the index

```bash
# Validate a single skill
npm run validate -- skills/design/frontend-design

# Validate all skills
npm run validate:all

# Build index.json (used by the website)
npm run build

# Watch skills/ and rebuild on change
npm run build:watch
```

Requires Node.js ≥ 20.

```bash
nvm use   # switches to Node 20 via .nvmrc
npm install
```

## Contribute a skill

1. Read **[docs/skill-spec.md](docs/skill-spec.md)** — the authoritative spec
2. Create your skill folder under `skills/<domain>/<name>/`
3. Run `npm run validate -- skills/<domain>/<name>` — must pass
4. Open a pull request using the **New skill** template

The CI pipeline validates every PR automatically.

## Project structure

```
claude-skills-registry/
├── skills/                  ← skill library
│   ├── design/frontend-design/
│   ├── code/code-reviewer/
│   ├── content/doc-writer/
│   ├── data/data-analyst/
│   └── meta/skill-creator/
├── docs/
│   ├── skill-spec.md        ← contributor specification
│   └── meta-schema.json     ← JSON Schema for meta.json
├── scripts/
│   ├── validate-skill.js    ← single-skill validator
│   ├── validate-all.js      ← bulk validator
│   ├── build-index.js       ← generates index.json
│   └── build-watch.js       ← watch mode
├── site/                    ← React/Vite discovery website
├── desktop/                 ← Electron desktop manager
├── index.json               ← generated registry index
└── .github/workflows/       ← CI: validate, build, deploy
```

## Skills included

| Skill | Domain | What it does |
|---|---|---|
| `frontend-design` | design | Builds UIs with distinctive, non-generic aesthetics |
| `code-reviewer` | code | Reviews code with 4 severity levels and actionable fixes |
| `doc-writer` | content | Writes concept → quickstart → reference documentation |
| `data-analyst` | data | Produces data insights with chart recommendations |
| `skill-creator` | meta | Creates well-scoped, spec-compliant registry skills |

## License

MIT — see [LICENSE](LICENSE).
