// Bullbūcha: intro animation, 3D logo, LT/EN, ad video, order/contact form.
(() => {
  const $ = s => document.querySelector(s)
  const $$ = s => [...document.querySelectorAll(s)]
  const store = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch {} } }

  // ───────── texts (Lithuanian in the page; English here) ─────────
  const EN = {
    'intro.skip': 'Skip',
    'nav.about': 'About', 'nav.product': 'Kombucha', 'nav.care': 'How to enjoy', 'nav.contact': 'Contact', 'nav.order': 'Order',
    'hero.kicker': 'Premium handmade organic kombucha',
    'hero.tag': "Craft natural rose kombucha. You've never tasted anything like it.",
    'hero.contact': 'Contact us',
    'about.title1': 'Natural homemade',
    'about.lead': 'Live, sparkling, handmade kombucha with rose tea, ginger and lemon. No nonsense added.',
    'about.b1': 'Handmade and organic',
    'about.b2': 'No sweeteners, preservatives, E-numbers or other nonsense',
    'about.b3': 'Full of vitamins C and B6, minerals and antioxidants',
    'about.b4': 'With thiamine, for bull-strong immunity and energy',
    'about.b5': 'Even vegan-friendly',
    'about.b6': 'Seriously delicious, full of happiness and joy',
    'product.kicker': 'Our kombucha', 'product.sub': 'Craft natural rose kombucha',
    'product.desc': 'Green tea, secret rose tea, ginger and lemon, naturally fermented with live kombucha probiotics. Fresh, sparkling, with a rose aroma.',
    'product.price': 'special price', 'product.order': 'Order now',
    'product.ingrTitle': 'Ingredients',
    'product.ingr': "Pure spring water, organic sugar (±4 g/100 g), kombucha's good probiotics (SCOBY), green tea, secret rose tea, ginger, lemon.",
    'care.title': 'How to enjoy',
    'care.c1': "Don't shake, open carefully", 'care.c2': 'Fizzes like a volcano', 'care.c3': 'Keep cold and still, 1–5 °C',
    'care.note': 'Keeps for 6 months refrigerated. Once opened, drink within 7 days.',
    'contact.insta': 'Follow us on Instagram',
    'contact.kicker': 'Orders and questions', 'contact.title': 'ORDER BY MESSAGE',
    'contact.lead': "Tell us how many bottles you'd like and we'll get back to you to arrange your order. Got a question? Write to us too.",
    'form.order': 'Order', 'form.question': 'Question', 'form.name': 'Name', 'form.phone': 'Phone (optional)', 'form.email': 'Email',
    'form.message': 'Message', 'form.placeholder': 'Tell us what you would like to order, and when and where you would like to collect it',
    'form.placeholderQ': 'Your question',
    'form.privacy': 'We only use your details to reply to this message.', 'form.send': 'Send message',
    'form.sending': 'Sending…', 'form.thanks': "Thanks! We got your message and we'll be in touch soon.",
    'form.errName': 'Please add your name.', 'form.errEmail': 'Please enter a valid email address.', 'form.errOrder': 'Please write what you would like to order.',
    'form.errMsg': 'Please write your question.', 'form.errNet': "Couldn't send. Check your connection and try again.",
    'foot.tag': "Rock'n'roll in your mouth",
  }
  const LT = {
    'form.placeholderQ': 'Tavo klausimas',
    'form.sending': 'Siunčiama…', 'form.thanks': 'Ačiū! Žinutę gavome ir greitai susisieksime.',
    'form.errName': 'Įrašyk savo vardą.', 'form.errEmail': 'Įrašyk teisingą el. pašto adresą.', 'form.errOrder': 'Parašyk, ką norėtum užsisakyti.',
    'form.errMsg': 'Parašyk savo klausimą.', 'form.errNet': 'Nepavyko išsiųsti. Patikrink ryšį ir bandyk dar kartą.',
  }
  // the page's own Lithuanian text becomes the LT dictionary
  for (const el of $$('[data-i18n]')) LT[el.dataset.i18n] ??= el.textContent
  for (const el of $$('[data-i18n-placeholder]')) LT[el.dataset.i18nPlaceholder] ??= el.placeholder
  let lang = store.get('bb-lang') === 'en' ? 'en' : 'lt'
  const t = (k, ...a) => { const v = (lang === 'en' ? EN : LT)[k] ?? LT[k] ?? k; return typeof v === 'function' ? v(...a) : v }

  function applyLang(l) {
    lang = l; store.set('bb-lang', l)
    document.documentElement.lang = l
    for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n)
    for (const el of $$('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder)
    for (const b of $$('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === l))
    document.title = l === 'en' ? 'Bullbūcha · premium handmade organic kombucha' : 'Bullbūcha · premium rankų darbo ekologiška kombucha'
    syncType()
  }
  for (const b of $$('[data-lang]')) b.addEventListener('click', () => applyLang(b.dataset.lang))

  // ───────── intro ─────────
  // ?intro=gold (default) or ?intro=horns, to compare both; ?intro=off skips it.
  window.__bbIntro = true // tells the safety timer in <head> that the intro is handled here
  const intro = $('#intro')
  const style = new URLSearchParams(location.search).get('intro') || 'gold'
  let introDone = false
  function endIntro(fly) {
    if (introDone) return
    introDone = true
    const stage = intro.querySelector('.intro__stage')
    const target = $('.brand__bull').getBoundingClientRect()
    const from = intro.querySelector('.intro__bull').getBoundingClientRect()
    if (fly && from.width) {
      // glide the logo up into the header logo
      const s = target.width / from.width
      const dx = target.left + target.width / 2 - (from.left + from.width / 2)
      const dy = target.top + target.height / 2 - (from.top + from.height / 2)
      stage.style.transformOrigin = `${from.left + from.width / 2 - stage.getBoundingClientRect().left}px ${from.top + from.height / 2 - stage.getBoundingClientRect().top}px`
      stage.classList.add('fly')
      requestAnimationFrame(() => { stage.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`; stage.style.opacity = '0.0' })
    }
    intro.classList.add('out')
    document.body.style.overflow = document.documentElement.style.overflow = ''
    if (!location.hash) scrollTo(0, 0) // start at the top, even if the page moved under the intro
    setTimeout(start3d, 380) // the hero logo swings in as the intro fades out
    setTimeout(() => { intro.remove(); document.dispatchEvent(new Event('intro:done')) }, 760)
  }
  if (style === 'off' || !intro) { intro?.remove(); start3d() } else {
    const word = intro.querySelector('.intro__word')
    word.innerHTML = [...'BULLBŬCHA'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')
    intro.classList.add('on', style === 'horns' ? 'intro--horns' : 'intro--gold')
    document.body.style.overflow = document.documentElement.style.overflow = 'hidden'
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    if (!location.hash) scrollTo(0, 0)
    // phones (iPhone especially) still scroll the page under a fixed layer on swipe: block it during the intro
    for (const ev of ['touchmove', 'wheel']) intro.addEventListener(ev, e => e.preventDefault(), { passive: false })
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? 900 : style === 'horns' ? 3100 : 3000
    setTimeout(() => endIntro(!reduced), total)
    intro.addEventListener('click', e => { if (!e.target.closest('.intro__skip')) endIntro(false) })
    addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') endIntro(false) }, { once: true })
  }

  // ───────── 3D logo (hero) ─────────
  // The bull and its rings sit at different depths; after the intro the logo swings in, then follows the
  // mouse on computers and sways gently by itself on phones. Off with "reduce motion".
  function start3d() {
    const el = $('#logo3d')
    if (!el || el.classList.contains('on')) return
    el.classList.add('on')
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tilt = el.querySelector('.logo3d__tilt'), hero = $('#hero')
    let tx = 0, ty = 0, x = 0, y = 0, pointer = false, visible = true, raf = 0, t0 = performance.now()
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect()
        tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * .9)))
        ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * .9)))
        pointer = true
      })
      hero.addEventListener('pointerleave', () => { pointer = false })
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame) }).observe(hero)
    function frame(now) {
      raf = 0
      if (!visible) return
      const s = (now - t0) / 1000
      const gx = pointer ? tx : Math.sin(s * .55) * .45, gy = pointer ? ty : Math.sin(s * .8 + 1) * .25
      x += (gx - x) * .07; y += (gy - y) * .07
      tilt.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg')
      tilt.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg')
      tilt.style.setProperty('--shine', (50 - x * 30).toFixed(1) + '%')
      raf = requestAnimationFrame(frame)
    }
    setTimeout(() => { raf ||= requestAnimationFrame(frame) }, 1300) // after the swing-in
  }

  // the scroll hint under the button fades away once the visitor scrolls
  const hint = $('.hero__scroll')
  if (hint) addEventListener('scroll', () => hint.classList.toggle('gone', scrollY > 40), { passive: true })

  // ───────── reveal on scroll ─────────
  const revealables = $$('.frame, .product__media, .product__text, .contact__intro, .form, .care__item')
  for (const el of revealables) el.classList.add('reveal')
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }, { rootMargin: '0px 0px -10% 0px' }) : null
  for (const el of revealables) io ? io.observe(el) : el.classList.add('in')

  // ───────── ad video (always silent; plays while on screen) ─────────
  const video = $('#adVideo')
  if (video) {
    video.muted = true
    video.addEventListener('volumechange', () => { if (!video.muted) video.muted = true })
    const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? video.play().catch(() => {}) : video.pause() }, { threshold: .35 }) : null
    vio ? vio.observe(video) : video.play().catch(() => {})
  }

  // ───────── order / contact form ─────────
  const form = $('#contactForm'), status = $('#formStatus')
  const loadedAt = Date.now()
  function syncType() {
    if (!form) return
    form.message.placeholder = t(form.type.value === 'order' ? 'form.placeholder' : 'form.placeholderQ')
  }
  if (form) {
    for (const r of form.querySelectorAll('input[name=type]')) r.addEventListener('change', syncType)
    for (const a of $$('[data-order]')) a.addEventListener('click', () => { form.querySelector('input[value=order]').checked = true; syncType() })

    form.addEventListener('submit', async e => {
      e.preventDefault()
      for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid')
      const order = form.type.value === 'order'
      const data = {
        type: form.type.value, name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(),
        message: form.message.value.trim(), website: form.website.value, lang, ms: Date.now() - loadedAt,
      }
      const bad = !data.name ? ['name', 'form.errName']
        : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) ? ['email', 'form.errEmail']
        : !data.message ? ['message', order ? 'form.errOrder' : 'form.errMsg'] : null
      if (bad) { form[bad[0]].setAttribute('aria-invalid', 'true'); form[bad[0]].focus(); status.className = 'form__status err'; status.textContent = t(bad[1]); return }
      const btn = form.querySelector('button[type=submit]')
      btn.disabled = true; status.className = 'form__status'; status.textContent = t('form.sending')
      try {
        const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
        const out = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(out.error && lang === 'lt' ? out.errorLt || out.error : out.error || t('form.errNet'))
        form.classList.add('sent'); status.className = 'form__status ok'; status.textContent = t('form.thanks')
      } catch (err) {
        status.className = 'form__status err'; status.textContent = err.message || t('form.errNet'); btn.disabled = false
      }
    })
  }

  $('#year').textContent = new Date().getFullYear()
  applyLang(lang)
})()
