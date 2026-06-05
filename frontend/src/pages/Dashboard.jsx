import { useState, useEffect, useRef, useCallback } from 'react'
import MapaLocal from '../components/MapaLocal'
import MapaEvangelismo from '../components/MapaEvangelismo'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MENU = [
  { key: 'voluntarios', label: 'Voluntários', path: '/sistema/voluntario' },
  { key: 'usuarios', label: 'Usuários', path: '/sistema/usuarios' },
  { key: 'locais', label: 'Locais', path: '/sistema/locais' },
  { key: 'agenda', label: 'Agenda', path: '/sistema/agenda' },
  { key: 'evangelismo', label: 'Evangelismo', path: '/sistema/evangelismo' },
  { key: 'mapa', label: 'Mapa', path: '/sistema/mapa' },
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
  const menu = location.pathname === '/sistema/voluntario' ? 'voluntarios' : location.pathname === '/sistema/usuarios' ? 'usuarios' : location.pathname === '/sistema/locais' ? 'locais' : location.pathname === '/sistema/agenda' ? 'agenda' : location.pathname === '/sistema/evangelismo' ? 'evangelismo' : location.pathname === '/sistema/mapa' ? 'mapa' : location.pathname === '/sistema/dashboard' ? 'dashboard' : 'voluntarios'
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
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false)
  const [formNovoUsuario, setFormNovoUsuario] = useState({ nome: '', email: '', senha: '', telefone: '', perfil: 'voluntario' })
  const [salvandoUsuario, setSalvandoUsuario] = useState(false)
  const [erroUsuario, setErroUsuario] = useState('')
  const [selectedUsuario, setSelectedUsuario] = useState(null)
  const [confirmDeleteUsuario, setConfirmDeleteUsuario] = useState(false)
  const [deletandoUsuario, setDeletandoUsuario] = useState(false)
  const [buscaVoluntario, setBuscaVoluntario] = useState('')
  const [sugestoesVoluntario, setSugestoesVoluntario] = useState([])
  const [usuarioOrgs, setUsuarioOrgs] = useState({ equipes: [], grupos: [] })

  // Agenda
  const hoje = new Date()
  const [agendaView, setAgendaView] = useState('mes') // dia | semana | mes | agenda
  const [agendaData, setAgendaData] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [agendaEventos, setAgendaEventos] = useState([])
  const [modalEvento, setModalEvento] = useState(null) // { tipo: 'novo', dia } | { tipo: 'ver', evento } | { tipo: 'editar', evento }
  const [formEditEvento, setFormEditEvento] = useState({})
  const [buscaLocalEvento, setBuscaLocalEvento] = useState('')
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [formEvento, setFormEvento] = useState({ titulo: '', data: '', horaInicio: '', horaFim: '', cor: '#F97310', descricao: '', local: '', localId: null, equipe: '', equipeId: null })
  const [equipes, setEquipes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [organizacoes, setOrganizacoes] = useState([])
  const [agendaDiaSelecionado, setAgendaDiaSelecionado] = useState(null) // { diaObj, evsDia }
  const [agendaDiaModal, setAgendaDiaModal] = useState(null) // modal da lista do dia
  const [agendaDiaEventoAberto, setAgendaDiaEventoAberto] = useState(null) // evento aberto no modal do dia
  const [mobileDiaSel, setMobileDiaSel] = useState(new Date())

  // Evangelismo
  const [abordagens, setAbordagens] = useState([])
  const [loadingEvang, setLoadingEvang] = useState(false)
  const [modalAbordagem, setModalAbordagem] = useState(false)
  const [salvandoAbordagem, setSalvandoAbordagem] = useState(false)
  const [formAbordagem, setFormAbordagem] = useState({ local: '', endereco: '', data_hora: '', observacao: '' })
  const [pessoas, setPessoas] = useState([{ nome: '', telefone: '', endereco_pessoa: '', observacao: '' }])
  const [abordagemSelecionada, setAbordagemSelecionada] = useState(null)
  const [evangelizados, setEvangelizados] = useState([])
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false)
  const [erroAbordagem, setErroAbordagem] = useState('')
  const [sugestoesEndereco, setSugestoesEndereco] = useState([])
  const [enderecoConfirmado, setEnderecoConfirmado] = useState(false)
  const buscaEnderecoTimer = useRef(null)
  const [sugestoesPessoa, setSugestoesPessoa] = useState({})
  const [pessoasConfirmadas, setPessoasConfirmadas] = useState({})
  const buscaPessoaTimer = useRef({})
  const [abordagensComTotal, setAbordagensComTotal] = useState([])
  const [editandoEvangelizado, setEditandoEvangelizado] = useState(null)
  const [formEditEvangelizado, setFormEditEvangelizado] = useState({})
  const [salvandoEvangelizado, setSalvandoEvangelizado] = useState(false)
  const [editandoAbordagem, setEditandoAbordagem] = useState(false)
  const [formEditAbordagem, setFormEditAbordagem] = useState({})
  const [salvandoEditAbordagem, setSalvandoEditAbordagem] = useState(false)

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
    if (menu === 'usuarios') { carregarUsuarios(); carregarEquipes(); carregarGrupos() }
    if (menu === 'locais' || menu === 'agenda') carregarLocais()
    if (menu === 'agenda') { carregarEventos(); carregarEquipes() }
    if (menu === 'evangelismo') carregarAbordagens()
    if (menu === 'mapa') carregarAbordagensComTotal()
  }, [menu])

  async function carregarEventos() {
    const { data } = await supabase.from('eventos').select('*, locais(nome), equipes(nome)').order('data').order('hora_inicio')
    if (data) {
      setAgendaEventos(data.map(e => ({
        id: e.id,
        titulo: e.titulo,
        data: new Date(e.data + 'T00:00:00'),
        horaInicio: e.hora_inicio?.slice(0, 5),
        horaFim: e.hora_fim?.slice(0, 5),
        hora: e.hora_inicio?.slice(0, 5),
        cor: e.cor || '#F97310',
        descricao: e.descricao || '',
        local: e.locais?.nome || '',
        localId: e.local_id || null,
        equipe: e.equipes?.nome || '',
        equipeId: e.equipe_id || null,
      })))
    }
  }

  async function carregarEquipes() {
    const { data } = await supabase.from('equipes').select('*').order('nome')
    setEquipes(data || [])
    setOrganizacoes(data || [])
  }

  async function carregarGrupos() {
    const { data } = await supabase.from('grupos').select('*').order('nome')
    setGrupos(data || [])
  }

  async function carregarOrganizacoes() {
    await carregarEquipes()
  }

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

  async function criarUsuario() {
    setSalvandoUsuario(true)
    setErroUsuario('')
    const { nome, email, senha, telefone, perfil } = formNovoUsuario
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) { setErroUsuario(error.message); setSalvandoUsuario(false); return }
    const uid = data.user?.id
    if (uid) {
      const { error: insertError } = await supabase.from('usuarios').insert({ id: uid, nome, email, telefone: telefone || null, perfil, ativo: true })
      if (insertError) console.error('Erro insert usuarios:', insertError)
    } else {
      console.error('uid nulo, data:', data)
    }
    setSalvandoUsuario(false)
    setModalNovoUsuario(false)
    setFormNovoUsuario({ nome: '', email: '', senha: '', telefone: '', perfil: 'voluntario' })
    carregarUsuarios()
  }

  async function carregarOrgsUsuario(uid) {
    const [{ data: eqs }, { data: grs }] = await Promise.all([
      supabase.from('usuario_equipes').select('equipe_id').eq('usuario_id', uid),
      supabase.from('usuario_grupos').select('grupo_id').eq('usuario_id', uid),
    ])
    setUsuarioOrgs({
      equipes: (eqs || []).map(r => r.equipe_id),
      grupos: (grs || []).map(r => r.grupo_id),
    })
  }

  async function toggleEquipeUsuario(uid, id, ativo) {
    if (ativo) {
      await supabase.from('usuario_equipes').delete().eq('usuario_id', uid).eq('equipe_id', id)
      setUsuarioOrgs(prev => ({ ...prev, equipes: prev.equipes.filter(x => x !== id) }))
    } else {
      await supabase.from('usuario_equipes').insert({ usuario_id: uid, equipe_id: id })
      setUsuarioOrgs(prev => ({ ...prev, equipes: [...prev.equipes, id] }))
    }
  }

  async function toggleGrupoUsuario(uid, id, ativo) {
    if (ativo) {
      await supabase.from('usuario_grupos').delete().eq('usuario_id', uid).eq('grupo_id', id)
      setUsuarioOrgs(prev => ({ ...prev, grupos: prev.grupos.filter(x => x !== id) }))
    } else {
      await supabase.from('usuario_grupos').insert({ usuario_id: uid, grupo_id: id })
      setUsuarioOrgs(prev => ({ ...prev, grupos: [...prev.grupos, id] }))
    }
  }

  async function buscarVoluntariosParaVinculo(texto) {
    setBuscaVoluntario(texto)
    if (texto.length < 2) { setSugestoesVoluntario([]); return }
    const { data } = await supabase.from('voluntarios').select('id, nome_completo').ilike('nome_completo', `%${texto}%`).limit(8)
    setSugestoesVoluntario(data || [])
  }

  async function ativarUsuario(u) {
    const novoAtivo = !u.ativo
    await supabase.from('usuarios').update({ ativo: novoAtivo }).eq('id', u.id)
    setSelectedUsuario(v => ({ ...v, ativo: novoAtivo }))
    setUsuarios(list => list.map(x => x.id === u.id ? { ...x, ativo: novoAtivo } : x))
  }

  async function deletarUsuario(uid) {
    setDeletandoUsuario(true)
    await supabase.from('usuarios').delete().eq('id', uid)
    await supabase.auth.admin.deleteUser(uid)
    setDeletandoUsuario(false)
    setSelectedUsuario(null)
    setConfirmDeleteUsuario(false)
    carregarUsuarios()
  }

  async function carregarAbordagensComTotal() {
    const { data } = await supabase
      .from('abordagens')
      .select('*, evangelizados(count)')
      .order('data_hora', { ascending: false })
    if (data) {
      setAbordagensComTotal(data.map(ab => ({
        ...ab,
        total_pessoas: ab.evangelizados?.[0]?.count || 0,
      })))
    }
  }

  async function carregarAbordagens() {
    setLoadingEvang(true)
    const { data } = await supabase
      .from('abordagens')
      .select('*, usuarios(nome)')
      .order('data_hora', { ascending: false })
    setAbordagens(data || [])
    setLoadingEvang(false)
  }

  async function carregarEvangelizados(abordagemId) {
    const { data } = await supabase
      .from('evangelizados')
      .select('*, usuarios!responsavel_id(nome)')
      .eq('abordagem_id', abordagemId)
      .order('criado_em')
    setEvangelizados(data || [])
  }

  async function salvarAbordagem() {
    setErroAbordagem('')
    if (!formAbordagem.endereco.trim() || !enderecoConfirmado) { setErroAbordagem('Selecione um endereço da lista de sugestões.'); return }
    if (!formAbordagem.data_hora) { setErroAbordagem('Preencha a data e hora.'); return }
    for (let i = 0; i < pessoas.length; i++) {
      const p = pessoas[i]
      if (!p.nome.trim()) { setErroAbordagem(`Preencha o nome da pessoa ${i + 1}.`); return }
      if (!p.telefone.trim()) { setErroAbordagem(`Preencha o telefone da pessoa ${i + 1}.`); return }
      if (!p.endereco_pessoa.trim() || !pessoasConfirmadas[i]) { setErroAbordagem(`Selecione o endereço da pessoa ${i + 1} na lista de sugestões.`); return }
      // observacao é opcional
    }
    setSalvandoAbordagem(true)
    const pessoasValidas = pessoas.filter(p => p.nome.trim())
    const { error } = await supabase.rpc('registrar_abordagem', {
      p_local: formAbordagem.endereco,
      p_endereco: formAbordagem.endereco || null,
      p_data_hora: formAbordagem.data_hora || new Date().toISOString(),
      p_usuario_id: user?.id,
      p_observacao: formAbordagem.observacao || null,
      p_pessoas: pessoasValidas,
    })
    setSalvandoAbordagem(false)
    if (!error) {
      setModalAbordagem(false)
      setFormAbordagem({ local: '', endereco: '', data_hora: '', observacao: '' })
      setPessoas([{ nome: '', telefone: '', endereco_pessoa: '', observacao: '' }])
      carregarAbordagens()
    }
  }

  function buscarSugestoesPessoa(idx, texto) {
    setPessoas(p => p.map((x, i) => i === idx ? { ...x, endereco_pessoa: texto } : x))
    setPessoasConfirmadas(prev => ({ ...prev, [idx]: false }))
    clearTimeout(buscaPessoaTimer.current[idx])
    if (texto.length < 4) { setSugestoesPessoa(prev => ({ ...prev, [idx]: [] })); return }
    buscaPessoaTimer.current[idx] = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto)}&format=json&limit=5&addressdetails=1`)
        const data = await res.json()
        setSugestoesPessoa(prev => ({ ...prev, [idx]: data.map(d => {
          const a = d.address
          return [a.road, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.municipality || a.village].filter(Boolean).join(', ')
        }) }))
      } catch {
        setSugestoesPessoa(prev => ({ ...prev, [idx]: [] }))
      }
    }, 400)
  }

  function selecionarEnderecoPessoa(idx, endereco) {
    setPessoas(p => p.map((x, i) => i === idx ? { ...x, endereco_pessoa: endereco } : x))
    setSugestoesPessoa(prev => ({ ...prev, [idx]: [] }))
    setPessoasConfirmadas(prev => ({ ...prev, [idx]: true }))
  }

  function buscarSugestoesEndereco(texto) {
    setFormAbordagem(f => ({ ...f, endereco: texto }))
    setEnderecoConfirmado(false)
    clearTimeout(buscaEnderecoTimer.current)
    if (texto.length < 4) { setSugestoesEndereco([]); return }
    buscaEnderecoTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto)}&format=json&limit=5&addressdetails=1`)
        const data = await res.json()
        setSugestoesEndereco(data.map(d => {
          const a = d.address
          return [a.road, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.municipality || a.village].filter(Boolean).join(', ')
        }))
      } catch {
        setSugestoesEndereco([])
      }
    }, 400)
  }

  function selecionarEndereco(endereco) {
    setFormAbordagem(f => ({ ...f, endereco }))
    setSugestoesEndereco([])
    setEnderecoConfirmado(true)
  }

  async function usarLocalizacaoAtual() {
    if (!navigator.geolocation) return
    setBuscandoLocalizacao(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)
          const data = await res.json()
          const agora = new Date()
          const dataHoraLocal = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}T${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
          const a = data.address
          const endFormatado = [a.road, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.municipality || a.village].filter(Boolean).join(', ')
          setFormAbordagem(f => ({ ...f, endereco: endFormatado, data_hora: dataHoraLocal }))
          setEnderecoConfirmado(true)
          setSugestoesEndereco([])
        } catch {
          setFormAbordagem(f => ({ ...f, endereco: `${coords.latitude}, ${coords.longitude}` }))
        }
        setBuscandoLocalizacao(false)
      },
      () => setBuscandoLocalizacao(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function salvarEdicaoAbordagem() {
    setSalvandoEditAbordagem(true)
    const { error } = await supabase.from('abordagens').update({
      local: formEditAbordagem.endereco,
      endereco: formEditAbordagem.endereco,
      data_hora: formEditAbordagem.data_hora || null,
      observacao: formEditAbordagem.observacao || null,
    }).eq('id', abordagemSelecionada.id)
    setSalvandoEditAbordagem(false)
    if (!error) {
      const atualizada = { ...abordagemSelecionada, ...formEditAbordagem, local: formEditAbordagem.endereco }
      setAbordagemSelecionada(atualizada)
      setAbordagens(list => list.map(a => a.id === atualizada.id ? atualizada : a))
      setEditandoAbordagem(false)
    }
  }

  async function salvarEdicaoEvangelizado() {
    setSalvandoEvangelizado(true)
    const { error } = await supabase.from('evangelizados').update({
      nome: formEditEvangelizado.nome,
      telefone: formEditEvangelizado.telefone,
      endereco_pessoa: formEditEvangelizado.endereco_pessoa,
      observacao: formEditEvangelizado.observacao,
    }).eq('id', editandoEvangelizado)
    setSalvandoEvangelizado(false)
    if (!error) {
      setEvangelizados(list => list.map(e => e.id === editandoEvangelizado ? { ...e, ...formEditEvangelizado } : e))
      setEditandoEvangelizado(null)
      setFormEditEvangelizado({})
    }
  }

  async function atualizarStatusEvangelizado(id, status) {
    await supabase.from('evangelizados').update({ status_contato: status, data_contato: new Date().toISOString() }).eq('id', id)
    setEvangelizados(list => list.map(e => e.id === id ? { ...e, status_contato: status } : e))
  }

  async function alterarStatus(status) {
    await supabase.from('voluntarios').update({ status }).eq('id', selected.id)
    setSelected(v => ({ ...v, status }))
    setVoluntarios(list => list.map(v => v.id === selected.id ? { ...v, status } : v))
    setEditandoStatus(false)
  }

  return (
    <div style={s.page}>

      {/* Modal lista do dia - agenda */}
      {agendaDiaModal && (
        <div style={s.modalOverlay} onClick={() => { setAgendaDiaModal(null); setAgendaDiaEventoAberto(null) }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setAgendaDiaModal(null); setAgendaDiaEventoAberto(null) }} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

            {agendaDiaEventoAberto ? (
              // Tela de detalhe
              <>
                <button onClick={() => setAgendaDiaEventoAberto(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontWeight: 700, fontSize: '13px', marginBottom: '20px', padding: 0, fontFamily: 'inherit' }}>← Voltar</button>
                {(() => {
                  const ev = agendaDiaModal.evsDia.find(e => e.id === agendaDiaEventoAberto)
                  if (!ev) return null
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1.5px solid #f3f4f6' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: ev.cor || '#F97310', flexShrink: 0 }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', margin: 0 }}>{ev.titulo}</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}><span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '90px' }}>Horário</span><span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{ev.horaInicio || ev.hora} – {ev.horaFim || '—'}</span></div>
                        {ev.local && <div style={{ display: 'flex', gap: '10px' }}><span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '90px' }}>Local</span><span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{ev.local}</span></div>}
                        {ev.equipe && <div style={{ display: 'flex', gap: '10px' }}><span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '90px' }}>Equipe</span><span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{ev.equipe}</span></div>}
                        {ev.descricao && <div style={{ display: 'flex', gap: '10px' }}><span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '90px' }}>Observações</span><span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{ev.descricao}</span></div>}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                        <button style={{ ...s.editBtn, flex: 1, textAlign: 'center' }} onClick={() => { setAgendaDiaModal(null); setAgendaDiaEventoAberto(null); setModalEvento({ tipo: 'editar', evento: ev }); const d = ev.data; setFormEditEvento({ titulo: ev.titulo, data: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, horaInicio: ev.horaInicio || ev.hora, horaFim: ev.horaFim || '', cor: ev.cor, descricao: ev.descricao || '', local: ev.local || '', localId: ev.localId || null, equipe: ev.equipe || '', organizacaoId: ev.organizacaoId || null }) }}>Editar</button>
                        <button style={{ ...s.editBtn, flex: 1, textAlign: 'center', background: '#f3f4f6', color: '#0f1117', borderColor: '#e5e7eb' }} onClick={() => { if (window.confirm(`Excluir "${ev.titulo}"?`)) { /* excluirEvento handled outside */ } }}>Excluir</button>
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : (
              // Tela de lista
              <>
                <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #F97310' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][agendaDiaModal.diaObj.getDay()]}</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f1117', lineHeight: 1.2 }}>{agendaDiaModal.diaObj.getDate()} de {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][agendaDiaModal.diaObj.getMonth()]} · {agendaDiaModal.diaObj.getFullYear()}</div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{agendaDiaModal.evsDia.length} evento{agendaDiaModal.evsDia.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {agendaDiaModal.evsDia.map((ev, idx) => (
                    <div key={ev.id} onClick={() => setAgendaDiaEventoAberto(ev.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < agendaDiaModal.evsDia.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.cor || '#F97310', flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f1117' }}>{ev.titulo}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#F97310', whiteSpace: 'nowrap', marginLeft: '16px' }}>{ev.horaInicio || ev.hora} – {ev.horaFim || '—'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal campos pendentes */}
      {alertaCampos && (
        <div style={s.modalOverlay} onClick={() => setAlertaCampos(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚠</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', margin: 0 }}>Cadastro incompleto</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, marginTop: '2px' }}>{alertaCampos.nome}</p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>Os seguintes campos obrigatórios estão pendentes:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              {alertaCampos.campos.map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#0f1117', fontSize: '12px' }}>●</span>
                  <span style={{ fontSize: '14px', color: '#0f1117', fontWeight: 600 }}>{c}</span>
                </div>
              ))}
            </div>
            <button style={{ ...s.editBtn, width: '100%', textAlign: 'center' }} onClick={() => setAlertaCampos(null)}>Fechar</button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .agenda-mobile { display: block !important; }
          .agenda-desktop { display: none !important; }
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
          .dash-check-grid { grid-template-columns: 1fr !important; }
          .dash-form-grid { grid-template-columns: 1fr !important; }
          .dash-faixa-etaria { margin-bottom: 24px !important; }
        }
        @media (min-width: 769px) {
          .dash-bottomnav { display: none !important; }
          .agenda-mobile { display: none !important; }
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
          <img src="/icon-512.png" alt="Logo" style={{ height: '22px', width: 'auto' }} />
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
              <button style={{ ...s.dropdownItem, color: '#0f1117' }} onClick={handleSignOut}>Sair</button>
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
                    { label: 'Aprovados', value: aprovados, color: '#F97310', bg: '#fff4ec', border: '#fed7aa', lista: voluntarios.filter(v => v.status === 'aprovado') },
                    { label: 'Pendentes', value: pendentes, color: '#F97310', bg: '#fff4ec', border: '#fed7aa', lista: voluntarios.filter(v => !v.status || v.status === 'pendente') },
                    { label: 'Reprovados', value: reprovados, color: '#0f1117', bg: '#f3f4f6', border: '#e5e7eb', lista: voluntarios.filter(v => v.status === 'reprovado') },
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
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f1117' }}>{masculino}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Masculino</div>
                      </div>
                      <div style={{ width: '1px', background: '#f3f4f6' }} />
                      <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px', ...itemStyle('Feminino') }}
                        onMouseEnter={e => hover(e, 'Feminino', base.filter(v => v.sexo === 'Feminino'))}
                        onMouseLeave={() => { clearTimeout(tooltipTimer.current); tooltipTimer.current = setTimeout(() => setTooltip(null), 150) }}
                        onClick={() => clique('Feminino', voluntarios.filter(v => v.sexo === 'Feminino'))}>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#F97310' }}>{feminino}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Feminino</div>
                      </div>
                    </div>
                    <div style={{ height: '10px', borderRadius: '99px', background: '#f3f4f6', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${pct(masculino, total)}%`, background: '#0f1117', transition: 'width 0.5s' }} />
                      <div style={{ width: `${pct(feminino, total)}%`, background: '#F97310', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#0f1117', fontWeight: 700 }}>{pct(masculino, total)}%</span>
                      <span style={{ fontSize: '11px', color: '#F97310', fontWeight: 700 }}>{pct(feminino, total)}%</span>
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
                      { label: 'Solteiros', value: solteiros, color: '#F97310', lista: voluntarios.filter(v => v.estado_civil === 'solteiro') },
                      { label: 'Casados', value: casados, color: '#F97310', lista: voluntarios.filter(v => v.estado_civil === 'casado') },
                      { label: 'Fora de MG', value: foraMG, color: '#0f1117', lista: voluntarios.filter(v => v.cidade_estado_pais && !v.cidade_estado_pais.includes('Minas Gerais')) },
                      { label: 'Incompletos', value: incompletos, color: '#0f1117', lista: voluntarios.filter(v => camposFaltando(v).length > 0) },
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
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#F97310' }}>{c.count}</span>
                          </div>
                          <div style={{ height: `${barComp}px`, borderRadius: '99px', background: '#f3f4f6', overflow: 'hidden' }}>
                            <div style={{ width: `${pct(c.count, maxComp)}%`, height: '100%', background: '#F97310' }} />
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
                      style={{ ...s.modalStatus, cursor: 'pointer', background: selected.status === 'aprovado' ? '#dcfce7' : selected.status === 'reprovado' ? '#f3f4f6' : '#fff4ec', color: selected.status === 'aprovado' ? '#F97310' : selected.status === 'reprovado' ? '#0f1117' : '#F97310' }}
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
                <div style={s.formGrid} className="dash-form-grid">
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
                <div style={s.formGrid} className="dash-form-grid">
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
                <div style={s.formGrid} className="dash-form-grid">
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
                <div style={s.checkGrid} className="dash-check-grid">
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

          {menu === 'agenda' && (() => {
            const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
            const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
            const ano = agendaData.getFullYear()
            const mes = agendaData.getMonth()

            function eventosNoDia(d) {
              return agendaEventos.filter(e => {
                const ed = e.data
                return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate()
              }).sort((a, b) => a.hora.localeCompare(b.hora))
            }

            function navAnterior() {
              if (agendaView === 'mes') setAgendaData(new Date(ano, mes - 1, 1))
              else if (agendaView === 'semana') setAgendaData(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
              else if (agendaView === 'dia') setAgendaData(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
              else setAgendaData(new Date(ano, mes - 1, 1))
            }
            function navProximo() {
              if (agendaView === 'mes') setAgendaData(new Date(ano, mes + 1, 1))
              else if (agendaView === 'semana') setAgendaData(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
              else if (agendaView === 'dia') setAgendaData(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })
              else setAgendaData(new Date(ano, mes + 1, 1))
            }
            function irHoje() { setAgendaData(new Date(hoje.getFullYear(), hoje.getMonth(), 1)) }

            function tituloNav() {
              if (agendaView === 'mes' || agendaView === 'agenda') return `${MESES[mes]} ${ano}`
              if (agendaView === 'semana') {
                const ini = new Date(agendaData); ini.setDate(ini.getDate() - ini.getDay())
                const fim = new Date(ini); fim.setDate(fim.getDate() + 6)
                return `${ini.getDate()} – ${fim.getDate()} de ${MESES[ini.getMonth()]} ${ano}`
              }
              if (agendaView === 'dia') return `${agendaData.getDate()} de ${MESES[agendaData.getMonth()]} ${agendaData.getFullYear()}`
            }

            function toInputDate(d) {
              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            }
            function abrirNovoEvento(dia) {
              if (locais.length === 0) carregarLocais()
              setFormEvento({ titulo: '', data: toInputDate(dia), horaInicio: '09:00', horaFim: '10:00', cor: '#F97310', descricao: '', local: '', localId: null, equipe: '', equipeId: null })
              setModalEvento({ tipo: 'novo', dia })
            }
            async function salvarEvento() {
              if (!formEvento.titulo.trim() || !formEvento.data) return
              const payload = {
                titulo: formEvento.titulo,
                data: formEvento.data,
                hora_inicio: formEvento.horaInicio,
                hora_fim: formEvento.horaFim,
                cor: formEvento.cor,
                descricao: formEvento.descricao || null,
                local_id: formEvento.localId || null,
                equipe_id: formEvento.equipeId || null,
              }
              const { data, error } = await supabase.from('eventos').insert(payload).select('*, locais(nome), equipes(nome)').single()
              if (!error && data) {
                const novo = { id: data.id, titulo: data.titulo, data: new Date(data.data + 'T00:00:00'), horaInicio: data.hora_inicio?.slice(0,5), horaFim: data.hora_fim?.slice(0,5), hora: data.hora_inicio?.slice(0,5), cor: data.cor, descricao: data.descricao || '', local: data.locais?.nome || '', localId: data.local_id, equipe: data.equipes?.nome || '', equipeId: data.equipe_id }
                setAgendaEventos(ev => [...ev, novo])
              }
              setModalEvento(null)
            }
            async function excluirEvento(id) {
              await supabase.from('eventos').delete().eq('id', id)
              setAgendaEventos(ev => ev.filter(e => e.id !== id))
              setModalEvento(null)
            }

            // --- Vista Mês ---
            function renderMes() {
              const primeiroDia = new Date(ano, mes, 1).getDay()
              const diasNoMes = new Date(ano, mes + 1, 0).getDate()
              const diasAntes = primeiroDia
              const totalCelulas = Math.ceil((diasAntes + diasNoMes) / 7) * 7
              const celulas = []
              for (let i = 0; i < totalCelulas; i++) {
                const diaNum = i - diasAntes + 1
                const valido = diaNum >= 1 && diaNum <= diasNoMes
                const diaObj = valido ? new Date(ano, mes, diaNum) : null
                const ehHoje = diaObj && diaObj.toDateString() === hoje.toDateString()
                const eventos = diaObj ? eventosNoDia(diaObj) : []
                celulas.push({ diaNum, valido, diaObj, ehHoje, eventos })
              }
              return (
                <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Cabeçalho dias da semana */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
                    {DIAS_SEMANA.map(d => (
                      <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
                    ))}
                  </div>
                  {/* Grade */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {celulas.map((c, i) => (
                      <div key={i}
                        onClick={() => c.valido && setAgendaDiaModal({ diaObj: c.diaObj, evsDia: c.eventos })}
                        style={{ minHeight: '100px', borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid #f3f4f6', borderBottom: i < celulas.length - 7 ? '1px solid #f3f4f6' : 'none', padding: '8px', background: c.valido ? '#fff' : '#fafafa', cursor: c.valido ? 'pointer' : 'default', position: 'relative' }}
                        onMouseEnter={e => c.valido && (e.currentTarget.style.background = '#fafffe')}
                        onMouseLeave={e => c.valido && (e.currentTarget.style.background = '#fff')}
                      >
                        {c.valido && (
                          <>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.ehHoje ? '#F97310' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: c.ehHoje ? 900 : 600, color: c.ehHoje ? '#fff' : '#374151' }}>{c.diaNum}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {c.eventos.slice(0, 3).map(ev => (
                                <div key={ev.id}
                                  onClick={e => { e.stopPropagation(); setAgendaDiaModal({ diaObj: c.diaObj, evsDia: c.eventos }) }}
                                  style={{ fontSize: '11px', fontWeight: 700, color: ev.cor === '#ffffff' ? '#0f1117' : '#fff', background: ev.cor, borderRadius: '4px', padding: '2px 6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}
                                >
                                  {ev.horaInicio || ev.hora} {ev.titulo}
                                </div>
                              ))}
                              {c.eventos.length > 3 && <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700 }}>+{c.eventos.length - 3} mais</div>}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // helpers de tempo
            function horaParaMinutos(h) {
              if (!h) return 0
              const [hh, mm] = h.split(':').map(Number)
              return hh * 60 + (mm || 0)
            }
            const HORA_H = 60 // px por hora

            // Calcula colunas para eventos sobrepostos
            function calcularColunas(evs) {
              const sorted = [...evs].sort((a, b) => horaParaMinutos(a.horaInicio || a.hora) - horaParaMinutos(b.horaInicio || b.hora))
              const cols = [] // cada posição guarda o fim do último evento naquela coluna
              const resultado = sorted.map(ev => {
                const ini = horaParaMinutos(ev.horaInicio || ev.hora)
                const fim = horaParaMinutos(ev.horaFim) || ini + 60
                let col = cols.findIndex(fimCol => fimCol <= ini)
                if (col === -1) { col = cols.length; cols.push(fim) } else { cols[col] = fim }
                return { ev, col }
              })
              const totalCols = cols.length
              return resultado.map(r => ({ ...r, totalCols }))
            }

            // --- Vista Semana ---
            function renderSemana() {
              const inicioSemana = new Date(agendaData)
              inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
              const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(inicioSemana); d.setDate(d.getDate() + i); return d })
              const horas = Array.from({ length: 24 }, (_, i) => i)
              const totalH = 24 * HORA_H
              return (
                <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Cabeçalho */}
                  <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb' }}>
                    <div style={{ width: '56px', flexShrink: 0 }} />
                    {dias.map((d, i) => {
                      const ehHoje = d.toDateString() === hoje.toDateString()
                      return (
                        <div key={i} style={{ flex: 1, padding: '12px 4px', textAlign: 'center', borderLeft: '1px solid #f3f4f6' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{DIAS_SEMANA[d.getDay()]}</div>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: ehHoje ? '#F97310' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0' }}>
                            <span style={{ fontSize: '16px', fontWeight: 900, color: ehHoje ? '#fff' : '#374151' }}>{d.getDate()}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Corpo */}
                  <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                    <div style={{ display: 'flex' }}>
                      {/* Coluna de horas */}
                      <div style={{ width: '56px', flexShrink: 0 }}>
                        {horas.map(h => (
                          <div key={h} style={{ height: `${HORA_H}px`, borderBottom: '1px solid #f3f4f6', padding: '4px 8px 0', fontSize: '11px', color: '#9ca3af', fontWeight: 600, textAlign: 'right', boxSizing: 'border-box' }}>
                            {h === 0 ? '' : `${String(h).padStart(2,'0')}:00`}
                          </div>
                        ))}
                      </div>
                      {/* Colunas dos dias */}
                      {dias.map((d, di) => {
                        const evsDia = agendaEventos.filter(e => {
                          const ed = e.data
                          return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate()
                        })
                        return (
                          <div key={di} style={{ flex: 1, borderLeft: '1px solid #f3f4f6', position: 'relative', height: `${totalH}px` }}
                            onClick={() => abrirNovoEvento(new Date(d.getFullYear(), d.getMonth(), d.getDate()))}>
                            {/* Linhas de hora */}
                            {horas.map(h => (
                              <div key={h} style={{ position: 'absolute', top: `${h * HORA_H}px`, left: 0, right: 0, height: `${HORA_H}px`, borderBottom: '1px solid #f3f4f6' }} />
                            ))}
                            {/* Eventos */}
                            {calcularColunas(evsDia).map(({ ev, col, totalCols }) => {
                              const ini = horaParaMinutos(ev.horaInicio || ev.hora)
                              const fim = horaParaMinutos(ev.horaFim) || ini + 60
                              const top = (ini / 60) * HORA_H
                              const height = Math.max(((fim - ini) / 60) * HORA_H, 20)
                              const w = `calc((100% - 4px) / ${totalCols})`
                              const left = `calc(2px + ${col} * ((100% - 4px) / ${totalCols}))`
                              const bgClaro = ev.cor === '#0f1117' ? '#f3f4f6' : ev.cor === '#ffffff' ? '#f9fafb' : '#fff4ec'
                              return (
                                <div key={ev.id}
                                  onClick={e => { e.stopPropagation(); setModalEvento({ tipo: 'ver', evento: ev }) }}
                                  style={{ position: 'absolute', top: `${top}px`, left, width: w, height: `${height}px`, background: bgClaro, borderRadius: '6px', overflow: 'hidden', zIndex: 2, boxSizing: 'border-box', display: 'flex', cursor: 'pointer' }}>
                                  <div style={{ width: '4px', background: ev.cor, flexShrink: 0 }} />
                                  <div style={{ flex: 1, padding: '3px 5px', overflow: 'hidden' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f1117', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.horaInicio}–{ev.horaFim}</div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.titulo}</div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            // --- Vista Dia ---
            function renderDia() {
              const horas = Array.from({ length: 24 }, (_, i) => i)
              const ehHoje = agendaData.toDateString() === hoje.toDateString()
              const evsDia = agendaEventos.filter(e => {
                const ed = e.data
                return ed.getFullYear() === agendaData.getFullYear() && ed.getMonth() === agendaData.getMonth() && ed.getDate() === agendaData.getDate()
              })
              const totalH = 24 * HORA_H
              return (
                <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Cabeçalho */}
                  <div style={{ padding: '16px 24px', borderBottom: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: ehHoje ? '#F97310' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: ehHoje ? '#fff' : '#374151' }}>{agendaData.getDate()}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f1117' }}>{DIAS_SEMANA[agendaData.getDay()]}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{MESES[agendaData.getMonth()]} {agendaData.getFullYear()}</div>
                    </div>
                  </div>
                  {/* Corpo */}
                  <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                    <div style={{ display: 'flex' }}>
                      {/* Coluna horas */}
                      <div style={{ width: '64px', flexShrink: 0 }}>
                        {horas.map(h => (
                          <div key={h} style={{ height: `${HORA_H}px`, padding: '4px 12px 0', fontSize: '12px', color: '#9ca3af', fontWeight: 600, textAlign: 'right', boxSizing: 'border-box', borderBottom: '1px solid #f3f4f6' }}>
                            {h === 0 ? '' : `${String(h).padStart(2,'0')}:00`}
                          </div>
                        ))}
                      </div>
                      {/* Coluna do dia */}
                      <div style={{ flex: 1, borderLeft: '1px solid #f3f4f6', position: 'relative', height: `${totalH}px`, cursor: 'pointer' }}
                        onClick={() => abrirNovoEvento(new Date(agendaData.getFullYear(), agendaData.getMonth(), agendaData.getDate()))}>
                        {horas.map(h => (
                          <div key={h} style={{ position: 'absolute', top: `${h * HORA_H}px`, left: 0, right: 0, height: `${HORA_H}px`, borderBottom: '1px solid #f3f4f6' }} />
                        ))}
                        {calcularColunas(evsDia).map(({ ev, col, totalCols }) => {
                          const ini = horaParaMinutos(ev.horaInicio || ev.hora)
                          const fim = horaParaMinutos(ev.horaFim) || ini + 60
                          const top = (ini / 60) * HORA_H
                          const height = Math.max(((fim - ini) / 60) * HORA_H, 24)
                          const w = `calc((100% - 12px) / ${totalCols})`
                          const left = `calc(4px + ${col} * ((100% - 12px) / ${totalCols}))`
                          const bgClaro = ev.cor === '#0f1117' ? '#f3f4f6' : ev.cor === '#ffffff' ? '#f9fafb' : '#fff4ec'
                          return (
                            <div key={ev.id}
                              onClick={e => { e.stopPropagation(); setModalEvento({ tipo: 'ver', evento: ev }) }}
                              style={{ position: 'absolute', top: `${top}px`, left, width: w, height: `${height}px`, background: bgClaro, borderRadius: '8px', overflow: 'hidden', zIndex: 2, boxSizing: 'border-box', display: 'flex', cursor: 'pointer' }}>
                              <div style={{ width: '5px', background: ev.cor, flexShrink: 0 }} />
                              <div style={{ flex: 1, padding: '6px 10px', overflow: 'hidden' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f1117' }}>{ev.horaInicio}–{ev.horaFim}</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{ev.titulo}</div>
                                {ev.local && height > 50 && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>📍 {ev.local}</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // --- Vista Agenda (lista) ---
            function renderAgenda() {
              const proximos = agendaEventos
                .filter(e => e.data >= new Date(ano, mes, 1))
                .sort((a, b) => a.data - b.data || a.hora.localeCompare(b.hora))
              if (proximos.length === 0) return (
                <div style={{ background: '#fff', borderRadius: '12px', padding: '48px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Nenhum evento agendado</p>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>Clique em um dia para adicionar um evento.</p>
                </div>
              )
              let ultimoMes = null
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {proximos.map(ev => {
                    const evMes = `${MESES[ev.data.getMonth()]} ${ev.data.getFullYear()}`
                    const mostrarMes = evMes !== ultimoMes
                    ultimoMes = evMes
                    return (
                      <div key={ev.id}>
                        {mostrarMes && <div style={{ fontSize: '13px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 0 8px' }}>{evMes}</div>}
                        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', overflow: 'hidden' }}
                          onClick={() => setModalEvento({ tipo: 'ver', evento: ev })}>
                          {/* Data à esquerda */}
                          <div style={{ width: '56px', textAlign: 'center', flexShrink: 0, padding: '16px 0' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{DIAS_SEMANA[ev.data.getDay()]}</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: ev.data.toDateString() === hoje.toDateString() ? '#F97310' : '#0f1117', lineHeight: 1.1 }}>{ev.data.getDate()}</div>
                          </div>
                          {/* Card com faixa colorida + fundo claro */}
                          <div style={{ flex: 1, display: 'flex', borderRadius: '10px', overflow: 'hidden', margin: '8px 12px 8px 0' }}>
                            <div style={{ width: '5px', background: ev.cor, flexShrink: 0 }} />
                            <div style={{ flex: 1, padding: '10px 14px', background: ev.cor === '#ffffff' ? '#f9fafb' : ev.cor === '#0f1117' ? '#f3f4f6' : '#fff4ec' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f1117' }}>{ev.titulo}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>{ev.horaInicio || ev.hora} – {ev.horaFim || '—'}{ev.local ? ` · ${ev.local}` : ''}</div>
                              {ev.descricao && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{ev.descricao}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }

            return (
              <>
                {/* Modal novo evento / ver evento */}
                {modalEvento && (
                  <div style={s.modalOverlay} onClick={() => { setModalEvento(null); setConfirmarExclusao(false) }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                      {modalEvento.tipo === 'novo' ? (
                        <>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>
                            Novo evento — {modalEvento.dia.getDate()} de {MESES[modalEvento.dia.getMonth()]}
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Título - linha inteira */}
                            <div>
                              <label style={s.fieldLabel}>Título</label>
                              <input style={s.inputEdit} value={formEvento.titulo} onChange={e => setFormEvento(f => ({ ...f, titulo: e.target.value }))} placeholder="Nome do evento" autoFocus />
                            </div>
                            {/* Data + Início + Fim em 3 colunas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={s.fieldLabel}>Data</label>
                                <input type="date" style={s.inputEdit} value={formEvento.data} onChange={e => setFormEvento(f => ({ ...f, data: e.target.value }))} />
                              </div>
                              <div>
                                <label style={s.fieldLabel}>Início</label>
                                <input type="time" style={s.inputEdit} value={formEvento.horaInicio} onChange={e => setFormEvento(f => ({ ...f, horaInicio: e.target.value }))} />
                              </div>
                              <div>
                                <label style={s.fieldLabel}>Fim</label>
                                <input type="time" style={s.inputEdit} value={formEvento.horaFim} onChange={e => setFormEvento(f => ({ ...f, horaFim: e.target.value }))} />
                              </div>
                            </div>
                            {/* Local + Equipe em 2 colunas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ position: 'relative' }}>
                                <label style={s.fieldLabel}>Local</label>
                                <input style={s.inputEdit} value={formEvento.local} onChange={e => setFormEvento(f => ({ ...f, local: e.target.value, localId: null }))} placeholder="Pesquisar local..." autoComplete="off" />
                                {formEvento.local.length > 0 && !formEvento.localId && locais.filter(l => l.nome.toLowerCase().includes(formEvento.local.toLowerCase()) || l.bairro?.toLowerCase().includes(formEvento.local.toLowerCase())).length > 0 && (
                                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 10, overflow: 'hidden' }}>
                                    {locais.filter(l => l.nome.toLowerCase().includes(formEvento.local.toLowerCase()) || l.bairro?.toLowerCase().includes(formEvento.local.toLowerCase())).slice(0, 8).map(l => (
                                      <div key={l.id}
                                        style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fff', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        onClick={() => setFormEvento(f => ({ ...f, local: l.nome, localId: l.id }))}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f1117' }}>{l.nome}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div style={{ position: 'relative' }}>
                                <label style={s.fieldLabel}>Organização</label>
                                <input style={s.inputEdit} value={formEvento.equipe} onChange={e => setFormEvento(f => ({ ...f, equipe: e.target.value, equipeId: null }))} placeholder="Pesquisar equipe..." autoComplete="off" />
                                {formEvento.equipe.length > 0 && !formEvento.equipeId && equipes.filter(o => o.nome.toLowerCase().includes(formEvento.equipe.toLowerCase())).length > 0 && (
                                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 10, overflow: 'hidden' }}>
                                    {equipes.filter(o => o.nome.toLowerCase().includes(formEvento.equipe.toLowerCase())).slice(0, 8).map(o => (
                                      <div key={o.id}
                                        style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fff', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        onClick={() => setFormEvento(f => ({ ...f, equipe: o.nome, equipeId: o.id }))}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f1117' }}>{o.nome}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Descrição</label>
                              <textarea style={{ ...s.inputEdit, minHeight: '80px', resize: 'vertical' }} value={formEvento.descricao} onChange={e => setFormEvento(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Cor</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {['#F97310','#0f1117','#ffffff'].map(cor => (
                                  <div key={cor} onClick={() => setFormEvento(f => ({ ...f, cor }))}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: cor, cursor: 'pointer', border: formEvento.cor === cor ? '3px solid #F97310' : '2px solid #e5e7eb', boxSizing: 'border-box' }} />
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                              <button style={s.backBtn} onClick={() => setModalEvento(null)}>Cancelar</button>
                              <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', flex: 1 }} onClick={salvarEvento}>Criar evento</button>
                            </div>
                          </div>
                        </>
                      ) : modalEvento.tipo === 'editar' ? (
                        <>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Editar evento</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <label style={s.fieldLabel}>Título</label>
                              <input style={s.inputEdit} value={formEditEvento.titulo} onChange={e => setFormEditEvento(f => ({ ...f, titulo: e.target.value }))} autoFocus />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={s.fieldLabel}>Data</label>
                                <input type="date" style={s.inputEdit} value={formEditEvento.data} onChange={e => setFormEditEvento(f => ({ ...f, data: e.target.value }))} />
                              </div>
                              <div>
                                <label style={s.fieldLabel}>Início</label>
                                <input type="time" style={s.inputEdit} value={formEditEvento.horaInicio} onChange={e => setFormEditEvento(f => ({ ...f, horaInicio: e.target.value }))} />
                              </div>
                              <div>
                                <label style={s.fieldLabel}>Fim</label>
                                <input type="time" style={s.inputEdit} value={formEditEvento.horaFim} onChange={e => setFormEditEvento(f => ({ ...f, horaFim: e.target.value }))} />
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ position: 'relative' }}>
                                <label style={s.fieldLabel}>Local</label>
                                <input style={s.inputEdit} value={formEditEvento.local || ''} onChange={e => setFormEditEvento(f => ({ ...f, local: e.target.value, localId: null }))} placeholder="Pesquisar local..." autoComplete="off" />
                                {(formEditEvento.local || '').length > 0 && !formEditEvento.localId && locais.filter(l => l.nome.toLowerCase().includes((formEditEvento.local || '').toLowerCase()) || l.bairro?.toLowerCase().includes((formEditEvento.local || '').toLowerCase())).length > 0 && (
                                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 10, overflow: 'hidden' }}>
                                    {locais.filter(l => l.nome.toLowerCase().includes((formEditEvento.local || '').toLowerCase()) || l.bairro?.toLowerCase().includes((formEditEvento.local || '').toLowerCase())).slice(0, 8).map(l => (
                                      <div key={l.id}
                                        style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fff', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        onClick={() => setFormEditEvento(f => ({ ...f, local: l.nome, localId: l.id }))}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f1117' }}>{l.nome}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div style={{ position: 'relative' }}>
                                <label style={s.fieldLabel}>Organização</label>
                                <input style={s.inputEdit} value={formEditEvento.equipe || ''} onChange={e => setFormEditEvento(f => ({ ...f, equipe: e.target.value, equipeId: null }))} placeholder="Pesquisar equipe..." autoComplete="off" />
                                {(formEditEvento.equipe || '').length > 0 && !formEditEvento.equipeId && equipes.filter(o => o.nome.toLowerCase().includes((formEditEvento.equipe || '').toLowerCase())).length > 0 && (
                                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 10, overflow: 'hidden' }}>
                                    {equipes.filter(o => o.nome.toLowerCase().includes((formEditEvento.equipe || '').toLowerCase())).slice(0, 8).map(o => (
                                      <div key={o.id}
                                        style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fff', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        onClick={() => setFormEditEvento(f => ({ ...f, equipe: o.nome, equipeId: o.id }))}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f1117' }}>{o.nome}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Descrição</label>
                              <textarea style={{ ...s.inputEdit, minHeight: '80px', resize: 'vertical' }} value={formEditEvento.descricao} onChange={e => setFormEditEvento(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Cor</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {['#F97310','#0f1117','#ffffff'].map(cor => (
                                  <div key={cor} onClick={() => setFormEditEvento(f => ({ ...f, cor }))}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: cor, cursor: 'pointer', border: formEditEvento.cor === cor ? '3px solid #F97310' : '2px solid #e5e7eb', boxSizing: 'border-box' }} />
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                              <button style={s.backBtn} onClick={() => setModalEvento({ tipo: 'ver', evento: modalEvento.evento })}>Cancelar</button>
                              <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', flex: 1 }} onClick={async () => {
                                if (!formEditEvento.titulo.trim()) return
                                const payload = {
                                  titulo: formEditEvento.titulo,
                                  data: formEditEvento.data,
                                  hora_inicio: formEditEvento.horaInicio,
                                  hora_fim: formEditEvento.horaFim,
                                  cor: formEditEvento.cor,
                                  descricao: formEditEvento.descricao || null,
                                  local_id: formEditEvento.localId || null,
                                  equipe_id: formEditEvento.equipeId || null,
                                }
                                const { error } = await supabase.from('eventos').update(payload).eq('id', modalEvento.evento.id)
                                if (!error) {
                                  const [y, m, d] = formEditEvento.data.split('-').map(Number)
                                  const atualizado = { ...modalEvento.evento, ...formEditEvento, data: new Date(y, m-1, d), hora: formEditEvento.horaInicio, local: formEditEvento.local, equipe: formEditEvento.equipe }
                                  setAgendaEventos(ev => ev.map(e => e.id === atualizado.id ? atualizado : e))
                                }
                                setModalEvento(null)
                              }}>Salvar</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* X fechar */}
                          <button onClick={() => { setModalEvento(null); setConfirmarExclusao(false) }} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

                          {!confirmarExclusao && (
                            <div style={{ marginBottom: '24px' }}>
                              {/* Título com bolinha de cor */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1.5px solid #f3f4f6' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: modalEvento.evento.cor, border: '2px solid #e5e7eb', flexShrink: 0 }} />
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', margin: 0 }}>{modalEvento.evento.titulo}</h3>
                              </div>
                              {/* Informações em linhas */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '80px' }}>Data</span>
                                  <span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{DIAS_SEMANA[modalEvento.evento.data.getDay()]}, {modalEvento.evento.data.getDate()} de {MESES[modalEvento.evento.data.getMonth()]} de {modalEvento.evento.data.getFullYear()}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '80px' }}>Horário</span>
                                  <span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{modalEvento.evento.horaInicio || modalEvento.evento.hora} – {modalEvento.evento.horaFim || '—'}</span>
                                </div>
                                {modalEvento.evento.local && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '80px' }}>Local</span>
                                    <span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{modalEvento.evento.local}</span>
                                  </div>
                                )}
                                {modalEvento.evento.equipe && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '80px' }}>Equipe</span>
                                    <span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{modalEvento.evento.equipe}</span>
                                  </div>
                                )}
                                {modalEvento.evento.descricao && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, minWidth: '80px' }}>Observações</span>
                                    <span style={{ fontSize: '13px', color: '#0f1117', fontWeight: 600 }}>{modalEvento.evento.descricao}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {confirmarExclusao ? (
                            <div style={{ padding: '8px 0' }}>
                              <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f1117', margin: '0 0 16px', textAlign: 'center' }}>Tem certeza que deseja excluir este evento?</p>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={{ ...s.backBtn, flex: 1, textAlign: 'center' }} onClick={() => setConfirmarExclusao(false)}>Cancelar</button>
                                <button style={{ ...s.editBtn, flex: 1, textAlign: 'center', background: '#0f1117', color: '#fff', borderColor: '#0f1117' }} onClick={() => { excluirEvento(modalEvento.evento.id); setConfirmarExclusao(false) }}>Sim, excluir</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button style={{ ...s.editBtn, flex: 1, textAlign: 'center' }} onClick={() => {
                                const ev = modalEvento.evento
                                const d = ev.data
                                setFormEditEvento({ titulo: ev.titulo, data: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, horaInicio: ev.horaInicio || ev.hora, horaFim: ev.horaFim || '', cor: ev.cor, descricao: ev.descricao || '', local: ev.local || '', localId: ev.localId || null, equipe: ev.equipe || '', equipeId: ev.equipeId || null })
                                setModalEvento({ tipo: 'editar', evento: ev })
                              }}>Editar</button>
                              <button style={{ ...s.editBtn, flex: 1, textAlign: 'center', background: '#f3f4f6', color: '#0f1117', borderColor: '#e5e7eb' }} onClick={() => setConfirmarExclusao(true)}>Excluir</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Vista Mobile */}
                {(() => {
                  const MESES_EXT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
                  const evsDia = agendaEventos.filter(e => e.data.toDateString() === mobileDiaSel.toDateString()).sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
                  const ehHoje = mobileDiaSel.toDateString() === hoje.toDateString()

                  // grade de dias clicáveis (semana ou mês)
                  function DiasGrid() {
                    const LETRAS = ['D','S','T','Q','Q','S','S']
                    let celulas = []
                    if (agendaView === 'semana') {
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
                        {/* Cabeçalho letras */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '4px' }}>
                          {LETRAS.map((l, i) => <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#9ca3af', padding: '4px 0' }}>{l}</div>)}
                        </div>
                        {/* Linhas de dias */}
                        {rows.map((row, ri) => (
                          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                            {row.map((d, di) => {
                              if (!d) return <div key={di} />
                              const sel = d.toDateString() === mobileDiaSel.toDateString()
                              const dHoje = d.toDateString() === hoje.toDateString()
                              const temEv = agendaEventos.some(e => e.data.toDateString() === d.toDateString())
                              return (
                                <div key={di} onClick={() => setMobileDiaSel(new Date(d))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', padding: '4px 0' }}>
                                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: sel ? '#F97310' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '15px', fontWeight: 900, color: sel ? '#fff' : dHoje ? '#F97310' : '#374151' }}>{d.getDate()}</span>
                                  </div>
                                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: temEv ? '#F97310' : 'transparent' }} />
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    )
                  }

                  return (
                    <div className="agenda-mobile" style={{ display: 'none' }}>
                      {/* Header: mês/ano + novo evento + toggle */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                          <button onClick={() => setMobileDiaSel(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#9ca3af', lineHeight: 1, padding: 0 }}>‹</button>
                          <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f1117', textTransform: 'capitalize', minWidth: '160px', textAlign: 'center' }}>{MESES_EXT[mobileDiaSel.getMonth()]} {mobileDiaSel.getFullYear()}</span>
                          <button onClick={() => setMobileDiaSel(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#9ca3af', lineHeight: 1, padding: 0 }}>›</button>
                        </div>
                        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                          {[['semana','Semana'],['mes','Mês']].map(([v, l]) => (
                            <button key={v} onClick={() => setAgendaView(v)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, background: agendaView === v ? '#fff' : 'transparent', color: agendaView === v ? '#F97310' : '#6b7280', boxShadow: agendaView === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>{l}</button>
                          ))}
                        </div>
                      </div>

                      {/* Grade de dias */}
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '12px' }}>
                        <DiasGrid />
                      </div>
                      <button onClick={() => { if (locais.length === 0) carregarLocais(); const d = `${mobileDiaSel.getFullYear()}-${String(mobileDiaSel.getMonth()+1).padStart(2,'0')}-${String(mobileDiaSel.getDate()).padStart(2,'0')}`; setFormEvento({ titulo: '', data: d, horaInicio: '09:00', horaFim: '10:00', cor: '#F97310', descricao: '', local: '', localId: null, equipe: '', organizacaoId: null }); setModalEvento({ tipo: 'novo', dia: mobileDiaSel }) }} style={{ ...s.editBtn, background: '#F97310', color: '#fff', width: '100%', textAlign: 'center', marginBottom: '16px' }}>+ Novo evento</button>

                      {/* Eventos do dia selecionado */}
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: ehHoje ? '#F97310' : '#0f1117', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1.5px solid #f3f4f6' }}>
                          {mobileDiaSel.getDate()} de {MESES_EXT[mobileDiaSel.getMonth()]}{ehHoje ? ' · Hoje' : ''}
                        </div>
                        {evsDia.length === 0 ? (
                          <p style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '16px 0', margin: 0 }}>Nenhum evento neste dia.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {evsDia.map(ev => (
                              <div key={ev.id} onClick={() => setModalEvento({ tipo: 'ver', evento: ev })} style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'flex-start' }}>
                                <div style={{ width: '44px', flexShrink: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{ev.horaInicio}</div>
                                  {ev.horaFim && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{ev.horaFim}</div>}
                                </div>
                                <div style={{ flex: 1, display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
                                  <div style={{ width: '4px', background: ev.cor || '#F97310', flexShrink: 0 }} />
                                  <div style={{ flex: 1, padding: '8px 12px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f1117' }}>{ev.titulo}</div>
                                    {ev.local && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{ev.local}</div>}
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

                {/* Toolbar e calendário desktop */}
                <div className="agenda-desktop">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => { if (locais.length === 0) carregarLocais(); const d = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`; setFormEvento({ titulo: '', data: d, horaInicio: '09:00', horaFim: '10:00', cor: '#F97310', descricao: '', local: '', localId: null, equipe: '', organizacaoId: null }); setModalEvento({ tipo: 'novo', dia: hoje }) }} style={{ ...s.editBtn, background: '#F97310', color: '#fff', fontSize: '13px', padding: '6px 16px' }}>+ Novo evento</button>
                      <button onClick={irHoje} style={{ ...s.backBtn, fontSize: '13px', padding: '6px 16px' }}>Hoje</button>
                      <button onClick={navAnterior} style={{ width: '32px', height: '32px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                      <button onClick={navProximo} style={{ width: '32px', height: '32px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginLeft: '4px' }}>{tituloNav()}</span>
                    </div>
                    <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                      {[['dia','Dia'],['semana','Semana'],['mes','Mês'],['agenda','Agenda']].map(([v, l]) => (
                        <button key={v} onClick={() => setAgendaView(v)}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, background: agendaView === v ? '#fff' : 'transparent', color: agendaView === v ? '#F97310' : '#6b7280', boxShadow: agendaView === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {agendaView === 'mes' && renderMes()}
                  {agendaView === 'semana' && renderSemana()}
                  {agendaView === 'dia' && renderDia()}
                  {agendaView === 'agenda' && renderAgenda()}
                </div>
              </>
            )
          })()}

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

          {menu === 'mapa' && (
            <>
              <h2 style={{ ...s.pageTitle, marginBottom: '20px' }}>Mapa de Evangelismo</h2>
              <MapaEvangelismo abordagens={abordagensComTotal} />
            </>
          )}

          {menu === 'evangelismo' && (
            <>
              {/* Modal nova abordagem */}
              {modalAbordagem && (
                <div style={s.modalOverlay} onClick={() => { setModalAbordagem(false); setSugestoesEndereco([]); setEnderecoConfirmado(false); setErroAbordagem('') }}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '960px', padding: '24px 32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Nova Abordagem</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {pessoas.map((pessoa, idx) => (
                        <div key={idx} style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px', border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280' }}>Pessoa {idx + 1}</span>
                            {pessoas.length > 1 && (
                              <button onClick={() => setPessoas(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', fontWeight: 700 }}>✕</button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={s.fieldLabel}>Nome</label>
                              <input style={s.inputEdit} value={pessoa.nome} onChange={e => setPessoas(p => p.map((x, i) => i === idx ? { ...x, nome: e.target.value } : x))} />
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Telefone</label>
                              <input style={s.inputEdit} value={pessoa.telefone} onChange={e => setPessoas(p => p.map((x, i) => i === idx ? { ...x, telefone: e.target.value } : x))} />
                            </div>
                            <div style={{ position: 'relative' }}>
                              <label style={s.fieldLabel}>Endereço (onde mora)</label>
                              <input
                                style={{ ...s.inputEdit, borderColor: pessoasConfirmadas[idx] ? '#F97310' : undefined }}
                                placeholder="Digite e selecione uma opção"
                                value={pessoa.endereco_pessoa}
                                onChange={e => buscarSugestoesPessoa(idx, e.target.value)}
                                autoComplete="off"
                              />
                              {(sugestoesPessoa[idx] || []).length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, marginTop: '4px', overflow: 'hidden' }}>
                                  {(sugestoesPessoa[idx] || []).map((sug, i) => (
                                    <div key={i} onClick={() => selecionarEnderecoPessoa(idx, sug)}
                                      style={{ padding: '10px 14px', fontSize: '13px', color: '#0f1117', cursor: 'pointer', borderBottom: i < sugestoesPessoa[idx].length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#fff4ec'}
                                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                    >{sug}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Observação</label>
                              <input style={s.inputEdit} value={pessoa.observacao} onChange={e => setPessoas(p => p.map((x, i) => i === idx ? { ...x, observacao: e.target.value } : x))} />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontSize: '13px', fontWeight: 700, textAlign: 'center', padding: '4px 0', fontFamily: 'inherit' }} onClick={() => setPessoas(p => [...p, { nome: '', telefone: '', endereco_pessoa: '', observacao: '' }])}>+ Adicionar pessoa</button>

                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <label style={{ ...s.fieldLabel, marginBottom: 0 }}>Endereço / Local</label>
                          <button type="button" onClick={usarLocalizacaoAtual} disabled={buscandoLocalizacao} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', padding: 0, fontFamily: 'inherit' }}>
                            {buscandoLocalizacao ? 'Buscando...' : 'Preenchimento automático'}
                          </button>
                        </div>
                        <input
                          style={{ ...s.inputEdit, borderColor: enderecoConfirmado ? '#F97310' : undefined }}
                          placeholder="Digite o endereço e selecione uma opção"
                          value={formAbordagem.endereco}
                          onChange={e => buscarSugestoesEndereco(e.target.value)}
                          autoComplete="off"
                        />
                        {sugestoesEndereco.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, marginTop: '4px', overflow: 'hidden' }}>
                            {sugestoesEndereco.map((s, i) => (
                              <div key={i} onClick={() => selecionarEndereco(s)}
                                style={{ padding: '10px 14px', fontSize: '13px', color: '#0f1117', cursor: 'pointer', borderBottom: i < sugestoesEndereco.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fff4ec'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                              >{s}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={s.fieldLabel}>Data e hora</label>
                        <input style={s.inputEdit} type="datetime-local" value={formAbordagem.data_hora} onChange={e => setFormAbordagem(f => ({ ...f, data_hora: e.target.value }))} />
                      </div>

                      <div>
                        <label style={s.fieldLabel}>Observação geral</label>
                        <textarea style={{ ...s.inputEdit, minHeight: '80px', resize: 'vertical' }} value={formAbordagem.observacao} onChange={e => setFormAbordagem(f => ({ ...f, observacao: e.target.value }))} />
                      </div>
                    </div>

                    {erroAbordagem && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', fontWeight: 600, marginTop: '8px' }}>{erroAbordagem}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                      <button style={{ ...s.editBtn, background: '#f3f4f6', color: '#6b7280', border: '1.5px solid #e5e7eb', textAlign: 'center' }} onClick={() => { setModalAbordagem(false); setErroAbordagem('') }}>Cancelar</button>
                      <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', textAlign: 'center' }} onClick={salvarAbordagem} disabled={salvandoAbordagem}>
                        {salvandoAbordagem ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {abordagemSelecionada ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <button style={s.backBtn} onClick={() => { setAbordagemSelecionada(null); setEvangelizados([]); setEditandoEvangelizado(null); setEditandoAbordagem(false) }}>Voltar</button>
                      {!editandoAbordagem && <button style={s.editBtn} onClick={() => { setEditandoAbordagem(true); setFormEditAbordagem({ endereco: abordagemSelecionada.endereco || abordagemSelecionada.local, data_hora: abordagemSelecionada.data_hora ? abordagemSelecionada.data_hora.slice(0,16) : '', observacao: abordagemSelecionada.observacao || '' }) }}>Editar abordagem</button>}
                    </div>

                    {editandoAbordagem ? (
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div><label style={s.fieldLabel}>Endereço / Local</label><input style={s.inputEdit} value={formEditAbordagem.endereco || ''} onChange={e => setFormEditAbordagem(f => ({ ...f, endereco: e.target.value }))} /></div>
                        <div><label style={s.fieldLabel}>Data e hora</label><input style={s.inputEdit} type="datetime-local" value={formEditAbordagem.data_hora || ''} onChange={e => setFormEditAbordagem(f => ({ ...f, data_hora: e.target.value }))} /></div>
                        <div><label style={s.fieldLabel}>Observação</label><textarea style={{ ...s.inputEdit, minHeight: '60px', resize: 'vertical' }} value={formEditAbordagem.observacao || ''} onChange={e => setFormEditAbordagem(f => ({ ...f, observacao: e.target.value }))} /></div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button style={s.backBtn} onClick={() => setEditandoAbordagem(false)}>Cancelar</button>
                          <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={salvarEdicaoAbordagem} disabled={salvandoEditAbordagem}>{salvandoEditAbordagem ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117' }}>{abordagemSelecionada.local}</div>
                        {abordagemSelecionada.endereco && <div style={{ fontSize: '13px', color: '#6b7280' }}>{abordagemSelecionada.endereco}</div>}
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          {abordagemSelecionada.data_hora ? new Date(abordagemSelecionada.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          {abordagemSelecionada.usuarios?.nome ? ` · por ${abordagemSelecionada.usuarios.nome}` : ''}
                        </div>
                        {abordagemSelecionada.observacao && <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', marginTop: '4px' }}>{abordagemSelecionada.observacao}</div>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {evangelizados.length === 0 && <p style={s.info}>Nenhuma pessoa registrada.</p>}
                    {evangelizados.map(ev => (
                      <div key={ev.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        {editandoEvangelizado === ev.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div><label style={s.fieldLabel}>Nome</label><input style={s.inputEdit} value={formEditEvangelizado.nome || ''} onChange={e => setFormEditEvangelizado(f => ({ ...f, nome: e.target.value }))} /></div>
                              <div><label style={s.fieldLabel}>Telefone</label><input style={s.inputEdit} value={formEditEvangelizado.telefone || ''} onChange={e => setFormEditEvangelizado(f => ({ ...f, telefone: e.target.value }))} /></div>
                              <div><label style={s.fieldLabel}>Endereço</label><input style={s.inputEdit} value={formEditEvangelizado.endereco_pessoa || ''} onChange={e => setFormEditEvangelizado(f => ({ ...f, endereco_pessoa: e.target.value }))} /></div>
                              <div><label style={s.fieldLabel}>Observação</label><input style={s.inputEdit} value={formEditEvangelizado.observacao || ''} onChange={e => setFormEditEvangelizado(f => ({ ...f, observacao: e.target.value }))} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button style={s.backBtn} onClick={() => { setEditandoEvangelizado(null); setFormEditEvangelizado({}) }}>Cancelar</button>
                              <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={salvarEdicaoEvangelizado} disabled={salvandoEvangelizado}>{salvandoEvangelizado ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f1117' }}>{ev.nome}</div>
                              {ev.telefone && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{ev.telefone}</div>}
                              {ev.endereco_pessoa && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{ev.endereco_pessoa}</div>}
                              {ev.observacao && <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>{ev.observacao}</div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                              <select
                                value={ev.status_contato}
                                onChange={e => atualizarStatusEvangelizado(ev.id, e.target.value)}
                                style={{ ...s.inputEdit, width: 'auto', minWidth: '140px', fontSize: '13px', fontWeight: 700, color: ev.status_contato === 'discipulado' ? '#16a34a' : ev.status_contato === 'contatado' ? '#F97310' : ev.status_contato === 'sem_resposta' ? '#6b7280' : '#0f1117' }}
                              >
                                <option value="pendente">Pendente</option>
                                <option value="contatado">Contatado</option>
                                <option value="sem_resposta">Sem resposta</option>
                                <option value="discipulado">Discipulado</option>
                              </select>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', padding: 0 }} onClick={() => { setEditandoEvangelizado(ev.id); setFormEditEvangelizado({ nome: ev.nome, telefone: ev.telefone, endereco_pessoa: ev.endereco_pessoa, observacao: ev.observacao }) }}>Editar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h2 style={{ ...s.pageTitle, marginBottom: 0 }}>Evangelismo</h2>
                    <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={() => setModalAbordagem(true)}>+ Nova abordagem</button>
                  </div>
                  {loadingEvang && <p style={s.info}>Carregando...</p>}
                  {!loadingEvang && abordagens.length === 0 && <p style={s.info}>Nenhuma abordagem registrada ainda.</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {abordagens.map(ab => (
                      <div key={ab.id}
                        onClick={() => { setAbordagemSelecionada(ab); carregarEvangelizados(ab.id) }}
                        style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff4ec'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f1117' }}>{ab.local}</div>
                          {ab.endereco && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{ab.endereco}</div>}
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                            {ab.data_hora ? new Date(ab.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            {ab.usuarios?.nome ? ` · por ${ab.usuarios.nome}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#F97310' }}>Ver →</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {menu === 'usuarios' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ ...s.pageTitle, marginBottom: 0 }}>Usuários</h2>
                <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={() => setModalNovoUsuario(true)}>+ Adicionar</button>
              </div>

              {modalNovoUsuario && (
                <div style={s.modalOverlay} onClick={() => setModalNovoUsuario(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', marginBottom: '24px' }}>Novo Usuário</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[['Nome', 'nome', 'text'], ['Email', 'email', 'email'], ['Senha', 'senha', 'password'], ['Telefone', 'telefone', 'text']].map(([label, key, type]) => (
                        <div key={key}>
                          <label style={s.fieldLabel}>{label}</label>
                          <input type={type} style={s.inputEdit} value={formNovoUsuario[key]} onChange={e => setFormNovoUsuario(f => ({ ...f, [key]: e.target.value }))} />
                        </div>
                      ))}
                      <div>
                        <label style={s.fieldLabel}>Perfil</label>
                        <select style={s.inputEdit} value={formNovoUsuario.perfil} onChange={e => setFormNovoUsuario(f => ({ ...f, perfil: e.target.value }))}>
                          <option value="admin">Admin</option>
                          <option value="lider">Líder</option>
                          <option value="voluntario">Voluntário</option>
                          <option value="igreja">Igreja</option>
                          <option value="prefeitura">Prefeitura</option>
                        </select>
                      </div>
                      {erroUsuario && <p style={{ color: '#0f1117', fontSize: '13px', margin: 0 }}>{erroUsuario}</p>}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button style={s.backBtn} onClick={() => setModalNovoUsuario(false)}>Cancelar</button>
                        <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', flex: 1 }} onClick={criarUsuario} disabled={salvandoUsuario}>
                          {salvandoUsuario ? 'Criando...' : 'Criar usuário'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loadingUsers && <p style={s.info}>Carregando...</p>}
              {!loadingUsers && usuarios.length === 0 && <p style={s.info}>Nenhum usuário cadastrado.</p>}
              {selectedUsuario && (
                <div style={s.modalOverlay} onClick={() => { setSelectedUsuario(null); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]) }}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setSelectedUsuario(null); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]) }} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151' }}>✕</button>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                      <div style={{ ...s.cardAvatar, width: '52px', height: '52px', fontSize: '22px', borderRadius: '50%', flexShrink: 0 }}>{selectedUsuario.nome?.[0]?.toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f1117' }}>{selectedUsuario.nome}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedUsuario.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: selectedUsuario.ativo ? '#16a34a' : '#dc2626', background: selectedUsuario.ativo ? '#dcfce7' : '#fee2e2', borderRadius: '20px', padding: '2px 10px' }}>
                            {selectedUsuario.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!confirmDeleteUsuario ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Ativar/Desativar */}
                        <button onClick={() => ativarUsuario(selectedUsuario)} style={{ width: '100%', background: selectedUsuario.ativo ? '#f3f4f6' : '#dcfce7', color: selectedUsuario.ativo ? '#374151' : '#16a34a', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {selectedUsuario.ativo ? 'Desativar acesso' : 'Ativar acesso'}
                        </button>

                        {/* Editar campos */}
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Editar</div>

                          <div>
                            <label style={s.fieldLabel}>Perfil</label>
                            <select style={s.inputEdit} value={selectedUsuario.perfil || ''} onChange={async e => {
                              const perfil = e.target.value
                              await supabase.from('usuarios').update({ perfil }).eq('id', selectedUsuario.id)
                              setSelectedUsuario(v => ({ ...v, perfil }))
                              setUsuarios(list => list.map(x => x.id === selectedUsuario.id ? { ...x, perfil } : x))
                            }}>
                              <option value="admin">Admin</option>
                              <option value="lider">Líder</option>
                              <option value="voluntario">Voluntário</option>
                              <option value="igreja">Igreja</option>
                              <option value="prefeitura">Prefeitura</option>
                            </select>
                          </div>

                          <EquipeRadio
                            itens={equipes}
                            selecionado={usuarioOrgs.equipes[0] || null}
                            onSelect={async (id) => {
                              await supabase.from('usuario_equipes').delete().eq('usuario_id', selectedUsuario.id)
                              if (id) await supabase.from('usuario_equipes').insert({ usuario_id: selectedUsuario.id, equipe_id: id })
                              setUsuarioOrgs(prev => ({ ...prev, equipes: id ? [id] : [] }))
                            }}
                            fieldLabel={s.fieldLabel}
                          />
                          <EquipeGrupoCheckbox
                            label="Grupos"
                            itens={grupos}
                            marcados={usuarioOrgs.grupos}
                            onToggle={(id, marcado) => toggleGrupoUsuario(selectedUsuario.id, id, marcado)}
                            fieldLabel={s.fieldLabel}
                          />

                          <div style={{ position: 'relative' }}>
                            <label style={s.fieldLabel}>Vincular voluntário</label>
                            <input
                              style={s.inputEdit}
                              placeholder="Buscar pelo nome..."
                              value={buscaVoluntario}
                              onChange={e => buscarVoluntariosParaVinculo(e.target.value)}
                              onBlur={() => setTimeout(() => setSugestoesVoluntario([]), 200)}
                              autoComplete="off"
                            />
                            {selectedUsuario.voluntario_id && !buscaVoluntario && (
                              <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, marginTop: '4px', display: 'block' }}>✓ já vinculado</span>
                            )}
                            {sugestoesVoluntario.length > 0 && (
                              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200, listStyle: 'none', margin: '4px 0 0', padding: 0, overflow: 'hidden' }}>
                                {sugestoesVoluntario.map(vol => (
                                  <li key={vol.id} onMouseDown={async () => {
                                    await supabase.from('usuarios').update({ voluntario_id: vol.id }).eq('id', selectedUsuario.id)
                                    setSelectedUsuario(v => ({ ...v, voluntario_id: vol.id }))
                                    setUsuarios(list => list.map(x => x.id === selectedUsuario.id ? { ...x, voluntario_id: vol.id } : x))
                                    setBuscaVoluntario('')
                                    setSugestoesVoluntario([])
                                  }} style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#1a1d27' }}>
                                    {vol.nome_completo}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Excluir */}
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                          <button onClick={() => setConfirmDeleteUsuario(true)} style={{ width: '100%', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Excluir usuário
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>Tem certeza? Esta ação não pode ser desfeita.</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => setConfirmDeleteUsuario(false)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                          <button onClick={() => deletarUsuario(selectedUsuario.id)} disabled={deletandoUsuario} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {deletandoUsuario ? 'Excluindo...' : 'Confirmar exclusão'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={s.cards}>
                {usuarios.map(u => (
                  <div key={u.id} style={{ ...s.card, cursor: 'pointer' }} onClick={() => { setSelectedUsuario(u); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]); carregarOrgsUsuario(u.id); carregarEquipes(); carregarGrupos() }}>
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

        {/* Menu extra (+ button) */}
        {menuMobileAberto && (
          <div style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 199, boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}>
            {[
              { key: 'agenda', path: '/sistema/agenda', label: 'Agenda' },
              { key: 'evangelismo', path: '/sistema/evangelismo', label: 'Evangelismo' },
              { key: 'mapa', path: '/sistema/mapa', label: 'Mapa' },
              { key: 'dashboard', path: '/sistema/dashboard', label: 'Dashboard' },
            ].map(item => (
              <button key={item.key} onClick={() => { navigate(item.path); setMenuMobileAberto(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', background: menu === item.key ? '#fff4ec' : 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', color: menu === item.key ? '#F97310' : '#374151', padding: '12px 16px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, textAlign: 'left' }}>
                {item.label}
              </button>
            ))}
          </div>
        )}

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
        ].map(item => {
          const ativo = menu === item.key
          return (
            <button key={item.key} onClick={() => { navigate(item.path); setMenuMobileAberto(false) }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'transparent', border: 'none', cursor: 'pointer', color: ativo ? '#F97310' : '#9ca3af', padding: '6px 12px', fontFamily: 'inherit' }}>
              {item.icon}
              <span style={{ fontSize: '10px', fontWeight: 700 }}>{item.label}</span>
            </button>
          )
        })}

        {/* Botão + */}
        <button onClick={() => setMenuMobileAberto(o => !o)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit', color: menuMobileAberto ? '#F97310' : '#9ca3af' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuMobileAberto ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 700 }}>Mais</span>
        </button>

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
              <button style={{ ...s.dropdownItem, color: '#0f1117' }} onClick={handleSignOut}>Sair</button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

function EquipeRadio({ itens, selecionado, onSelect, fieldLabel }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const filtrados = itens.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()))
  const nomeSelecionado = itens.find(o => o.id === selecionado)?.nome
  return (
    <div style={{ marginBottom: '4px', position: 'relative' }}>
      <label style={fieldLabel}>Equipe</label>
      <input
        type="text"
        value={busca}
        onChange={e => { setBusca(e.target.value); setAberto(e.target.value.length > 0) }}
        onBlur={() => setTimeout(() => { setAberto(false); setBusca('') }, 200)}
        placeholder={nomeSelecionado || 'Buscar equipe...'}
        autoComplete="off"
        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: '#1a1d27', outline: 'none', boxSizing: 'border-box', marginTop: '6px' }}
      />
      {aberto && filtrados.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filtrados.map(o => (
              <label key={o.id} onMouseDown={e => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: selecionado === o.id ? 700 : 400, borderBottom: '1px solid #f3f4f6' }}>
                <input type="radio" name="equipe_radio" checked={selecionado === o.id} onChange={() => onSelect(o.id)} style={{ accentColor: '#F97310', width: '16px', height: '16px' }} />
                {o.nome}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EquipeGrupoCheckbox({ label, itens, marcados, onToggle, fieldLabel }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const filtrados = itens.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()))
  const selecionados = itens.filter(o => marcados.includes(o.id))
  return (
    <div style={{ marginBottom: '4px', position: 'relative' }}>
      <label style={fieldLabel}>{label}{selecionados.length > 0 && <span style={{ color: '#F97310', marginLeft: '6px', fontWeight: 700 }}>({selecionados.length})</span>}</label>
      <input
        type="text"
        value={busca}
        onChange={e => { setBusca(e.target.value); setAberto(e.target.value.length > 0) }}
        onBlur={() => setTimeout(() => { setAberto(false); setBusca('') }, 200)}
        placeholder={selecionados.length ? selecionados.map(o => o.nome).join(', ') : `Buscar ${label.toLowerCase()}...`}
        autoComplete="off"
        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: '#1a1d27', outline: 'none', boxSizing: 'border-box', marginTop: '6px' }}
      />
      {aberto && filtrados.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filtrados.map(o => {
              const marcado = marcados.includes(o.id)
              return (
                <label key={o.id} onMouseDown={e => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: marcado ? 700 : 400, borderBottom: '1px solid #f3f4f6' }}>
                  <input type="checkbox" checked={marcado} onChange={() => onToggle(o.id, marcado)} style={{ accentColor: '#F97310', width: '16px', height: '16px' }} />
                  {o.nome}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function VoluntarioCard({ v, onClick }) {
  const pendente = camposFaltando(v).length > 0
  return (
    <div style={{ ...s.card, ...(pendente ? { borderLeft: '4px solid #0f1117' } : {}) }} onClick={onClick}>
      <div style={s.cardAvatar}>{v.nome_completo?.[0]?.toUpperCase()}</div>
      <div style={s.cardInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={s.cardNome}>{v.nome_completo}</span>
          {pendente && <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f1117', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '1px 6px' }}>incompleto</span>}
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
