const { app, BrowserWindow, ipcMain } = require('electron')
const { execFileSync } = require('child_process')
const path = require('path')
const fs   = require('fs')
const https = require('https')
const os   = require('os')

const PLUGINS_FILE = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json')

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url)
    const req = https.get({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: { 'User-Agent': 'Skills-Manager/1.0' }
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Invalid JSON')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('plugins:get-installed', async () => {
  try {
    if (!fs.existsSync(PLUGINS_FILE)) return []
    const raw  = fs.readFileSync(PLUGINS_FILE, 'utf8')
    const data = JSON.parse(raw)

    // Format v2: { version: 2, plugins: { "name@source": [ ...installs ] } }
    const pluginsMap = data.plugins ?? data
    if (Array.isArray(pluginsMap)) return pluginsMap

    const result = []
    for (const [key, installs] of Object.entries(pluginsMap)) {
      const atIdx  = key.lastIndexOf('@')
      const name   = key.slice(0, atIdx)
      const source = key.slice(atIdx + 1)
      const list   = Array.isArray(installs) ? installs : [installs]
      // Prefer user-scoped, else first entry
      const install = list.find(i => i.scope === 'user') ?? list[0]
      if (install) result.push({ name, source, ...install })
    }
    return result
  } catch {
    return []
  }
})

ipcMain.handle('plugins:get-marketplaces', async () => {
  const MARKETPLACES_FILE = path.join(os.homedir(), '.claude', 'plugins', 'known_marketplaces.json')
  try {
    if (fs.existsSync(MARKETPLACES_FILE)) {
      const data = JSON.parse(fs.readFileSync(MARKETPLACES_FILE, 'utf8'))
      return Object.entries(data).map(([id, info]) => ({
        id,
        label: id,
        repo: info.source?.source?.repo ?? null,
      }))
    }
  } catch {}
  return []
})

ipcMain.handle('skill:read-meta', async (_event, { installPath, name }) => {
  try {
    // 1. Try .claude-plugin/plugin.json (structured metadata)
    const pluginJsonPath = path.join(installPath, '.claude-plugin', 'plugin.json')
    if (fs.existsSync(pluginJsonPath)) {
      const data = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'))
      return { name: data.name ?? name, description: data.description ?? '' }
    }

    // 2. Try skills/{name}/SKILL.md frontmatter
    const skillMdPath = path.join(installPath, 'skills', name, 'SKILL.md')
    const mdPath = fs.existsSync(skillMdPath) ? skillMdPath : path.join(installPath, 'SKILL.md')
    if (!fs.existsSync(mdPath)) return { name, description: '' }

    const content = fs.readFileSync(mdPath, 'utf8')
    const match   = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return { name, description: '' }

    const fm = {}
    for (const line of match[1].split('\n')) {
      const [key, ...rest] = line.split(':')
      if (key && rest.length) fm[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '')
    }
    return { name: fm.name ?? name, description: fm.description ?? '' }
  } catch {
    return { name, description: '' }
  }
})

ipcMain.handle('github:check-update', async (_event, { source, name, localSha }) => {
  try {
    if (!localSha) return { status: 'unknown' }

    // Resolve local marketplace git repo
    const MARKETPLACES_FILE = path.join(os.homedir(), '.claude', 'plugins', 'known_marketplaces.json')
    if (!fs.existsSync(MARKETPLACES_FILE)) return { status: 'unknown' }

    const mkts         = JSON.parse(fs.readFileSync(MARKETPLACES_FILE, 'utf8'))
    const installLoc   = mkts[source]?.installLocation
    if (!installLoc || !fs.existsSync(installLoc)) return { status: 'unknown' }

    // Get latest commit SHA for plugins/{name} in the local marketplace git repo
    const remoteSha = execFileSync(
      'git',
      ['-C', installLoc, 'log', '--format=%H', '-1', '--', `plugins/${name}`],
      { encoding: 'utf8', timeout: 5000 }
    ).trim()

    if (!remoteSha) return { status: 'unknown' }

    const upToDate = remoteSha.startsWith(localSha) || localSha.startsWith(remoteSha.slice(0, 7))
    return upToDate
      ? { status: 'up-to-date', remoteSha }
      : { status: 'update-available', remoteSha }
  } catch {
    return { status: 'unknown' }
  }
})

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    backgroundColor: '#0d1117',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  win.setTitle('Skills Manager')

  const distIndex = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(distIndex)) {
    win.loadFile(distIndex)
  } else {
    win.loadURL('http://localhost:5173')
  }

  win.webContents.openDevTools({ mode: 'detach' })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
