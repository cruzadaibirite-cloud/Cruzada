import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MENU = [
  { key: 'voluntarios', label: 'Voluntários' },
  { key: 'usuarios', label: 'Usuários' },
]

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
  const [menu, setMenu] = useState('voluntarios')
  const [voluntarios, setVoluntarios] = useState([])
  const [loadingVol, setLoadingVol] = useState(false)
  const [selected, setSelected] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [editandoStatus, setEditandoStatus] = useState(false)

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
    if (menu === 'voluntarios') carregarVoluntarios()
    if (menu === 'usuarios') carregarUsuarios()
  }, [menu])

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

  async function alterarStatus(status) {
    await supabase.from('voluntarios').update({ status }).eq('id', selected.id)
    setSelected(v => ({ ...v, status }))
    setVoluntarios(list => list.map(v => v.id === selected.id ? { ...v, status } : v))
    setEditandoStatus(false)
  }

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLogo}>
          <img src="/logo1.png" alt="Logo" style={{ height: '36px', width: 'auto' }} />
          <span style={s.headerTitle}>Cruzada <span style={{ color: '#F97310' }}>Ibirité</span></span>
        </div>
        <div style={{ position: 'relative' }}>
          <button style={s.profileBtn} onClick={() => setDropdownOpen(o => !o)}>
            <div style={s.profileAvatar}>{getInitials(nomeUsuario || user?.email)}</div>
            <span style={s.profileEmail}>{nomeUsuario || user?.email}</span>
            <span style={s.profileChevron}>▾</span>
          </button>
          {dropdownOpen && (
            <div style={s.dropdown}>
              <button style={s.dropdownItem} onClick={() => { setDropdownOpen(false) }}>
                Editar usuário
              </button>
              <div style={s.dropdownDivider} />
              <button style={{ ...s.dropdownItem, color: '#ef4444' }} onClick={handleSignOut}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={s.body}>

        {/* Sidebar */}
        <div style={s.sidebar}>
          <p style={s.sidebarLabel}>Menu</p>
          {MENU.map(item => (
            <button
              key={item.key}
              onClick={() => setMenu(item.key)}
              style={{ ...s.menuItem, ...(menu === item.key ? s.menuItemActive : {}) }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={s.main}>

          {menu === 'voluntarios' && (
            <>
              <h2 style={s.pageTitle}>Voluntários</h2>
              {loadingVol && <p style={s.info}>Carregando...</p>}
              {!loadingVol && voluntarios.length === 0 && <p style={s.info}>Nenhum voluntário cadastrado ainda.</p>}
              <div style={s.cards}>
                {voluntarios.map(v => (
                  <div key={v.id} style={s.card} onClick={() => setSelected(v)}>
                    <div style={s.cardAvatar}>{v.nome_completo?.[0]?.toUpperCase()}</div>
                    <div style={s.cardInfo}>
                      <div style={s.cardNome}>{v.nome_completo}</div>
                      <div style={s.cardSub}>{v.cidade_estado_pais}</div>
                      <div style={s.cardSub}>{v.idade} anos</div>
                    </div>
                    <div style={s.cardStatus}>{v.status || 'pendente'}</div>
                  </div>
                ))}
              </div>
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

      {/* Modal voluntário */}
      {selected && (
        <div style={s.modalOverlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {/* Header fixo */}
            <div style={s.modalHeaderFixed}>
              <button style={s.modalClose} onClick={() => setSelected(null)}>✕</button>
              <div style={s.modalHeader}>
                <div style={s.modalAvatar}>{selected.nome_completo?.[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <h2 style={s.modalNome}>{selected.nome_completo}</h2>
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: '6px' }}>
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
              </div>
            </div>

            {/* Corpo com scroll */}
            <div style={s.modalScrollBody}>
              <div style={s.modalGrid}>
                {row('Idade', `${selected.idade} anos`)}
                {row('WhatsApp', selected.whatsapp)}
                {row('Instagram', selected.instagram)}
                {row('Cidade', selected.cidade_estado_pais)}
                {row('Igreja', selected.igreja)}
                {row('Pastor / Líder', selected.nome_pastor)}
                {row('Telefone Pastor', selected.contato_pastor_lider)}
                {row('Como serve', selected.como_serve_igreja)}
                {row('Tempo na igreja', selected.tempo_na_igreja)}
                {row('Estado Civil', selected.estado_civil)}
                {selected.estado_civil === 'casado' && row('Cônjuge na missão?', selected.conjuge_na_missao ? 'Sim' : 'Não')}
                {selected.motivo_conjuge_ausente && row('Motivo cônjuge ausente', selected.motivo_conjuge_ausente)}
                {row('Emergência', selected.nome_emergencia)}
                {row('Tel. Emergência', selected.telefone_emergencia)}
                {row('Limitação física', selected.limitacao_fisica || 'Nenhuma')}
                {row('Já missionou?', selected.ja_participou_missao ? 'Sim' : 'Não')}
              </div>

              {Object.keys(COMPETENCIAS_LABEL).some(k => selected[k]) && (
                <div style={s.competencias}>
                  <div style={s.competenciasTitle}>Competências</div>
                  <div style={s.competenciasTags}>
                    {Object.entries(COMPETENCIAS_LABEL).filter(([k]) => selected[k]).map(([k, label]) => (
                      <span key={k} style={s.tag}>{label}</span>
                    ))}
                  </div>
                  {selected.outra_competencia_descricao && (
                    <p style={s.modalSub}>Outra: {selected.outra_competencia_descricao}</p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

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
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily: "'Nunito', sans-serif",
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
    minHeight: 'calc(100vh - 64px)',
  },
  sidebar: {
    width: '220px',
    background: '#fff',
    borderRight: '1px solid #e5e7eb',
    padding: '28px 16px',
    flexShrink: 0,
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
    padding: '32px',
    overflowY: 'auto',
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
