require('dotenv').config()
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const TelegramBot = require('node-telegram-bot-api')

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const MANAGER_GROUP_CHAT_ID = process.env.MANAGER_GROUP_CHAT_ID
const SITE_CHAT_PORT = process.env.SITE_CHAT_PORT || 8801

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN env var not set')
  process.exit(1)
}
if (!MANAGER_GROUP_CHAT_ID) {
  console.warn('MANAGER_GROUP_CHAT_ID not set yet — running in discovery mode: logging chat ids for any message received so the manager group id can be found in the logs.')
}

// This VPS has no working outbound IPv6 route ("Network is unreachable"), but the underlying
// request library tries it first and hangs — force IPv4 via agentOptions.
const bot = new TelegramBot(TOKEN, { polling: true, request: { agentOptions: { family: 4 } } })

// Each client gets their own forum Topic inside the manager group, instead of everyone's
// messages being interleaved in one feed. The mapping (client chat id <-> topic id) is
// persisted to disk so it survives bot restarts.
const TOPICS_FILE = path.join(__dirname, 'client_topics.json')

function loadTopics() {
  try {
    return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveTopics(map) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(map, null, 2))
}

// clientChatId (string) -> topicId (number)
let topicsByClient = loadTopics()
// topicId (number, as string key) -> clientChatId (string) — reverse lookup for routing replies
let clientsByTopic = {}
Object.entries(topicsByClient).forEach(([clientId, topicId]) => {
  clientsByTopic[String(topicId)] = clientId
})

function persistTopic(clientChatId, topicId) {
  topicsByClient[clientChatId] = topicId
  clientsByTopic[String(topicId)] = clientChatId
  saveTopics(topicsByClient)
}

// createForumTopic isn't wrapped by node-telegram-bot-api — call the raw Bot API over HTTPS
// (forcing IPv4 for the same reason as above).
function callTelegramApi(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params)
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${TOKEN}/${method}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        family: 4,
      },
      (res) => {
        let data = ''
        res.on('data', (d) => (data += d))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (!parsed.ok) {
              const err = new Error(parsed.description || 'Telegram API error')
              err.telegramResponse = parsed
              return reject(err)
            }
            resolve(parsed.result)
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const WELCOME_TEXT = 'Здравствуйте! Напишите ваш вопрос, и менеджер ответит вам здесь в ближайшее время.'

function clientLabel(msg) {
  const from = msg.from || {}
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Клиент'
  const username = from.username ? ` (@${from.username})` : ''
  return `${name}${username}`
}

async function getOrCreateTopic(clientChatId, topicName) {
  const existing = topicsByClient[clientChatId]
  if (existing) return existing
  const topic = await callTelegramApi('createForumTopic', { chat_id: MANAGER_GROUP_CHAT_ID, name: topicName.slice(0, 128) })
  persistTopic(clientChatId, topic.message_thread_id)
  return topic.message_thread_id
}

// Website chat widget visitors aren't real Telegram chats, so they reuse the same
// per-client Topic mechanism above under a "site:<clientId>" pseudo chat id, and their
// transcripts (both directions) are kept here instead of being sent back over Telegram.
const SITE_CHAT_PREFIX = 'site:'
const SITE_CHATS_FILE = path.join(__dirname, 'site_chats.json')

function loadSiteChats() {
  try {
    return JSON.parse(fs.readFileSync(SITE_CHATS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveSiteChats(map) {
  fs.writeFileSync(SITE_CHATS_FILE, JSON.stringify(map, null, 2))
}

let siteChats = loadSiteChats() // { [clientId]: { messages: [{id, from, text, ts}] } }

function appendSiteMessage(clientId, from, text) {
  if (!siteChats[clientId]) siteChats[clientId] = { messages: [] }
  const id = siteChats[clientId].messages.length + 1
  siteChats[clientId].messages.push({ id, from, text, ts: Date.now() })
  saveSiteChats(siteChats)
  return id
}

function jsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (d) => (body += d))
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const siteChatServer = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const url = new URL(req.url, 'http://localhost')

  if (req.method === 'POST' && url.pathname === '/send') {
    try {
      const { clientId, name, text } = await jsonBody(req)
      if (!clientId || !text) {
        res.writeHead(400)
        return res.end(JSON.stringify({ ok: false, error: 'clientId and text required' }))
      }
      appendSiteMessage(clientId, 'client', text)
      if (MANAGER_GROUP_CHAT_ID) {
        const topicId = await getOrCreateTopic(SITE_CHAT_PREFIX + clientId, name || `Сайт (${clientId.slice(0, 8)})`)
        await bot.sendMessage(MANAGER_GROUP_CHAT_ID, text, { message_thread_id: topicId })
      }
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true }))
    } catch (e) {
      console.error('site chat send failed', e.message)
      res.writeHead(500)
      res.end(JSON.stringify({ ok: false, error: e.message }))
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/poll') {
    const clientId = url.searchParams.get('clientId') || ''
    const after = parseInt(url.searchParams.get('after') || '0', 10)
    if (!clientId) {
      res.writeHead(400)
      return res.end(JSON.stringify({ ok: false, error: 'clientId required' }))
    }
    const chat = siteChats[clientId]
    const messages = chat ? chat.messages.filter((m) => m.id > after) : []
    res.writeHead(200)
    res.end(JSON.stringify({ ok: true, messages }))
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ ok: false, error: 'not found' }))
})

siteChatServer.listen(SITE_CHAT_PORT, '127.0.0.1', () => console.log('Site chat HTTP server listening on 127.0.0.1:' + SITE_CHAT_PORT))

bot.onText(/^\/start\b/, (msg) => {
  if (msg.chat.type !== 'private') return
  bot.sendMessage(msg.chat.id, WELCOME_TEXT).catch((e) => console.error('sendMessage failed', e.message))
})

bot.on('message', async (msg) => {
  if (!MANAGER_GROUP_CHAT_ID) {
    console.log(`[discovery] chat.id=${msg.chat.id} type=${msg.chat.type} title=${msg.chat.title || ''} text=${msg.text || ''}`)
  }
  if (!msg.text || msg.text.startsWith('/start')) return
  if (!MANAGER_GROUP_CHAT_ID) return

  if (msg.chat.type === 'private') {
    const clientChatId = String(msg.chat.id)
    try {
      const topicId = await getOrCreateTopic(clientChatId, clientLabel(msg))
      await bot.sendMessage(MANAGER_GROUP_CHAT_ID, msg.text, { message_thread_id: topicId })
    } catch (e) {
      console.error('forward to group failed', e.message)
    }
    return
  }

  if (String(msg.chat.id) === String(MANAGER_GROUP_CHAT_ID) && msg.is_topic_message && msg.message_thread_id) {
    const clientChatId = clientsByTopic[String(msg.message_thread_id)]
    if (!clientChatId) return
    if (clientChatId.startsWith(SITE_CHAT_PREFIX)) {
      appendSiteMessage(clientChatId.slice(SITE_CHAT_PREFIX.length), 'manager', msg.text)
      return
    }
    bot.sendMessage(clientChatId, msg.text).catch((e) => console.error('reply to client failed', e.message))
  }
})

bot.on('polling_error', (err) => console.error('polling_error', err.message))

console.log('Telegram bot started (long polling)')
