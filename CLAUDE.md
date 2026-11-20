# Notes for Claude / developers

- Static one-page site in `public/` plus a small Node 22 server (`server.js`, only dependency: nodemailer).
- Lithuanian text lives in `index.html` (`data-i18n` keys); English in the `EN` object in `public/js/site.js`. Change both together.
- Product facts (benefits, ingredients, storage, 7.77 EUR) come from the client's label. Don't invent claims. The price is also in `server.js` (`PRICE`) and `site.js` (`form.total`).
- Never commit SMTP passwords or `ADMIN_PASSWORD`; they're Coolify runtime env vars.
- Messages are saved to `DATA_DIR/messages.jsonl` (volume `/app/data` in Coolify).
- Run `npm test` (Playwright e2e with a fake SMTP server) before pushing.
