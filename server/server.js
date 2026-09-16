import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import mysql from 'mysql2/promise'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' }))
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, 'uploads')
const { Pool } = pg
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined }) : null
// MYSQL_URL이 있으면 PostgreSQL보다 MySQL을 우선 사용합니다. Workbench는 이 DB를 관리하는 GUI입니다.
const mysqlPool = process.env.MYSQL_URL ? mysql.createPool(process.env.MYSQL_URL) : null
const s3 = process.env.S3_BUCKET ? new S3Client({ region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: Boolean(process.env.S3_ENDPOINT), credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } : undefined }) : null
const memoryProjects = new Map()
const memoryUsers = new Map()
app.use('/uploads', express.static(UPLOAD_DIR))

async function ensureProjectsTable() {
  if (mysqlPool) {
    await mysqlPool.query('CREATE TABLE IF NOT EXISTS users (id BIGINT AUTO_INCREMENT PRIMARY KEY, nickname VARCHAR(60) NOT NULL UNIQUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)')
    await mysqlPool.query('CREATE TABLE IF NOT EXISTS projects (id VARCHAR(120) PRIMARY KEY, user_id VARCHAR(60) NOT NULL, name VARCHAR(120) NOT NULL, document_json JSON NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX(user_id))')
  } else if (pool) {
    await pool.query('CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, nickname TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
    await pool.query('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, document_json JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  }
}

app.post('/api/users', async (req, res) => {
  const nickname = String(req.body?.nickname || '').trim().slice(0, 60)
  if (!nickname) return res.status(400).json({ error: '닉네임을 입력하세요.' })
  try {
    await ensureProjectsTable()
    if (mysqlPool) {
      await mysqlPool.query('INSERT INTO users (nickname) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)', [nickname])
      const [rows] = await mysqlPool.query('SELECT id, nickname FROM users WHERE nickname=?', [nickname])
      return res.json(rows[0])
    }
    if (pool) { const result = await pool.query('INSERT INTO users (nickname) VALUES ($1) ON CONFLICT (nickname) DO UPDATE SET nickname=EXCLUDED.nickname RETURNING id, nickname', [nickname]); return res.json(result.rows[0]) }
    const user = memoryUsers.get(nickname) || { id: `local-${memoryUsers.size + 1}`, nickname }
    memoryUsers.set(nickname, user)
    return res.json(user)
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

app.get('/api/projects/:id', async (req, res) => {
  try {
    const userId = String(req.query.userId || '')
    if (mysqlPool) { await ensureProjectsTable(); const [rows] = await mysqlPool.query('SELECT id, name, document_json AS document, updated_at FROM projects WHERE id=? AND user_id=?', [req.params.id, userId]); return res.json(rows[0] || {}) }
    if (pool) { await ensureProjectsTable(); const result = await pool.query('SELECT id, name, document_json AS document, updated_at FROM projects WHERE id=$1 AND user_id=$2', [req.params.id, userId]); return res.json(result.rows[0] || {}) }
    return res.json(memoryProjects.get(req.params.id) || {})
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

app.put('/api/projects/:id', async (req, res) => {
  const { name = 'Untitled', document, userId } = req.body || {}
  if (!document) return res.status(400).json({ error: 'document가 필요합니다.' })
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' })
  try {
    const record = { id: req.params.id, userId: String(userId), name, document }
    if (mysqlPool) { await ensureProjectsTable(); await mysqlPool.query('INSERT INTO projects (id,user_id,name,document_json) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), document_json=VALUES(document_json), updated_at=CURRENT_TIMESTAMP', [record.id, record.userId, record.name, JSON.stringify(record.document)]) }
    else if (pool) { await ensureProjectsTable(); await pool.query('INSERT INTO projects (id,user_id,name,document_json) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, document_json=EXCLUDED.document_json, updated_at=NOW()', [record.id, record.userId, record.name, JSON.stringify(record.document)]) }
    else memoryProjects.set(record.id, record)
    res.json({ ok: true, storage: mysqlPool ? 'mysql' : pool ? 'postgresql' : 'memory' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

app.post('/api/assets', async (req, res) => {
  const { name = 'image', dataUrl } = req.body || {}
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(dataUrl || '')
  if (!match) return res.status(400).json({ error: '이미지 dataUrl이 필요합니다.' })
  if (Buffer.byteLength(match[2], 'base64') > 8 * 1024 * 1024) return res.status(413).json({ error: '이미지는 8MB 이하여야 합니다.' })
  const ext = match[1].split('/')[1].replace(/[^a-z0-9]/gi, '') || 'png'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${path.basename(name).replace(/[^a-z0-9._-]/gi, '_')}.${ext}`
  try {
    const body = Buffer.from(match[2], 'base64')
    if (s3) {
      const key = `assets/${filename}`
      await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: match[1] }))
      const base = (process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || '').replace(/\/$/, '')
      if (!base) return res.status(500).json({ error: 'S3_PUBLIC_URL 또는 S3_ENDPOINT가 필요합니다.' })
      return res.status(201).json({ url: `${base}/${process.env.S3_BUCKET}/${key}`, storage: 'object-storage' })
    }
    await mkdir(UPLOAD_DIR, { recursive: true }); await writeFile(path.join(UPLOAD_DIR, filename), body)
    res.status(201).json({ url: `/uploads/${filename}`, storage: 'local' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

const PORT = process.env.PORT || 8787
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MODEL = 'claude-sonnet-5' // 참고: 최신 모델명은 Anthropic 문서(docs.claude.com)에서 확인하세요.

// 프론트엔드(src/utils/aiService.js)가 기대하는 응답 스키마를 모델에게 강제하는 시스템 프롬프트.
// VibeFrame의 UI Tree 편집 "patch" 포맷은 스펙 문서 5, 6번을 그대로 따릅니다.
const SYSTEM_PROMPT = `당신은 VibeFrame이라는 UI 빌더의 AI 에디터입니다.
사용자의 자연어 명령과 현재 선택된 요소(context)를 보고, 아래 JSON 스키마로만 응답하세요.
다른 설명, 마크다운, 코드블록 없이 순수 JSON 객체 하나만 출력합니다.

{
  "reply": "사용자에게 보여줄 한국어 한두 문장",
  "patch": {
    "kind": "style" | "text" | "resize" | "action" | "createPage" | "delete" | "none",
    // kind === "style" 인 경우:
    "style": { "background": "#ff0000" },
    // kind === "text" 인 경우:
    "text": "새 텍스트",
    // kind === "resize" 인 경우 (현재 크기에 곱할 배수):
    "factor": 1.3,
    // kind === "action" 인 경우:
    "action": { "type": "navigate", "target": "dashboard" },
    // kind === "createPage" 인 경우:
    "template": "blank" | "login" | "dashboard" | "landing" | "ecommerce",
    "title": "Payment"
  }
}`

app.post('/api/ai/edit', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. server/.env를 확인하세요.' })
  }

  const { prompt, context } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt가 필요합니다.' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `현재 컨텍스트: ${JSON.stringify(context)}\n\n사용자 명령: ${prompt}`
          }
        ]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: `Anthropic API 오류: ${errText}` })
    }

    const data = await response.json()
    const textBlock = (data.content || []).find((b) => b.type === 'text')
    if (!textBlock) return res.status(502).json({ error: 'AI 응답에 텍스트가 없습니다.' })

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return res.json(parsed)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: String(err) })
  }
})

app.listen(PORT, () => {
  console.log(`VibeFrame AI 백엔드가 http://localhost:${PORT} 에서 실행 중입니다.`)
})
