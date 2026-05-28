import { useState, useEffect, useRef } from 'react'
import MapaLocal from '../components/MapaLocal'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MENU = [
  { key: 'voluntarios', label: 'Voluntários', path: '/sistema/voluntario' },
  { key: 'usuarios', label: 'Usuários', path: '/sistema/usuarios' },
  { key: 'locais', label: 'Locais', path: '/sistema/locais' },
  { key: 'dashboard', label: 'Dashboard', path: '/sistema/dashboard' },
]

const CAMPOS_OBRIGATORIOS = [
  { key: 'nome_completo', label: 'Nome Completo' },
  { key: 'idade', label: 'Idade' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'cidade_estado_pais', label: 'Cidade / Estado / País' },
  { key: 'igreja', label: 'Nome da Igreja' },
  { key: 'nome_pastor', label: 'Pastor / Líder' },
  { key: 'contato_pastor_lider', label: 'Telefone do Pastor / Líder' },
  { key: 'como_serve_igreja', label: 'Como serve na igreja' },
  { key: 'tempo_na_igreja', label: 'Tempo na igreja' },
  { key: 'estado_civil', label: 'Estado Civil' },
  { key: 'nome_emergencia', label: 'Contato de Emergência' },
  { key: 'telefone_emergencia', label: 'Telefone de Emergência' },
]

function camposFaltando(v) {
  const faltando = CAMPOS_OBRIGATORIOS.filter(({ key }) => !v[key] && v[key] !== 0).map(({ label }) => label)
  if (v.estado_civil === 'casado' && v.conjuge_na_missao === null) faltando.push('Cônjuge vai na missão?')
  if (v.estado_civil === 'casado' && v.conjuge_na_missao === false && !v.motivo_conjuge_ausente) faltando.push('Motivo cônjuge ausente')
  if (v.ja_participou_missao === null || v.ja_participou_missao === undefined) faltando.push('Já participou de missão?')
  return faltando
}

