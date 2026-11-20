# Bullbūcha website

One-page site for Bullbūcha (Triple Rose kombucha): logo intro animation, brand and product, the ad video, how to enjoy, and an order/question form that emails you. Lithuanian by default with an EN switch.

- `public/`: the page (`index.html`, `css/site.css`, `js/site.js`, images, video, fonts)
- `server.js`: serves the page, handles the form (`POST /api/contact`) and the message list (`/admin`)
- Every form message is **saved** to `DATA_DIR/messages.jsonl` and, when SMTP is set up, **emailed** to `CONTACT_TO`. Without SMTP the form still works and messages wait in `/admin`.

## Run locally

```
npm install
npm start            # http://localhost:3000
npm test             # end-to-end test (needs Playwright installed)
```

## Intro animation

Two styles are built in:

- `https://bullbucha.com/?intro=gold`: gold ring draws, bull rises, letters appear (the default)
- `https://bullbucha.com/?intro=horns`: horns first, then the bull, letters stamp in
- `?intro=off`: no intro

To change the default, edit `|| 'gold'` in `public/js/site.js` (the `intro` section). Visitors can skip it with the button, a click, Esc or Enter. With "reduce motion" switched on it's shortened.

## Deploy on Coolify

1. **New resource → Public/Private repository** → `Payc4/bullbucha`, branch `main`, build pack **Dockerfile**, port **3000**.
2. **Persistent storage**: add a volume mounted at **`/app/data`** (otherwise saved messages are lost on every redeploy).
3. **Domain**: `https://bullbucha.com` (and `https://www.bullbucha.com` if you want it). At the domain registrar add an **A record** `@` → `2.24.164.200` (and `www` → same, or a CNAME to `bullbucha.com`).
4. **Environment variables** (runtime, not build):

| Variable | Example | What it does |
|---|---|---|
| `CONTACT_TO` | `orders@bullbucha.com` | Inbox that receives form messages (comma-separate for several) |
| `SMTP_HOST` | `smtp-relay.brevo.com` | Mail server |
| `SMTP_PORT` | `587` | `587` (STARTTLS) or `465` (SSL) |
| `SMTP_SECURE` | `false` | `true` only for port 465 |
| `SMTP_USER` | (from your mail provider) | SMTP login |
| `SMTP_PASS` | (from your mail provider) | SMTP password / key, keep it secret |
| `MAIL_FROM` | `Bullbūcha <info@bullbucha.com>` | Sender shown on the email |
| `ADMIN_PASSWORD` | (a long random password) | Turns on `/admin` (any username, this password) |

5. Deploy. The log says `Email is ON` when SMTP is configured, or a warning when it isn't.

### SMTP options

- **Brevo** (free 300 emails/day): `smtp-relay.brevo.com`, port 587, login + SMTP key from *SMTP & API*. Verify the bullbucha.com domain there so mail isn't marked as spam.
- **Gmail / Google Workspace**: `smtp.gmail.com`, port 465, `SMTP_SECURE=true`, user = the Gmail address, password = an **App password** (needs 2-step verification). `MAIL_FROM` must be that address.
- **Hostinger email**: `smtp.hostinger.com`, port 465, `SMTP_SECURE=true`, the mailbox address and its password.

Replies go straight to the customer: each email has *Reply-To* set to the address they typed.

## Messages page

`https://bullbucha.com/admin` (browser asks for a password: any username, `ADMIN_PASSWORD`). It lists every message, newest first, with whether the email went out. Off (404) when `ADMIN_PASSWORD` isn't set.

## Spam protection

Hidden honeypot field, ignores forms sent within 2 s of loading, 5 messages per 10 minutes per visitor, 20 KB request limit.
