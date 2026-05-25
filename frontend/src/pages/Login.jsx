import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const mobileStyle = `
  @media (max-width: 768px) {
    .login-left { display: none !important; }
    .login-page { grid-template-columns: 1fr !important; }
    .login-right {
      background: #fff !important;
      border-left: none !important;
    }
    .login-form-title { color: #1a1d27 !important; }
    .login-form-sub { color: #9ca3af !important; }
    .login-label { color: #374151 !important; }
    .login-input-wrap {
      background: #f9fafb !important;
      border-color: #e5e7eb !important;
    }
    .login-input-wrap input { color: #1a1d27 !important; background: transparent !important; }
    .login-input-wrap input::placeholder { color: #9ca3af !important; }
    .login-back-link { color: #9ca3af !important; }
    .login-or-line { background: #e5e7eb !important; }
    .login-or-text { color: #9ca3af !important; }
    .login-mobile-logo {
      display: flex !important;
    }
  }
`

const VERSES = [
  { text: '"Ide por todo o mundo e pregai o Evangelho a toda criatura."', ref: 'Marcos 16:15' },
  { text: '"A colheita é grande, mas os trabalhadores são poucos."', ref: 'Lucas 10:2' },
  { text: '"Como crerão naquele de quem não ouviram? E como ouvirão sem que haja quem pregue?"', ref: 'Romanos 10:14' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [verseIdx, setVerseIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const iv = setInterval(() => {
      setFade(false)
      setTimeout(() => { setVerseIdx(i => (i + 1) % VERSES.length); setFade(true) }, 500)
    }, 6000)
    return () => clearInterval(iv)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch {
      setError('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setForgotMsg('Se este e-mail estiver cadastrado, você receberá as instruções em breve.')
  }

  const verse = VERSES[verseIdx]

  return (
    <div style={s.page} className="login-page">
      <style>{mobileStyle}</style>

      {/* ESQUERDO — tela cheia com imagem */}
      <div style={s.left} className="login-left">
        <div style={s.leftBg} />
        <div style={s.leftOverlay} />

        <div style={s.leftInner}>
          {/* Logo */}
          <a href="/" style={s.logo}>
            <img src="/logo1.png" alt="Logo" style={{height:'34px', width:'auto'}} />
            <span style={s.logoText}>Cruzada <span style={{color:'#F97310'}}>Ibirité</span></span>
          </a>

          {/* Versículo */}
          <div style={s.verseArea}>
            <div style={s.verseCard}>
              <div style={s.verseCardLine} />
              <div style={{opacity: fade ? 1 : 0, transform: fade ? 'none' : 'translateY(10px)', transition: 'all 0.5s ease'}}>
                <p style={s.verseText}>{verse.text}</p>
                <span style={s.verseRef}>{verse.ref}</span>
              </div>
              <div style={s.verseDots}>
                {VERSES.map((_, i) => (
                  <button key={i} onClick={() => setVerseIdx(i)} style={{...s.dot, width: i === verseIdx ? '20px' : '6px', background: i === verseIdx ? '#F97310' : 'rgba(255,255,255,0.3)'}} />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={s.leftBottom}>
            <span style={s.leftBottomText}>27 jun — 5 jul · 2026 · Ibirité, MG</span>
          </div>
        </div>
      </div>

      {/* DIREITO — formulário */}
      <div style={s.right} className="login-right">
        <div style={s.rightInner} className="login-right-inner">

          {/* Logo visível só no mobile */}
          <div style={s.mobileLogo} className="login-mobile-logo">
            <img src="/logo1.png" alt="Logo" style={{height:'34px', width:'auto'}} />
            <span style={{...s.logoText, color: '#1a1d27'}}>Cruzada <span style={{color:'#F97310'}}>Ibirité</span></span>
          </div>

          {!showForgot ? (
            <>
              <div style={s.formTop}>
                <div style={s.formTopIcon}>
                  <img src="/logo1.png" alt="Logo" style={{height:'48px', width:'auto'}} />
                </div>
                <h1 style={s.formTitle} className="login-form-title">Bem-vindo</h1>
                <p style={s.formSub} className="login-form-sub">Entre com sua conta para acessar a plataforma da Cruzada</p>
              </div>

              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.field}>
                  <label style={s.label} className="login-label">E-mail</label>
                  <div style={s.inputWrap} className="login-input-wrap">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      style={{...s.input, padding: '12px 14px'}}
                      onFocus={e => e.target.parentNode.style.borderColor = '#F97310'}
                      onBlur={e => e.target.parentNode.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>

                <div style={s.field}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <label style={s.label}>Senha</label>
                    <button type="button" onClick={() => setShowForgot(true)} style={s.forgotLink}>Esqueci a senha</button>
                  </div>
                  <div style={s.inputWrap} className="login-input-wrap">
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      style={{...s.input, padding: '12px 14px'}}
                      onFocus={e => e.target.parentNode.style.borderColor = '#F97310'}
                      onBlur={e => e.target.parentNode.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>

                {error && <p style={s.error}>{error}</p>}

                <button type="submit" disabled={loading} style={{...s.btn, opacity: loading ? 0.75 : 1}}>
                  <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                  {!loading && <span style={s.btnArrow}>→</span>}
                </button>
              </form>

              <div style={s.orRow}>
                <div style={s.orLine}/><span style={s.orText}>não tem acesso?</span><div style={s.orLine}/>
              </div>

              <a href="/cadastro-voluntario" style={s.btnOutline}>Quero fazer parte</a>

              <a href="/" style={s.backLink} className="login-back-link">← Voltar ao site</a>
            </>
          ) : (
            <>
              <div style={s.formTop}>
                <div style={s.formTopIcon}>
                  <div style={s.formTopIconMark}>?</div>
                </div>
                <h1 style={s.formTitle}>Recuperar senha</h1>
                <p style={s.formSub}>Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
              </div>

              <form onSubmit={handleForgot} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>E-mail</label>
                  <div style={s.inputWrap}>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      style={{...s.input, padding: '12px 14px'}}
                      onFocus={e => e.target.parentNode.style.borderColor = '#F97310'}
                      onBlur={e => e.target.parentNode.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>
                {forgotMsg && <p style={s.success}>{forgotMsg}</p>}
                <button type="submit" style={s.btn}><span>Enviar instruções</span></button>
              </form>

              <button onClick={() => { setShowForgot(false); setForgotMsg('') }} style={s.backLoginBtn}>
                ← Voltar ao login
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  )
}

const s = {
  page: {
    display: 'grid',
    gridTemplateColumns: '55% 45%',
    minHeight: '100vh',
    fontFamily: "'Nunito', sans-serif",
  },

  /* ESQUERDO */
  left: {
    position: 'relative',
    overflow: 'hidden',
  },
  leftBg: {
    position: 'absolute',
    inset: 0,
    background: `url('/login1.jpeg') center/cover no-repeat`,
  },
  leftOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
  },
  leftInner: {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px 52px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logoMark: {
    width: '34px',
    height: '34px',
    background: '#F97310',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 900,
    color: '#fff',
    clipPath: 'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
  },
  logoText: {
    fontSize: '14px',
    fontWeight: 900,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  verseArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  verseCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  verseCardLine: {
    width: '40px',
    height: '4px',
    background: '#F97310',
    borderRadius: '2px',
  },
  verseText: {
    fontSize: 'clamp(24px, 2.5vw, 38px)',
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.3,
    margin: '0 0 12px',
    letterSpacing: '-0.5px',
    maxWidth: '520px',
  },
  verseRef: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#F97310',
    letterSpacing: '3px',
    textTransform: 'uppercase',
  },
  verseDots: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  dot: {
    height: '6px',
    borderRadius: '3px',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.4s ease',
  },
  leftBottom: {
    display: 'flex',
    alignItems: 'center',
  },
  leftBottomText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '1px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },

  /* DIREITO */
  right: {
    background: '#fafafa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
    borderLeft: '1px solid #efefef',
  },
  rightInner: {
    width: '100%',
    maxWidth: '360px',
  },
  formTop: {
    marginBottom: '36px',
    textAlign: 'center',
  },
  formTopIcon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  formTopIconMark: {
    width: '52px',
    height: '52px',
    background: 'linear-gradient(135deg, #F97310, #fb923c)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 900,
    color: '#fff',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(249,115,16,0.35)',
  },
  formTitle: {
    fontSize: '26px',
    fontWeight: 900,
    color: '#1a1d27',
    margin: '0 0 6px',
  },
  formSub: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    background: '#fff',
    border: '1.5px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  inputIcon: {
    padding: '0 12px',
    fontSize: '14px',
    color: '#9ca3af',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '12px 14px 12px 0',
    fontSize: '14px',
    color: '#1a1d27',
    fontFamily: "'Nunito', sans-serif",
    outline: 'none',
    width: '100%',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    color: '#F97310',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    padding: 0,
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    margin: 0,
  },
  success: {
    color: '#16a34a',
    fontSize: '13px',
    background: 'rgba(22,163,74,0.06)',
    border: '1px solid rgba(22,163,74,0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    margin: 0,
  },
  btn: {
    background: 'linear-gradient(135deg, #F97310, #fb923c)',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    padding: '14px 24px',
    fontSize: '13px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    width: '100%',
    marginTop: '4px',
    boxShadow: '0 6px 24px rgba(249,115,16,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  btnArrow: {
    fontSize: '16px',
    fontWeight: 900,
  },
  orRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '20px 0',
  },
  orLine: {
    flex: 1,
    height: '1px',
    background: '#e5e7eb',
  },
  orText: {
    fontSize: '11px',
    color: '#9ca3af',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  btnOutline: {
    display: 'block',
    textAlign: 'center',
    border: '2px solid #F97310',
    color: '#F97310',
    borderRadius: '50px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  backLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '12px',
    color: '#9ca3af',
    textDecoration: 'none',
    fontWeight: 600,
  },
  mobileLogo: {
    display: 'none',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
    justifyContent: 'center',
  },
  backLoginBtn: {
    marginTop: '20px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    padding: 0,
    display: 'block',
    width: '100%',
    textAlign: 'center',
  },
}
