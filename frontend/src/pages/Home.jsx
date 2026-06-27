import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DIAS_SEMANA_CURTO = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function Home() {
  const navigate = useNavigate()
  const [eventos, setEventos] = useState([])
  const [calMes, setCalMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1) })
  const [calDiaSelecionado, setCalDiaSelecionado] = useState(null) // { diaObj, evsDia }
  const [calEventoAberto, setCalEventoAberto] = useState(null) // id do evento expandido
  const [mobileDiaSel, setMobileDiaSel] = useState(new Date())
  const [mobileView, setMobileView] = useState('semana')
  const [cruzadaComecou, setCruzadaComecou] = useState(() => new Date() >= new Date('2026-06-27T00:00:00'))

  useEffect(() => {
    if (calDiaSelecionado) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [calDiaSelecionado])

  useEffect(() => {
    supabase.from('eventos').select('*').order('data').order('hora_inicio').then(({ data }) => {
      if (data) setEventos(data)
    })
  }, [])

  useEffect(() => {
    // Countdown
    const alvo = new Date('2026-06-27T00:00:00')
    const tick = () => {
      const diff = Math.max(0, alvo - new Date())
      const pad = n => String(Math.floor(n)).padStart(2, '0')
      const dias = document.getElementById('cd-dias')
      const horas = document.getElementById('cd-horas')
      const min = document.getElementById('cd-min')
      const seg = document.getElementById('cd-seg')
      if (dias) dias.textContent = pad(diff / 86400000)
      if (horas) horas.textContent = pad((diff % 86400000) / 3600000)
      if (min) min.textContent = pad((diff % 3600000) / 60000)
      if (seg) seg.textContent = pad((diff % 60000) / 1000)
      if (diff === 0) setCruzadaComecou(true)
    }
    tick()
    const iv = setInterval(tick, 1000)

    // Scroll reveal
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on') })
    }, { threshold: 0.06 })
    document.querySelectorAll('.r, .r2').forEach(el => obs.observe(el))

    // Nav active
    const sections = document.querySelectorAll('section[id]')
    const onScroll = () => {
      let cur = ''
      sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id })
      document.querySelectorAll('.nav-links a, .nav-mobile-menu a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + cur)
      })
    }
    window.addEventListener('scroll', onScroll)

    // Scrollbar
    const bar = document.getElementById('custom-scroll')
    const thumb = document.getElementById('custom-scroll-thumb')
    const updateThumb = () => {
      if (!bar || !thumb) return
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const ratio = scrollTop / docHeight
      const thumbH = Math.max(40, (window.innerHeight / document.documentElement.scrollHeight) * window.innerHeight)
      thumb.style.height = thumbH + 'px'
      thumb.style.top = (ratio * (window.innerHeight - thumbH)) + 'px'
    }
    window.addEventListener('scroll', updateThumb)
    window.addEventListener('resize', updateThumb)
    updateThumb()
    const onMouseMove = e => {
      if (!bar) return
      bar.style.opacity = e.clientX >= window.innerWidth - 20 ? '1' : '0'
    }
    document.addEventListener('mousemove', onMouseMove)

    // Hamburger
    const hamburger = document.getElementById('nav-hamburger')
    const mobileMenu = document.getElementById('nav-mobile-menu')
    const onHamburger = () => {
      hamburger.classList.toggle('open')
      mobileMenu.classList.toggle('open')
    }
    hamburger?.addEventListener('click', onHamburger)
    mobileMenu?.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open')
        mobileMenu.classList.remove('open')
      })
    })

    // Botão Entrar → /login
    const btnsEntrar = document.querySelectorAll('.btn-nav')
    const onEntrar = e => { e.preventDefault(); navigate('/login') }
    btnsEntrar.forEach(btn => btn.addEventListener('click', onEntrar))

    return () => {
      clearInterval(iv)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', updateThumb)
      window.removeEventListener('resize', updateThumb)
      document.removeEventListener('mousemove', onMouseMove)
      hamburger?.removeEventListener('click', onHamburger)
      btnsEntrar.forEach(btn => btn.removeEventListener('click', onEntrar))
      obs.disconnect()
    }
  }, [navigate])

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --orange: #F97310; --orange2: #FB923C; --orange3: #FDBA74;
          --dark: #0f1117; --dark2: #1a1d27; --white: #ffffff;
          --gray: #f4f4f6; --text: #1a1d27; --muted: #6b7280;
        }
        html { scroll-behavior: smooth; }
        body { font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; background: var(--white); color: var(--text); overflow-x: clip; }
        ::-webkit-scrollbar { width: 0; background: transparent; }
        * { scrollbar-width: none; }
        #custom-scroll { position: fixed; right: 0; top: 0; width: 4px; height: 100vh; z-index: 9998; pointer-events: none; opacity: 0; transition: opacity .3s; }
        #custom-scroll-thumb { position: absolute; right: 0; width: 4px; background: var(--orange); border-radius: 4px; transition: opacity .3s; }
        .topbar { background: var(--dark2); padding: 8px 72px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,.45); letter-spacing: .5px; }
        .topbar a { color: rgba(255,255,255,.45); text-decoration: none; transition: color .2s; }
        .topbar a:hover { color: var(--orange); }
        .topbar-right { display: flex; gap: 24px; }
        nav { background: var(--dark); padding: 0 72px; display: flex; align-items: center; justify-content: space-between; height: 72px; position: fixed; top: 0; left: 0; right: 0; z-index: 300; border-bottom: 3px solid var(--orange); box-shadow: 0 4px 32px rgba(0,0,0,.5); }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo-mark { width: 38px; height: 38px; background: var(--orange); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #fff; clip-path: polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
        .nav-logo-text { font-size: 18px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        .nav-logo-text span { color: var(--orange); }
        .nav-links { display: flex; gap: 36px; list-style: none; }
        .nav-links a { color: rgba(255,255,255,.7); text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; transition: color .2s; padding-bottom: 4px; border-bottom: 2px solid transparent; transition: all .2s; }
        .nav-links a:hover, .nav-links a.active { color: var(--orange); border-bottom-color: var(--orange); }
        .nav-right { display: flex; align-items: center; gap: 20px; }
        .nav-date { font-size: 12px; color: var(--orange); font-weight: 700; letter-spacing: 1px; }
        .btn-nav { background: transparent; color: var(--orange); padding: 11px 28px; font-size: 15px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; transition: all .2s; white-space: nowrap; border-radius: 50px; cursor: pointer; border: none; font-family: inherit; }
        .btn-nav:hover { color: var(--orange2); }
        .hero { background: var(--dark); min-height: 100dvh; position: relative; overflow: hidden; display: flex; align-items: center; padding-top: 75px; }
        .hero-map { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 30% 50%, rgba(249,115,22,.06) 0%, transparent 60%), url('/f1.jpg') center/cover no-repeat; filter: brightness(.12) saturate(.2); }
        .hero-inner { position: relative; z-index: 2; width: 100%; max-width: 1280px; margin: 0 auto; padding: 80px 72px; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 60px; }
        .hero-badge { display: inline-flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: var(--orange); margin-bottom: 24px; }
        .hero-badge::after { content: '›› ›› ›'; color: rgba(249,115,22,.4); letter-spacing: 2px; }
        .hero-title { font-size: clamp(36px, 4.5vw, 64px); font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 24px; letter-spacing: -1px; }
        .hero-title span { color: var(--orange); }
        .hero-sub { font-size: 15px; color: rgba(255,255,255,.5); line-height: 1.75; margin-bottom: 40px; max-width: 440px; }
        .hero-cd { display: flex; gap: 12px; margin-bottom: 40px; }
        .hcd { text-align: center; background: rgba(255,255,255,.05); border: 1px solid rgba(249,115,22,.25); padding: 12px 20px; min-width: 70px; border-radius: 14px; }
        .hcd-num { font-size: 28px; font-weight: 900; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; }
        .hcd-label { font-size: 8px; letter-spacing: 2px; text-transform: uppercase; color: var(--orange); margin-top: 4px; }
        .hero-btns { display: flex; gap: 14px; align-items: center; }
        .btn-orange { background: var(--orange); color: #fff; padding: 14px 36px; font-size: 13px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; transition: all .25s; display: inline-flex; align-items: center; gap: 8px; border-radius: 50px; }
        .btn-orange:hover { background: var(--orange2); box-shadow: 0 0 32px rgba(249,115,22,.5); }
        .btn-outline-white { border: 2px solid rgba(255,255,255,.3); color: rgba(255,255,255,.7); padding: 12px 32px; font-size: 13px; font-weight: 700; text-transform: uppercase; text-decoration: none; transition: all .2s; border-radius: 50px; }
        .btn-outline-white:hover { border-color: var(--orange); color: var(--orange); }
        .hero-right { display: flex; align-items: center; justify-content: center; position: relative; }
        .hero-circle-wrap { position: relative; width: 460px; height: 460px; }
        .hero-circle-bg { position: absolute; inset: 0; border-radius: 50%; border: 3px solid var(--orange); box-shadow: 0 0 0 12px rgba(249,115,22,.08), 0 0 80px rgba(249,115,22,.2); }
        .hero-circle-img { width: 100%; height: 100%; border-radius: 50%; overflow: hidden; }
        .hero-circle-img img { width: 100%; height: 100%; object-fit: cover; filter: brightness(.6) saturate(.5); }
        .hero-img-badge { position: absolute; bottom: 20px; left: -20px; background: var(--orange); color: #fff; padding: 16px 28px; font-size: 16px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 8px 32px rgba(249,115,22,.4); border-radius: 12px; }
        .hero-img-badge span { display: block; font-size: 22px; font-weight: 900; line-height: 1.1; }
        .hero-arrows { position: absolute; bottom: 32px; left: 72px; display: flex; gap: 8px; z-index: 3; }
        .hero-arrow { width: 36px; height: 36px; border: 1px solid rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.5); font-size: 14px; cursor: pointer; transition: all .2s; background: transparent; border-radius: 50%; }
        .hero-arrow:hover { background: var(--orange); border-color: var(--orange); color: #fff; }
        .sec-o-que { background: var(--gray); padding: 96px 72px; }
        .sec-top-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 52px; }
        .sec-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: var(--orange); margin-bottom: 10px; display: block; }
        .sec-h2 { font-size: clamp(26px, 3vw, 44px); font-weight: 900; color: var(--text); line-height: 1.1; letter-spacing: -.5px; }
        .sec-h2 span { color: var(--orange); }
        .sec-h2-line { display: block; width: 48px; height: 3px; background: var(--orange); margin-top: 14px; }
        .btn-outline-orange { border: 2px solid var(--orange); color: var(--orange); padding: 11px 28px; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; transition: all .2s; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; align-self: flex-start; border-radius: 50px; }
        .btn-outline-orange:hover { background: var(--orange); color: #fff; }
        .setores-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .sc-card { position: relative; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.1); transition: transform .3s, box-shadow .3s; cursor: default; border-radius: 18px; }
        .sc-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(0,0,0,.18); }
        .sc-card-img { height: 220px; overflow: hidden; position: relative; }
        .sc-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
        .sc-card:hover .sc-card-img img { transform: scale(1.07); }
        .sc-card-img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,17,23,.6) 0%, transparent 60%); }
        .sc-badge { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: var(--orange); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #fff; box-shadow: 0 4px 16px rgba(249,115,22,.4); border-radius: 50%; }
        .sc-card-body { background: var(--white); padding: 40px 24px 28px; text-align: center; border: 1px solid #efefef; border-top: none; border-radius: 0 0 18px 18px; }
        .sc-card-title { font-size: 16px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
        .sc-card-desc { font-size: 13px; color: var(--muted); line-height: 1.65; }
        .sec-sobre { background: var(--white); padding: 96px 72px; }
        .sobre-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .sobre-list { margin: 28px 0 36px; display: flex; flex-direction: column; gap: 22px; }
        .sobre-item { display: flex; align-items: flex-start; gap: 18px; }
        .sobre-item-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--orange); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; font-weight: 900; color: #fff; box-shadow: 0 4px 16px rgba(249,115,22,.3); }
        .sobre-item-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
        .sobre-item-desc { font-size: 13px; color: var(--muted); line-height: 1.6; }
        .btn-dark { background: var(--dark); color: #fff; padding: 14px 36px; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; transition: all .2s; display: inline-flex; align-items: center; gap: 8px; border-radius: 50px; }
        .btn-dark:hover { background: var(--orange); box-shadow: 0 0 24px rgba(249,115,22,.4); }
        .sobre-right { position: relative; }
        .sobre-img-wrap { position: relative; }
        .sobre-img-wrap img { width: 100%; height: 480px; object-fit: cover; display: block; border-radius: 18px; }
        .sobre-stat-top { position: absolute; top: 20px; left: -24px; display: flex; gap: 4px; }
        .stat-badge { background: var(--orange); color: #fff; padding: 14px 20px; text-align: center; min-width: 100px; }
        .stat-badge-num { font-size: 26px; font-weight: 900; line-height: 1; }
        .stat-badge-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; opacity: .85; }
        .stat-badge.alt { background: var(--dark); }
        .sec-cta-banner { position: relative; min-height: 520px; display: flex; align-items: stretch; overflow: hidden; }
        .cta-banner-bg { position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1529390079861-591de354faf5?w=1920&q=70') center/cover no-repeat; filter: brightness(.4) saturate(.3); }
        .cta-banner-inner { position: relative; z-index: 2; width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 72px; display: grid; grid-template-columns: 480px 1fr; align-items: stretch; }
        .cta-box { background: var(--orange); padding: 60px 48px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
        .cta-box::before { content: ''; position: absolute; bottom: -30px; right: -30px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,.08); }
        .cta-box-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,.7); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .cta-box-eyebrow::before { content: '›› ›'; opacity: .6; }
        .cta-box-title { font-size: clamp(22px, 2.5vw, 36px); font-weight: 900; color: #fff; line-height: 1.15; margin-bottom: 18px; }
        .cta-box-desc { font-size: 13px; color: rgba(255,255,255,.75); line-height: 1.7; margin-bottom: 36px; }
        .cta-box-stats { display: flex; gap: 24px; margin-bottom: 36px; }
        .cta-stat { border-left: 3px solid rgba(255,255,255,.4); padding-left: 14px; }
        .cta-stat-num { font-size: 28px; font-weight: 900; color: #fff; line-height: 1; }
        .cta-stat-label { font-size: 10px; color: rgba(255,255,255,.7); letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; }
        .btn-white { background: #fff; color: var(--orange); padding: 13px 32px; font-size: 12px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; transition: all .2s; display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; border-radius: 50px; }
        .btn-white:hover { background: var(--dark); color: #fff; }
        .cta-right-area { display: flex; align-items: flex-end; justify-content: flex-end; padding: 40px 0; }
        .trust-badge { background: rgba(15,17,23,.85); border: 1px solid rgba(249,115,22,.3); padding: 16px 24px; display: flex; flex-direction: column; gap: 4px; }
        .trust-badge-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.7); letter-spacing: 1px; text-transform: uppercase; }
        .trust-badge-val { font-size: 22px; font-weight: 900; color: var(--orange); line-height: 1; }
        .trust-badge-sub { font-size: 10px; color: rgba(255,255,255,.4); }
        .sec-setores { background: var(--gray); padding: 96px 72px; }
        .setores-grid { margin-top: 52px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .sg-card { background: var(--white); padding: 32px 28px; border-top: 4px solid transparent; transition: all .3s; cursor: default; border-radius: 16px; }
        .sg-card:hover { border-top-color: var(--orange); background: var(--gray); }
        .sg-num { font-size: 42px; font-weight: 900; color: rgba(249,115,22,.18); line-height: 1; margin-bottom: 12px; }
        .sg-title { font-size: 15px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
        .sg-items { list-style: none; }
        .sg-items li { font-size: 12px; color: var(--muted); padding: 4px 0; border-bottom: 1px solid #f0f0f0; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
        .sg-items li:last-child { border-bottom: none; }
        .sg-items li::before { content: '›'; color: var(--orange); font-size: 14px; flex-shrink: 0; line-height: 1.4; font-weight: 700; }
        .sec-consolid { background: var(--dark); padding: 96px 72px; position: relative; overflow: hidden; }
        .sec-consolid::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--orange); }
        .consolid-inner { display: grid; grid-template-columns: 1fr 2fr; gap: 80px; align-items: center; }
        .consolid-left .sec-eyebrow { color: var(--orange); }
        .consolid-left .sec-h2 { color: #fff; }
        .consolid-left p { font-size: 14px; color: rgba(255,255,255,.45); line-height: 1.8; margin-top: 18px; }
        .consolid-steps { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .cs-card { background: var(--dark2); padding: 36px 28px; border-top: 4px solid var(--orange); position: relative; overflow: hidden; transition: background .25s; border-radius: 16px; }
        .cs-card:hover { background: rgba(249,115,22,.08); }
        .cs-num { font-size: 56px; font-weight: 900; color: rgba(249,115,22,.15); line-height: 1; margin-bottom: 14px; }
        .cs-title { font-size: 15px; font-weight: 800; color: #fff; text-transform: uppercase; margin-bottom: 10px; }
        .cs-desc { font-size: 13px; color: rgba(255,255,255,.4); line-height: 1.7; }
        .sec-agenda { background: var(--gray); padding: 96px 72px; }
        .agenda-table-wrap { margin-top: 52px; overflow: hidden; border: 1px solid #e5e7eb; border-radius: 18px; }
        .ag-table { width: 100%; border-collapse: collapse; }
        .ag-table thead tr { background: var(--orange); }
        .ag-table th { padding: 16px 20px; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #fff; text-align: left; }
        .ag-table td { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
        .ag-table tr:last-child td { border-bottom: none; }
        .ag-table tr:hover td { background: #fff8f3; }
        .ag-table tr.final td { background: rgba(249,115,22,.06); }
        .ag-day { font-size: 15px; font-weight: 900; color: var(--text); white-space: nowrap; }
        .ag-table tr.final .ag-day { color: var(--orange); }
        .ag-weekday { font-size: 11px; color: var(--muted); letter-spacing: .5px; }
        .ag-event { font-size: 14px; font-weight: 800; color: var(--text); }
        .ag-table tr.final .ag-event { color: var(--orange); }
        .ag-desc-td { font-size: 13px; color: var(--muted); line-height: 1.5; }
        .ag-badge-td span { background: var(--orange); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; white-space: nowrap; border-radius: 50px; }
        .ag-table tr.final .ag-badge-td span { background: var(--dark); }
        .sec-inscricao { display: grid; grid-template-columns: 1fr 1fr; min-height: 500px; }
        .insc-left { background: var(--dark); padding: 72px 64px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
        .insc-left::after { content: ''; position: absolute; bottom: -60px; right: -60px; width: 200px; height: 200px; border-radius: 50%; border: 40px solid rgba(249,115,22,.07); }
        .insc-left .sec-eyebrow { margin-bottom: 12px; }
        .insc-left-title { font-size: clamp(26px, 3vw, 42px); font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 20px; }
        .insc-left-title span { color: var(--orange); }
        .insc-info { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
        .insc-info-item { display: flex; align-items: center; gap: 14px; font-size: 13px; color: rgba(255,255,255,.5); }
        .insc-info-dot { width: 8px; height: 8px; background: var(--orange); flex-shrink: 0; }
        .insc-right { background: var(--gray); padding: 72px 64px; display: flex; flex-direction: column; justify-content: center; }
        .insc-right-title { font-size: 22px; font-weight: 900; color: var(--text); margin-bottom: 6px; }
        .insc-right-title span { color: var(--orange); }
        .insc-right-sub { font-size: 13px; color: var(--muted); margin-bottom: 28px; }
        .form-field { width: 100%; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 13px 16px; font-size: 13px; color: var(--text); margin-bottom: 12px; outline: none; font-family: inherit; transition: border-color .2s; }
        .form-field::placeholder { color: #9ca3af; }
        .form-field:focus { border-color: var(--orange); }
        .btn-form { width: 100%; background: var(--orange); color: #fff; border: none; padding: 15px; font-size: 13px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all .2s; margin-top: 4px; border-radius: 50px; }
        .btn-form:hover { background: var(--orange2); box-shadow: 0 0 24px rgba(249,115,22,.4); }
        .sec-evangelho { background: var(--white); padding: 96px 72px; }
        .sec-evangelho .sec-h2 { color: #1a1d27 !important; }
        .evangelho-inner { max-width: 820px; margin: 0 auto; text-align: center; }
        .evangelho-desc { font-size: 16px; color: var(--muted); line-height: 1.85; margin: 24px 0 36px; }
        .evangelho-desc strong { color: var(--orange); font-weight: 800; }
        .evangelho-quote { border-left: 4px solid var(--orange); background: rgba(249,115,22,.06); padding: 24px 32px; margin: 0 0 48px; text-align: left; border-radius: 0 12px 12px 0; }
        .evangelho-quote p, .evangelho-quote { font-size: 17px; color: var(--text); line-height: 1.75; font-style: italic; }
        .evangelho-quote cite { display: block; margin-top: 12px; font-size: 12px; font-style: normal; color: var(--orange); font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .evangelho-pilares { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .ep-item { background: var(--gray); border: 1px solid #e5e7eb; padding: 24px 20px; border-radius: 14px; text-align: left; display: flex; gap: 16px; align-items: flex-start; }
        .ep-num { width: 32px; height: 32px; border-radius: 50%; background: var(--orange); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #fff; flex-shrink: 0; }
        .ep-text { font-size: 13px; color: var(--muted); line-height: 1.65; }
        .ep-text strong { color: var(--text); font-weight: 700; }
        .ep-ref { font-size: 13px; color: var(--orange); font-weight: 700; letter-spacing: .5px; margin-top: 4px; display: inline-block; }
        .sec-como { background: var(--dark); padding: 96px 72px; }
        .sec-como .sec-h2 { color: #fff; }
        .sec-como .sec-h2 span { color: var(--orange); }
        .sec-como .sec-eyebrow { color: var(--orange); }
        .como-inner { max-width: 1136px; margin: 0 auto; }
        .como-steps { display: grid; grid-template-columns: repeat(5,1fr); gap: 0; }
        .como-step { padding: 0 24px; position: relative; text-align: center; }
        .como-step:not(:last-child)::after { content: ''; position: absolute; top: 28px; right: -1px; width: 2px; height: 40px; background: rgba(249,115,22,.2); }
        .como-step-num { font-size: 13px; font-weight: 900; color: var(--orange); letter-spacing: 2px; margin-bottom: 16px; }
        .como-step-line { width: 40px; height: 3px; background: var(--orange); margin: 0 auto 20px; border-radius: 2px; }
        .como-step-title { font-size: 14px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
        .como-step-desc { font-size: 12px; color: rgba(255,255,255,.4); line-height: 1.75; }
        .sec-galeria { background: var(--dark); padding: 96px 0 0; }
        .sec-galeria .sec-h2 { color: #fff; }
        .galeria-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; grid-template-rows: 280px 280px; gap: 4px; }
        .galeria-item { position: relative; overflow: hidden; }
        .galeria-item--tall { grid-row: 1 / 3; }
        .galeria-item img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; display: block; }
        .galeria-item:hover img { transform: scale(1.06); }
        .galeria-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,17,23,.7) 0%, transparent 50%); display: flex; align-items: flex-end; padding: 20px; opacity: 0; transition: opacity .3s; }
        .galeria-item:hover .galeria-overlay { opacity: 1; }
        .galeria-overlay span { font-size: 13px; font-weight: 700; color: #fff; letter-spacing: .5px; }
        .sec-oracao { background: var(--gray); padding: 96px 72px; position: relative; overflow: hidden; }
        .sec-oracao::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(249,115,22,.06) 0%, transparent 70%); }
        .oracao-inner { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; text-align: center; }
        .oracao-title { font-size: clamp(28px, 3.5vw, 48px); font-weight: 900; color: var(--text); line-height: 1.15; margin: 16px 0 20px; }
        .oracao-title span { color: var(--orange); }
        .oracao-desc { font-size: 15px; color: var(--muted); line-height: 1.85; margin-bottom: 40px; }
        .oracao-pontos { display: flex; flex-direction: column; gap: 16px; text-align: left; margin-bottom: 40px; }
        .oracao-ponto { display: flex; align-items: flex-start; gap: 14px; font-size: 14px; color: var(--muted); line-height: 1.6; }
        .oracao-ponto strong { color: var(--text); }
        .oracao-ponto-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--orange); flex-shrink: 0; margin-top: 5px; }
        .oracao-verse { border-left: 4px solid var(--orange); background: rgba(249,115,22,.06); padding: 24px 28px; text-align: left; border-radius: 0 12px 12px 0; }
        .oracao-verse, .oracao-verse p { font-size: 15px; color: var(--text); line-height: 1.8; font-style: italic; }
        .oracao-verse cite { display: block; margin-top: 12px; font-size: 11px; font-style: normal; color: var(--orange); font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .sec-porque { background: var(--white); padding: 96px 72px; }
        .porque-inner { display: flex; flex-direction: column; gap: 52px; max-width: 1136px; margin: 0 auto; text-align: center; }
        .porque-top { display: flex; flex-direction: column; align-items: center; gap: 24px; }
        .porque-top .sec-h2-line { margin: 14px auto 0; }
        .porque-desc { font-size: 15px; color: var(--muted); line-height: 1.8; text-align: justify; max-width: 100%; }
        .porque-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 3px; background: #e5e7eb; border-radius: 18px; overflow: hidden; }
        .psg-item { background: var(--gray); padding: 36px 28px; text-align: center; transition: background .2s; }
        .psg-item:hover { background: #fff8f3; }
        .psg-num { font-size: 36px; font-weight: 900; color: var(--orange); line-height: 1; margin-bottom: 8px; }
        .psg-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
        .sec-depoimentos { background: var(--gray); padding: 96px 72px; }
        .dep-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        .dep-card { background: var(--white); padding: 36px 28px; border-radius: 18px; border-top: 4px solid var(--orange); box-shadow: 0 4px 24px rgba(0,0,0,.06); }
        .dep-quote { font-size: 14px; color: var(--text); line-height: 1.8; font-style: italic; margin-bottom: 24px; }
        .dep-quote::before { content: '"'; font-size: 48px; color: var(--orange); line-height: 0; vertical-align: -18px; margin-right: 4px; font-style: normal; }
        .dep-author { display: flex; align-items: center; gap: 12px; }
        .dep-author-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--orange); flex-shrink: 0; }
        .dep-name { font-size: 14px; font-weight: 800; color: var(--text); }
        .dep-role { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .sec-paratodos { background: var(--white); padding: 96px 72px; }
        .paratodos-inner { display: grid; grid-template-columns: 1fr 380px; gap: 80px; align-items: center; max-width: 1280px; margin: 0 auto; }
        .paratodos-desc { font-size: 15px; color: var(--muted); line-height: 1.9; margin-bottom: 20px; }
        .paratodos-quote { border-left: 4px solid var(--orange); padding: 20px 24px; margin-top: 24px; background: rgba(249,115,22,.06); border-radius: 0 12px 12px 0; }
        .paratodos-quote, .paratodos-quote p { font-size: 16px; color: var(--text); line-height: 1.75; font-style: italic; }
        .paratodos-quote cite { display: block; margin-top: 10px; font-size: 12px; font-style: normal; color: var(--orange); font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .paratodos-right img { width: 100%; aspect-ratio: 9/16; object-fit: cover; border-radius: 18px; display: block; box-shadow: 0 12px 48px rgba(0,0,0,.15); }
        .sec-quem { background: var(--white); padding: 96px 72px; }
        .sec-quem .sec-h2 { color: var(--text); }
        .sec-quem .sec-eyebrow { color: var(--orange); }
        .quem-inner { max-width: 1136px; margin: 0 auto; }
        .quem-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        .quem-card { background: var(--gray); border: 1px solid #e5e7eb; padding: 32px 24px; border-radius: 16px; border-top: 4px solid var(--orange); transition: background .25s; }
        .quem-card:hover { background: #fff8f3; }
        .quem-num { font-size: 42px; font-weight: 900; color: rgba(249,115,22,.25); line-height: 1; margin-bottom: 12px; }
        .quem-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 10px; text-transform: uppercase; letter-spacing: .5px; }
        .quem-desc { font-size: 13px; color: var(--muted); line-height: 1.7; }
        .sec-mapa { background: var(--gray); padding: 96px 72px; }
        .mapa-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
        .sec-mapa .sec-h2 { color: var(--text); }
        .mapa-desc { font-size: 15px; color: var(--muted); line-height: 1.8; margin: 20px 0 32px; }
        .mapa-detalhes { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mapa-detalhe-item { padding: 16px 20px; background: var(--white); border-radius: 12px; border-left: 3px solid var(--orange); }
        .mapa-detalhe-label { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--orange); margin-bottom: 4px; }
        .mapa-detalhe-val { font-size: 14px; font-weight: 700; color: var(--text); }
        .mapa-embed { height: 420px; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,.12); }
        .sec-cta-final { background: var(--dark); padding: 96px 72px; text-align: center; position: relative; overflow: hidden; }
        .sec-cta-final::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(249,115,22,.08) 0%, transparent 70%); pointer-events: none; }
        .cta-final-inner { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
        .cta-final-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: var(--orange); margin-bottom: 20px; display: block; }
        .cta-final-title { font-size: clamp(36px, 5vw, 64px); font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 20px; }
        .cta-final-title span { color: var(--orange); }
        .cta-final-sub { font-size: 15px; color: rgba(255,255,255,.45); margin-bottom: 40px; letter-spacing: .3px; }
        footer { background: var(--dark2); border-top: 4px solid var(--orange); padding: 32px 72px; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-size: 14px; font-weight: 900; color: #fff; text-transform: uppercase; }
        .footer-logo span { color: var(--orange); }
        .footer-center { font-size: 12px; color: rgba(255,255,255,.3); text-align: center; }
        .footer-right { font-size: 12px; color: rgba(255,255,255,.25); letter-spacing: 1px; }
        .nav-hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 6px; background: none; border: none; }
        .nav-hamburger span { display: block; width: 24px; height: 2px; background: #fff; border-radius: 2px; transition: all .3s; }
        .nav-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nav-hamburger.open span:nth-child(2) { opacity: 0; }
        .nav-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .nav-mobile-menu { display: none; position: fixed; top: 56px; left: 0; right: 0; background: var(--dark2); z-index: 299; flex-direction: column; padding: 24px 24px 32px; border-bottom: 3px solid var(--orange); box-shadow: 0 8px 32px rgba(0,0,0,.5); }
        .nav-mobile-menu.open { display: flex; }
        .nav-mobile-menu a { color: rgba(255,255,255,.8); text-decoration: none; font-size: 15px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.07); transition: color .2s; }
        .nav-mobile-menu a:last-child { border-bottom: none; }
        .nav-mobile-menu a:hover, .nav-mobile-menu a.active { color: var(--orange); }
        .r { opacity: 0; transform: translateY(28px); transition: opacity .65s ease, transform .65s ease; }
        .r.on { opacity: 1; transform: none; }
        .r2 { opacity: 0; transform: translateY(28px); transition: opacity .65s ease .15s, transform .65s ease .15s; }
        .r2.on { opacity: 1; transform: none; }
        @media (max-width: 768px) {
          .cal-desktop { display: none !important; }
          .cal-mobile { display: block !important; margin-top: 24px !important; }
        }
        @media (min-width: 769px) {
          .cal-mobile { display: none !important; }
        }
        @media (max-width: 900px) {
          nav { padding: 0 20px; }
          .nav-links, .nav-date { display: none; }
          .nav-hamburger { display: flex; }
          .btn-nav { display: none; }
          .nav-mobile-menu .btn-nav { display: block; width: 100%; text-align: left; padding-left: 0; background: none; }
          nav { height: 56px; }
          .nav-logo-mark { width: 28px; height: 28px; font-size: 13px; }
          .nav-logo-text { font-size: 13px; letter-spacing: 0; }
          .nav-hamburger span { width: 20px; }
          .hero { min-height: 100dvh; }
          .hero-inner { grid-template-columns: 1fr; padding: 60px 20px 48px; gap: 0; width: 100%; box-sizing: border-box; }
          .hero-right { display: none; }
          .hero-title { font-size: clamp(28px, 7vw, 44px); }
          .hero-left { text-align: center; width: 100%; }
          .hero-sub { max-width: 100%; font-size: 14px; }
          .hero-badge { justify-content: center; }
          .hero-cd { justify-content: center; flex-wrap: nowrap; gap: 6px; width: 100%; }
          .hcd { min-width: 0; flex: 1; padding: 10px 8px; }
          .hcd-num { font-size: 20px; }
          .hcd-label { font-size: 7px; }
          .hero-btns { justify-content: center; flex-wrap: wrap; }
          .sec-h2-line { margin-left: auto; margin-right: auto; }
          section { padding-left: 24px !important; padding-right: 24px !important; }
          .setores-cards, .setores-grid, .consolid-inner, .consolid-steps, .paratodos-inner, .mapa-inner, .dep-grid { grid-template-columns: 1fr !important; }
          .sobre-inner { display: flex !important; flex-direction: column !important; gap: 32px !important; }
          .sec-sobre { padding: 64px 24px !important; }
          .sobre-img-wrap img { height: 220px; width: 100%; object-fit: cover; }
          .sobre-stat-top { position: static !important; flex-wrap: nowrap; margin-bottom: 20px; gap: 4px; width: 100%; }
          .sobre-stat-top .stat-badge { flex: 1; min-width: 0; padding: 10px 8px; }
          .evangelho-pilares { grid-template-columns: 1fr 1fr; gap: 12px; }
          .porque-stat-grid { grid-template-columns: 1fr 1fr; }
          .quem-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .mapa-detalhes { grid-template-columns: 1fr 1fr; gap: 10px; }
          .como-steps { grid-template-columns: 1fr 1fr; gap: 28px; }
          .como-step::after { display: none; }
          .sec-top-row { flex-direction: column; align-items: flex-start; gap: 16px; }
          .cta-banner-inner { grid-template-columns: 1fr; padding: 0; }
          .cta-box { padding: 48px 24px; }
          .cta-right-area { display: none; }
          .galeria-grid { grid-template-columns: 1fr 1fr; grid-template-rows: 220px 180px 180px; }
          .galeria-item--tall { grid-column: 1 / 3; grid-row: auto; height: 220px; }
          .sec-agenda { padding-top: 48px !important; }
          .sec-setores { padding-bottom: 48px !important; }
          .agenda-table-wrap { border-radius: 12px; overflow-x: auto; }
          .ag-table { min-width: 560px; }
          .ag-desc-td { display: none; }
          .paratodos-right { max-width: 280px; margin: 0 auto; }
          footer { padding: 24px 20px; flex-direction: column; gap: 10px; text-align: center; }
        }
        @media (max-width: 480px) {
          .evangelho-pilares { grid-template-columns: 1fr; }
          .quem-grid { grid-template-columns: 1fr; }
          .mapa-detalhes { grid-template-columns: 1fr; }
          .como-steps { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav>
        <a href="#" className="nav-logo">
          <img src="/logo.png" alt="Logo" style={{height:'28px', width:'auto'}} />
          <span className="nav-logo-text">Cruzada <span>Ibirité</span></span>
        </a>
        <ul className="nav-links">
          <li><a href="#a-cruzada">A Cruzada</a></li>
          <li><a href="#ibirite">Ibirité</a></li>
          <li><a href="#evangelho">Evangelho</a></li>
          <li><a href="#missao">Missão</a></li>
          <li><a href="#agenda">Agenda</a></li>
        </ul>
        <div className="nav-right">
          <button className="btn-nav">Entrar</button>
          <button className="nav-hamburger" id="nav-hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div id="custom-scroll"><div id="custom-scroll-thumb"></div></div>

      <div className="nav-mobile-menu" id="nav-mobile-menu">
        <a href="#a-cruzada">A Cruzada</a>
        <a href="#ibirite">Ibirité</a>
        <a href="#evangelho">Evangelho</a>
        <a href="#missao">Missão</a>
        <a href="#agenda">Agenda</a>
        <button className="btn-nav" id="btn-entrar-mobile" style={{marginTop:8}}>Entrar</button>
      </div>

      <section className="hero" id="inicio">
        <div className="hero-map"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">Uma cidade alcançada pelo Evangelho</div>
            <h1 className="hero-title">Alcançando<br /><span>toda Ibirité</span><br />com o Evangelho.</h1>
            <p className="hero-sub">De forma intencional, organizada e contínua, equipes percorrem cada bairro, rua e setor da cidade durante 9 dias intensos de missão.</p>
            {cruzadaComecou ? (
              <div className="hero-cd">
                <p style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, color: '#F97310', margin: 0 }}>A Cruzada começou!</p>
              </div>
            ) : (
              <div className="hero-cd">
                <div className="hcd"><div className="hcd-num" id="cd-dias">00</div><div className="hcd-label">Dias</div></div>
                <div className="hcd"><div className="hcd-num" id="cd-horas">00</div><div className="hcd-label">Horas</div></div>
                <div className="hcd"><div className="hcd-num" id="cd-min">00</div><div className="hcd-label">Min</div></div>
                <div className="hcd"><div className="hcd-num" id="cd-seg">00</div><div className="hcd-label">Seg</div></div>
              </div>
            )}
          </div>
          <div className="hero-right">
            <div className="hero-circle-wrap">
              <div className="hero-circle-bg"></div>
              <div className="hero-circle-img">
                <img src="/f2.jpeg" alt="Ibirité" />
              </div>
              <div className="hero-img-badge">9 Dias de Missão</div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec-evangelho" id="a-cruzada">
        <div className="evangelho-inner r">
          <span className="sec-eyebrow" style={{color:'var(--orange)'}}>A mensagem central</span>
          <h2 className="sec-h2">O que é o <span>Evangelho?</span><span className="sec-h2-line"></span></h2>
          <p className="evangelho-desc">Evangelho significa <strong>Boa Notícia</strong>. A melhor notícia que o mundo já ouviu: Deus amou tanto a humanidade que enviou Seu Filho Jesus Cristo para morrer no lugar de cada pessoa, pagar o preço do pecado e ressuscitar ao terceiro dia, oferecendo perdão, vida nova e a eternidade a todo aquele que crê.</p>
          <blockquote className="evangelho-quote">"Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo o que nele crê não pereça, mas tenha a vida eterna."<cite>João 3:16</cite></blockquote>
          <div className="evangelho-pilares">
            <div className="ep-item"><div className="ep-num">1</div><div className="ep-text"><strong>Todos pecaram</strong> e estão separados de Deus<br /><span className="ep-ref">Romanos 3:23</span></div></div>
            <div className="ep-item"><div className="ep-num">2</div><div className="ep-text"><strong>Cristo morreu</strong> por nossos pecados<br /><span className="ep-ref">1 Coríntios 15:3-4</span></div></div>
            <div className="ep-item"><div className="ep-num">3</div><div className="ep-text"><strong>"Ide e pregai</strong> o Evangelho a toda criatura."<br /><span className="ep-ref">Marcos 16:15</span></div></div>
          </div>
        </div>
      </section>

      <section className="sec-o-que" id="o-que-fazemos">
        <div className="sec-top-row r">
          <div>
            <span className="sec-eyebrow">O que fazemos</span>
            <h2 className="sec-h2">Levamos o <span>Evangelho</span><br />a cada canto da cidade<span className="sec-h2-line"></span></h2>
          </div>
        </div>
        <div className="setores-cards r2">
          <div className="sc-card"><div className="sc-card-img"><img src="/oqf1.jpeg" alt="Casa em Casa" /><div className="sc-card-img-overlay"></div><div className="sc-badge">01</div></div><div className="sc-card-body"><div className="sc-card-title">Casa em Casa</div><div className="sc-card-desc">Duplas treinadas percorrem cada rua orando pelas famílias e compartilhando o Evangelho diretamente nos lares.</div></div></div>
          <div className="sc-card"><div className="sc-card-img"><img src="/oqf2.jpeg" alt="Praças e Ruas" /><div className="sc-card-img-overlay"></div><div className="sc-badge">02</div></div><div className="sc-card-body"><div className="sc-card-title">Praças & Ruas</div><div className="sc-card-desc">Louvor ao ar livre, pregação direta e oração por pessoas nas principais praças e espaços públicos de Ibirité.</div></div></div>
          <div className="sc-card"><div className="sc-card-img"><img src="/oqf3.jpeg" alt="Ação Social" /><div className="sc-card-img-overlay"></div><div className="sc-badge">03</div></div><div className="sc-card-body"><div className="sc-card-title">Ação Social</div><div className="sc-card-desc">O Evangelho na prática visitas a lares de idosos, abrigos, hospitais, escolas e casas de recuperação com cuidado real.</div></div></div>
        </div>
      </section>

      <section className="sec-como">
        <div className="como-inner">
          <div className="r" style={{textAlign:'center',marginBottom:60}}>
            <span className="sec-eyebrow">Na prática</span>
            <h2 className="sec-h2">Como funciona a <span>Cruzada?</span><span className="sec-h2-line" style={{margin:'14px auto 0'}}></span></h2>
          </div>
          <div className="como-steps r2">
            <div className="como-step"><div className="como-step-num">01</div><div className="como-step-line"></div><div className="como-step-title">Treinamento</div><div className="como-step-desc">Antes do início, todos os voluntários passam por um treinamento prático como compartilhar o Evangelho, como abordar pessoas e como registrar decisões.</div></div>
            <div className="como-step"><div className="como-step-num">02</div><div className="como-step-line"></div><div className="como-step-title">Divisão por Setores</div><div className="como-step-desc">A cidade é dividida em setores e bairros. Cada equipe recebe uma área específica para cobrir durante os 9 dias.</div></div>
            <div className="como-step"><div className="como-step-num">03</div><div className="como-step-line"></div><div className="como-step-title">Ação Diária</div><div className="como-step-desc">Todos os dias as equipes saem juntas para suas regiões visitando lares, orando pelas famílias, pregando nas praças.</div></div>
            <div className="como-step"><div className="como-step-num">04</div><div className="como-step-line"></div><div className="como-step-title">Registro de Decisões</div><div className="como-step-desc">Cada pessoa que aceita Jesus tem seus dados registrados. Nenhuma ovelha se perde cada uma é encaminhada a uma igreja local.</div></div>
            <div className="como-step"><div className="como-step-num">05</div><div className="como-step-line"></div><div className="como-step-title">Culto da Cruzada</div><div className="como-step-desc">No encerramento, toda a cidade é convidada para o grande culto final com louvor, pregação evangelística e apelo público.</div></div>
          </div>
        </div>
      </section>

      <section className="sec-porque" id="ibirite">
        <div className="porque-inner">
          <div className="porque-top r">
            <span className="sec-eyebrow">A visão</span>
            <h2 className="sec-h2">Por que <span>Ibirité?</span><span className="sec-h2-line"></span></h2>
            <p className="porque-desc">Ibirité é uma cidade com mais de 170 mil habitantes, situada na Região Metropolitana de Belo Horizonte, cheia de famílias, jovens, crianças e histórias que precisam ser alcançadas pelo Evangelho.</p>
            <p className="porque-desc">Durante anos, líderes e pastores de diferentes igrejas de Ibirité oraram juntos, sonharam juntos e buscaram a Deus por um mover genuíno na cidade. A Cruzada Ibirité 2026 é a resposta concreta a essa busca.</p>
            <p className="porque-desc">Não se trata apenas de um evento. É uma estratégia de missão integral, planejada com meses de antecedência, com equipes treinadas, setores definidos e um processo de consolidação estruturado.</p>
          </div>
          <div className="porque-stat-grid r2">
            <div className="psg-item"><div className="psg-num">170mil</div><div className="psg-label">Habitantes</div></div>
            <div className="psg-item"><div className="psg-num">9</div><div className="psg-label">Dias de missão</div></div>
            <div className="psg-item"><div className="psg-num">8+</div><div className="psg-label">Setores de atuação</div></div>
            <div className="psg-item"><div className="psg-num">100%</div><div className="psg-label">Cobertura da cidade</div></div>
          </div>
        </div>
      </section>

      <section className="sec-mapa">
        <div className="mapa-inner r">
          <div className="mapa-info">
            <span className="sec-eyebrow">Onde acontece</span>
            <h2 className="sec-h2">Ibirité, <span>Minas Gerais</span><span className="sec-h2-line"></span></h2>
            <p className="mapa-desc">A Cruzada acontece em toda a cidade de Ibirité nos bairros, ruas, praças, escolas e igrejas.</p>
            <div className="mapa-detalhes">
              <div className="mapa-detalhe-item"><div className="mapa-detalhe-label">Cidade</div><div className="mapa-detalhe-val">Ibirité, MG</div></div>
              <div className="mapa-detalhe-item"><div className="mapa-detalhe-label">Período</div><div className="mapa-detalhe-val">27 Jun a 05 Jul · 2026</div></div>
              <div className="mapa-detalhe-item"><div className="mapa-detalhe-label">Abertura</div><div className="mapa-detalhe-val">27 de Junho · Sábado</div></div>
              <div className="mapa-detalhe-item"><div className="mapa-detalhe-label">Encerramento</div><div className="mapa-detalhe-val">05 de Julho · Domingo</div></div>
            </div>
          </div>
          <div className="mapa-embed">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d58996.59!2d-44.0591!3d-20.0217!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa699a5f70c8a1f%3A0x8e9b5c7f6c8a1f!2sIbirit%C3%A9%2C%20MG!5e0!3m2!1spt-BR!2sbr!4v1" width="100%" height="100%" style={{border:0}} allowFullScreen loading="lazy" title="Mapa Ibirité"></iframe>
          </div>
        </div>
      </section>

      <section className="sec-galeria">
        <div className="r" style={{textAlign:'center',marginBottom:52,padding:'0 72px'}}>
          <span className="sec-eyebrow">Ibirité em imagens</span>
          <h2 className="sec-h2">A cidade que <span>vamos alcançar</span><span className="sec-h2-line" style={{margin:'14px auto 0'}}></span></h2>
        </div>
        <div className="galeria-grid r2">
          <div className="galeria-item galeria-item--tall"><img src="/gal1.png" alt="Cidade" /><div className="galeria-overlay"><span>Ibirité, MG</span></div></div>
          <div className="galeria-item"><img src="/gal2.jpeg" alt="Evangelismo" /><div className="galeria-overlay"><span>Evangelismo nas ruas</span></div></div>
          <div className="galeria-item"><img src="/gal3.jpeg" alt="Ação Social" /><div className="galeria-overlay"><span>Ação Social</span></div></div>
          <div className="galeria-item"><img src="/gal4.jpeg" alt="Culto" /><div className="galeria-overlay"><span>Culto da Cruzada</span></div></div>
          <div className="galeria-item"><img src="/gal5.jpeg" alt="Missão" /><div className="galeria-overlay"><span>Missão em Campo</span></div></div>
        </div>
      </section>

      <section className="sec-paratodos" id="evangelho">
        <div className="paratodos-inner">
          <div className="paratodos-left r">
            <span className="sec-eyebrow">A vontade de Deus</span>
            <h2 className="sec-h2">O Evangelho é<br /><span>para todos.</span><span className="sec-h2-line"></span></h2>
            <p className="paratodos-desc">Não existe pessoa fora do alcance do amor de Deus. Não importa o passado, a origem, os erros cometidos o Evangelho de Jesus Cristo é uma mensagem de perdão, restauração e vida nova para cada ser humano.</p>
            <p className="paratodos-desc">Jesus morreu na cruz não apenas pelos religiosos mas por todos, sem exceção. O ladrão na cruz, a mulher adúltera, o cobrador de impostos: todos encontraram graça diante de Jesus.</p>
            <blockquote className="paratodos-quote">"Deus quer que todos os homens sejam salvos e cheguem ao pleno conhecimento da verdade."<cite>1 Timóteo 2:4</cite></blockquote>
          </div>
          <div className="paratodos-right r2">
            <img src="/ev1.jpg" alt="Evangelho para todos" />
          </div>
        </div>
      </section>

      <section className="sec-oracao">
        <div className="oracao-inner r">
          <span className="sec-eyebrow">Junte-se em oração</span>
          <h2 className="oracao-title">Ore pela <span>Cruzada Ibirité 2026</span></h2>
          <p className="oracao-desc">A oração é o alicerce de tudo. Antes de qualquer ação, antes de qualquer equipe sair às ruas é a oração que prepara o coração das pessoas e abre portas que nenhum homem pode abrir.</p>
          <div className="oracao-pontos">
            <div className="oracao-ponto"><div className="oracao-ponto-dot"></div><div>Ore pela <strong>unidade das igrejas</strong> e dos líderes envolvidos</div></div>
            <div className="oracao-ponto"><div className="oracao-ponto-dot"></div><div>Ore pelo <strong>coração das pessoas</strong> de Ibirité</div></div>
            <div className="oracao-ponto"><div className="oracao-ponto-dot"></div><div>Ore pela <strong>proteção e vigor</strong> de cada voluntário durante os 9 dias</div></div>
            <div className="oracao-ponto"><div className="oracao-ponto-dot"></div><div>Ore por uma <strong>colheita abundante</strong> e por frutos que permaneçam</div></div>
          </div>
          <blockquote className="oracao-verse">"Se o meu povo, que se chama pelo meu nome, se humilhar, e orar, e buscar a minha face, e se converter dos seus maus caminhos, então eu ouvirei dos céus, e perdoarei os seus pecados, e sararei a sua terra."<cite>2 Crônicas 7:14</cite></blockquote>
        </div>
      </section>

      <section className="sec-sobre" id="missao">
        <div className="sobre-inner">
          <div className="sobre-left r">
            <span className="sec-eyebrow">Sobre a Missão</span>
            <h2 className="sec-h2">A missão que vai<br /><span>transformar Ibirité.</span><span className="sec-h2-line"></span></h2>
            <div className="sobre-list">
              <div className="sobre-item"><div className="sobre-item-dot">1</div><div className="sobre-item-body"><div className="sobre-item-title">Unidade das Igrejas</div><div className="sobre-item-desc">Diferentes denominações unidas por um único propósito alcançar toda Ibirité com o Evangelho.</div></div></div>
              <div className="sobre-item"><div className="sobre-item-dot">2</div><div className="sobre-item-body"><div className="sobre-item-title">Evangelismo Diário</div><div className="sobre-item-desc">Ação contínua nos 9 dias com equipes atuando simultaneamente em todos os setores da cidade.</div></div></div>
              <div className="sobre-item"><div className="sobre-item-dot">3</div><div className="sobre-item-body"><div className="sobre-item-title">Colheita e Consolidação</div><div className="sobre-item-desc">Cada decisão registrada, acompanhada em 48h, encaminhada para uma igreja e discipulada.</div></div></div>
            </div>
          </div>
          <div className="sobre-right r2">
            <div className="sobre-stat-top">
              <div className="stat-badge"><div className="stat-badge-num">9</div><div className="stat-badge-label">Dias de<br />Missão</div></div>
              <div className="stat-badge alt"><div className="stat-badge-num">8+</div><div className="stat-badge-label">Setores de<br />Atuação</div></div>
              <div className="stat-badge"><div className="stat-badge-num">24h</div><div className="stat-badge-label">Prazo de<br />Consolidação</div></div>
            </div>
            <div className="sobre-img-wrap">
              <img src="/missao1.jpeg" alt="Missão" />
            </div>
          </div>
        </div>
      </section>

      <section className="sec-setores" id="setores">
        <div className="r">
          <span className="sec-eyebrow">Estrutura Geral</span>
          <h2 className="sec-h2">Todos os <span>Setores</span> da Cruzada<span className="sec-h2-line"></span></h2>
        </div>
        <div className="setores-grid r2">
          <div className="sg-card"><div className="sg-num">01</div><div className="sg-title">Mapeamento</div><ul className="sg-items"><li>Base estratégica da cruzada</li><li>Divisão por bairros e regiões</li><li>Cobertura de todas as ruas</li><li>Direcionamento das ações</li><li>Ações simultâneas coordenadas</li></ul></div>
          <div className="sg-card"><div className="sg-num">02</div><div className="sg-title">Casa em Casa</div><ul className="sg-items"><li>Evangelismo direto nos lares</li><li>Duplas treinadas e orientadas</li><li>Oração pelas famílias</li><li>Convite para os cultos</li><li>Coleta e registro de contatos</li></ul></div>
          <div className="sg-card"><div className="sg-num">03</div><div className="sg-title">Escolas</div><ul className="sg-items"><li>Alcance de jovens e famílias</li><li>Palestras nas escolas</li><li>Conexão com alunos</li><li>Convite para a cruzada</li><li>Distribuição de material</li></ul></div>
          <div className="sg-card"><div className="sg-num">04</div><div className="sg-title">Ônibus</div><ul className="sg-items"><li>Evangelismo de fluxo urbano</li><li>Abordagem rápida e respeitosa</li><li>Palavra curta e objetiva</li><li>Convites para os cultos</li><li>Horários de maior movimento</li></ul></div>
          <div className="sg-card"><div className="sg-num">05</div><div className="sg-title">Praças & Ruas</div><ul className="sg-items"><li>Evangelho público e visível</li><li>Louvor ao ar livre</li><li>Pregação direta ao público</li><li>Oração por pessoas no local</li></ul></div>
          <div className="sg-card"><div className="sg-num">06</div><div className="sg-title">Cultos & Igrejas</div><ul className="sg-items"><li>Unidade visível do corpo</li><li>Cultos evangelísticos na semana</li><li>Igrejas parceiras envolvidas</li><li>Mobilização de voluntários</li></ul></div>
          <div className="sg-card"><div className="sg-num">07</div><div className="sg-title">Ação Social</div><ul className="sg-items"><li>Lar de idosos</li><li>Abrigo de crianças e adolescentes</li><li>Casa de recuperação</li><li>Hospital</li><li>Atendimento básico</li></ul></div>
          <div className="sg-card" style={{borderTopColor:'var(--orange)'}}><div className="sg-num" style={{color:'rgba(249,115,22,.4)'}}>08</div><div className="sg-title" style={{color:'var(--orange)'}}>Culto da Cruzada</div><ul className="sg-items"><li>Grande colheita final</li><li>Louvor</li><li>Palavra evangelística</li><li>Apelo organizado</li><li>Consolidação imediata</li></ul></div>
          <div className="sg-card"><div className="sg-num">09</div><div className="sg-title">Consolidação</div><ul className="sg-items"><li>Após a decisão, começa o cuidado</li><li>Contato em até 48h</li><li>Encaminhamento para igrejas</li><li>Discipulado contínuo</li><li>Permanência dos frutos</li></ul></div>
        </div>
      </section>

      <section className="sec-agenda" id="agenda">
        <div className="r">
          <span className="sec-eyebrow">Programação Oficial</span>
          <h2 className="sec-h2">Nossa <span>Agenda</span><span className="sec-h2-line"></span></h2>
        </div>
        {/* Modal dia */}
        {calDiaSelecionado && (
          <div onClick={() => { setCalDiaSelecionado(null); setCalEventoAberto(null) }} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
            <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:'16px',width:'100%',maxWidth:'440px',padding:'32px',position:'relative',maxHeight:'80vh',overflowY:'auto'}}>
              <button onClick={() => { setCalDiaSelecionado(null); setCalEventoAberto(null) }} style={{position:'absolute',top:'16px',right:'16px',background:'#f3f4f6',border:'none',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',fontSize:'14px',fontWeight:700}}>✕</button>
              {calEventoAberto ? (
                // Tela de detalhe do evento
                <>
                  <button onClick={() => setCalEventoAberto(null)} style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',cursor:'pointer',color:'#F97310',fontWeight:700,fontSize:'13px',marginBottom:'20px',padding:0,fontFamily:'inherit'}}>
                    ← Voltar
                  </button>
                  {(() => {
                    const ev = calDiaSelecionado.evsDia.find(e => e.id === calEventoAberto)
                    if (!ev) return null
                    return (
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px',paddingBottom:'16px',borderBottom:'1.5px solid #f3f4f6'}}>
                          <div style={{width:'12px',height:'12px',borderRadius:'50%',background:ev.cor||'#F97310',flexShrink:0}}/>
                          <h3 style={{fontSize:'18px',fontWeight:800,color:'#0f1117',margin:0}}>{ev.titulo}</h3>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                          <div style={{display:'flex',gap:'10px'}}><span style={{fontSize:'13px',color:'#9ca3af',fontWeight:700,minWidth:'90px'}}>Horário</span><span style={{fontSize:'13px',color:'#0f1117',fontWeight:600}}>{ev.hora_inicio?.slice(0,5)} – {ev.hora_fim?.slice(0,5)||'—'}</span></div>
                          {ev.local && <div style={{display:'flex',gap:'10px'}}><span style={{fontSize:'13px',color:'#9ca3af',fontWeight:700,minWidth:'90px'}}>Local</span><span style={{fontSize:'13px',color:'#0f1117',fontWeight:600}}>{ev.local}</span></div>}
                          {ev.equipe && <div style={{display:'flex',gap:'10px'}}><span style={{fontSize:'13px',color:'#9ca3af',fontWeight:700,minWidth:'90px'}}>Equipe</span><span style={{fontSize:'13px',color:'#0f1117',fontWeight:600}}>{ev.equipe}</span></div>}
                          {ev.descricao && <div style={{display:'flex',gap:'10px'}}><span style={{fontSize:'13px',color:'#9ca3af',fontWeight:700,minWidth:'90px'}}>Observações</span><span style={{fontSize:'13px',color:'#0f1117',fontWeight:600}}>{ev.descricao}</span></div>}
                        </div>
                      </div>
                    )
                  })()}
                </>
              ) : (
                // Tela de lista
                <>
                  <div style={{marginBottom:'20px',paddingBottom:'16px',borderBottom:'2px solid #F97310'}}>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'1px'}}>{DIAS_SEMANA_CURTO[calDiaSelecionado.diaObj.getDay()]}</div>
                    <div style={{fontSize:'28px',fontWeight:900,color:'#0f1117',lineHeight:1.1}}>{calDiaSelecionado.diaObj.getDate()} de {MESES_FULL[calDiaSelecionado.diaObj.getMonth()]} · {calDiaSelecionado.diaObj.getFullYear()}</div>
                    <div style={{fontSize:'13px',color:'#9ca3af',marginTop:'4px'}}>{calDiaSelecionado.evsDia.length} evento{calDiaSelecionado.evsDia.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column'}}>
                    {calDiaSelecionado.evsDia.map((ev, idx) => (
                      <div key={ev.id} onClick={() => setCalEventoAberto(ev.id)}
                        style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom: idx < calDiaSelecionado.evsDia.length - 1 ? '1px solid #f3f4f6' : 'none',cursor:'pointer'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:ev.cor||'#F97310',flexShrink:0}}/>
                          <span style={{fontSize:'14px',fontWeight:700,color:'#0f1117'}}>{ev.titulo}</span>
                        </div>
                        <span style={{fontSize:'13px',fontWeight:700,color:'#F97310',whiteSpace:'nowrap',marginLeft:'16px'}}>{ev.hora_inicio?.slice(0,5)} – {ev.hora_fim?.slice(0,5)||'—'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Vista mobile do calendário */}
        {(() => {
          const hoje = new Date()
          const MESES_EXT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
          const evsDia = eventos.filter(e => new Date(e.data+'T00:00:00').toDateString() === mobileDiaSel.toDateString()).sort((a,b) => (a.hora_inicio||'').localeCompare(b.hora_inicio||''))
          const ehHoje = mobileDiaSel.toDateString() === hoje.toDateString()

          function DiasGrid() {
            const LETRAS = ['D','S','T','Q','Q','S','S']
            let celulas = []
            if (mobileView === 'semana') {
              const ini = new Date(mobileDiaSel)
              ini.setDate(ini.getDate() - ini.getDay())
              celulas = Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(d.getDate() + i); return d })
            } else {
              const mA = mobileDiaSel.getMonth()
              const aA = mobileDiaSel.getFullYear()
              const primeiroDia = new Date(aA, mA, 1).getDay()
              const diasNoMes = new Date(aA, mA + 1, 0).getDate()
              const total = Math.ceil((primeiroDia + diasNoMes) / 7) * 7
              celulas = Array.from({ length: total }, (_, i) => {
                const diaNum = i - primeiroDia + 1
                return (diaNum >= 1 && diaNum <= diasNoMes) ? new Date(aA, mA, diaNum) : null
              })
            }
            const rows = []
            for (let i = 0; i < celulas.length; i += 7) rows.push(celulas.slice(i, i + 7))
            return (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:'4px'}}>
                  {LETRAS.map((l,i) => <div key={i} style={{textAlign:'center',fontSize:'11px',fontWeight:700,color:'#9ca3af',padding:'4px 0'}}>{l}</div>)}
                </div>
                {rows.map((row, ri) => (
                  <div key={ri} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
                    {row.map((d, di) => {
                      if (!d) return <div key={di} />
                      const sel = d.toDateString() === mobileDiaSel.toDateString()
                      const dHoje = d.toDateString() === hoje.toDateString()
                      const temEv = eventos.some(e => new Date(e.data+'T00:00:00').toDateString() === d.toDateString())
                      return (
                        <div key={di} onClick={() => setMobileDiaSel(new Date(d))} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',padding:'4px 0'}}>
                          <div style={{width:'34px',height:'34px',borderRadius:'50%',background:sel?'#F97310':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:'15px',fontWeight:900,color:sel?'#fff':dHoje?'#F97310':'#374151'}}>{d.getDate()}</span>
                          </div>
                          <div style={{width:'5px',height:'5px',borderRadius:'50%',background:temEv?'#F97310':'transparent'}} />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          }

          return (
            <div className="cal-mobile r2" style={{display:'none',marginTop:'52px'}}>
              {/* Header */}
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'16px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'12px'}}>
                  <button onClick={() => setMobileDiaSel(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n })} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#9ca3af',lineHeight:1,padding:0}}>‹</button>
                  <span style={{fontSize:'18px',fontWeight:900,color:'#0f1117',textTransform:'capitalize',minWidth:'160px',textAlign:'center'}}>{MESES_EXT[mobileDiaSel.getMonth()]} {mobileDiaSel.getFullYear()}</span>
                  <button onClick={() => setMobileDiaSel(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n })} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#9ca3af',lineHeight:1,padding:0}}>›</button>
                </div>
                <div style={{display:'flex',background:'#f3f4f6',borderRadius:'10px',padding:'3px',gap:'2px'}}>
                  {[['semana','Semana'],['mes','Mês']].map(([v,l]) => (
                    <button key={v} onClick={() => setMobileView(v)} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:700,background:mobileView===v?'#fff':'transparent',color:mobileView===v?'#F97310':'#6b7280',boxShadow:mobileView===v?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Grade */}
              <div style={{background:'#fff',borderRadius:'12px',padding:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',marginBottom:'16px'}}>
                <DiasGrid />
              </div>

              {/* Eventos do dia */}
              <div style={{background:'#fff',borderRadius:'12px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                <div style={{fontSize:'15px',fontWeight:900,color:ehHoje?'#F97310':'#0f1117',marginBottom:'16px',paddingBottom:'12px',borderBottom:'1.5px solid #f3f4f6'}}>
                  {mobileDiaSel.getDate()} de {MESES_EXT[mobileDiaSel.getMonth()]}{ehHoje?' · Hoje':''}
                </div>
                {evsDia.length === 0 ? (
                  <p style={{fontSize:'14px',color:'#9ca3af',textAlign:'center',padding:'16px 0',margin:0}}>Nenhum evento neste dia.</p>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    {evsDia.map(ev => (
                      <div key={ev.id} onClick={() => setCalDiaSelecionado({ diaObj: mobileDiaSel, evsDia, _abrir: ev.id })} style={{display:'flex',gap:'12px',cursor:'pointer',alignItems:'flex-start'}}>
                        <div style={{width:'44px',flexShrink:0}}>
                          <div style={{fontSize:'13px',fontWeight:700,color:'#374151'}}>{ev.hora_inicio?.slice(0,5)}</div>
                          {ev.hora_fim && <div style={{fontSize:'11px',color:'#9ca3af'}}>{ev.hora_fim?.slice(0,5)}</div>}
                        </div>
                        <div style={{flex:1,display:'flex',borderRadius:'8px',overflow:'hidden',border:'1px solid #f3f4f6'}}>
                          <div style={{width:'4px',background:ev.cor||'#F97310',flexShrink:0}} />
                          <div style={{flex:1,padding:'8px 12px'}}>
                            <div style={{fontSize:'14px',fontWeight:800,color:'#0f1117'}}>{ev.titulo}</div>
                            {ev.local && <div style={{fontSize:'12px',color:'#6b7280',marginTop:'2px'}}>{ev.local}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Calendário mensal — desktop */}
        <div className="cal-desktop r2" style={{marginTop:'52px'}}>
          {/* Toolbar */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <button onClick={() => setCalMes(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} style={{width:'36px',height:'36px',border:'1.5px solid #e5e7eb',borderRadius:'8px',background:'#fff',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
              <button onClick={() => setCalMes(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} style={{width:'36px',height:'36px',border:'1.5px solid #e5e7eb',borderRadius:'8px',background:'#fff',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
              <span style={{fontSize:'20px',fontWeight:900,color:'#0f1117'}}>{MESES_FULL[calMes.getMonth()]} {calMes.getFullYear()}</span>
            </div>
            <button onClick={() => setCalMes(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} style={{border:'2px solid #F97310',color:'#F97310',background:'none',fontWeight:700,fontSize:'13px',padding:'6px 16px',borderRadius:'8px',cursor:'pointer',fontFamily:'inherit'}}>Hoje</button>
          </div>

          {/* Grade */}
          <div style={{background:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
            {/* Cabeçalho dias da semana */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'2px solid #F97310'}}>
              {DIAS_SEMANA_CURTO.map(d => (
                <div key={d} style={{padding:'12px 0',textAlign:'center',fontSize:'12px',fontWeight:800,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.5px'}}>{d}</div>
              ))}
            </div>
            {/* Células */}
            {(() => {
              const hoje = new Date()
              const ano = calMes.getFullYear()
              const mes = calMes.getMonth()
              const primeiroDia = new Date(ano, mes, 1).getDay()
              const diasNoMes = new Date(ano, mes+1, 0).getDate()
              const totalCelulas = Math.ceil((primeiroDia + diasNoMes) / 7) * 7
              const celulas = []
              for (let i = 0; i < totalCelulas; i++) {
                const diaNum = i - primeiroDia + 1
                const valido = diaNum >= 1 && diaNum <= diasNoMes
                const diaObj = valido ? new Date(ano, mes, diaNum) : null
                const ehHoje = diaObj && diaObj.toDateString() === hoje.toDateString()
                const evsDia = valido ? eventos.filter(e => {
                  const ed = new Date(e.data + 'T00:00:00')
                  return ed.getFullYear()===ano && ed.getMonth()===mes && ed.getDate()===diaNum
                }) : []
                celulas.push({ diaNum, valido, ehHoje, evsDia, i })
              }
              return (
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
                  {celulas.map((c, idx) => (
                    <div key={idx} style={{minHeight:'100px',borderRight:(idx+1)%7===0?'none':'1px solid #f3f4f6',borderBottom:idx<celulas.length-7?'1px solid #f3f4f6':'none',padding:'8px',background:c.valido?'#fff':'#fafafa'}}>
                      {c.valido && (
                        <div style={{cursor: c.evsDia.length > 0 ? 'pointer' : 'default', height:'100%'}}
                          onClick={() => c.evsDia.length > 0 && setCalDiaSelecionado({ diaObj: new Date(ano, mes, c.diaNum), evsDia: c.evsDia })}>
                          <div style={{width:'28px',height:'28px',borderRadius:'50%',background:c.ehHoje?'#F97310':'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'4px'}}>
                            <span style={{fontSize:'13px',fontWeight:c.ehHoje?900:600,color:c.ehHoje?'#fff':'#374151'}}>{c.diaNum}</span>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                            {c.evsDia.slice(0,3).map(ev => (
                              <div key={ev.id} style={{fontSize:'11px',fontWeight:700,color:ev.cor==='#ffffff'?'#0f1117':'#fff',background:ev.cor||'#F97310',borderRadius:'4px',padding:'2px 6px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                                {ev.hora_inicio?.slice(0,5)} {ev.titulo}
                              </div>
                            ))}
                            {c.evsDia.length > 3 && <div style={{fontSize:'10px',color:'#9ca3af',fontWeight:700}}>+{c.evsDia.length - 3} mais</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-logo">Cruzada <span>Ibirité</span></div>
        <div className="footer-center">© 2026 · Uma cidade alcançada pelo Evangelho · Ibirité, MG</div>
        <div className="footer-right">27 Jun – 05 Jul · 2026</div>
      </footer>
    </>
  )
}
