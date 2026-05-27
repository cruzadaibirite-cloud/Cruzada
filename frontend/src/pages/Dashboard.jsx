import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MENU = [
  { key: 'voluntarios', label: 'Voluntários', path: '/sistema/voluntario' },
  { key: 'usuarios', label: 'Usuários', path: '/sistema/usuarios' },
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
  const menu = location.pathname === '/sistema/voluntario' ? 'voluntarios' : location.pathname === '/sistema/usuarios' ? 'usuarios' : 'voluntarios'
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
              onClick={() => navigate(item.path)}
              style={{ ...s.menuItem, ...(menu === item.key ? s.menuItemActive : {}) }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={s.main}>

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
