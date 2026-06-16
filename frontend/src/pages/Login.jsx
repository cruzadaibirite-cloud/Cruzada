import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

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
  const [showRegister, setShowRegister] = useState(false)
  const [showEncerrado, setShowEncerrado] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [regNome, setRegNome] = useState('')
  const [regSobrenome, setRegSobrenome] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regTelefone, setRegTelefone] = useState('')
  const [regSenha, setRegSenha] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [verseIdx, setVerseIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [aguardando, setAguardando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const { data } = await supabase.from('usuarios').select('ativo').eq('id', session.user.id).single()
      if (data?.ativo === true) { navigate('/sistema'); return }
      if (data?.ativo === false) { setAguardando(true) }
    })
  }, [])

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
      navigate('/sistema')
    } catch (err) {
      if (err.message === 'inactive') {
        setError('Sua conta ainda não foi ativada. Aguarde a aprovação do administrador.')
      } else {
        setError('E-mail ou senha incorretos.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` }
    })
  }

  async function handleForgot(e) {
    e.preventDefault()
    setForgotMsg('Se este e-mail estiver cadastrado, você receberá as instruções em breve.')
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegError('')
    if (regSenha !== regConfirm) { setRegError('As senhas não coincidem.'); return }
    if (regSenha.length < 6) { setRegError('A senha deve ter pelo menos 6 caracteres.'); return }
    setRegLoading(true)
    const nomeCompleto = `${regNome.trim()} ${regSobrenome.trim()}`.trim()
    let data, error
    try {
      ;({ data, error } = await supabase.auth.signUp({ email: regEmail, password: regSenha, options: { data: { nome: nomeCompleto } } }))
    } catch {
      setRegError('Sem conexão. Verifique sua internet e tente novamente.')
      setRegLoading(false)
      return
    }
    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        setRegError('E-mail já cadastrado.')
      } else if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
        setRegError('Sem conexão. Verifique sua internet e tente novamente.')
      } else {
        setRegError(error.message)
      }
      setRegLoading(false)
      return
    }
    const uid = data.user?.id
    if (uid) {
      await supabase.from('usuarios').insert({ id: uid, nome: nomeCompleto, email: regEmail, telefone: regTelefone || null, perfil: 'voluntario', ativo: false })
    }
    setRegLoading(false)
    setRegSuccess(true)
  }

  const verse = VERSES[verseIdx]

  if (aguardando) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '40px', textAlign: 'center', boxShadow: '0 16px 64px rgba(0,0,0,0.3)' }}>
        <div style={{ width: '64px', height: '64px', background: '#fff4ec', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F97310" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f1117', margin: '0 0 10px' }}>Solicitação enviada!</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.7, margin: '0 0 24px' }}>
          Sua conta foi criada com sucesso. Aguarde a aprovação do administrador para acessar a plataforma.
        </p>
        <button onClick={async () => { await supabase.auth.signOut(); setAguardando(false) }} style={{ background: '#F97310', color: '#fff', border: 'none', borderRadius: '50px', padding: '12px 32px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", letterSpacing: '1px', textTransform: 'uppercase' }}>
          Voltar ao login
        </button>
      </div>
    </div>
  )

  return (
    <div style={s.page} className="login-page">
      <style>{mobileStyle}</style>

      {showEncerrado && (
        <div onClick={() => setShowEncerrado(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:'20px',width:'100%',maxWidth:'480px',padding:'40px 48px',textAlign:'center',position:'relative',boxShadow:'0 16px 64px rgba(0,0,0,0.2)'}}>
            <button onClick={() => setShowEncerrado(false)} style={{position:'absolute',top:'16px',right:'16px',background:'#f3f4f6',border:'none',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',fontSize:'14px',fontWeight:700,color:'#374151'}}>✕</button>
            <h2 style={{fontSize:'20px',fontWeight:900,color:'#0f1117',margin:'0 0 10px'}}>Inscrições encerradas</h2>
            <p style={{fontSize:'14px',color:'#9ca3af',lineHeight:1.6,margin:'0 0 24px'}}>As inscrições para a Cruzada Ibirité 2026 estão encerradas.</p>
            <button onClick={() => setShowEncerrado(false)} style={{background:'#F97310',color:'#fff',border:'none',borderRadius:'50px',padding:'12px 32px',fontSize:'13px',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito', sans-serif",letterSpacing:'1px',textTransform:'uppercase'}}>Fechar</button>
          </div>
        </div>
      )}

      {/* ESQUERDO — tela cheia com imagem */}
      <div style={s.left} className="login-left">
        <div style={s.leftBg} />
        <div style={s.leftOverlay} />

        <div style={s.leftInner}>
          {/* Logo */}
          <a href="/" style={s.logo}>
            <img src="/icon-512.png" alt="Logo" style={{height:'34px', width:'auto'}} />
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

          {showRegister ? (
            <>
              <div style={{ marginBottom: '28px', textAlign: 'center' }}>
                <div style={s.formTopIcon}>
                  <img src="/icon-512.png" alt="Logo" style={{ height: '36px', width: 'auto' }} />
                </div>
                <h1 style={{ ...s.formTitle, marginBottom: '6px' }} className="login-form-title">Criar conta</h1>
                <p style={s.formSub} className="login-form-sub">Preencha os dados para criar seu acesso</p>
              </div>

              {regSuccess ? (
                <div style={s.success}>Conta criada! Você já pode entrar.</div>
              ) : (
                <form onSubmit={handleRegister} style={{ ...s.form, gap: '14px' }} autoComplete="off">
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ ...s.field, flex: 1 }}>
                      <label style={s.label} className="login-label">Nome</label>
                      <div style={s.inputWrap} className="login-input-wrap">
                        <input type="text" required autoComplete="off" value={regNome} onChange={e => setRegNome(e.target.value)} placeholder="Nome" style={{...s.input, padding:'11px 14px'}} onFocus={e => e.target.parentNode.style.borderColor='#F97310'} onBlur={e => e.target.parentNode.style.borderColor='#e5e7eb'} />
                      </div>
                    </div>
                    <div style={{ ...s.field, flex: 1 }}>
                      <label style={s.label} className="login-label">Sobrenome</label>
                      <div style={s.inputWrap} className="login-input-wrap">
                        <input type="text" required autoComplete="off" value={regSobrenome} onChange={e => setRegSobrenome(e.target.value)} placeholder="Sobrenome" style={{...s.input, padding:'11px 14px'}} onFocus={e => e.target.parentNode.style.borderColor='#F97310'} onBlur={e => e.target.parentNode.style.borderColor='#e5e7eb'} />
                      </div>
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label} className="login-label">E-mail</label>
                    <div style={s.inputWrap} className="login-input-wrap">
                      <input type="email" required autoComplete="off" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="seu@email.com" style={{...s.input, padding:'11px 14px'}} onFocus={e => e.target.parentNode.style.borderColor='#F97310'} onBlur={e => e.target.parentNode.style.borderColor='#e5e7eb'} />
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label} className="login-label">Telefone</label>
                    <div style={s.inputWrap} className="login-input-wrap">
                      <input type="tel" value={regTelefone} onChange={e => setRegTelefone(e.target.value)} placeholder="(31) 99999-9999" style={{...s.input, padding:'11px 14px'}} onFocus={e => e.target.parentNode.style.borderColor='#F97310'} onBlur={e => e.target.parentNode.style.borderColor='#e5e7eb'} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ ...s.field, flex: 1 }}>
                      <label style={s.label} className="login-label">Senha</label>
                      <div style={s.inputWrap} className="login-input-wrap">
                        <input type="password" required autoComplete="new-password" value={regSenha} onChange={e => setRegSenha(e.target.value)} placeholder="Mínimo 6 caracteres" style={{...s.input, padding:'11px 14px'}} onFocus={e => e.target.parentNode.style.borderColor='#F97310'} onBlur={e => e.target.parentNode.style.borderColor='#e5e7eb'} />
                      </div>
                    </div>
                    <div style={{ ...s.field, flex: 1 }}>
                      <label style={s.label} className="login-label">Confirmar senha</label>
                      <div style={s.inputWrap} className="login-input-wrap">
                        <input type="password" required autoComplete="new-password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Repita a senha" style={{...s.input, padding:'11px 14px'}} onFocus={e => e.target.parentNode.style.borderColor='#F97310'} onBlur={e => e.target.parentNode.style.borderColor='#e5e7eb'} />
                      </div>
                    </div>
                  </div>
                  {regError && <p style={s.error}>{regError}</p>}
                  <button type="submit" disabled={regLoading} style={{...s.btn, opacity: regLoading ? 0.75 : 1}}>
                    <span>{regLoading ? 'Criando conta...' : 'Criar conta'}</span>
                  </button>
                </form>
              )}

              <button onClick={() => { setShowRegister(false); setRegError(''); setRegSuccess(false) }} style={s.backLoginBtn}>
                ← Voltar ao login
              </button>
            </>
          ) : !showForgot ? (
            <>
              <div style={s.formTop}>
                <div style={s.formTopIcon}>
                  <img src="/icon-512.png" alt="Logo" style={{height:'72px', width:'auto'}} />
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
                <div style={s.orLine}/><span style={s.orText}>ou continue com</span><div style={s.orLine}/>
              </div>

              <button onClick={handleGoogle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: '50px', background: '#fff', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: 800, color: '#374151', letterSpacing: '0.5px' }}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.3-17.7 11.7z"/><path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.8 14.4-5l-6.7-5.5C29.8 36.1 27 37 24 37c-5.7 0-10.6-3.1-11.7-8.5l-7 5.4C8 40.5 15.4 45 24 45z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.6 2.8-2.3 5.1-4.7 6.6l6.7 5.5C42.4 37.3 45 31.1 45 24c0-1.3-.2-2.7-.5-4z"/></svg>
                Entrar com Google
              </button>

              <div style={{ ...s.orRow, margin: '16px 0' }}>
                <div style={s.orLine}/><span style={s.orText}>não tem acesso?</span><div style={s.orLine}/>
              </div>

              <button onClick={() => setShowRegister(true)} style={{...s.btnOutline, background:'none', cursor:'pointer', fontFamily:"'Nunito', sans-serif", width:'100%'}}>Criar conta</button>

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
