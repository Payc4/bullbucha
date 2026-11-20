// Bullbūcha website server: serves public/, takes the order/contact form, saves every message
// and emails it to the team over SMTP. Settings come from environment variables (see README).
import { createServer } from 'node:http'
import { readFile, appendFile, mkdir, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { timingSafeEqual, createHash } from 'node:crypto'
import nodemailer from 'nodemailer'

const ROOT = new URL('.', import.meta.url).pathname
const PUBLIC = join(ROOT, 'public')
const PORT = Number(process.env.PORT || 3000)
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data')
const MESSAGES = join(DATA_DIR, 'messages.jsonl')
const env = k => (process.env[k] || '').trim()
const CONTACT_TO = env('CONTACT_TO')
const ADMIN_PASSWORD = env('ADMIN_PASSWORD')

// ── email ──
const smtpPort = Number(env('SMTP_PORT') || 587)
const mailer = env('SMTP_HOST') && CONTACT_TO
  ? nodemailer.createTransport({
    host: env('SMTP_HOST'), port: smtpPort, secure: env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : smtpPort === 465,
    auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined,
  })
  : null
if (!mailer) console.warn('Email is OFF (set SMTP_HOST, SMTP_USER, SMTP_PASS, CONTACT_TO). Messages are still saved and shown on /admin.')
else console.log(`Email is ON: form messages go to ${CONTACT_TO.replace(/(.).*@/, '$1…@')} via ${env('SMTP_HOST')}:${smtpPort}`)

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const oneLine = s => String(s ?? '').replace(/[\r\n]+/g, ' ').trim()

async function sendEmail(m) {
  if (!mailer) return 'off'
  const order = m.type === 'order'
  const subject = order
    ? `Bullbūcha užsakymas: ${oneLine(m.name)}`
    : `Bullbūcha klausimas: ${oneLine(m.name)}`
  const rows = [
    ['Tipas', order ? 'Užsakymas' : 'Klausimas'],
    ['Vardas', m.name], ['El. paštas', m.email], ['Telefonas', m.phone || '–'],
    ['Žinutė', m.message || '–'], ['Kalba', m.lang.toUpperCase()], ['Gauta', new Date(m.at).toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius' })],
  ]
  await mailer.sendMail({
    from: env('MAIL_FROM') || env('SMTP_USER') || CONTACT_TO,
    to: CONTACT_TO,
    replyTo: { name: oneLine(m.name), address: m.email },
    subject,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nAtsakyk į šį laišką, ir atsakymas nueis klientui.',
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><h2 style="margin:0 0 12px;color:#8a5a24">${esc(subject)}</h2><table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table><p style="color:#666">Atsakyk į šį laišką, ir atsakymas nueis klientui.</p></div>`,
  })
  return 'sent'
}

// ── helpers ──
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' }
const SECURITY = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN' }
function json(res, code, body) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SECURITY }); res.end(JSON.stringify(body)) }
async function readBody(req, max = 20000) {
  let size = 0, chunks = []
  for await (const c of req) { size += c.length; if (size > max) throw Object.assign(new Error('too large'), { code: 413 }); chunks.push(c) }
  return Buffer.concat(chunks).toString('utf8')
}
// behind Coolify's proxy the real visitor address is the last X-Forwarded-For entry (earlier ones can be faked)
const clientIp = req => (req.headers['x-forwarded-for']?.split(',').at(-1) || req.socket.remoteAddress || '').trim()

// 5 messages per 10 minutes per IP
const hits = new Map()
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 600e3)
  list.push(now); hits.set(ip, list)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < 600e3)) hits.delete(k)
  return list.length > 5
}

// Cache busting: the page's links to its own files get ?v=<content fingerprint>, so after a redeploy browsers
// fetch the new CSS/JS/images instead of mixing a fresh page with week-old cached files.
const fingerprint = async rel => createHash('sha1').update(await readFile(join(PUBLIC, rel))).digest('hex').slice(0, 10)
let indexHtml = null
async function buildIndex() {
  const html = await readFile(join(PUBLIC, 'index.html'), 'utf8')
  const refs = [...new Set([...html.matchAll(/(?:src|href|poster)="(\/(?:css|js|img|media)\/[^"?#]+)"/g)].map(m => m[1]))]
  const v = Object.fromEntries(await Promise.all(refs.map(async r => [r, await fingerprint(r).catch(() => null)])))
  return html.replace(/((?:src|href|poster)=")(\/(?:css|js|img|media)\/[^"?#]+)"/g, (m, a, r) => v[r] ? `${a}${r}?v=${v[r]}"` : m)
}

async function sendStatic(req, res, path, versioned) {
  if (path === '/' || path === '/index.html') {
    indexHtml ??= await buildIndex()
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...SECURITY })
    return res.end(req.method === 'HEAD' ? undefined : indexHtml)
  }
  const file = normalize(join(PUBLIC, path === '/' ? 'index.html' : decodeURIComponent(path)))
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end() }
  let info
  try { info = await stat(file) } catch { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found') }
  if (!info.isFile()) { res.writeHead(404); return res.end() }
  const type = TYPES[extname(file)] || 'application/octet-stream'
  // fingerprinted links never change, so they can be cached for a year; anything else is re-checked
  const cache = versioned ? 'public, max-age=31536000, immutable' : extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600'
  // byte ranges, so the video can seek and play on iPhones
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range)
  if (range && extname(file) === '.mp4') {
    const start = range[1] ? Number(range[1]) : 0
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1
    const buf = (await readFile(file)).subarray(start, end + 1)
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${info.size}`, 'accept-ranges': 'bytes', 'content-length': buf.length, 'cache-control': cache, ...SECURITY })
    return res.end(buf)
  }
  res.writeHead(200, { 'content-type': type, 'content-length': info.size, 'accept-ranges': 'bytes', 'cache-control': cache, ...SECURITY })
  res.end(req.method === 'HEAD' ? undefined : await readFile(file))
}

function adminAllowed(req) {
  if (!ADMIN_PASSWORD) return false
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '')
  if (!m) return false
  const pass = Buffer.from(m[1], 'base64').toString().split(':').slice(1).join(':')
  const a = Buffer.from(pass), b = Buffer.from(ADMIN_PASSWORD)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function adminPage(res) {
  let list = []
  try { list = (await readFile(MESSAGES, 'utf8')).trim().split('\n').filter(Boolean).map(l => JSON.parse(l)).reverse() } catch {}
  const rows = list.map(m => `<tr><td>${esc(new Date(m.at).toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius' }))}</td><td>${m.type === 'order' ? `<b>Užsakymas</b>${m.bottles ? `<br>${esc(m.bottles)} but.` : ''}` : 'Klausimas'}</td><td>${esc(m.name)}<br><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${m.phone ? `<br>${esc(m.phone)}` : ''}</td><td style="white-space:pre-wrap">${esc(m.message)}</td><td>${esc(m.email_status)}</td></tr>`).join('')
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...SECURITY })
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Bullbūcha žinutės</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:20px;background:#10101b;color:#f3ead8}h1{color:#e2b663}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #333;text-align:left;vertical-align:top}th{color:#c9bfae;font-size:12px;text-transform:uppercase}a{color:#e2b663}.wrap{overflow-x:auto}</style>
<h1>Žinutės (${list.length})</h1><p>El. paštas: ${mailer ? 'įjungtas' : '<b>išjungtas</b> (žinutės tik išsaugomos čia)'}</p>
<div class="wrap"><table><tr><th>Gauta</th><th>Tipas</th><th>Kas</th><th>Žinutė</th><th>Laiškas</th></tr>${rows || '<tr><td colspan="5">Kol kas žinučių nėra.</td></tr>'}</table></div>`)
}

// ── routes ──
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  try {
    if (url.pathname === '/health') return json(res, 200, { ok: true })

    if (url.pathname === '/api/contact' && req.method === 'POST') {
      if (limited(clientIp(req))) return json(res, 429, { error: 'Too many messages. Please try again later.', errorLt: 'Per daug žinučių. Bandyk vėliau.' })
      let b
      try { b = JSON.parse(await readBody(req)) } catch (e) { return json(res, e.code === 413 ? 413 : 400, { error: 'Invalid request.', errorLt: 'Netinkama užklausa.' }) }
      // Spam traps: a hidden field bots fill in, and forms sent within 2 seconds of loading.
      if (b.website || Number(b.ms) < 2000) return json(res, 200, { ok: true })
      const m = {
        at: new Date().toISOString(),
        type: b.type === 'question' ? 'question' : 'order',
        name: String(b.name || '').trim().slice(0, 80),
        email: String(b.email || '').trim().slice(0, 160),
        phone: String(b.phone || '').trim().slice(0, 40),
        message: String(b.message || '').trim().slice(0, 3000),
        lang: b.lang === 'en' ? 'en' : 'lt',
      }
      if (!m.name) return json(res, 400, { error: 'Please add your name.', errorLt: 'Įrašyk savo vardą.' })
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m.email)) return json(res, 400, { error: 'Please enter a valid email address.', errorLt: 'Įrašyk teisingą el. pašto adresą.' })
      if (!m.message) return json(res, 400, m.type === 'order'
        ? { error: 'Please write what you would like to order.', errorLt: 'Parašyk, ką norėtum užsisakyti.' }
        : { error: 'Please write your question.', errorLt: 'Parašyk savo klausimą.' })
      try { m.email_status = await sendEmail(m) } catch (e) { console.error('Email failed:', e.message); m.email_status = 'failed' }
      await mkdir(DATA_DIR, { recursive: true })
      await appendFile(MESSAGES, JSON.stringify(m) + '\n')
      return json(res, 200, { ok: true })
    }

    if (url.pathname === '/admin') {
      if (!ADMIN_PASSWORD) { res.writeHead(404); return res.end('Not found') }
      if (!adminAllowed(req)) { res.writeHead(401, { 'www-authenticate': 'Basic realm="Bullbucha", charset="UTF-8"' }); return res.end('Login required') }
      return adminPage(res)
    }

    if (req.method === 'GET' || req.method === 'HEAD') return sendStatic(req, res, url.pathname, url.searchParams.has('v'))
    res.writeHead(405); res.end()
  } catch (e) {
    console.error(e)
    if (!res.headersSent) json(res, 500, { error: 'Something went wrong. Please try again.', errorLt: 'Kažkas nepavyko. Bandyk dar kartą.' })
  }
})
server.listen(PORT, () => console.log(`Bullbūcha on :${PORT}`))
