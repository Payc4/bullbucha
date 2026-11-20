// Bullbūcha: intro animation, LT/EN, ad video sound, order/contact form.
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
    'hero.order': 'Order by message', 'hero.more': 'Find out more',
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
    'product.soundOn': 'Sound on', 'product.soundOff': 'Sound off',
    'care.title': 'How to enjoy',
    'care.c1': "Don't shake, open carefully", 'care.c2': 'Fizzes like a volcano', 'care.c3': 'Keep cold and still, 1–5 °C',
    'care.note': 'Keeps for 6 months refrigerated. Once opened, drink within 7 days.',
    'contact.kicker': 'Orders and questions', 'contact.title': 'ORDER BY MESSAGE',
    'contact.lead': "Tell us how many bottles you'd like and we'll get back to you to arrange your order. Got a question? Write to us too.",
    'form.order': 'Order', 'form.question': 'Question', 'form.name': 'Name', 'form.phone': 'Phone (optional)', 'form.email': 'Email',
    'form.qty': 'Number of bottles', 'form.message': 'Message', 'form.placeholder': 'E.g. when and where you would like to collect',
    'form.placeholderQ': 'Your question',
    'form.privacy': 'We only use your details to reply to this message.', 'form.send': 'Send message',
    'form.sending': 'Sending…', 'form.thanks': "Thanks! We got your message and we'll be in touch soon.",
    'form.errName': 'Please add your name.', 'form.errEmail': 'Please enter a valid email address.', 'form.errQty': 'How many bottles? (1–200)',
    'form.errMsg': 'Please write your question.', 'form.errNet': "Couldn't send. Check your connection and try again.",
    'form.total': n => `${n} × 7.77 EUR = ${(n * 7.77).toFixed(2)} EUR`,
    'foot.tag': "Rock'n'roll in your mouth",
  }
  const LT = {
    'product.soundOn': 'Įjungti garsą', 'product.soundOff': 'Išjungti garsą',
    'form.placeholderQ': 'Tavo klausimas',
    'form.sending': 'Siunčiama…', 'form.thanks': 'Ačiū! Žinutę gavome ir greitai susisieksime.',
    'form.errName': 'Įrašyk savo vardą.', 'form.errEmail': 'Įrašyk teisingą el. pašto adresą.', 'form.errQty': 'Kiek butelių? (1–200)',
    'form.errMsg': 'Parašyk savo klausimą.', 'form.errNet': 'Nepavyko išsiųsti. Patikrink ryšį ir bandyk dar kartą.',
    'form.total': n => `${n} × 7.77 EUR = ${(n * 7.77).toFixed(2).replace('.', ',')} EUR`,
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
    syncSound(); syncType(); updateTotal()
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
    document.body.style.overflow = ''
    setTimeout(() => { intro.remove(); document.dispatchEvent(new Event('intro:done')) }, 760)
  }
  if (style === 'off' || !intro) { intro?.remove() } else {
    const word = intro.querySelector('.intro__word')
    word.innerHTML = [...'BULLBŬCHA'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')
    intro.classList.add('on', style === 'horns' ? 'intro--horns' : 'intro--gold')
    document.body.style.overflow = 'hidden'
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? 900 : style === 'horns' ? 3100 : 3000
    setTimeout(() => endIntro(!reduced), total)
    intro.querySelector('.intro__skip').addEventListener('click', () => endIntro(false))
    intro.addEventListener('click', e => { if (!e.target.closest('.intro__skip')) endIntro(false) })
    addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') endIntro(false) }, { once: true })
  }

  // ───────── reveal on scroll ─────────
  const revealables = $$('.frame, .product__media, .product__text, .contact__intro, .form, .care__item')
  for (const el of revealables) el.classList.add('reveal')
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }, { rootMargin: '0px 0px -10% 0px' }) : null
  for (const el of revealables) io ? io.observe(el) : el.classList.add('in')

  // ───────── ad video ─────────
  const video = $('#adVideo'), soundBtn = $('#soundBtn')
  function syncSound() {
    if (!video) return
    soundBtn.setAttribute('aria-pressed', String(!video.muted))
    soundBtn.querySelector('[data-i18n]').textContent = t(video.muted ? 'product.soundOn' : 'product.soundOff')
  }
  if (video) {
    const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? video.play().catch(() => {}) : video.pause() }, { threshold: .35 }) : null
    vio ? vio.observe(video) : video.play().catch(() => {})
    soundBtn.addEventListener('click', () => { video.muted = !video.muted; if (!video.muted) video.play().catch(() => {}); syncSound() })
  }

  // ───────── order / contact form ─────────
  const form = $('#contactForm'), status = $('#formStatus'), qtyField = $('#qtyField')
  const loadedAt = Date.now()
  const qty = () => Number(form.bottles.value)
  function updateTotal() { if (form) $('#qtyTotal').textContent = qty() >= 1 && qty() <= 200 ? t('form.total', qty()) : '' }
  function syncType() {
    if (!form) return
    const order = form.type.value === 'order'
    qtyField.hidden = !order
    form.message.placeholder = t(order ? 'form.placeholder' : 'form.placeholderQ')
  }
  if (form) {
    for (const r of form.querySelectorAll('input[name=type]')) r.addEventListener('change', syncType)
    for (const b of form.querySelectorAll('[data-step]')) b.addEventListener('click', () => { form.bottles.value = Math.min(200, Math.max(1, (qty() || 0) + Number(b.dataset.step))); updateTotal() })
    form.bottles.addEventListener('input', updateTotal)
    for (const a of $$('[data-order]')) a.addEventListener('click', () => { form.querySelector('input[value=order]').checked = true; syncType() })

    form.addEventListener('submit', async e => {
      e.preventDefault()
      for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid')
      const order = form.type.value === 'order'
      const data = {
        type: form.type.value, name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(),
        bottles: order ? qty() : null, message: form.message.value.trim(), website: form.website.value, lang, ms: Date.now() - loadedAt,
      }
      const bad = !data.name ? ['name', 'form.errName']
        : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) ? ['email', 'form.errEmail']
        : order && !(data.bottles >= 1 && data.bottles <= 200) ? ['bottles', 'form.errQty']
        : !order && !data.message ? ['message', 'form.errMsg'] : null
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
