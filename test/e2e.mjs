// End-to-end test: runs the site with a fake SMTP server and checks the page, both intros,
// LT/EN, the order form (email + saved copy), spam traps, admin page and phone layout.
// Run: npm test   (needs Playwright installed globally)
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const { chromium } = createRequire(import.meta.url)('playwright')

// ── a tiny SMTP server that keeps every message it receives ──
const mails = []
const smtp = createServer(sock => {
  let data = false, buf = '', cur = ''
  sock.write('220 test ESMTP\r\n')
  sock.on('data', chunk => {
    buf += chunk.toString('utf8')
    let i
    while ((i = buf.indexOf('\r\n')) !== -1) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2)
      if (data) {
        if (line === '.') { data = false; mails.push(cur); cur = ''; sock.write('250 OK queued\r\n') } else cur += line + '\n'
        continue
      }
      const cmd = line.slice(0, 4).toUpperCase()
      if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250-test\r\n250 8BITMIME\r\n')
      else if (cmd === 'DATA') { data = true; sock.write('354 go\r\n') }
      else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end() }
      else sock.write('250 OK\r\n')
    }
  })
})
await new Promise(r => smtp.listen(0, '127.0.0.1', r))

const PORT = 4791, BASE = `http://127.0.0.1:${PORT}`
const dataDir = await mkdtemp(join(tmpdir(), 'bb-'))
const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url).pathname,
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port), SMTP_SECURE: 'false', SMTP_USER: '', CONTACT_TO: 'orders@example.com', MAIL_FROM: 'site@example.com', ADMIN_PASSWORD: 'test-pass' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''; server.stdout.on('data', d => log += d); server.stderr.on('data', d => log += d)
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/health')).ok) break } catch {} await new Promise(r => setTimeout(r, 100)) }

