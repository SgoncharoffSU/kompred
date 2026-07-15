const TelegramBot = require('node-telegram-bot-api')

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const MANAGER_GROUP_CHAT_ID = process.env.MANAGER_GROUP_CHAT_ID

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN env var not set')
  process.exit(1)
}
if (!MANAGER_GROUP_CHAT_ID) {
  console.error('MANAGER_GROUP_CHAT_ID env var not set')
  process.exit(1)
}

const bot = new TelegramBot(TOKEN, { polling: true })

const WELCOME_TEXT = 'Здравствуйте! Напишите ваш вопрос, и менеджер ответит вам здесь в ближайшее время.'

// The client's chat id is embedded directly in the text forwarded to the manager group
// (rather than kept in a separate map), so replying works even after a bot restart.
const CLIENT_ID_TAG = /\nID клиента: (-?\d+)/

function clientLabel(msg) {
  const from = msg.from || {}
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Клиент'
  const username = from.username ? ` (@${from.username})` : ''
  return `${name}${username}`
}

bot.onText(/^\/start\b/, (msg) => {
  if (msg.chat.type !== 'private') return
  bot.sendMessage(msg.chat.id, WELCOME_TEXT).catch((e) => console.error('sendMessage failed', e.message))
})

bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/start')) return

  if (msg.chat.type === 'private') {
    // Client -> forward to the manager group with the client's chat id embedded.
    const forwarded = `💬 ${clientLabel(msg)}\n${msg.text}\nID клиента: ${msg.chat.id}`
    bot.sendMessage(MANAGER_GROUP_CHAT_ID, forwarded).catch((e) => console.error('forward to group failed', e.message))
    return
  }

  if (String(msg.chat.id) === String(MANAGER_GROUP_CHAT_ID) && msg.reply_to_message) {
    // Manager replying to a forwarded client message -> relay the reply back to the client.
    const repliedText = msg.reply_to_message.text || ''
    const match = repliedText.match(CLIENT_ID_TAG)
    if (!match) return
    const clientChatId = match[1]
    bot.sendMessage(clientChatId, msg.text).catch((e) => console.error('reply to client failed', e.message))
  }
})

bot.on('polling_error', (err) => console.error('polling_error', err.message))

console.log('Telegram bot started (long polling)')
