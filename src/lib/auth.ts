import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface Workspace {
  id: string
  name: string
  invite_code: string
  use_php: boolean
  php_workspace_id: number
  client_design?: 'classic' | 'modern' | 'minimal'
  logo_light_url?: string
  logo_dark_url?: string
  page_title?: string
  page_subtitle?: string
  cta_text?: string
  offer_note?: string
  group_texts?: Record<string, string>
  delivery_configs?: Record<string, unknown>
  popup_blocks?: unknown[]
  inclusion_sections?: unknown[]
  contact_blocks?: unknown[]
  chat_widget_welcome?: string
  chat_widget_delay_seconds?: number
  chat_widget_animations?: boolean
  published_model_ids?: string[] | null
  paid_until?: string
  trial_expires_at?: string
}

export interface User {
  id: string
  email: string
  password_hash: string
  workspace_id: string
  created_at: string
  trial_expires_at?: string
  paid_until?: string
}

export interface Session {
  token: string
  user_id: string
  created_at: string
}

interface Db {
  users: User[]
  workspaces: Workspace[]
  sessions: Session[]
}

export interface SubscriptionStatus {
  status: 'active' | 'trial' | 'trial_expiring' | 'expired'
  daysLeft: number | null
  isPaid: boolean
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'db.json')

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

export function getSubscriptionStatus(entity: { paid_until?: string; trial_expires_at?: string }): SubscriptionStatus {
  const now = Date.now()
  if (entity.paid_until && new Date(entity.paid_until).getTime() > now) {
    return { status: 'active', daysLeft: null, isPaid: true }
  }
  if (!entity.trial_expires_at) {
    return { status: 'active', daysLeft: null, isPaid: false }
  }
  const expiresAt = new Date(entity.trial_expires_at).getTime()
  const daysLeft = Math.ceil((expiresAt - now) / 86400000)
  if (expiresAt > now) {
    return { status: daysLeft <= 3 ? 'trial_expiring' : 'trial', daysLeft, isPaid: false }
  }
  return { status: 'expired', daysLeft: 0, isPaid: false }
}

export function readDb(): Db {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { users: [], workspaces: [], sessions: [] }
  }
}

function writeDb(db: Db): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const derived = crypto.scryptSync(password, salt, 32).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'))
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const db = readDb()
  const cutoff = new Date(Date.now() - SESSION_MAX_AGE_MS).toISOString()
  db.sessions = db.sessions.filter((s) => s.created_at > cutoff)
  db.sessions.push({ token, user_id: userId, created_at: new Date().toISOString() })
  writeDb(db)
  return token
}

export function getSessionUser(token: string | undefined): (User & { workspace: Workspace }) | null {
  if (!token) return null
  const db = readDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return null
  const user = db.users.find((u) => u.id === session.user_id)
  if (!user) return null
  const workspace = db.workspaces.find((w) => w.id === user.workspace_id)
  if (!workspace) return null
  return { ...user, workspace }
}

export function destroySession(token: string): void {
  const db = readDb()
  db.sessions = db.sessions.filter((s) => s.token !== token)
  writeDb(db)
}

export function findUserByEmail(email: string): User | null {
  return readDb().users.find((u) => u.email === email.toLowerCase()) || null
}

export function updateWorkspace(id: string, updates: Partial<Workspace>): void {
  const db = readDb()
  const idx = db.workspaces.findIndex((w) => w.id === id)
  if (idx !== -1) {
    db.workspaces[idx] = { ...db.workspaces[idx], ...updates }
    writeDb(db)
  }
}

export function findWorkspaceByInviteCode(code: string): Workspace | null {
  return readDb().workspaces.find((w) => w.invite_code === code) || null
}

export function nextAdminWorkspaceId(): number {
  const ids = readDb()
    .workspaces.map((w) => w.id.match(/^admin(\d+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => parseInt(m[1], 10))
  return ids.length > 0 ? Math.max(...ids) + 1 : 1239
}

export function createWorkspace(id: string, name: string, phpWorkspaceId: number): Workspace {
  const db = readDb()
  const workspace: Workspace = {
    id,
    name,
    invite_code: crypto.randomBytes(8).toString('hex'),
    use_php: true,
    php_workspace_id: phpWorkspaceId,
  }
  db.workspaces.push(workspace)
  writeDb(db)
  return workspace
}

export function registerUser(email: string, password: string, workspaceId: string): User {
  const db = readDb()
  const trialExpiresAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString()
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    workspace_id: workspaceId,
    created_at: new Date().toISOString(),
    trial_expires_at: trialExpiresAt,
  }
  db.users.push(user)
  writeDb(db)
  return user
}