const errors = []
const step = s => console.log('✓', s)
const browser = await chromium.launch()
const saved = async () => (await readFile(join(dataDir, 'messages.jsonl'), 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
try {
  // ── intros ──
  for (const style of ['gold', 'horns']) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    p.on('pageerror', e => errors.push(e.message))
    await p.goto(`${BASE}/?intro=${style}`)
    await p.waitForSelector(`#intro.intro--${style}`)
    assert.equal(await p.evaluate(() => document.body.style.overflow), 'hidden', 'page locked during intro')
    await p.waitForSelector('#intro', { state: 'detached', timeout: 6000 })
    assert.equal(await p.evaluate(() => document.body.style.overflow), '')
    assert.ok(await p.$('#logo3d.on'), '3D logo starts after the intro')
    const tf = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 1500)); return getComputedStyle(document.querySelector('.logo3d__tilt')).transform })
    assert.notEqual(tf, 'none', '3D logo is tilting')
    await p.close()
  }
  const sk = await browser.newPage(); await sk.goto(BASE + '/'); assert.equal(await sk.$('.intro__skip'), null, 'no skip button'); await sk.click('#intro'); await sk.waitForSelector('#intro', { state: 'detached', timeout: 2000 }); await sk.close()
  step('both intros play and remove themselves; no skip button; 3D logo starts')

  // ── page + language ──
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(BASE + '/?intro=off')
  assert.match(await page.textContent('h1'), /BULLBŬCHA/)
  assert.match(await page.textContent('#produktas'), /7\.77/)
  assert.match(await page.textContent('#apie'), /Rankų darbo ir ekologiška/)
  await page.click('[data-lang=en]')
  assert.match(await page.textContent('#apie'), /Handmade and organic/)
  assert.equal(await page.getAttribute('html', 'lang'), 'en')
  await page.reload(); assert.match(await page.textContent('#apie'), /Handmade and organic/, 'language remembered')
  await page.click('[data-lang=lt]')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no sideways scroll on a phone')
  assert.equal(await page.$('#soundBtn'), null, 'no sound button')
  assert.equal(await page.$('input[name=bottles]'), null, 'no bottle quantity')
  assert.equal(await page.$$eval('.hero__cta .btn', b => b.map(x => x.textContent).join('|')), 'Susisiek su mumis')
  assert.equal(await page.evaluate(() => document.querySelector('#adVideo').muted), true)
  const v = await fetch(BASE + '/media/bullbucha-ad.mp4', { headers: { range: 'bytes=0-99' } })
  assert.equal(v.status, 206); assert.equal((await v.arrayBuffer()).byteLength, 100)
  step('Lithuanian page, EN switch (remembered), price shown, phone layout, video streams')

  // ── order form ──
  await page.click('.hero__cta .btn'); await page.waitForTimeout(400)
  await page.click('#contactForm button[type=submit]')
  assert.match(await page.textContent('#formStatus'), /vardą/)
  await page.fill('input[name=name]', 'Rūta Bulienė'); await page.fill('input[name=email]', 'ruta@example.com'); await page.fill('input[name=phone]', '+370 600 00000')
  await page.click('#contactForm button[type=submit]')
  assert.match(await page.textContent('#formStatus'), /ką norėtum užsisakyti/)
  await page.fill('textarea[name=message]', '4 butelius, atsiimčiau šeštadienį.\nAčiū!')
  await page.waitForTimeout(1600) // the form ignores sends within 2 s of loading (bots)
  await page.click('#contactForm button[type=submit]')
  await page.waitForSelector('#contactForm.sent')
  assert.match(await page.textContent('#formStatus'), /Ačiū/)
  let all = await saved()
  assert.equal(all.length, 1)
  assert.deepEqual([all[0].type, all[0].name, all[0].message.slice(0, 10), all[0].email_status], ['order', 'Rūta Bulienė', '4 butelius', 'sent'])
  assert.equal(mails.length, 1)
  const mail = mails[0]
  assert.match(mail, /To: orders@example\.com/)
  assert.match(mail, /Reply-To: .*ruta@example\.com/)
  assert.match(mail, /Subject: =\?UTF-8\?/) // Lithuanian letters are encoded
  step('order: validation (message required, no quantity), saved, emailed to CONTACT_TO with Reply-To = customer')

  // ── question in English ──
  const q = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await q.goto(BASE + '/?intro=off'); await q.click('[data-lang=en]')
  await q.click('#contactForm .seg label:nth-child(2)')
  await q.fill('input[name=name]', 'Sam'); await q.fill('input[name=email]', 'sam@example.com')
  await q.waitForTimeout(1600)
  await q.click('#contactForm button[type=submit]')
  assert.match(await q.textContent('#formStatus'), /write your question/)
  await q.fill('textarea[name=message]', 'Do you deliver to Kaunas?')
  await q.click('#contactForm button[type=submit]'); await q.waitForSelector('#contactForm.sent')
  assert.match(await q.textContent('#formStatus'), /Thanks/)
  all = await saved(); assert.equal(all[1].type, 'question'); assert.equal(all[1].lang, 'en')
  step('question in English: message required, saved + emailed')

  // ── spam traps + rate limit ──
  let ipN = 10
  const post = (body, ip = `10.0.0.${ipN++}`) => fetch(BASE + '/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) })
  const good = { type: 'order', name: 'Bot', email: 'b@example.com', message: '2 bottles', ms: 5000 }
  assert.equal((await post({ ...good, website: 'http://spam' })).status, 200)
  assert.equal((await post({ ...good, ms: 300 })).status, 200)
  assert.equal((await saved()).length, 2, 'spam not saved')
  assert.equal((await post({ ...good, email: 'nope' })).status, 400)
  assert.equal((await post({ ...good, message: '' })).status, 400)
  let last
  for (let i = 0; i < 6; i++) last = await post({ ...good, name: 'Limit ' + i }, '10.9.9.9')
  assert.equal(last.status, 429)
  assert.equal((await post({ ...good, name: 'Faked' }, '1.2.3.4, 10.9.9.9')).status, 429, 'a faked first address does not dodge the limit')
  step('spam traps (hidden field, too-fast) ignored; bad input refused; 5 per 10 min per visitor')

  // ── admin ──
  assert.equal((await fetch(BASE + '/admin')).status, 401)
  const adm = await fetch(BASE + '/admin', { headers: { authorization: 'Basic ' + Buffer.from('x:test-pass').toString('base64') } })
  assert.equal(adm.status, 200); const html = await adm.text()
  assert.ok(html.includes('Rūta Bulienė') && html.includes('Do you deliver to Kaunas?'))
  assert.ok(!html.includes('<script'), 'messages are escaped')
  step('/admin needs the password and lists saved messages')

  assert.equal((await fetch(BASE + '/../server.js')).status !== 200 || !(await (await fetch(BASE + '/%2e%2e/server.js')).text()).includes('nodemailer'), true)
  step('no access to files outside public/')

  assert.deepEqual(errors, [])
  step('no JavaScript errors')
  console.log('\nALL PASSED')
} catch (e) {
  console.error('\nFAILED:', e); console.error(log.slice(-2000)); process.exitCode = 1
} finally {
  await browser.close(); server.kill(); smtp.close(); await rm(dataDir, { recursive: true, force: true })
}