const COMPETENCIAS_LABEL = {
  fala_ingles: 'Fala Inglês',
  fala_espanhol: 'Fala Espanhol',
  canta: 'Canta',
  toca_instrumento: 'Toca instrumento',
  tira_fotos: 'Tira fotos',
  faz_filmagens: 'Faz filmagens',
  outras_competencias: 'Outras',
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const menu = location.pathname === '/sistema/voluntario' ? 'voluntarios' : location.pathname === '/sistema/usuarios' ? 'usuarios' : location.pathname === '/sistema/locais' ? 'locais' : location.pathname === '/sistema/dashboard' ? 'dashboard' : 'voluntarios'
  const [voluntarios, setVoluntarios] = useState([])
  const [loadingVol, setLoadingVol] = useState(false)
  const [selected, setSelected] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [editandoStatus, setEditandoStatus] = useState(false)
  const [alertaCampos, setAlertaCampos] = useState(null)
  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [locais, setLocais] = useState([])
  const [buscaLocal, setBuscaLocal] = useState('')
  const [localSelecionado, setLocalSelecionado] = useState(null)
  const [viewLocais, setViewLocais] = useState('mapa')
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [filtro, setFiltro] = useState(null)
  const tooltipTimer = useRef(null)

  useEffect(() => {
    async function carregarNome() {
      const { data } = await supabase.from('usuarios').select('nome').eq('id', user?.id).single()
      if (data?.nome) setNomeUsuario(data.nome)
    }
    if (user?.id) carregarNome()
  }, [user])

  function getInitials(nome) {
    if (!nome) return '?'
    const parts = nome.trim().split(' ')
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
  }

  useEffect(() => {
    if (menu === 'voluntarios' || menu === 'dashboard') carregarVoluntarios()
    if (menu === 'usuarios') carregarUsuarios()
    if (menu === 'locais') carregarLocais()
  }, [menu])

  async function carregarLocais() {
    const { data } = await supabase.from('locais').select('*').order('nome')
    setLocais(data || [])
  }


  async function carregarUsuarios() {
    setLoadingUsers(true)
    const { data } = await supabase.from('usuarios').select('*').order('criado_em', { ascending: false })
    setUsuarios(data || [])
    setLoadingUsers(false)
  }

  async function carregarVoluntarios() {
    setLoadingVol(true)
    const { data } = await supabase.from('voluntarios').select('*').order('criado_em', { ascending: false })
    setVoluntarios(data || [])
    setLoadingVol(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function iniciarEdicao() {
    setFormEdit({ ...selected })
    setEditando(true)
  }

  function cancelarEdicao() {
    setEditando(false)
    setFormEdit({})
  }

  function setField(key, value) {
    setFormEdit(f => ({ ...f, [key]: value }))
  }

  async function salvarEdicao() {
    setSalvando(true)
    const payload = {
      nome_completo: formEdit.nome_completo,
      idade: parseInt(formEdit.idade) || null,
      whatsapp: formEdit.whatsapp,
      instagram: formEdit.instagram,
      cidade_estado_pais: formEdit.cidade_estado_pais,
      igreja: formEdit.igreja,
      nome_pastor: formEdit.nome_pastor,
      contato_pastor_lider: formEdit.contato_pastor_lider,
      como_serve_igreja: formEdit.como_serve_igreja,
      tempo_na_igreja: formEdit.tempo_na_igreja,
      estado_civil: formEdit.estado_civil,
      conjuge_na_missao: formEdit.conjuge_na_missao ?? null,
      motivo_conjuge_ausente: formEdit.motivo_conjuge_ausente || null,
      nome_emergencia: formEdit.nome_emergencia,
      telefone_emergencia: formEdit.telefone_emergencia,
      limitacao_fisica: formEdit.limitacao_fisica || null,
      ja_participou_missao: formEdit.ja_participou_missao ?? null,
      fala_ingles: !!formEdit.fala_ingles,
      fala_espanhol: !!formEdit.fala_espanhol,
      canta: !!formEdit.canta,
      toca_instrumento: !!formEdit.toca_instrumento,
      tira_fotos: !!formEdit.tira_fotos,
      faz_filmagens: !!formEdit.faz_filmagens,
      outras_competencias: !!formEdit.outras_competencias,
      outra_competencia_descricao: formEdit.outra_competencia_descricao || null,
      sexo: formEdit.sexo || null,
    }
    const { error } = await supabase.from('voluntarios').update(payload).eq('id', selected.id)
    setSalvando(false)
    if (!error) {
      const atualizado = { ...selected, ...payload }
      setSelected(atualizado)
      setVoluntarios(list => list.map(v => v.id === selected.id ? atualizado : v))
      setEditando(false)
      setFormEdit({})
    }
  }

  async function alterarStatus(status) {
    await supabase.from('voluntarios').update({ status }).eq('id', selected.id)
    setSelected(v => ({ ...v, status }))
    setVoluntarios(list => list.map(v => v.id === selected.id ? { ...v, status } : v))
    setEditandoStatus(false)
  }

  return (
    <div style={s.page}>

      {/* Modal campos pendentes */}
      {alertaCampos && (
        <div style={s.modalOverlay} onClick={() => setAlertaCampos(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚠</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', margin: 0 }}>Cadastro incompleto</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, marginTop: '2px' }}>{alertaCampos.nome}</p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>Os seguintes campos obrigatórios estão pendentes:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              {alertaCampos.campos.map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <span style={{ color: '#ef4444', fontSize: '12px' }}>●</span>
                  <span style={{ fontSize: '14px', color: '#dc2626', fontWeight: 600 }}>{c}</span>
                </div>
              ))}
            </div>
            <button style={{ ...s.editBtn, width: '100%', textAlign: 'center' }} onClick={() => setAlertaCampos(null)}>Fechar</button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .dash-sidebar { display: none !important; }
          .dash-profile-email { display: none !important; }
          .dash-profile-chevron { display: none !important; }
          .dash-profile-btn { display: none !important; }
          .dash-header { padding: 0 16px !important; }
          .dash-header-title { font-size: 15px !important; }
          .dash-header-logo img { height: 24px !important; }
          .dash-main { padding: 20px 16px 90px !important; }
          .dash-bottomnav { display: flex !important; }
          .dash-kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .dash-mid-grid { grid-template-columns: 1fr !important; }
          .dash-bot-grid { grid-template-columns: 1fr !important; }
          .dash-faixa-etaria { margin-bottom: 24px !important; }
        }
        @media (min-width: 769px) {
          .dash-bottomnav { display: none !important; }
        }
      `}</style>

      {/* Tooltip hover */}
      {tooltip && (
        <div
          onMouseEnter={() => clearTimeout(tooltipTimer.current)}
          onMouseLeave={() => { tooltipTimer.current = setTimeout(() => tooltipTimer.current = setTimeout(() => setTooltip(null), 150), 300) }}
          style={{ position: 'fixed', top: tooltip.y, left: tooltip.x, zIndex: 500, background: '#fff', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb', minWidth: '280px', maxWidth: '340px', maxHeight: '280px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #F97310' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#0f1117', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{tooltip.titulo}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Cidade</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{tooltip.lista.length}</th>
              </tr>
            </thead>
          </table>
          <div style={{ overflowY: 'auto', maxHeight: '220px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {tooltip.lista.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '10px 12px', color: '#9ca3af' }}>Nenhuma pessoa.</td></tr>
                )}
                {tooltip.lista.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 700, color: '#0f1117' }}>{v.nome_completo}</td>
                    <td style={{ padding: '7px 12px', color: '#6b7280' }}>{v.cidade_estado_pais?.split(',')[0]}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center', color: '#9ca3af' }}>{v.idade}a</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header} className="dash-header">
        <div style={s.headerLogo} className="dash-header-logo">
          <img src="/logo1.png" alt="Logo" style={{ height: '22px', width: 'auto' }} />
          <span style={s.headerTitle} className="dash-header-title">Cruzada <span style={{ color: '#F97310' }}>Ibirité</span></span>
        </div>
        <div style={{ position: 'relative' }} className="dash-profile-btn">
          <button style={s.profileBtn} onClick={() => setDropdownOpen(o => !o)}>
            <div style={s.profileAvatar}>{getInitials(nomeUsuario || user?.email)}</div>
            <span style={s.profileEmail} className="dash-profile-email">{nomeUsuario || user?.email}</span>
            <span style={s.profileChevron} className="dash-profile-chevron">▾</span>
          </button>
          {dropdownOpen && (
            <div style={s.dropdown}>
              <button style={s.dropdownItem} onClick={() => { setDropdownOpen(false) }}>Editar usuário</button>
              <div style={s.dropdownDivider} />
              <button style={{ ...s.dropdownItem, color: '#ef4444' }} onClick={handleSignOut}>Sair</button>
            </div>
          )}
        </div>
      </div>

      <div style={s.body}>

        {/* Sidebar */}
        <div style={s.sidebar} className="dash-sidebar">
          <p style={s.sidebarLabel}>Menu</p>
          {MENU.map(item => (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              style={{ ...s.menuItem, ...(menu === item.key ? s.menuItemActive : {}) }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={s.main} className="dash-main">

          {menu === 'dashboard' && (() => {
            const base = filtro ? filtro.lista : voluntarios
            const total = base.length
            const aprovados = base.filter(v => v.status === 'aprovado').length
            const pendentes = base.filter(v => !v.status || v.status === 'pendente').length
            const reprovados = base.filter(v => v.status === 'reprovado').length
            const masculino = base.filter(v => v.sexo === 'Masculino').length
            const feminino = base.filter(v => v.sexo === 'Feminino').length
            const foraMG = base.filter(v => v.cidade_estado_pais && !v.cidade_estado_pais.includes('Minas Gerais')).length
            const missionarios = base.filter(v => v.ja_participou_missao === true).length
            const solteiros = base.filter(v => v.estado_civil === 'solteiro').length
            const casados = base.filter(v => v.estado_civil === 'casado').length
            const incompletos = base.filter(v => camposFaltando(v).length > 0).length

            function hover(e, titulo, lista) {
              const rect = e.currentTarget.getBoundingClientRect()
              const tooltipW = 340
              const tooltipH = 280
              let x = rect.left
              let y = rect.bottom + 8
              if (x + tooltipW > window.innerWidth - 8) x = window.innerWidth - tooltipW - 8
              if (x < 8) x = 8
              if (y + tooltipH > window.innerHeight - 8) y = rect.top - tooltipH - 8
              clearTimeout(tooltipTimer.current)
              tooltipTimer.current = setTimeout(() => setTooltip({ titulo, lista, x, y }), 1000)
            }
            function clique(titulo, lista) {
              if (filtro?.titulo === titulo) { setFiltro(null) } else { setFiltro({ titulo, lista }) }
            }
            function itemStyle(titulo) {
              return filtro?.titulo === titulo
                ? { cursor: 'pointer' }
                : { cursor: 'pointer' }
            }

            const cidades = {}
            base.forEach(v => {
              if (!v.cidade_estado_pais) return
              const cidade = v.cidade_estado_pais.split(',')[0].trim()
              cidades[cidade] = (cidades[cidade] || 0) + 1
            })
            const topCidades = Object.entries(cidades).sort((a, b) => b[1] - a[1])
            const maxCidadeReal = topCidades.length > 0 ? topCidades[0][1] : 1

            const competencias = [
              { label: 'Mídia/Fotos', count: base.filter(v => v.tira_fotos).length },
              { label: 'Filmagem', count: base.filter(v => v.faz_filmagens).length },
              { label: 'Canto', count: base.filter(v => v.canta).length },
              { label: 'Instrumento', count: base.filter(v => v.toca_instrumento).length },
              { label: 'Inglês', count: base.filter(v => v.fala_ingles).length },
              { label: 'Espanhol', count: base.filter(v => v.fala_espanhol).length },
              { label: 'LIBRAS/Outros', count: base.filter(v => v.outras_competencias).length },
            ].sort((a, b) => b.count - a.count)

            const faixas = [
              { label: '16–20', count: base.filter(v => v.idade >= 16 && v.idade <= 20).length },
              { label: '21–25', count: base.filter(v => v.idade >= 21 && v.idade <= 25).length },
              { label: '26–30', count: base.filter(v => v.idade >= 26 && v.idade <= 30).length },
              { label: '31–40', count: base.filter(v => v.idade >= 31 && v.idade <= 40).length },
              { label: '40+',   count: base.filter(v => v.idade > 40).length },
            ]
            const maxFaixa = Math.max(...faixas.map(f => f.count), 1)
            const maxCidade = maxCidadeReal
            const maxComp = Math.max(...competencias.map(c => c.count), 1)

            const pct = (n, d) => d === 0 ? 0 : Math.round((n / d) * 100)

            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ ...s.pageTitle, marginBottom: 0 }}>Dashboard</h2>
                  {filtro && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff4ec', border: '1.5px solid #F97310', borderRadius: '20px', padding: '4px 12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#F97310' }}>Filtrando: {filtro.titulo} ({filtro.lista.length})</span>
                      <button onClick={() => setFiltro(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontWeight: 900, fontSize: '14px', padding: '0', lineHeight: 1 }}>✕</button>
                    </div>
                  )}
                </div>

                {/* KPIs */}
                <div className="dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                  {[
                    { label: 'Total', value: total, color: '#0f1117', bg: '#fff', border: '#e5e7eb', lista: voluntarios },
                    { label: 'Aprovados', value: aprovados, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', lista: voluntarios.filter(v => v.status === 'aprovado') },
                    { label: 'Pendentes', value: pendentes, color: '#F97310', bg: '#fff4ec', border: '#fed7aa', lista: voluntarios.filter(v => !v.status || v.status === 'pendente') },
                    { label: 'Reprovados', value: reprovados, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', lista: voluntarios.filter(v => v.status === 'reprovado') },
                  ].map(k => (
                    <div key={k.label}
                      onMouseEnter={e => hover(e, k.label, k.lista)}
                      onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                      onClick={() => clique(k.label, k.lista)}
                      style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', ...itemStyle(k.label) }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{k.label}</div>
                      <div style={{ fontSize: '36px', fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
                      {k.label !== 'Total' && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{pct(k.value, total)}% do total</div>}
                    </div>
                  ))}
                </div>

                {/* Linha 2 */}
                <div className="dash-mid-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>

                  {/* Sexo */}
                  <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Sexo</div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px', ...itemStyle('Masculino') }}
                        onMouseEnter={e => hover(e, 'Masculino', base.filter(v => v.sexo === 'Masculino'))}
                        onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                        onClick={() => clique('Masculino', voluntarios.filter(v => v.sexo === 'Masculino'))}>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#3b82f6' }}>{masculino}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Masculino</div>
                      </div>
                      <div style={{ width: '1px', background: '#f3f4f6' }} />
                      <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px', ...itemStyle('Feminino') }}
                        onMouseEnter={e => hover(e, 'Feminino', base.filter(v => v.sexo === 'Feminino'))}
                        onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                        onClick={() => clique('Feminino', voluntarios.filter(v => v.sexo === 'Feminino'))}>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#ec4899' }}>{feminino}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Feminino</div>
                      </div>
                    </div>
                    <div style={{ height: '10px', borderRadius: '99px', background: '#f3f4f6', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${pct(masculino, total)}%`, background: '#3b82f6', transition: 'width 0.5s' }} />
                      <div style={{ width: `${pct(feminino, total)}%`, background: '#ec4899', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>{pct(masculino, total)}%</span>
                      <span style={{ fontSize: '11px', color: '#ec4899', fontWeight: 700 }}>{pct(feminino, total)}%</span>
                    </div>
                  </div>

                  {/* Missão anterior */}
                  <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Missão anterior</div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px', ...itemStyle('Já foram em missão') }}
                        onMouseEnter={e => hover(e, 'Já foram em missão', base.filter(v => v.ja_participou_missao === true))}
                        onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                        onClick={() => clique('Já foram em missão', voluntarios.filter(v => v.ja_participou_missao === true))}>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#F97310' }}>{missionarios}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Já foram</div>
                      </div>
                      <div style={{ width: '1px', background: '#f3f4f6' }} />
                      <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px', ...itemStyle('Primeira missão') }}
                        onMouseEnter={e => hover(e, 'Primeira missão', base.filter(v => !v.ja_participou_missao))}
                        onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                        onClick={() => clique('Primeira missão', voluntarios.filter(v => !v.ja_participou_missao))}>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#6b7280' }}>{total - missionarios}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Primeira vez</div>
                      </div>
                    </div>
                    <div style={{ height: '10px', borderRadius: '99px', background: '#f3f4f6', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${pct(missionarios, total)}%`, background: '#F97310' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#F97310', fontWeight: 700, marginTop: '6px' }}>{pct(missionarios, total)}% com experiência</div>
                  </div>

                  {/* Estado civil + extras */}
                  <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Perfil geral</div>
                    {[
                      { label: 'Solteiros', value: solteiros, color: '#8b5cf6', lista: voluntarios.filter(v => v.estado_civil === 'solteiro') },
                      { label: 'Casados', value: casados, color: '#F97310', lista: voluntarios.filter(v => v.estado_civil === 'casado') },
                      { label: 'Fora de MG', value: foraMG, color: '#3b82f6', lista: voluntarios.filter(v => v.cidade_estado_pais && !v.cidade_estado_pais.includes('Minas Gerais')) },
                      { label: 'Incompletos', value: incompletos, color: '#ef4444', lista: voluntarios.filter(v => camposFaltando(v).length > 0) },
                    ].map(item => (
                      <div key={item.label}
                        onMouseEnter={e => hover(e, item.label, base.filter(v => item.lista.find(x => x.id === v.id)))}
                        onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                        onClick={() => clique(item.label, item.lista)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', ...itemStyle(item.label) }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '6px', borderRadius: '99px', background: '#f3f4f6', overflow: 'hidden' }}>
                            <div style={{ width: `${pct(item.value, total)}%`, height: '100%', background: item.color }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: item.color, minWidth: '24px', textAlign: 'right' }}>{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Linha 3 */}
                <div className="dash-bot-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

                  {/* Cidades */}
                  <div style={{ background: '#fff', borderRadius: '16px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ background: 'transparent', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Cidades</div>
                      {(() => { const barCidade = Math.min(24, Math.max(6, Math.floor(280 / (topCidades.length || 1)))); const itemHCidade = barCidade + 28; const totalHCidade = itemHCidade * topCidades.length + 12 * (topCidades.length - 1); const justifyCidade = totalHCidade <= 320 ? 'center' : 'flex-start'; return (
                      <div style={{ overflowY: 'auto', height: '320px', paddingRight: '4px', display: 'flex', flexDirection: 'column', justifyContent: justifyCidade, gap: '12px' }}>
                      {topCidades.map(([cidade, qtd]) => (
                        <div key={cidade}
                          onMouseEnter={e => hover(e, cidade, base.filter(v => v.cidade_estado_pais?.split(',')[0].trim() === cidade))}
                          onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                          onClick={() => clique(cidade, voluntarios.filter(v => v.cidade_estado_pais?.split(',')[0].trim() === cidade))}
                          style={{ cursor: 'pointer', borderRadius: '8px', ...itemStyle(cidade) }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{cidade}</span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#F97310' }}>{qtd}</span>
                          </div>
                          <div style={{ height: `${barCidade}px`, borderRadius: '99px', background: '#f3f4f6', overflow: 'hidden' }}>
                            <div style={{ width: `${pct(qtd, maxCidade)}%`, height: '100%', background: '#F97310' }} />
                          </div>
                        </div>
                      ))}
                      </div>) })()}
                    </div>
                  </div>

                  {/* Competências */}
                  <div style={{ background: '#fff', borderRadius: '16px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ background: 'transparent', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Competências</div>
                      {(() => { const compFiltradas = competencias.filter(c => c.count > 0); const barComp = Math.min(24, Math.max(6, Math.floor(280 / (compFiltradas.length || 1)))); const itemHComp = barComp + 28; const totalHComp = itemHComp * compFiltradas.length + 12 * (compFiltradas.length - 1); const justifyComp = totalHComp <= 320 ? 'center' : 'flex-start'; return (
                      <div style={{ overflowY: 'auto', height: '320px', paddingRight: '4px', display: 'flex', flexDirection: 'column', justifyContent: justifyComp, gap: '12px' }}>
                      {compFiltradas.map(c => {
                        const compKey = c.label === 'Mídia/Fotos' ? 'tira_fotos' : c.label === 'Filmagem' ? 'faz_filmagens' : c.label === 'Canto' ? 'canta' : c.label === 'Instrumento' ? 'toca_instrumento' : c.label === 'Inglês' ? 'fala_ingles' : c.label === 'Espanhol' ? 'fala_espanhol' : 'outras_competencias'
                        return <div key={c.label}
                          onMouseEnter={e => hover(e, c.label, base.filter(v => v[compKey]))}
                          onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                          onClick={() => clique(c.label, voluntarios.filter(v => v[compKey]))}
                          style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', ...itemStyle(c.label) }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{c.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#8b5cf6' }}>{c.count}</span>
                          </div>
                          <div style={{ height: `${barComp}px`, borderRadius: '99px', background: '#f3f4f6', overflow: 'hidden' }}>
                            <div style={{ width: `${pct(c.count, maxComp)}%`, height: '100%', background: '#8b5cf6' }} />
                          </div>
                        </div>
                      })}
                      </div>) })()}
                    </div>
                  </div>
                </div>

                {/* Faixa etária */}
                <div className="dash-faixa-etaria" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '32px', overflow: 'visible' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Faixa etária</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
                    {faixas.map(f => {
                      const fLista = voluntarios.filter(v => {
                        if (f.label === '16–20') return v.idade >= 16 && v.idade <= 20
                        if (f.label === '21–25') return v.idade >= 21 && v.idade <= 25
                        if (f.label === '26–30') return v.idade >= 26 && v.idade <= 30
                        if (f.label === '31–40') return v.idade >= 31 && v.idade <= 40
                        if (f.label === '40+') return v.idade > 40
                        return false
                      })
                      const barH = maxFaixa === 0 ? 0 : Math.round((f.count / maxFaixa) * 100)
                      return <div key={f.label}
                        onMouseEnter={e => hover(e, `Faixa ${f.label}`, base.filter(v => fLista.find(x => x.id === v.id)))}
                        onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                        onClick={() => clique(`Faixa ${f.label}`, fLista)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', ...itemStyle(`Faixa ${f.label}`) }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f1117' }}>{f.count}</span>
                        <div style={{ width: '100%', background: '#F97310', borderRadius: '6px 6px 0 0', height: `${barH}px`, minHeight: f.count > 0 ? '6px' : '0', transition: 'height 0.4s' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginTop: '4px' }}>{f.label}</span>
                      </div>
                    })}
                  </div>
                </div>
              </>
            )
          })()}

          {menu === 'voluntarios' && !selected && (
            <>
              <h2 style={s.pageTitle}>Voluntários</h2>
              {loadingVol && <p style={s.info}>Carregando...</p>}

              {!loadingVol && voluntarios.length === 0 && <p style={s.info}>Nenhum voluntário cadastrado ainda.</p>}
              <div style={s.cards}>
                {voluntarios.map(v => (
                  <VoluntarioCard key={v.id} v={v} onClick={() => { const f = camposFaltando(v); setAlertaCampos(f.length > 0 ? { nome: v.nome_completo, campos: f } : null); setSelected(v) }} />
                ))}
              </div>
            </>
          )}

          {menu === 'voluntarios' && selected && (
            <div>

              {/* Barra de ações */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                {editando ? (
                  <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                    <button style={s.backBtn} onClick={cancelarEdicao}>Cancelar</button>
                    <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={salvarEdicao} disabled={salvando}>
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                ) : (
                  <>
                    <button style={s.backBtn} onClick={() => { setSelected(null); setEditandoStatus(false); setAlertaCampos(null) }}>Voltar</button>
                    <button style={s.editBtn} onClick={iniciarEdicao}>Editar</button>
                  </>
                )}
              </div>


              {/* Seção: Dados Pessoais */}
              <div style={s.formSection}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F97310', lineHeight: 1 }}>
                  <h3 style={{ ...s.formSectionTitle, margin: 0, padding: 0, border: 'none' }}>Dados Pessoais</h3>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{ ...s.modalStatus, cursor: 'pointer', background: selected.status === 'aprovado' ? '#dcfce7' : selected.status === 'reprovado' ? '#fee2e2' : '#fff4ec', color: selected.status === 'aprovado' ? '#16a34a' : selected.status === 'reprovado' ? '#dc2626' : '#F97310' }}
                      onClick={() => setEditandoStatus(e => !e)}
                    >
                      {selected.status || 'pendente'} ▾
                    </span>
                    {editandoStatus && (
                      <div style={s.statusDropdown}>
                        {['pendente', 'aprovado', 'reprovado'].map(op => (
                          <div key={op} style={{ ...s.statusDropItem, ...(selected.status === op ? s.statusDropItemActive : {}) }} onClick={() => alterarStatus(op)}>
                            {op.charAt(0).toUpperCase() + op.slice(1)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={s.formGrid}>
                  {editando ? (
                    <>
                      {editField('Nome Completo', 'nome_completo', formEdit, setField)}
                      {editField('Idade', 'idade', formEdit, setField, 'number')}
                      <div>
                        <label style={s.fieldLabel}>Sexo</label>
                        <select style={s.inputEdit} value={formEdit.sexo || ''} onChange={e => setField('sexo', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                        </select>
                      </div>
                      {editField('WhatsApp', 'whatsapp', formEdit, setField)}
                      {editField('Instagram', 'instagram', formEdit, setField)}
                      {editField('Cidade / Estado / País', 'cidade_estado_pais', formEdit, setField)}
                      <div>
                        <label style={s.fieldLabel}>Estado Civil</label>
                        <select style={s.inputEdit} value={formEdit.estado_civil || ''} onChange={e => setField('estado_civil', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="solteiro">Solteiro</option>
                          <option value="casado">Casado</option>
                        </select>
                      </div>
                      {formEdit.estado_civil === 'casado' && (
                        <div>
                          <label style={s.fieldLabel}>Cônjuge vai na missão?</label>
                          <select style={s.inputEdit} value={formEdit.conjuge_na_missao === true ? 'sim' : formEdit.conjuge_na_missao === false ? 'nao' : ''} onChange={e => setField('conjuge_na_missao', e.target.value === 'sim')}>
                            <option value="">Selecione</option>
                            <option value="sim">Sim</option>
                            <option value="nao">Não</option>
                          </select>
                        </div>
                      )}
                      {formEdit.estado_civil === 'casado' && formEdit.conjuge_na_missao === false && editField('Motivo cônjuge ausente', 'motivo_conjuge_ausente', formEdit, setField, 'textarea')}
                    </>
                  ) : (
                    <>
                      {formField('Nome Completo', selected.nome_completo)}
                      {formField('Idade', `${selected.idade} anos`)}
                      {formField('Sexo', selected.sexo ? selected.sexo.charAt(0).toUpperCase() + selected.sexo.slice(1) : null)}
                      {formField('WhatsApp', selected.whatsapp)}
                      {formField('Instagram', selected.instagram)}
                      {formField('Cidade / Estado / País', selected.cidade_estado_pais)}
                      {formField('Estado Civil', selected.estado_civil === 'casado' ? 'Casado' : 'Solteiro')}
                      {selected.estado_civil === 'casado' && formField('Cônjuge vai na missão?', selected.conjuge_na_missao ? 'Sim' : 'Não')}
                      {selected.motivo_conjuge_ausente && formField('Motivo cônjuge ausente', selected.motivo_conjuge_ausente)}
                    </>
                  )}
                </div>
              </div>

              {/* Seção: Igreja */}
              <div style={s.formSection}>
                <h3 style={s.formSectionTitle}>Igreja</h3>
                <div style={s.formGrid}>
                  {editando ? (
                    <>
                      {editField('Nome da Igreja', 'igreja', formEdit, setField)}
                      {editField('Pastor / Líder', 'nome_pastor', formEdit, setField)}
                      {editField('Telefone do Pastor / Líder', 'contato_pastor_lider', formEdit, setField)}
                      {editField('Como você serve na sua igreja local?', 'como_serve_igreja', formEdit, setField, 'textarea')}
                      {editField('Há quanto tempo está na sua igreja local?', 'tempo_na_igreja', formEdit, setField)}
                    </>
                  ) : (
                    <>
                      {formField('Nome da Igreja', selected.igreja)}
                      {formField('Pastor / Líder', selected.nome_pastor)}
                      {formField('Telefone do Pastor / Líder', selected.contato_pastor_lider)}
                      {formField('Como você serve na sua igreja local?', selected.como_serve_igreja)}
                      {formField('Há quanto tempo está na sua igreja local?', selected.tempo_na_igreja)}
                    </>
                  )}
                </div>
              </div>

              {/* Seção: Saúde e Experiência */}
              <div style={s.formSection}>
                <h3 style={s.formSectionTitle}>Saúde e Experiência</h3>
                <div style={s.formGrid}>
                  {editando ? (
                    <>
                      {editField('Nome de Emergência', 'nome_emergencia', formEdit, setField)}
                      {editField('Contato de Emergência', 'telefone_emergencia', formEdit, setField)}
                      {editField('Limitação física ou remédio especial?', 'limitacao_fisica', formEdit, setField, 'textarea')}
                      <div>
                        <label style={s.fieldLabel}>Já participou de viagem missionária?</label>
                        <select style={s.inputEdit} value={formEdit.ja_participou_missao === true ? 'sim' : formEdit.ja_participou_missao === false ? 'nao' : ''} onChange={e => setField('ja_participou_missao', e.target.value === 'sim')}>
                          <option value="">Selecione</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {formField('Nome de Emergência', selected.nome_emergencia)}
                      {formField('Contato de Emergência', selected.telefone_emergencia)}
                      {formField('Limitação física ou remédio especial?', selected.limitacao_fisica || 'Não informado')}
                      {formField('Já participou de viagem missionária?', selected.ja_participou_missao ? 'Sim' : 'Não')}
                    </>
                  )}
                </div>
              </div>

              {/* Seção: Competências */}
              <div style={s.formSection}>
                <h3 style={s.formSectionTitle}>Competências</h3>
                <div style={s.checkGrid}>
                  {Object.entries(COMPETENCIAS_LABEL).map(([key, label]) => (
                    <label key={key} style={{ ...s.checkLabel, opacity: (editando ? formEdit[key] : selected[key]) ? 1 : 0.35, cursor: editando ? 'pointer' : 'default' }}>
                      <input
                        type="checkbox"
                        checked={!!(editando ? formEdit[key] : selected[key])}
                        onChange={editando ? e => setField(key, e.target.checked) : undefined}
                        readOnly={!editando}
                        style={s.checkbox}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {(editando ? formEdit.outras_competencias : selected.outras_competencias) && (
                  <div style={{ marginTop: '16px' }}>
                    {editando
                      ? editField('Outra competência', 'outra_competencia_descricao', formEdit, setField, 'textarea')
                      : formField('Outra competência', selected.outra_competencia_descricao)
                    }
                  </div>
                )}
              </div>

            </div>
          )}

          {menu === 'locais' && (
            <>
              <h2 style={s.pageTitle}>Locais</h2>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                <button
                  title="Ver tabela"
                  onClick={() => { setViewLocais(v => { if (v === 'mapa') { setBuscaLocal('') } return v === 'tabela' ? 'mapa' : 'tabela' }) }}
                  style={{ flexShrink: 0, width: '40px', height: '40px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: viewLocais === 'tabela' ? '#F97310' : '#fff', color: viewLocais === 'tabela' ? '#fff' : '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
                >
                  ⊞
                </button>
                <input
                  style={{ ...s.inputEdit, flex: 1 }}
                  placeholder="Pesquisar local..."
                  value={buscaLocal}
                  onChange={e => setBuscaLocal(e.target.value)}
                />
              </div>

              {buscaLocal.length > 0 && buscaLocal !== localSelecionado?.nome && (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' }}>
                  {locais.filter(l => l.nome.toLowerCase().includes(buscaLocal.toLowerCase()) || l.bairro?.toLowerCase().includes(buscaLocal.toLowerCase())).slice(0, 8).map(l => (
                    <div key={l.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setLocalSelecionado(l); setBuscaLocal(l.nome) }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f1117' }}>{l.nome}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{l.endereco} — {l.bairro} — {l.regiao}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}


              {viewLocais === 'mapa' ? (
                <div style={{ position: 'relative' }}>
                  {localSelecionado?.endereco && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${localSelecionado.endereco}, ${localSelecionado.bairro}, Ibirité, MG`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...s.editBtn, textDecoration: 'none', position: 'absolute', top: '12px', right: '12px', zIndex: 1000, fontSize: '13px', background: '#F97310', color: '#fff' }}
                    >
                      Como chegar
                    </a>
                  )}
                  <MapaLocal local={localSelecionado} />
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #F97310' }}>
                        {['Tipo', 'Nome', 'Endereço', 'Bairro', 'Região'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: '#0f1117', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(buscaLocal ? locais.filter(l => l.nome.toLowerCase().includes(buscaLocal.toLowerCase()) || l.bairro?.toLowerCase().includes(buscaLocal.toLowerCase())) : locais).map((l, i) => (
                        <tr key={l.id} onClick={() => { setLocalSelecionado(l); setBuscaLocal(l.nome); setViewLocais('mapa') }} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fff4ec'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                        >
                          <td style={{ padding: '10px 16px', color: '#6b7280' }}>{l.tipo}</td>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f1117' }}>{l.nome}</td>
                          <td style={{ padding: '10px 16px', color: '#6b7280' }}>{l.endereco || '—'}</td>
                          <td style={{ padding: '10px 16px', color: '#6b7280' }}>{l.bairro}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F97310', background: '#fff4ec', borderRadius: '4px', padding: '2px 8px' }}>{l.regiao}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {menu === 'usuarios' && (
            <>
              <h2 style={s.pageTitle}>Usuários</h2>
              {loadingUsers && <p style={s.info}>Carregando...</p>}
              {!loadingUsers && usuarios.length === 0 && <p style={s.info}>Nenhum usuário cadastrado.</p>}
              <div style={s.cards}>
                {usuarios.map(u => (
                  <div key={u.id} style={s.card}>
                    <div style={s.cardAvatar}>{u.nome?.[0]?.toUpperCase()}</div>
                    <div style={s.cardInfo}>
                      <div style={s.cardNome}>{u.nome}</div>
                      <div style={s.cardSub}>{u.email}</div>
                      {u.telefone && <div style={s.cardSub}>{u.telefone}</div>}
                    </div>
                    <div style={s.cardStatus}>{u.perfil}</div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Bottom nav mobile */}
      <div className="dash-bottomnav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px', background: '#fff', borderTop: '1px solid #e5e7eb', zIndex: 200, alignItems: 'center', justifyContent: 'space-around' }}>
        {[
          { key: 'voluntarios', path: '/sistema/voluntario', label: 'Voluntários', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          )},
          { key: 'usuarios', path: '/sistema/usuarios', label: 'Usuários', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
            </svg>
          )},
          { key: 'locais', path: '/sistema/locais', label: 'Locais', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
            </svg>
          )},
          { key: 'dashboard', path: '/sistema/dashboard', label: 'Dashboard', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          )},
        ].map(item => {
          const ativo = menu === item.key
          return (
            <button key={item.key} onClick={() => navigate(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'transparent', border: 'none', cursor: 'pointer', color: ativo ? '#F97310' : '#9ca3af', padding: '6px 12px', fontFamily: 'inherit' }}>
              {item.icon}
              <span style={{ fontSize: '10px', fontWeight: 700 }}>{item.label}</span>
            </button>
          )
        })}
        {/* Perfil */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropdownOpen(o => !o)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit' }}>
            <div style={{ ...s.profileAvatar, width: '28px', height: '28px', fontSize: '11px' }}>{getInitials(nomeUsuario || user?.email)}</div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af' }}>Perfil</span>
          </button>
          {dropdownOpen && (
            <div style={{ ...s.dropdown, bottom: '64px', top: 'auto', right: 0 }}>
              <button style={s.dropdownItem} onClick={() => setDropdownOpen(false)}>Editar usuário</button>
              <div style={s.dropdownDivider} />
              <button style={{ ...s.dropdownItem, color: '#ef4444' }} onClick={handleSignOut}>Sair</button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

function VoluntarioCard({ v, onClick }) {
  const pendente = camposFaltando(v).length > 0
  return (
    <div style={{ ...s.card, ...(pendente ? { borderLeft: '4px solid #ef4444' } : {}) }} onClick={onClick}>
      <div style={s.cardAvatar}>{v.nome_completo?.[0]?.toUpperCase()}</div>
      <div style={s.cardInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={s.cardNome}>{v.nome_completo}</span>
          {pendente && <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '1px 6px' }}>incompleto</span>}
        </div>
        <div style={s.cardSub}>{v.cidade_estado_pais}</div>
        <div style={s.cardSub}>{v.idade} anos</div>
      </div>
      <div style={s.cardStatus}>{v.status || 'pendente'}</div>
    </div>
  )
}

function editField(label, key, form, setField, type = 'text') {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>{label}</label>
      {type === 'textarea'
        ? <textarea style={{ ...s.inputEdit, minHeight: '80px', resize: 'vertical' }} value={form[key] || ''} onChange={e => setField(key, e.target.value)} />
        : <input type={type} style={s.inputEdit} value={form[key] || ''} onChange={e => setField(key, e.target.value)} />
      }
    </div>
  )
}

function formField(label, value) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>{label}</label>
      <div style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#0f1117', background: '#f9fafb', minHeight: '40px' }}>
        {value || '—'}
      </div>
    </div>
  )
}

function row(label, value) {
  if (!value) return null
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowValue}>{value}</span>
    </div>
  )
}

const s = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f9fafb',
    fontFamily: "'Nunito', sans-serif",
    overflow: 'hidden',
  },
  header: {
    background: '#0f1117',
    padding: '0 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerUser: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  profileBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'transparent',
    border: 'none',
    borderRadius: '10px',
    padding: '6px 14px 6px 6px',
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
  },
  profileAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: '#F97310',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 900,
    flexShrink: 0,
  },
  profileEmail: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 600,
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  profileChevron: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    minWidth: '180px',
    overflow: 'hidden',
    zIndex: 200,
  },
  dropdownItem: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: "'Nunito', sans-serif",
  },
  dropdownDivider: {
    height: '1px',
    background: '#f3f4f6',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  sidebar: {
    width: '220px',
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    padding: '28px 16px',
    flexShrink: 0,
    overflowY: 'auto',
  },
  sidebarLabel: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
    paddingLeft: '12px',
  },
  menuItem: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: "'Nunito', sans-serif",
    marginBottom: '4px',
  },
  menuItemActive: {
    background: '#fff4ec',
    color: '#F97310',
  },
  main: {
    flex: 1,
    paddingTop: '32px',
    paddingLeft: '32px',
    paddingRight: '32px',
    paddingBottom: '0',
    overflowY: 'auto',
    minHeight: 0,
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#0f1117',
    marginBottom: '24px',
  },
  info: {
    color: '#9ca3af',
    fontSize: '14px',
  },
  cards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1.5px solid transparent',
    transition: 'border-color 0.2s',
  },
  cardAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: '#F97310',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 900,
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
  },
  cardNome: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#0f1117',
  },
  cardSub: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  cardStatus: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#F97310',
    background: '#fff4ec',
    borderRadius: '20px',
    padding: '4px 12px',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 8px 48px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  modalScrollBody: {
    overflowY: 'auto',
    padding: '0 24px 24px',
    flex: 1,
    scrollbarWidth: 'thin',
    scrollbarColor: 'transparent transparent',
  },
  modalClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    color: '#374151',
  },
  modalHeaderFixed: {
    padding: '24px 24px 0',
    background: '#fff',
    borderRadius: '16px 16px 0 0',
    flexShrink: 0,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f3f4f6',
  },
  inputEdit: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0f1117',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#6b7280',
    marginBottom: '6px',
  },
  backBtn: {
    background: 'none',
    border: '2px solid #F97310',
    color: '#F97310',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '6px 20px',
    borderRadius: '8px',
  },
  editBtn: {
    background: 'none',
    border: '2px solid #F97310',
    color: '#F97310',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '6px 20px',
    borderRadius: '8px',
  },
  detalheHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '2px solid #f3f4f6',
  },
  modalAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#F97310',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 900,
    flexShrink: 0,
  },
  modalNome: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#0f1117',
    margin: '0 0 6px',
  },
  modalStatus: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#F97310',
    background: '#fff4ec',
    borderRadius: '20px',
    padding: '3px 12px',
    textTransform: 'capitalize',
  },
  formSection: {
    background: '#fff',
    borderRadius: '16px',
    padding: '28px 32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    marginBottom: '16px',
  },
  formSectionTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#0f1117',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #F97310',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  checkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f1117',
    cursor: 'default',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#F97310',
  },
  detalheGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    alignItems: 'start',
  },
  detalheCard: {
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '1px solid #f3f4f6',
  },
  detalheCardTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '10px',
  },
  modalGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
    gap: '16px',
  },
  rowLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#9ca3af',
    flexShrink: 0,
    minWidth: '140px',
  },
  rowValue: {
    fontSize: '13px',
    color: '#0f1117',
    fontWeight: 600,
    textAlign: 'right',
  },
  competencias: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '2px solid #f3f4f6',
  },
  competenciasTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '10px',
  },
  competenciasTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    background: '#fff4ec',
    color: '#F97310',
    borderRadius: '20px',
    padding: '4px 14px',
    fontSize: '13px',
    fontWeight: 700,
  },
  statusDropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 100,
    overflow: 'hidden',
    minWidth: '140px',
  },
  statusDropItem: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#374151',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
  },
  statusDropItemActive: {
    background: '#fff4ec',
    color: '#F97310',
  },
  modalSub: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '10px',
  },
}
