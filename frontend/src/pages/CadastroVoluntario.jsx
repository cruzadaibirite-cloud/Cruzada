import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const COMPETENCIAS = [
  { key: 'fala_ingles', label: 'Falo Inglês' },
  { key: 'fala_espanhol', label: 'Falo Espanhol' },
  { key: 'canta', label: 'Canto' },
  { key: 'toca_instrumento', label: 'Toco um instrumento' },
  { key: 'tira_fotos', label: 'Tiro Fotos' },
  { key: 'faz_filmagens', label: 'Faço filmagens' },
  { key: 'outras_competencias', label: 'Outros' },
]

const mobileStyle = `
  @media (max-width: 768px) {
    .cad-container { padding: 24px 16px !important; }
    .cad-grid { grid-template-columns: 1fr !important; }
    .cad-header { padding: 0 20px !important; }
    .cad-header-nav { height: 48px !important; }
    .cad-header-title { font-size: 11px !important; }
  }
`

export default function CadastroVoluntario() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showInstaModal, setShowInstaModal] = useState(false)
  const instaConfirmed = useRef(false)
  const [cidadeSugestoes, setCidadeSugestoes] = useState([])
  const cidadeTimer = useRef(null)

  const [form, setForm] = useState({
    nome_completo: '',
    idade: '',
    whatsapp: '',
    instagram: '',
    cidade_estado_pais: '',
    igreja: '',
    estado_civil: '',
    conjuge_na_missao: '',
    motivo_conjuge_ausente: '',
    tempo_na_igreja: '',
    como_serve_igreja: '',
    nome_pastor: '',
    contato_pastor_lider: '',
    nome_emergencia: '',
    telefone_emergencia: '',
    ja_participou_missao: '',
    limitacao_fisica: '',
    fala_ingles: false,
    fala_espanhol: false,
    canta: false,
    toca_instrumento: false,
    tira_fotos: false,
    faz_filmagens: false,
    outras_competencias: false,
    outra_competencia_descricao: '',
    sexo: '',
  })

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function buscarCidade(valor) {
    set('cidade_estado_pais', valor)
    clearTimeout(cidadeTimer.current)
    if (valor.length < 3) { setCidadeSugestoes([]); return }
    cidadeTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(valor)}&format=json&addressdetails=1&limit=6&featureType=city`)
        const data = await res.json()
        const sugestoes = data.map(item => {
          const a = item.address
          const cidade = a.city || a.town || a.village || a.municipality || a.county || ''
          const estado = a.state || ''
          const pais = a.country || ''
          return [cidade, estado, pais].filter(Boolean).join(', ')
        }).filter((v, i, arr) => v && arr.indexOf(v) === i)
        setCidadeSugestoes(sugestoes)
      } catch {}
    }, 400)
  }

  function selecionarCidade(valor) {
    set('cidade_estado_pais', valor)
    setCidadeSugestoes([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      nome_completo: form.nome_completo,
      idade: parseInt(form.idade),
      whatsapp: form.whatsapp,
      instagram: form.instagram,
      cidade_estado_pais: form.cidade_estado_pais,
      igreja: form.igreja,
      nome_pastor: form.nome_pastor,
      contato_pastor_lider: form.contato_pastor_lider,
      como_serve_igreja: form.como_serve_igreja,
      tempo_na_igreja: form.tempo_na_igreja,
      estado_civil: form.estado_civil,
      conjuge_na_missao: form.estado_civil === 'casado' ? form.conjuge_na_missao === 'sim' : null,
      motivo_conjuge_ausente: form.motivo_conjuge_ausente || null,
      nome_emergencia: form.nome_emergencia,
      telefone_emergencia: form.telefone_emergencia,
      limitacao_fisica: form.limitacao_fisica || null,
      ja_participou_missao: form.ja_participou_missao === 'sim',
      fala_ingles: form.fala_ingles,
      fala_espanhol: form.fala_espanhol,
      canta: form.canta,
      toca_instrumento: form.toca_instrumento,
      tira_fotos: form.tira_fotos,
      faz_filmagens: form.faz_filmagens,
      outras_competencias: form.outras_competencias,
      outra_competencia_descricao: form.outra_competencia_descricao || null,
      sexo: form.sexo || null,
    }

    const { error: err } = await supabase.from('voluntarios').insert([payload])
    setLoading(false)

    if (err) {
      setError('Erro ao enviar. Tente novamente.')
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div style={s.successPage}>
        <style>{mobileStyle}</style>
        <div style={s.successBox}>
          <div style={s.successIcon}>✓</div>
          <h2 style={s.successTitle}>Cadastro enviado!</h2>
          <p style={s.successText}>Suas informações foram encaminhadas para a equipe da Cruzada Ibirité 2026. Em breve entraremos em contato.</p>
          <button onClick={() => navigate('/cruzada')} style={s.btnPrimary}>Voltar ao início</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <style>{mobileStyle}</style>

      {/* Modal Instagram */}
      {showInstaModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            <h3 style={s.modalTitle}>Atenção ao Instagram</h3>
            <p style={s.modalText}>Seu Instagram precisa estar <strong>público</strong> no momento do cadastro.</p>
            <button style={s.btnPrimary} onClick={() => { instaConfirmed.current = true; setShowInstaModal(false) }}>
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header} className="cad-header">
        <div style={s.headerNav} className="cad-header-nav">
          <div style={s.headerLogo}>
            <img src="/logo1.png" alt="Logo" style={{ height: '38px', width: 'auto' }} />
            <span style={s.headerTitle} className="cad-header-title">Cruzada <span style={{ color: '#F97310' }}>Ibirité</span></span>
          </div>
          <a href="/cruzada" style={s.backLink}>← Voltar</a>
        </div>
      </div>

      {/* Título */}
      <div style={s.titleSection}>
        <h1 style={s.pageTitle}>Quero fazer parte</h1>
        <p style={s.pageSubtitle}>Preencha o formulário abaixo para se cadastrar como voluntário da Cruzada Ibirité 2026.</p>
      </div>

      {/* Form */}
      <div style={s.container} className="cad-container">
        <form onSubmit={handleSubmit} style={s.form}>

          {/* Dados pessoais */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Dados Pessoais</h2>
            <div style={s.grid} className="cad-grid">
              {field('Nome Completo', <input style={s.input} required value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)} placeholder="Seu nome completo" />, true)}
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {field('Idade', <input style={s.input} required type="number" min="16" max="99" value={form.idade} onChange={e => set('idade', e.target.value)} placeholder="Sua idade" />)}
                {field('Sexo', (
                  <select style={s.input} required value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                ))}
              </div>
              {field('WhatsApp com DDD', <input style={s.input} required value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(31) 99999-9999" />)}
              {field('Instagram', <input style={s.input} required value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@seuinstagram" onFocus={() => { if (!instaConfirmed.current) setShowInstaModal(true) }} />)}
              {field('Cidade, Estado, País', (
                <div style={{ position: 'relative' }}>
                  <input
                    style={s.input}
                    required
                    value={form.cidade_estado_pais}
                    onChange={e => buscarCidade(e.target.value)}
                    onBlur={() => setTimeout(() => setCidadeSugestoes([]), 200)}
                    placeholder="Digite sua cidade..."
                    autoComplete="off"
                  />
                  {cidadeSugestoes.length > 0 && (
                    <ul style={s.sugestoes}>
                      {cidadeSugestoes.map((s, i) => (
                        <li key={i} style={s2.sugestaoItem} onMouseDown={() => selecionarCidade(s)}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ), true)}
            </div>
          </div>

          {/* Igreja */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Igreja</h2>
            <div style={s.grid} className="cad-grid">
              {field('Nome da Igreja', <input style={s.input} required value={form.igreja} onChange={e => set('igreja', e.target.value)} placeholder="Nome da sua igreja" />, true)}
              {field('Nome do Pastor / Líder', <input style={s.input} required value={form.nome_pastor} onChange={e => set('nome_pastor', e.target.value)} placeholder="Nome do pastor ou líder" />)}
              {field('Telefone do Pastor / Líder', <input style={s.input} required value={form.contato_pastor_lider} onChange={e => set('contato_pastor_lider', e.target.value)} placeholder="(31) 99999-9999" />)}
              {field('Como você serve na sua igreja local?', <textarea style={s.textarea} required value={form.como_serve_igreja} onChange={e => set('como_serve_igreja', e.target.value)} placeholder="Descreva como você serve" />, true)}
              {field('Há quanto tempo está na sua igreja local?', <input style={s.input} required value={form.tempo_na_igreja} onChange={e => set('tempo_na_igreja', e.target.value)} placeholder="Ex: 3 anos" />, true)}
              {field('Estado Civil', (
                <select style={s.input} required value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="solteiro">Solteiro</option>
                  <option value="casado">Casado</option>
                </select>
              ))}
              {form.estado_civil === 'casado' && (
                <>
                  {field('Seu cônjuge irá na missão?', (
                    <select style={s.input} required value={form.conjuge_na_missao} onChange={e => set('conjuge_na_missao', e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  ))}
                  {form.conjuge_na_missao === 'nao' && field('Se não, por quê?', <textarea style={s.textarea} required value={form.motivo_conjuge_ausente} onChange={e => set('motivo_conjuge_ausente', e.target.value)} placeholder="Explique o motivo" />, true)}
                </>
              )}
            </div>
          </div>

          {/* Saúde e Experiência */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Saúde e Experiência</h2>
            <div style={s.grid} className="cad-grid">
              {field('Nome de Emergência', <input style={s.input} required value={form.nome_emergencia} onChange={e => set('nome_emergencia', e.target.value)} placeholder="Nome do contato de emergência" />)}
              {field('Contato de Emergência', <input style={s.input} required value={form.telefone_emergencia} onChange={e => set('telefone_emergencia', e.target.value)} placeholder="(31) 99999-9999" />)}
              {field('Você tem alguma limitação física ou precisa de algum remédio especial?', <textarea style={s.textarea} value={form.limitacao_fisica} onChange={e => set('limitacao_fisica', e.target.value)} placeholder="Se sim, descreva. Se não, deixe em branco." />, true)}
              {field('Já participou de alguma viagem missionária?', (
                <select style={s.input} required value={form.ja_participou_missao} onChange={e => set('ja_participou_missao', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              ), true)}
            </div>
          </div>

          {/* Competências */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Competências</h2>
            <div style={s.checkGrid}>
              {COMPETENCIAS.map(({ key, label }) => (
                <label key={key} style={s.checkLabel}>
                  <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} style={s.checkbox} />
                  {label}
                </label>
              ))}
            </div>
            {form.outras_competencias && (
              <div style={{ marginTop: '16px' }}>
                {field('Outra competência', <textarea style={s.textarea} required value={form.outra_competencia_descricao} onChange={e => set('outra_competencia_descricao', e.target.value)} placeholder="Descreva sua competência" />, true)}
              </div>
            )}
          </div>

          {error && <p style={s.errorMsg}>{error}</p>}

          <button type="submit" disabled={loading} style={s.btnPrimary}>
            {loading ? 'Enviando...' : 'Enviar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s2 = {
  sugestaoItem: {
    padding: '10px 14px',
    fontSize: '14px',
    color: '#1a1d27',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
  },
}

function field(label, input, fullWidth = false) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={s.label}>{label}</label>
      {input}
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily: "'Nunito', sans-serif",
  },
  header: {
    background: '#0f1117',
    padding: '0 72px',
    color: '#fff',
  },
  headerNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  backLink: {
    color: '#F97310',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 700,
  },
  headerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#fff',
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.6)',
    maxWidth: '560px',
  },
  titleSection: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '32px 24px 0',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 900,
    color: '#0f1117',
    marginBottom: '8px',
  },
  pageSubtitle: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  container: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '40px 24px 80px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  section: {
    background: '#fff',
    borderRadius: '16px',
    padding: '28px 32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#0f1117',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #F97310',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Nunito', sans-serif",
    color: '#1a1d27',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Nunito', sans-serif",
    color: '#1a1d27',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '90px',
    resize: 'vertical',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
    paddingTop: '6px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    fontWeight: 600,
  },
  radio: {
    accentColor: '#F97310',
  },
  checkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    fontWeight: 600,
  },
  checkbox: {
    accentColor: '#F97310',
    width: '16px',
    height: '16px',
  },
  btnPrimary: {
    background: '#F97310',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 32px',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    alignSelf: 'flex-start',
    fontFamily: "'Nunito', sans-serif",
  },
  errorMsg: {
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: 600,
  },
  sugestoes: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1.5px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    zIndex: 100,
    listStyle: 'none',
    margin: '4px 0 0',
    padding: 0,
    overflow: 'hidden',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modalBox: {
    background: '#fff',
    borderRadius: '16px',
    padding: '36px 32px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
  },
  modalIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#0f1117',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  successPage: {
    minHeight: '100vh',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Nunito', sans-serif",
    padding: '24px',
  },
  successBox: {
    background: '#fff',
    borderRadius: '20px',
    padding: '48px 40px',
    textAlign: 'center',
    maxWidth: '460px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    background: '#F97310',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: '#fff',
    margin: '0 auto 20px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#0f1117',
    marginBottom: '12px',
  },
  successText: {
    fontSize: '15px',
    color: '#6b7280',
    marginBottom: '28px',
    lineHeight: 1.6,
  },
}
