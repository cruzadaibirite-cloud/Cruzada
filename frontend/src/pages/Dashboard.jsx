import React, { useState, useEffect, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import MapaLocal from '../components/MapaLocal'
import MapaEvangelismo from '../components/MapaEvangelismo'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MENU = [
  { key: 'cruzada', label: 'Cruzada', path: '/sistema/cruzada', perfis: ['admin', 'voluntario', 'igreja', 'lider'] },
  { key: 'voluntarios', label: 'Voluntários', path: '/sistema/voluntario', perfis: ['admin'] },
  { key: 'usuarios', label: 'Usuários', path: '/sistema/usuarios', perfis: ['admin'] },
  { key: 'locais', label: 'Locais', path: '/sistema/locais', perfis: ['admin', 'voluntario'] },
  { key: 'agenda', label: 'Agenda', path: '/sistema/agenda', perfis: ['admin', 'voluntario', 'igreja', 'lider'] },
  { key: 'evangelismo', label: 'Evangelismo', path: '/sistema/evangelismo', perfis: ['admin', 'voluntario'] },
  { key: 'pessoas', label: 'Pessoas', path: '/sistema/pessoas', perfis: ['admin', 'voluntario'] },
  { key: 'mapa', label: 'Mapa', path: '/sistema/mapa', perfis: ['admin', 'igreja'] },
  { key: 'treinamento', label: 'Treinamento', path: '/sistema/treinamento', perfis: ['admin', 'voluntario'] },
  { key: 'galeria', label: 'Galeria', path: '/sistema/galeria', perfis: ['admin', 'voluntario', 'igreja'] },
  { key: 'grupos', label: 'Grupos', path: '/sistema/grupos', perfis: ['admin', 'voluntario'] },
  { key: 'dashboard', label: 'Dashboard', path: '/sistema/dashboard', perfis: ['admin', 'igreja'] },
  { key: 'controle', label: 'Controle', path: '/sistema/controle', perfis: ['admin'] },
]

const PERFIS_CONTROLE = ['admin', 'voluntario', 'igreja', 'lider']

function temAcesso(perfil, perfis) {
  return perfis.includes(perfil)
}

const KANBAN_COLUNAS = [
  { key: 'sem_contato', label: 'Sem Contato', cor: '#7c3aed', bg: '#f5f3ff' },
  { key: 'pendente', label: 'Pendente', cor: '#9ca3af', bg: '#f9fafb' },
  { key: 'sem_resposta', label: 'Sem Resposta', cor: '#ef4444', bg: '#fef2f2' },
  { key: 'contatado', label: 'Contato', cor: '#F97310', bg: '#fff4ec' },
  { key: 'discipulado', label: 'Discipulado', cor: '#16a34a', bg: '#f0fdf4' },
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
  const isMobile = () => window.innerWidth < 768
  const menu = location.pathname === '/sistema/cruzada' ? 'cruzada' : location.pathname === '/sistema/voluntario' ? 'voluntarios' : (location.pathname === '/sistema/usuarios' || location.pathname.startsWith('/sistema/usuarios/')) ? 'usuarios' : location.pathname === '/sistema/locais' ? 'locais' : location.pathname === '/sistema/agenda' ? 'agenda' : (location.pathname === '/sistema/evangelismo' || location.pathname === '/sistema/evangelismo/nova-abordagem') ? 'evangelismo' : (location.pathname === '/sistema/pessoas' || location.pathname.startsWith('/sistema/pessoas/')) ? 'pessoas' : location.pathname === '/sistema/mapa' ? 'mapa' : location.pathname === '/sistema/treinamento' ? 'treinamento' : location.pathname === '/sistema/grupos' || location.pathname.startsWith('/sistema/grupos/') ? 'grupos' : location.pathname === '/sistema/galeria' ? 'galeria' : location.pathname === '/sistema/dashboard' ? 'dashboard' : location.pathname === '/sistema/controle' ? 'controle' : 'cruzada'
  const isNovaAbordagemPage = location.pathname === '/sistema/evangelismo/nova-abordagem'
  const pessoaIdPage = location.pathname.startsWith('/sistema/pessoas/') ? location.pathname.split('/sistema/pessoas/')[1] : null
  const usuarioIdPage = location.pathname.startsWith('/sistema/usuarios/') ? location.pathname.split('/sistema/usuarios/')[1] : null
  const grupoIdPage = location.pathname.startsWith('/sistema/grupos/') ? location.pathname.split('/sistema/grupos/')[1] : null
  const [voluntarios, setVoluntarios] = useState([])
  const [loadingVol, setLoadingVol] = useState(false)
  const [selected, setSelected] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [filtroUsuarioNome, setFiltroUsuarioNome] = useState('')
  const [filtroUsuarioPerfil, setFiltroUsuarioPerfil] = useState('')
  const [filtroUsuarioEquipe, setFiltroUsuarioEquipe] = useState('')
  const [filtroUsuarioGrupo, setFiltroUsuarioGrupo] = useState('')
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [fotoUsuario, setFotoUsuario] = useState('')
  const [modalEditarPerfilAberto, setModalEditarPerfilAberto] = useState(false)
  const [enviandoFotoPerfil, setEnviandoFotoPerfil] = useState(false)
  const [subMenuFoto, setSubMenuFoto] = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [expandirFoto, setExpandirFoto] = useState(false)
  const [expandirAnuncio, setExpandirAnuncio] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [formVoluntario, setFormVoluntario] = useState({ nome_completo: '', idade: '', whatsapp: '', instagram: '', cidade_estado_pais: '', igreja: '', estado_civil: '', conjuge_na_missao: '', motivo_conjuge_ausente: '', tempo_na_igreja: '', como_serve_igreja: '', nome_pastor: '', contato_pastor_lider: '', nome_emergencia: '', telefone_emergencia: '', ja_participou_missao: '', limitacao_fisica: '', fala_ingles: false, fala_espanhol: false, canta: false, toca_instrumento: false, tira_fotos: false, faz_filmagens: false, outras_competencias: false, outra_competencia_descricao: '', sexo: '' })
  const [carregandoVoluntario, setCarregandoVoluntario] = useState(false)
  const [salvandoVoluntario, setSalvandoVoluntario] = useState(false)
  const [voluntarioId, setVoluntarioId] = useState(null)
  const [cidadeSugestoesPerf, setCidadeSugestoesPerf] = useState([])
  const cidadeTimerPerf = useRef(null)
  const [perfilUsuario, setPerfilUsuario] = useState('')
  const [permissoes, setPermissoes] = useState(null)
  const [permissoesOriginais, setPermissoesOriginais] = useState(null)
  const [salvandoPermissoes, setSalvandoPermissoes] = useState(false)
  const [minhaEquipe, setMinhaEquipe] = useState(null)
  const [minhaEquipeId, setMinhaEquipeId] = useState(null)
  const [meusGrupos, setMeusGrupos] = useState([])
  const [editandoStatus, setEditandoStatus] = useState(false)
  const [alertaCampos, setAlertaCampos] = useState(null)
  const [painelCruzada, setPainelCruzada] = useState({ eventosManha: [], eventosTarde: [], comunicados: [], equipes: [], totalUsuarios: 0, totalVoluntarios: 0, totalCompletos: 0, fotosAnuncios: [], proximaDataAgenda: null })
  const [carrosselIdx, setCarrosselIdx] = useState(0)
  const carrosselTimer = useRef(null)
  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState({})
  const [novoVoluntario, setNovoVoluntario] = useState(false)
  const [formNovoVol, setFormNovoVol] = useState({ nome_completo: '', idade: '', sexo: '', whatsapp: '', instagram: '', cidade_estado_pais: '', igreja: '', nome_pastor: '', contato_pastor_lider: '', como_serve_igreja: '', tempo_na_igreja: '', estado_civil: '', conjuge_na_missao: '', motivo_conjuge_ausente: '', nome_emergencia: '', telefone_emergencia: '', limitacao_fisica: '', ja_participou_missao: '', fala_ingles: false, fala_espanhol: false, canta: false, toca_instrumento: false, tira_fotos: false, faz_filmagens: false, outras_competencias: false, outra_competencia_descricao: '' })
  const [salvandoNovoVol, setSalvandoNovoVol] = useState(false)
  const [erroNovoVol, setErroNovoVol] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [locais, setLocais] = useState([])
  const [buscaLocal, setBuscaLocal] = useState('')
  const [localSelecionado, setLocalSelecionado] = useState(null)
  const [modalEditarLocal, setModalEditarLocal] = useState(false)
  const [formEditarLocal, setFormEditarLocal] = useState({})
  const [salvandoLocal, setSalvandoLocal] = useState(false)
  const [confirmExcluirLocal, setConfirmExcluirLocal] = useState(false)
  const [viewLocais, setViewLocais] = useState('mapa')
  const [modalNovoLocal, setModalNovoLocal] = useState(false)
  const [formNovoLocal, setFormNovoLocal] = useState({ tipo: '', nome: '', endereco: '', bairro: '', regiao: '', municipio: '', uf: '' })
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
  const [confirmExcluirVoluntario, setConfirmExcluirVoluntario] = useState(false)
  const [erroEquipeObrigatoria, setErroEquipeObrigatoria] = useState(false)
  const [deletandoUsuario, setDeletandoUsuario] = useState(false)
  const [editandoUsuario, setEditandoUsuario] = useState(false)
  const [formEditUsuario, setFormEditUsuario] = useState({})
  const [buscaVolVinculo, setBuscaVolVinculo] = useState('')
  const [sugestoesVolVinculo, setSugestoesVolVinculo] = useState([])
  const [vinculandoVol, setVinculandoVol] = useState(false)
  const [salvandoEdicaoUsuario, setSalvandoEdicaoUsuario] = useState(false)
  const [buscaVoluntario, setBuscaVoluntario] = useState('')
  const [sugestoesVoluntario, setSugestoesVoluntario] = useState([])
  const [usuarioOrgs, setUsuarioOrgs] = useState({ equipes: [], grupos: [] })
  const [showDetalheUsuario, setShowDetalheUsuario] = useState(false)

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
  const [modalNovoGrupo, setModalNovoGrupo] = useState(false)
  const [nomeNovoGrupo, setNomeNovoGrupo] = useState('')
  const [grupoAtivo, setGrupoAtivo] = useState(null)
  const [mensagensGrupo, setMensagensGrupo] = useState([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)
  const [papelNoGrupo, setPapelNoGrupo] = useState(null)
  const chatEndRef = useRef(null)
  const [menuGrupoAberto, setMenuGrupoAberto] = useState(false)
  const [modalEditarGrupo, setModalEditarGrupo] = useState(false)
  const [nomeEditarGrupo, setNomeEditarGrupo] = useState('')
  const [modalMembrosGrupo, setModalMembrosGrupo] = useState(false)
  const [membrosGrupo, setMembrosGrupo] = useState([])
  const [confirmExcluirGrupo, setConfirmExcluirGrupo] = useState(false)
  const [galeriaAba, setGaleriaAba] = useState('fotos')
  const [albuns, setAlbuns] = useState([])
  const [albumAtivo, setAlbumAtivo] = useState(null)
  const [albumBreadcrumb, setAlbumBreadcrumb] = useState([])
  const [fotosAlbum, setFotosAlbum] = useState([])
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [modalNovoAlbum, setModalNovoAlbum] = useState(false)
  const [nomeNovoAlbum, setNomeNovoAlbum] = useState('')
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const [uploadProgresso, setUploadProgresso] = useState({ atual: 0, total: 0 })
  const [videos, setVideos] = useState([])
  const [modalNovoVideo, setModalNovoVideo] = useState(false)
  const [formNovoVideo, setFormNovoVideo] = useState({ titulo: '', link: '' })
  const [videoGaleriaAtivo, setVideoGaleriaAtivo] = useState(null)
  const [podeGerenciarGaleria, setPodeGerenciarGaleria] = useState(false)
  const [confirmExcluirAlbum, setConfirmExcluirAlbum] = useState(null)
  const [msgMenuAberto, setMsgMenuAberto] = useState(null)
  const [msgMenuPos, setMsgMenuPos] = useState({ x: 0, y: 0 })
  const [msgMenuIsMinha, setMsgMenuIsMinha] = useState(false)
  const [msgHovered, setMsgHovered] = useState(null)
  const [editandoMsg, setEditandoMsg] = useState(null)
  const [textoEditandoMsg, setTextoEditandoMsg] = useState('')
  const [organizacoes, setOrganizacoes] = useState([])
  const [agendaDiaSelecionado, setAgendaDiaSelecionado] = useState(null) // { diaObj, evsDia }
  const [agendaDiaModal, setAgendaDiaModal] = useState(null) // modal da lista do dia
  const [agendaDiaEventoAberto, setAgendaDiaEventoAberto] = useState(null) // evento aberto no modal do dia
  const [dropEquipe, setDropEquipe] = useState(false)
  const [mobileDiaSel, setMobileDiaSel] = useState(new Date())

  // Evangelismo
  const [abordagens, setAbordagens] = useState([])
  const [loadingEvang, setLoadingEvang] = useState(false)
  const [modalAbordagem, setModalAbordagem] = useState(false)
  const [salvandoAbordagem, setSalvandoAbordagem] = useState(false)
  const [formAbordagem, setFormAbordagem] = useState({ local: '', endereco: '', data_hora: '', observacao: '', equipe_id: '' })
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
  const [sugestoesEditEvangelizado, setSugestoesEditEvangelizado] = useState([])
  const [editEvangelizadoEnderecoConfirmado, setEditEvangelizadoEnderecoConfirmado] = useState(false)
  const buscaEditEvangelizadoTimer = useRef(null)
  const [adicionandoPessoa, setAdicionandoPessoa] = useState(false)
  const [formNovaPessoa, setFormNovaPessoa] = useState({ nome: '', telefone: '', endereco_pessoa: '', observacao: '' })
  const [salvandoNovaPessoa, setSalvandoNovaPessoa] = useState(false)
  const [sugestoesNovaPessoa, setSugestoesNovaPessoa] = useState([])
  const [novaPessoaEnderecoConfirmado, setNovaPessoaEnderecoConfirmado] = useState(false)
  const buscaNovaPessoaTimer = useRef(null)
  const [editandoAbordagem, setEditandoAbordagem] = useState(false)
  const [formEditAbordagem, setFormEditAbordagem] = useState({})
  const [salvandoEditAbordagem, setSalvandoEditAbordagem] = useState(false)

  function acessoLiberado(perfil, itemKey, permissoesLista) {
    const item = MENU.find(m => m.key === itemKey)
    if (!item) return false
    if (item.key === 'controle') return perfil === 'admin'
    if (!permissoesLista) return temAcesso(perfil, item.perfis)
    const row = permissoesLista.find(p => p.pagina === itemKey && p.perfil === perfil)
    return row ? row.liberado : temAcesso(perfil, item.perfis)
  }

  function temAcessoDinamico(perfil, itemKey) {
    return acessoLiberado(perfil, itemKey, permissoes)
  }

  useEffect(() => {
    async function carregarNome() {
      const { data } = await supabase.from('usuarios').select('nome, perfil, foto_url').eq('id', user?.id).single()
      const { data: permData } = await supabase.from('permissoes').select('*')
      setPermissoes(permData || [])
      setPermissoesOriginais(permData || [])
      const { data: minhaEquipeData } = await supabase.from('usuario_equipes').select('equipe_id, equipes(nome, cor)').eq('usuario_id', user?.id).limit(1)
      setMinhaEquipe(minhaEquipeData?.[0]?.equipes || null)
      setMinhaEquipeId(minhaEquipeData?.[0]?.equipe_id || null)
      const { data: gruposData } = await supabase.from('usuario_grupos').select('grupos(nome)').eq('usuario_id', user?.id)
      setMeusGrupos((gruposData || []).map(r => r.grupos?.nome).filter(Boolean))
      if (data?.nome) setNomeUsuario(data.nome)
      setFotoUsuario(data?.foto_url || '')
      if (data?.perfil) {
        setPerfilUsuario(data.perfil)
        const menuAtual = MENU.find(m => location.pathname.startsWith(m.path))
        if (menuAtual && !acessoLiberado(data.perfil, menuAtual.key, permData || [])) {
          const primeiro = MENU.find(m => acessoLiberado(data.perfil, m.key, permData || []))
          if (primeiro) navigate(primeiro.path)
        }
      }
    }
    if (user?.id) carregarNome()
  }, [user])

  function alterarPermissao(pagina, perfil, liberado) {
    setPermissoes(prev => {
      const existe = prev.some(p => p.pagina === pagina && p.perfil === perfil)
      return existe ? prev.map(p => p.pagina === pagina && p.perfil === perfil ? { ...p, liberado } : p) : [...prev, { pagina, perfil, liberado }]
    })
  }

  function permissoesAlteradas() {
    if (!permissoes || !permissoesOriginais) return false
    return JSON.stringify(permissoes) !== JSON.stringify(permissoesOriginais)
  }

  async function salvarPermissoes() {
    setSalvandoPermissoes(true)
    await Promise.all(permissoes.map(p => supabase.from('permissoes').upsert({ pagina: p.pagina, perfil: p.perfil, liberado: p.liberado }, { onConflict: 'pagina,perfil' })))
    setPermissoesOriginais(permissoes)
    setSalvandoPermissoes(false)
  }

  function cancelarPermissoes() {
    setPermissoes(permissoesOriginais)
  }

  function getInitials(nome) {
    if (!nome) return '?'
    const parts = nome.trim().split(' ')
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
  }

  useEffect(() => {
    if (modalEvento) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalEvento])

  useEffect(() => {
    setMenuMobileAberto(false)
    setDropdownOpen(false)
  }, [location.pathname])

  const [pessoasKanban, setPessoasKanban] = useState([])
  const [loadingPessoas, setLoadingPessoas] = useState(false)
  const [dragPessoa, setDragPessoa] = useState(null)
  const [videoAtivo, setVideoAtivo] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [acordeaoAberto, setAcordeaoAberto] = useState({})
  const [modalPessoa, setModalPessoa] = useState(null)
  const [obs2Value, setObs2Value] = useState('')
  const [salvandoObs2, setSalvandoObs2] = useState(false)
  const [dropStatus, setDropStatus] = useState(false)
  const [showObs, setShowObs] = useState(false)
  const [modalDependentes, setModalDependentes] = useState(null) // lista de pessoas recém-salvas
  const [vinculosDependentes, setVinculosDependentes] = useState({}) // { idDependente: idResponsavel }
  const [dependentesDaPessoa, setDependentesDaPessoa] = useState([])
  const [dropEvangelizado, setDropEvangelizado] = useState(null)
  const [modalVincularDependente, setModalVincularDependente] = useState(null)
  const [novoResponsavelId, setNovoResponsavelId] = useState('')
  const [confirmExcluirEvangelizado, setConfirmExcluirEvangelizado] = useState(null)
  const [confirmExcluirAbordagem, setConfirmExcluirAbordagem] = useState(false)
  const mapaLocalRef = useRef(null)

  async function carregarPessoasKanban() {
    setLoadingPessoas(true)
    const { data } = await supabase.from('evangelizados').select('id, nome, telefone, observacao, observacao_2, status_contato, criado_em, abordagem_id, dependente, responsavel_id').order('criado_em', { ascending: false })
    if (data) {
      const atualizadas = await Promise.all(data.map(async p => {
        if (!p.telefone && (p.status_contato || 'pendente') === 'pendente' && !p.dependente) {
          await supabase.from('evangelizados').update({ status_contato: 'sem_contato' }).eq('id', p.id)
          return { ...p, status_contato: 'sem_contato' }
        }
        return p
      }))
      // dependentes não aparecem no kanban
      setPessoasKanban(atualizadas.filter(p => !p.dependente))
    }
    setLoadingPessoas(false)
  }

  async function moverPessoa(id, novoStatus) {
    const { error } = await supabase.from('evangelizados').update({ status_contato: novoStatus, data_contato: new Date().toISOString() }).eq('id', id)
    if (error) { console.error('Erro ao mover pessoa:', error); alert('Erro ao salvar: ' + error.message); return }
    setPessoasKanban(list => list.map(p => p.id === id ? { ...p, status_contato: novoStatus } : p))
    // atualiza dependentes
    await supabase.from('evangelizados').update({ status_contato: novoStatus, data_contato: new Date().toISOString() }).eq('responsavel_id', id).eq('dependente', true)
  }

  useEffect(() => {
    if (menu === 'cruzada') carregarPainelCruzada()
    if (menu === 'voluntarios' || menu === 'dashboard') carregarVoluntarios()
    if (menu === 'usuarios') { carregarUsuarios(); carregarEquipes(); carregarGrupos() }
    if (menu === 'grupos') carregarGrupos()
    if (menu === 'grupos' && !grupoIdPage) setGrupoAtivo(null)
    if (menu === 'locais' || menu === 'agenda') carregarLocais()
    if (menu === 'agenda') { carregarEventos(); carregarEquipes() }
    if (menu === 'evangelismo') { carregarAbordagens(); carregarEquipes(); if (user?.id) carregarOrgsUsuario(user.id) }
    if (menu === 'pessoas') { carregarPessoasKanban() }
    if (menu === 'mapa') carregarAbordagensComTotal()
    if (menu === 'galeria') { carregarAlbuns(); carregarVideosGaleria(); verificarGrupoMidia() }
  }, [menu, minhaEquipeId])

  useEffect(() => {
    if (isNovaAbordagemPage) {
      const agora = new Date()
      const dataHoraLocal = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}T${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
      setFormAbordagem(f => ({ ...f, data_hora: dataHoraLocal }))
      setModalAbordagem(true)
    } else {
      setModalAbordagem(false)
    }
  }, [isNovaAbordagemPage])

  useEffect(() => {
    if (modalNovoLocal || modalEditarLocal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalNovoLocal, modalEditarLocal])

  useEffect(() => {
    if (pessoaIdPage && pessoasKanban.length > 0) {
      const p = pessoasKanban.find(x => x.id === pessoaIdPage)
      if (p) {
        setModalPessoa(p); setObs2Value(''); setShowObs(false)
        supabase.from('evangelizados').select('id, nome').eq('responsavel_id', p.id).eq('dependente', true).then(({ data }) => setDependentesDaPessoa(data || []))
      }
    }
    if (!pessoaIdPage) setModalPessoa(null)
  }, [pessoaIdPage, pessoasKanban])

  useEffect(() => {
    if (usuarioIdPage && usuarios.length > 0) {
      const u = usuarios.find(x => x.id === usuarioIdPage)
      if (u) {
        setSelectedUsuario(u); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]); setFormEditUsuario({ perfil: u.perfil || '' }); setErroEquipeObrigatoria(false)
        carregarOrgsUsuario(u.id); carregarEquipes(); carregarGrupos()
      }
    }
    if (!usuarioIdPage) setSelectedUsuario(null)
  }, [usuarioIdPage, usuarios])

  useEffect(() => {
    if (!grupoIdPage) { setGrupoAtivo(null); return }
    async function carregarChat() {
      const g = grupos.find(x => x.id === grupoIdPage)
      if (g) setGrupoAtivo(g)
      else {
        const { data } = await supabase.from('grupos').select('*').eq('id', grupoIdPage).single()
        if (data) setGrupoAtivo(data)
      }
      const { data: msgs } = await supabase.from('mensagens_grupo').select('*, usuarios(nome)').eq('grupo_id', grupoIdPage).order('criado_em', { ascending: true })
      setMensagensGrupo(msgs || [])
      const { data: membroData } = await supabase.from('usuario_grupos').select('papel').eq('grupo_id', grupoIdPage).eq('usuario_id', user?.id).maybeSingle()
      setPapelNoGrupo(membroData?.papel || null)
    }
    carregarChat()
  }, [grupoIdPage, user])

  useEffect(() => {
    if (!grupoIdPage || !user?.id) return
    const channel = supabase.channel(`papel-grupo-${grupoIdPage}-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'usuario_grupos',
        filter: `grupo_id=eq.${grupoIdPage}`
      }, payload => {
        if (payload.new?.usuario_id === user.id) {
          setPapelNoGrupo(payload.new.papel || null)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [grupoIdPage, user])

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [mensagensGrupo])

  async function enviarMensagem() {
    if (!novaMensagem.trim() || !grupoIdPage) return
    setEnviandoMensagem(true)
    await supabase.from('mensagens_grupo').insert({ grupo_id: grupoIdPage, usuario_id: user.id, mensagem: novaMensagem.trim() })
    const { data: msgs } = await supabase.from('mensagens_grupo').select('*, usuarios(nome)').eq('grupo_id', grupoIdPage).order('criado_em', { ascending: true })
    setMensagensGrupo(msgs || [])
    setNovaMensagem('')
    setEnviandoMensagem(false)
  }

  useEffect(() => {
    if (modalPessoa) {
      const t = setTimeout(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 80)
      return () => clearTimeout(t)
    }
  }, [modalPessoa?.observacao_2])

  async function carregarEventos() {
    let query = supabase.from('eventos').select('*, locais(nome), equipes(nome)').order('data').order('hora_inicio')
    if (perfilUsuario !== 'admin' && perfilUsuario !== 'lider' && minhaEquipeId) {
      query = query.or(`equipe_id.eq.${minhaEquipeId},equipe_id.is.null`)
    } else if (perfilUsuario !== 'admin' && perfilUsuario !== 'lider' && !minhaEquipeId) {
      query = query.is('equipe_id', null)
    }
    const { data } = await query
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

  async function salvarNovoLocal() {
    if (!formNovoLocal.nome.trim()) return
    setSalvandoLocal(true)
    const { error } = await supabase.from('locais').insert({
      tipo: formNovoLocal.tipo || null,
      nome: formNovoLocal.nome,
      endereco: formNovoLocal.endereco || null,
      bairro: formNovoLocal.bairro || null,
      regiao: formNovoLocal.regiao || null,
      municipio: formNovoLocal.municipio || null,
      uf: formNovoLocal.uf || null,
    })
    setSalvandoLocal(false)
    if (!error) {
      setModalNovoLocal(false)
      setFormNovoLocal({ tipo: '', nome: '', endereco: '', bairro: '', regiao: '', municipio: '', uf: '' })
      carregarLocais()
    }
  }


  async function excluirLocal() {
    if (!localSelecionado) return
    const { error } = await supabase.from('locais').delete().eq('id', localSelecionado.id)
    if (!error) {
      setLocais(prev => prev.filter(l => l.id !== localSelecionado.id))
      setLocalSelecionado(null)
      setBuscaLocal('')
      setModalEditarLocal(false)
      setConfirmExcluirLocal(false)
    }
  }

  async function salvarEdicaoLocal() {
    if (!formEditarLocal.nome?.trim()) return
    setSalvandoLocal(true)
    const { error } = await supabase.from('locais').update({
      nome: formEditarLocal.nome,
      tipo: formEditarLocal.tipo || null,
      endereco: formEditarLocal.endereco || null,
      bairro: formEditarLocal.bairro || null,
      regiao: formEditarLocal.regiao || null,
      municipio: formEditarLocal.municipio || null,
      uf: formEditarLocal.uf || null,
      observacao: formEditarLocal.observacao || null,
    }).eq('id', localSelecionado.id)
    setSalvandoLocal(false)
    if (!error) {
      const updated = { ...localSelecionado, ...formEditarLocal }
      setLocalSelecionado(updated)
      setLocais(prev => prev.map(l => l.id === localSelecionado.id ? updated : l))
      setModalEditarLocal(false)
    }
  }

  async function carregarUsuarios() {
    setLoadingUsers(true)
    const { data } = await supabase.from('usuarios').select('*, usuario_equipes(equipe_id), usuario_grupos(grupo_id)').order('criado_em', { ascending: false })
    setUsuarios((data || []).map(u => ({
      ...u,
      equipes: (u.usuario_equipes || []).map(r => r.equipe_id),
      grupos: (u.usuario_grupos || []).map(r => r.grupo_id),
    })))
    setLoadingUsers(false)
  }

  async function carregarVoluntarios() {
    setLoadingVol(true)
    const { data } = await supabase.from('voluntarios').select('*').order('criado_em', { ascending: false })
    setVoluntarios(data || [])
    setLoadingVol(false)
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (e) {
      console.error(e)
    }
    navigate('/login')
  }

  async function salvarNome() {
    if (!novoNome.trim() || !user?.id) return
    setSalvandoNome(true)
    await supabase.from('usuarios').update({ nome: novoNome.trim() }).eq('id', user.id)
    setNomeUsuario(novoNome.trim())
    setEditandoNome(false)
    setSalvandoNome(false)
  }

  async function handleRemoverFotoPerfil() {
    if (!user?.id) return
    await supabase.from('usuarios').update({ foto_url: null }).eq('id', user.id)
    setFotoUsuario(null)
    setSubMenuFoto(false)
  }

  function handleSelecionarFotoPerfil(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setSubMenuFoto(false)
    const reader = new FileReader()
    reader.onload = () => { setCropSrc(reader.result); setCrop({ x: 0, y: 0 }); setZoom(1) }
    reader.readAsDataURL(arquivo)
    e.target.value = ''
  }

  async function confirmarCrop() {
    if (!cropSrc || !croppedAreaPixels || !user?.id) return
    setEnviandoFotoPerfil(true)
    setCropSrc(null)
    const blob = await getCroppedBlob(cropSrc, croppedAreaPixels)
    const caminho = `${user.id}/${Date.now()}.jpg`
    const { error: erroUpload } = await supabase.storage.from('fotos-perfil').upload(caminho, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!erroUpload) {
      const { data: urlData } = supabase.storage.from('fotos-perfil').getPublicUrl(caminho)
      await supabase.from('usuarios').update({ foto_url: urlData.publicUrl }).eq('id', user.id)
      setFotoUsuario(urlData.publicUrl)
    }
    setEnviandoFotoPerfil(false)
  }

  async function getCroppedBlob(imageSrc, pixelCrop) {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = imageSrc
    })
    const canvas = document.createElement('canvas')
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
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

  async function salvarNovoVoluntario() {
    setSalvandoNovoVol(true)
    setErroNovoVol('')
    const f = formNovoVol
    const payload = {
      nome_completo: f.nome_completo,
      idade: parseInt(f.idade) || null,
      sexo: f.sexo || null,
      whatsapp: f.whatsapp,
      instagram: f.instagram || null,
      cidade_estado_pais: f.cidade_estado_pais,
      igreja: f.igreja,
      nome_pastor: f.nome_pastor || null,
      contato_pastor_lider: f.contato_pastor_lider,
      como_serve_igreja: f.como_serve_igreja,
      tempo_na_igreja: f.tempo_na_igreja,
      estado_civil: f.estado_civil,
      conjuge_na_missao: f.estado_civil === 'casado' ? (f.conjuge_na_missao === 'sim') : null,
      motivo_conjuge_ausente: f.motivo_conjuge_ausente || null,
      nome_emergencia: f.nome_emergencia || null,
      telefone_emergencia: f.telefone_emergencia || null,
      limitacao_fisica: f.limitacao_fisica || null,
      ja_participou_missao: f.ja_participou_missao === 'sim',
      fala_ingles: !!f.fala_ingles,
      fala_espanhol: !!f.fala_espanhol,
      canta: !!f.canta,
      toca_instrumento: !!f.toca_instrumento,
      tira_fotos: !!f.tira_fotos,
      faz_filmagens: !!f.faz_filmagens,
      outras_competencias: !!f.outras_competencias,
      outra_competencia_descricao: f.outra_competencia_descricao || null,
      status: 'pendente',
    }
    const { error } = await supabase.from('voluntarios').insert([payload])
    setSalvandoNovoVol(false)
    if (error) { setErroNovoVol('Erro ao cadastrar. Tente novamente.'); return }
    await carregarVoluntarios()
    setNovoVoluntario(false)
    setFormNovoVol({ nome_completo: '', idade: '', sexo: '', whatsapp: '', instagram: '', cidade_estado_pais: '', igreja: '', nome_pastor: '', contato_pastor_lider: '', como_serve_igreja: '', tempo_na_igreja: '', estado_civil: '', conjuge_na_missao: '', motivo_conjuge_ausente: '', nome_emergencia: '', telefone_emergencia: '', limitacao_fisica: '', ja_participou_missao: '', fala_ingles: false, fala_espanhol: false, canta: false, toca_instrumento: false, tira_fotos: false, faz_filmagens: false, outras_competencias: false, outra_competencia_descricao: '' })
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
    const equipes = (eqs || []).map(r => r.equipe_id)
    const grupos = (grs || []).map(r => r.grupo_id)
    setUsuarioOrgs({ equipes, grupos })
    setFormEditUsuario(f => ({ ...f, equipe_id: equipes[0] || '' }))
    return { equipes, grupos }
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
      await supabase.from('usuario_grupos').insert({ usuario_id: uid, grupo_id: id, papel: 'membro' })
      setUsuarioOrgs(prev => ({ ...prev, grupos: [...prev.grupos, id] }))
    }
  }

  async function carregarAlbuns(parentId = null) {
    const query = supabase.from('albuns').select('*').order('criado_em', { ascending: false })
    const { data } = parentId ? await query.eq('parent_id', parentId) : await query.is('parent_id', null)
    setAlbuns(data || [])
  }

  function abrirAlbum(album, breadcrumb = []) {
    setAlbumAtivo(album)
    setAlbumBreadcrumb(breadcrumb)
    carregarAlbuns(album.id)
    carregarFotosAlbum(album.id)
  }

  function voltarAlbum() {
    if (albumBreadcrumb.length === 0) {
      setAlbumAtivo(null)
      setAlbumBreadcrumb([])
      carregarAlbuns(null)
      setFotosAlbum([])
    } else {
      const pai = albumBreadcrumb[albumBreadcrumb.length - 1]
      const novoBreadcrumb = albumBreadcrumb.slice(0, -1)
      setAlbumAtivo(pai)
      setAlbumBreadcrumb(novoBreadcrumb)
      carregarAlbuns(pai.id)
      carregarFotosAlbum(pai.id)
    }
  }

  async function carregarVideosGaleria() {
    const { data } = await supabase.from('videos').select('*').order('criado_em', { ascending: false })
    setVideos(data || [])
  }

  async function verificarGrupoMidia() {
    if (!user?.id) return
    const { data } = await supabase.from('usuario_grupos').select('grupos(nome)').eq('usuario_id', user.id)
    const pertence = (data || []).some(r => r.grupos?.nome?.toLowerCase().includes('mídia') || r.grupos?.nome?.toLowerCase().includes('midia'))
    const { data: u } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    setPodeGerenciarGaleria(pertence || u?.perfil === 'admin')
  }

  async function carregarFotosAlbum(albumId) {
    const { data } = await supabase.from('fotos').select('*').eq('album_id', albumId).order('criado_em', { ascending: true })
    setFotosAlbum(data || [])
  }

  async function criarAlbum() {
    if (!nomeNovoAlbum.trim()) return
    const { data } = await supabase.from('albuns').insert({ nome: nomeNovoAlbum.trim(), criado_por: user.id, parent_id: albumAtivo?.id || null }).select().single()
    if (data) setAlbuns(prev => [data, ...prev])
    setNomeNovoAlbum('')
    setModalNovoAlbum(false)
  }

  async function uploadFoto(e, albumId) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploadandoFoto(true)
    setUploadProgresso({ atual: 0, total: files.length })
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgresso({ atual: i + 1, total: files.length })
      const ext = file.name.split('.').pop()
      const path = `${albumId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('galeria').upload(path, file, { contentType: file.type })
      if (error) { console.error('Erro upload:', error); continue }
      if (!error) {
        const { data: urlData } = supabase.storage.from('galeria').getPublicUrl(path)
        await supabase.from('fotos').insert({ album_id: albumId, url: urlData.publicUrl, nome: file.name })
      }
    }
    await carregarFotosAlbum(albumId)
    setUploadandoFoto(false)
  }

  async function excluirFoto(foto) {
    const path = foto.url.split('/galeria/')[1]
    await supabase.storage.from('galeria').remove([path])
    await supabase.from('fotos').delete().eq('id', foto.id)
    setFotosAlbum(prev => prev.filter(f => f.id !== foto.id))
  }

  async function excluirAlbum(albumId) {
    await supabase.from('albuns').delete().eq('id', albumId)
    setAlbuns(prev => prev.filter(a => a.id !== albumId))
  }

  async function criarVideo() {
    if (!formNovoVideo.titulo.trim() || !formNovoVideo.link.trim()) return
    const { data } = await supabase.from('videos').insert({ titulo: formNovoVideo.titulo.trim(), link: formNovoVideo.link.trim() }).select().single()
    if (data) setVideos(prev => [data, ...prev])
    setFormNovoVideo({ titulo: '', link: '' })
    setModalNovoVideo(false)
  }

  function getYoutubeId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  async function buscarVoluntariosParaVinculo(texto) {
    setBuscaVoluntario(texto)
    if (texto.length < 2) { setSugestoesVoluntario([]); return }
    const [porNome, porTelefone] = await Promise.all([
      supabase.from('voluntarios').select('id, nome_completo, whatsapp').ilike('nome_completo', `%${texto}%`).limit(5),
      supabase.from('voluntarios').select('id, nome_completo, whatsapp').ilike('whatsapp', `%${texto}%`).limit(5),
    ])
    const todos = [...(porNome.data || []), ...(porTelefone.data || [])]
    const unicos = todos.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i).slice(0, 8)
    setSugestoesVoluntario(unicos)
  }

  async function buscarVolParaVinculo(texto) {
    if (!texto.trim()) { setSugestoesVolVinculo([]); return }
    const { data } = await supabase.from('voluntarios').select('id, nome_completo').ilike('nome_completo', `%${texto}%`).is('usuario_id', null).limit(6)
    setSugestoesVolVinculo(data || [])
  }

  async function vincularVoluntario(volId) {
    if (!selectedUsuario?.id) return
    setVinculandoVol(true)
    await supabase.from('voluntarios').update({ usuario_id: selectedUsuario.id }).eq('id', volId)
    setSugestoesVolVinculo([])
    setBuscaVolVinculo('✓ Vinculado')
    setVinculandoVol(false)
  }

  async function garantirRegistroVoluntario(usuarioId, nome) {
    const { data: existente } = await supabase.from('voluntarios').select('id').eq('usuario_id', usuarioId).maybeSingle()
    if (!existente) {
      const { error } = await supabase.from('voluntarios').insert({
        usuario_id: usuarioId,
        nome_completo: nome || '',
        status: 'pendente',
        idade: 0,
        whatsapp: '',
        cidade_estado_pais: '',
        igreja: '',
        contato_pastor_lider: '',
        como_serve_igreja: '',
        tempo_na_igreja: '',
        estado_civil: 'solteiro',
        ja_participou_missao: false,
      })
      if (error) console.error('Erro ao criar voluntário:', error)
    }
  }

  async function ativarUsuario(u) {
    const novoAtivo = !u.ativo
    const temEquipe = usuarioOrgs.equipes.length > 0 || !!formEditUsuario.equipe_id
    if (novoAtivo && !temEquipe) {
      setErroEquipeObrigatoria(true)
      return
    }
    setErroEquipeObrigatoria(false)
    if (novoAtivo && formEditUsuario.equipe_id && !usuarioOrgs.equipes.includes(formEditUsuario.equipe_id)) {
      await supabase.from('usuario_equipes').delete().eq('usuario_id', u.id)
      await supabase.from('usuario_equipes').upsert({ usuario_id: u.id, equipe_id: formEditUsuario.equipe_id })
      setUsuarioOrgs(prev => ({ ...prev, equipes: [formEditUsuario.equipe_id] }))
    }
    await supabase.from('usuarios').update({ ativo: novoAtivo }).eq('id', u.id)
    setSelectedUsuario(v => ({ ...v, ativo: novoAtivo }))
    setUsuarios(list => list.map(x => x.id === u.id ? { ...x, ativo: novoAtivo } : x))
    const perfilAtual = formEditUsuario.perfil || u.perfil
    if (novoAtivo && perfilAtual === 'voluntario') {
      await garantirRegistroVoluntario(u.id, u.nome)
      carregarVoluntarios()
    }
  }

  async function salvarEdicaoUsuario() {
    setSalvandoEdicaoUsuario(true)
    const perfil = formEditUsuario.perfil || selectedUsuario.perfil
    let erro = false
    if (perfil) {
      const { error } = await supabase.from('usuarios').update({ perfil }).eq('id', selectedUsuario.id)
      if (error) erro = true
    }
    if (!erro) {
      const { error } = await supabase.from('usuario_equipes').delete().eq('usuario_id', selectedUsuario.id)
      if (error) erro = true
    }
    if (!erro && formEditUsuario.equipe_id) {
      const { error } = await supabase.from('usuario_equipes').upsert({ usuario_id: selectedUsuario.id, equipe_id: formEditUsuario.equipe_id })
      if (error) erro = true
    }
    setSalvandoEdicaoUsuario(false)
    if (erro) return
    const novaEquipe = formEditUsuario.equipe_id ? [formEditUsuario.equipe_id] : []
    setUsuarioOrgs(prev => ({ ...prev, equipes: novaEquipe }))
    setSelectedUsuario(v => ({ ...v, perfil: formEditUsuario.perfil }))
    setUsuarios(list => list.map(x => x.id === selectedUsuario.id ? { ...x, perfil: formEditUsuario.perfil } : x))
    setEditandoUsuario(false)
    if (formEditUsuario.perfil === 'voluntario') {
      await garantirRegistroVoluntario(selectedUsuario.id, selectedUsuario.nome)
      carregarVoluntarios()
    }
    setSelectedUsuario(null)
    setErroEquipeObrigatoria(false)
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
      .select('*, usuarios(nome), equipes(nome)')
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
    const enderecoCompleto = formAbordagem.endereco
    const { error } = await supabase.rpc('registrar_abordagem', {
      p_local: enderecoCompleto,
      p_endereco: enderecoCompleto || null,
      p_data_hora: formAbordagem.data_hora || new Date().toISOString(),
      p_usuario_id: user?.id,
      p_observacao: formAbordagem.observacao || null,
      p_pessoas: pessoasValidas,
      p_equipe_id: usuarioOrgs.equipes?.[0] || null,
    })
    setSalvandoAbordagem(false)
    if (!error) {
      setModalAbordagem(false)
      setFormAbordagem({ local: '', endereco: '', data_hora: '', observacao: '' })
      // busca as pessoas recém-salvas para o modal de dependentes
      if (pessoasValidas.length > 1) {
        const { data: pessoasSalvas } = await supabase.from('evangelizados').select('id, nome').in('nome', pessoasValidas.map(p => p.nome)).order('criado_em', { ascending: false }).limit(pessoasValidas.length)
        if (pessoasSalvas && pessoasSalvas.length > 1) {
          setVinculosDependentes({})
          setModalDependentes(pessoasSalvas)
        }
      }
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
      equipe_id: formEditAbordagem.equipe_id || null,
    }).eq('id', abordagemSelecionada.id)
    setSalvandoEditAbordagem(false)
    if (!error) {
      const equipeNome = equipes.find(e => e.id === formEditAbordagem.equipe_id)
      const atualizada = { ...abordagemSelecionada, ...formEditAbordagem, local: formEditAbordagem.endereco, equipes: equipeNome ? { nome: equipeNome.nome } : null }
      setAbordagemSelecionada(atualizada)
      setAbordagens(list => list.map(a => a.id === atualizada.id ? atualizada : a))
      setEditandoAbordagem(false)
    }
  }

  async function salvarNovaPessoa() {
    if (!formNovaPessoa.nome.trim()) return
    setSalvandoNovaPessoa(true)
    const { data, error } = await supabase.from('evangelizados').insert({
      abordagem_id: abordagemSelecionada.id,
      nome: formNovaPessoa.nome,
      telefone: formNovaPessoa.telefone || null,
      endereco_pessoa: formNovaPessoa.endereco_pessoa || null,
      observacao: formNovaPessoa.observacao || null,
      status_contato: 'pendente',
    }).select().single()
    setSalvandoNovaPessoa(false)
    if (!error && data) {
      setEvangelizados(list => [...list, data])
      setFormNovaPessoa({ nome: '', telefone: '', endereco_pessoa: '', observacao: '' })
      setAdicionandoPessoa(false)
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

  async function salvarVinculosDependentes() {
    const entradas = Object.entries(vinculosDependentes)
    await Promise.all(entradas.map(([dependenteId, responsavelId]) =>
      supabase.from('evangelizados').update({ dependente: true, responsavel_id: responsavelId }).eq('id', dependenteId)
    ))
    setModalDependentes(null)
    setVinculosDependentes({})
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

  async function carregarPainelCruzada() {
    const hoje = new Date()
    const dataStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`
    const meiodia = `${dataStr}T12:00:00`
    const fimDia = `${dataStr}T23:59:59`

    const isAdmin = perfilUsuario === 'admin' || perfilUsuario === 'lider'
    let qEventosHoje = supabase.from('eventos').select('id, titulo, data, hora_inicio, locais(nome)').eq('data', dataStr).order('hora_inicio')
    if (!isAdmin && minhaEquipeId) qEventosHoje = qEventosHoje.or(`equipe_id.eq.${minhaEquipeId},equipe_id.is.null`)
    else if (!isAdmin && !minhaEquipeId) qEventosHoje = qEventosHoje.is('equipe_id', null)
    const [resEventos, resGrupos, resUsuarios, resVol, resEquipes, resAlbum] = await Promise.all([
      qEventosHoje,
      supabase.from('grupos').select('id, nome').ilike('nome', '%geral%').limit(1),
      supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('voluntarios').select('id, nome_completo, idade, whatsapp, instagram, cidade_estado_pais, igreja, nome_pastor, contato_pastor_lider, como_serve_igreja, tempo_na_igreja, estado_civil, conjuge_na_missao, motivo_conjuge_ausente, ja_participou_missao, nome_emergencia, telefone_emergencia').not('usuario_id', 'is', null),
      supabase.from('equipes').select('id, nome, cor').order('nome'),
      supabase.from('albuns').select('id').ilike('nome', '%anúncios cruzada%').limit(1),
    ])
    const eventos = resEventos.data || []
    const grupos = resGrupos.data || []
    const totalUsuariosData = resUsuarios.count ?? 0
    const todosVols = resVol.data || []
    const totalVolData = todosVols.length
    const totalCompletos = todosVols.filter(v => camposFaltando(v).length === 0).length
    const equipes = resEquipes.data || []
    let fotosAnuncios = []
    if (resAlbum.data && resAlbum.data.length > 0) {
      const { data: fotos } = await supabase.from('fotos').select('url').eq('album_id', resAlbum.data[0].id).order('criado_em', { ascending: true })
      fotosAnuncios = fotos || []
    }

    let comunicados = []
    if (grupos.length > 0) {
      const grupoId = grupos[0].id
      const { data: msgs } = await supabase.from('mensagens_grupo').select('mensagem, usuario_id, usuarios(nome)').eq('grupo_id', grupoId).order('id', { ascending: false }).limit(5)
      comunicados = msgs || []
    }

    let eventosManha = eventos.filter(e => (e.hora_inicio || '00:00') < '12:00')
    let eventosTarde = eventos.filter(e => (e.hora_inicio || '00:00') >= '12:00')
    let proximaDataAgenda = null

    if (eventos.length === 0) {
      let qProximos = supabase.from('eventos').select('id, titulo, data, hora_inicio, locais(nome)').gt('data', dataStr).order('data').order('hora_inicio').limit(20)
      if (!isAdmin && minhaEquipeId) qProximos = qProximos.or(`equipe_id.eq.${minhaEquipeId},equipe_id.is.null`)
      else if (!isAdmin && !minhaEquipeId) qProximos = qProximos.is('equipe_id', null)
      const { data: proximos } = await qProximos
      if (proximos && proximos.length > 0) {
        proximaDataAgenda = proximos[0].data
        const eventosProximos = proximos.filter(e => e.data === proximaDataAgenda)
        eventosManha = eventosProximos.filter(e => (e.hora_inicio || '00:00') < '12:00')
        eventosTarde = eventosProximos.filter(e => (e.hora_inicio || '00:00') >= '12:00')
      }
    }

    setPainelCruzada({
      eventosManha,
      eventosTarde,
      comunicados,
      equipes,
      totalUsuarios: totalUsuariosData,
      totalVoluntarios: totalVolData,
      totalCompletos,
      fotosAnuncios,
      proximaDataAgenda,
    })
  }

  async function carregarVoluntario() {
    setCarregandoVoluntario(true)
    const { data } = await supabase.from('voluntarios').select('*').eq('usuario_id', user.id).maybeSingle()
    if (data) {
      setVoluntarioId(data.id)
      setFormVoluntario({
        nome_completo: data.nome_completo || '', idade: data.idade || '', whatsapp: data.whatsapp || '',
        instagram: data.instagram || '', cidade_estado_pais: data.cidade_estado_pais || '',
        igreja: data.igreja || '', estado_civil: data.estado_civil || '',
        conjuge_na_missao: data.conjuge_na_missao === true ? 'sim' : data.conjuge_na_missao === false ? 'nao' : '',
        motivo_conjuge_ausente: data.motivo_conjuge_ausente || '', tempo_na_igreja: data.tempo_na_igreja || '',
        como_serve_igreja: data.como_serve_igreja || '', nome_pastor: data.nome_pastor || '',
        contato_pastor_lider: data.contato_pastor_lider || '', nome_emergencia: data.nome_emergencia || '',
        telefone_emergencia: data.telefone_emergencia || '',
        ja_participou_missao: data.ja_participou_missao === true ? 'sim' : data.ja_participou_missao === false ? 'nao' : '',
        limitacao_fisica: data.limitacao_fisica || '', fala_ingles: data.fala_ingles || false,
        fala_espanhol: data.fala_espanhol || false, canta: data.canta || false,
        toca_instrumento: data.toca_instrumento || false, tira_fotos: data.tira_fotos || false,
        faz_filmagens: data.faz_filmagens || false, outras_competencias: data.outras_competencias || false,
        outra_competencia_descricao: data.outra_competencia_descricao || '', sexo: data.sexo || '',
      })
    }
    setCarregandoVoluntario(false)
  }

  function setFV(key, value) { setFormVoluntario(f => ({ ...f, [key]: value })) }

  function buscarCidadePerf(valor) {
    setFV('cidade_estado_pais', valor)
    clearTimeout(cidadeTimerPerf.current)
    if (valor.length < 3) { setCidadeSugestoesPerf([]); return }
    cidadeTimerPerf.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(valor)}&format=json&addressdetails=1&limit=6&featureType=city`)
        const dados = await res.json()
        const sugestoes = dados.map(item => {
          const a = item.address
          const cidade = a.city || a.town || a.village || a.municipality || a.county || ''
          return [cidade, a.state || '', a.country || ''].filter(Boolean).join(', ')
        }).filter((v, i, arr) => v && arr.indexOf(v) === i)
        setCidadeSugestoesPerf(sugestoes)
      } catch {}
    }, 400)
  }

  async function handleSalvarVoluntario(e) {
    e.preventDefault()
    setSalvandoVoluntario(true)
    const fv = formVoluntario
    const payload = {
      usuario_id: user.id,
      nome_completo: fv.nome_completo, idade: parseInt(fv.idade) || null,
      whatsapp: fv.whatsapp, instagram: fv.instagram, cidade_estado_pais: fv.cidade_estado_pais,
      igreja: fv.igreja, nome_pastor: fv.nome_pastor, contato_pastor_lider: fv.contato_pastor_lider,
      como_serve_igreja: fv.como_serve_igreja, tempo_na_igreja: fv.tempo_na_igreja,
      estado_civil: fv.estado_civil,
      conjuge_na_missao: fv.estado_civil === 'casado' ? fv.conjuge_na_missao === 'sim' : null,
      motivo_conjuge_ausente: fv.motivo_conjuge_ausente || null,
      nome_emergencia: fv.nome_emergencia, telefone_emergencia: fv.telefone_emergencia,
      limitacao_fisica: fv.limitacao_fisica || null, ja_participou_missao: fv.ja_participou_missao === 'sim',
      fala_ingles: fv.fala_ingles, fala_espanhol: fv.fala_espanhol, canta: fv.canta,
      toca_instrumento: fv.toca_instrumento, tira_fotos: fv.tira_fotos, faz_filmagens: fv.faz_filmagens,
      outras_competencias: fv.outras_competencias, outra_competencia_descricao: fv.outra_competencia_descricao || null,
      sexo: fv.sexo || null, status: 'pendente',
    }
    if (voluntarioId) {
      const { error } = await supabase.from('voluntarios').update(payload).eq('id', voluntarioId)
      if (error) { console.error('Erro ao atualizar voluntário:', error); setSalvandoVoluntario(false); return }
    } else {
      const { data, error } = await supabase.from('voluntarios').insert([payload]).select().single()
      if (error) { console.error('Erro ao inserir voluntário:', error); setSalvandoVoluntario(false); return }
      if (data) setVoluntarioId(data.id)
    }
    if (fv.nome_completo?.trim()) {
      await supabase.from('usuarios').update({ nome: fv.nome_completo.trim() }).eq('id', user.id)
      setNomeUsuario(fv.nome_completo.trim())
    }
    setSalvandoVoluntario(false)
    setModalEditarPerfilAberto(false)
  }

  return (
    <div style={s.page}>

      {/* Modal cropper de foto */}
      {cropSrc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', padding: '20px', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <button onClick={() => setCropSrc(null)} style={{ flex: 1, maxWidth: '160px', padding: '12px', borderRadius: '10px', border: 'none', background: '#374151', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={confirmarCrop} style={{ flex: 1, maxWidth: '160px', padding: '12px', borderRadius: '10px', border: 'none', background: '#F97310', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Usar foto</button>
          </div>
        </div>
      )}

      {/* Modal expandir foto */}
      {expandirFoto && fotoUsuario && (
        <div onClick={() => setExpandirFoto(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={fotoUsuario} alt="Foto" style={{ width: '280px', height: '280px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 48px rgba(0,0,0,0.5)' }} />
        </div>
      )}

      {/* Modal expandir anúncio */}
      {expandirAnuncio !== null && painelCruzada.fotosAnuncios.length > 0 && (() => {
        const fotos = painelCruzada.fotosAnuncios
        const idxModal = expandirAnuncio % fotos.length
        const prev = () => setExpandirAnuncio(i => (i - 1 + fotos.length) % fotos.length)
        const next = () => setExpandirAnuncio(i => (i + 1) % fotos.length)
        let touchStartX = null
        return (
          <div
            onClick={() => setExpandirAnuncio(null)}
            onTouchStart={e => { touchStartX = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (touchStartX === null) return
              const diff = touchStartX - e.changedTouches[0].clientX
              if (diff > 50) next()
              else if (diff < -50) prev()
              touchStartX = null
            }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Fechar */}
            <button onClick={() => setExpandirAnuncio(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>✕</button>
            {/* Imagem principal */}
            <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px', position: 'relative', boxSizing: 'border-box' }}>
              {/* Setas - só desktop */}
              <button className="lightbox-arrow" onClick={e => { e.stopPropagation(); prev() }} style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', color: '#fff', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>‹</button>
              <img src={fotos[idxModal].url} alt="Anúncio" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 160px)', borderRadius: '10px', objectFit: 'contain' }} />
              <button className="lightbox-arrow" onClick={e => { e.stopPropagation(); next() }} style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', color: '#fff', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>›</button>
            </div>
            {/* Miniaturas */}
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '8px', padding: '12px 16px', overflowX: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}>
              {fotos.map((f, i) => (
                <img key={i} src={f.url} alt="" onClick={e => { e.stopPropagation(); setExpandirAnuncio(i) }}
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: i === idxModal ? '2px solid #F97310' : '2px solid transparent', opacity: i === idxModal ? 1 : 0.5, flexShrink: 0, transition: 'all 0.2s' }} />
              ))}
            </div>
          </div>
        )
      })()}

      {/* Modal lista do dia - agenda */}
      {agendaDiaModal && (
        <div style={s.modalOverlay} onClick={() => { setAgendaDiaModal(null); setAgendaDiaEventoAberto(null) }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setAgendaDiaModal(null); setAgendaDiaEventoAberto(null) }} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

            {agendaDiaEventoAberto ? (
              // Tela de detalhe
              <>
                <button onClick={() => setAgendaDiaEventoAberto(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', marginBottom: '20px', padding: 0, fontFamily: 'inherit' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Voltar
                </button>
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
        .grupo-chat-input::placeholder { color: #9ca3af !important; opacity: 1 !important; }
        .carrossel-container { aspect-ratio: 16/6; max-height: 220px; }
        .lightbox-arrow { display: flex !important; }
        @media (max-width: 768px) {
          .carrossel-container { aspect-ratio: 16/9 !important; max-height: none !important; }
          .lightbox-arrow { display: none !important; }
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
          .grupo-chat-container { height: calc(100vh - 174px) !important; }
          .dash-bottomnav { display: flex !important; }
          .dash-kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .dash-mid-grid { grid-template-columns: 1fr !important; }
          .dash-bot-grid { grid-template-columns: 1fr !important; }
          .dash-check-grid { grid-template-columns: 1fr !important; width: 100% !important; align-items: flex-start !important; }
          .dash-check-grid label { justify-content: flex-start !important; white-space: nowrap !important; text-align: left !important; margin-left: 0 !important; margin-right: auto !important; display: flex !important; align-items: center !important; }
          .dash-check-grid input[type="checkbox"] { width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; margin: 0 !important; flex-shrink: 0 !important; }
          .dash-form-grid { grid-template-columns: 1fr !important; }
          .dash-faixa-etaria { margin-bottom: 24px !important; }
          .pessoa-detalhe { padding: 20px 16px 90px !important; }
          .kanban-desktop { display: none !important; }
          .kanban-mobile { display: flex !important; }
          .abordagem-pessoa-grid { grid-template-columns: 1fr !important; }
          .abordagem-pessoa-card { background: transparent !important; border: none !important; padding: 0 !important; }
          .nova-abordagem-overlay { background: #fff !important; align-items: flex-start !important; padding: 0 !important; overflow-y: auto !important; top: 64px !important; }
          .nova-abordagem-inner { border-radius: 0 !important; max-width: 100% !important; height: auto !important; max-height: none !important; box-shadow: none !important; padding: 24px 20px 100px !important; overflow-y: visible !important; }
          .nova-abordagem-voltar { display: flex !important; }
          .local-modal-overlay { background: #fff !important; align-items: flex-start !important; padding: 0 !important; overflow-y: auto !important; top: 64px !important; }
          .local-modal-inner { border-radius: 0 !important; max-width: 100% !important; height: auto !important; max-height: none !important; box-shadow: none !important; padding: 24px 20px 100px !important; overflow-y: visible !important; }
          .local-modal-voltar { display: flex !important; }
          .treinamento-layout { grid-template-columns: 1fr !important; }
          .edit-abordagem-btns { justify-content: space-between !important; }
          .edit-abordagem-btns button { flex: 1 !important; text-align: center !important; }
          .dash-form-section { padding: 16px 14px !important; overflow: hidden; max-width: 100%; }
          .dash-form-section input, .dash-form-section textarea { max-width: 100% !important; box-sizing: border-box !important; width: 100% !important; }
          .usuarios-filtros { display: flex !important; }
          .vol-header { flex-wrap: wrap !important; gap: 10px !important; }
          .btn-novo-vol { width: 100% !important; text-align: center !important; justify-content: center !important; }
          .usuario-modal-overlay { background: #fff !important; align-items: flex-start !important; padding: 0 !important; overflow-y: auto !important; top: 64px !important; }
          .usuario-modal-inner { border-radius: 0 !important; max-width: 100% !important; height: auto !important; max-height: none !important; box-shadow: none !important; padding: 24px 20px 100px !important; overflow-y: visible !important; }
          .usuario-modal-voltar { display: flex !important; }
          .usuario-modal-close { display: none !important; }
        }
        @media (min-width: 769px) {
          .dash-bottomnav { display: none !important; }
          .agenda-mobile { display: none !important; }
        }
        .leaflet-top, .leaflet-bottom, .leaflet-control-container { z-index: 1 !important; }
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
        <div style={{ ...s.headerLogo, cursor: 'pointer' }} className="dash-header-logo" onClick={() => navigate('/sistema/cruzada')}>
          <img src="/logo.png" alt="Logo" style={{ height: '22px', width: 'auto' }} />
          <span style={s.headerTitle} className="dash-header-title">Cruzada <span style={{ color: '#F97310' }}>Ibirité</span></span>
        </div>
        <div style={{ position: 'relative' }} className="dash-profile-btn">
          <button style={s.profileBtn} onClick={() => setDropdownOpen(o => !o)}>
            <div style={s.profileAvatar}>{fotoUsuario ? <img src={fotoUsuario} alt="Foto de perfil" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(nomeUsuario || user?.email)}</div>
            <span style={s.profileEmail} className="dash-profile-email">{nomeUsuario || user?.email}</span>
            <span style={s.profileChevron} className="dash-profile-chevron">▾</span>
          </button>
          {dropdownOpen && (
            <div style={s.dropdown}>
              {minhaEquipe && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: minhaEquipe.cor || '#9ca3af', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{minhaEquipe.nome}</span>
                  </div>
                  <div style={s.dropdownDivider} />
                </>
              )}
              <button style={s.dropdownItem} onClick={() => { setDropdownOpen(false); setModalEditarPerfilAberto(true); carregarVoluntario() }}>Editar perfil</button>
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
          {MENU.filter(item => temAcessoDinamico(perfilUsuario, item.key)).map(item => (
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

          {modalEditarPerfilAberto && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button onClick={() => setModalEditarPerfilAberto(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Voltar
                </button>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', margin: 0 }}>Meu cadastro</h3>
              </div>

              {carregandoVoluntario ? (
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Carregando...</div>
              ) : (
                <form onSubmit={handleSalvarVoluntario} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* Foto */}
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '28px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <div onClick={() => fotoUsuario && setExpandirFoto(true)} style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', background: '#F97310', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', fontWeight: 800, color: '#fff', cursor: fotoUsuario ? 'zoom-in' : 'default' }}>
                        {fotoUsuario ? <img src={fotoUsuario} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(nomeUsuario || user?.email)}
                      </div>
                      <button type="button" onClick={() => setSubMenuFoto(v => !v)} style={{ position: 'absolute', bottom: 2, right: 2, width: '28px', height: '28px', borderRadius: '50%', background: '#F97310', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '16px', color: '#0f1117', margin: 0, textAlign: 'center' }}>{nomeUsuario || 'Sem nome'}</p>
                    {minhaEquipe && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: minhaEquipe.cor || '#9ca3af', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{minhaEquipe.nome}</span>
                      </div>
                    )}
                    {meusGrupos.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                        {meusGrupos.map(g => (
                          <span key={g} style={{ fontSize: '11px', fontWeight: 600, color: '#F97310', background: '#fff4ec', borderRadius: '20px', padding: '2px 10px' }}>{g}</span>
                        ))}
                      </div>
                    )}
                    {enviandoFotoPerfil && <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Enviando...</p>}
                    {subMenuFoto && (
                      <div style={{ position: 'absolute', top: '140px', left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 10, minWidth: '180px', overflow: 'hidden' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97310" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          Galeria
                          <input type="file" accept="image/*" onChange={handleSelecionarFotoPerfil} style={{ display: 'none' }} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#374151', borderBottom: fotoUsuario ? '1px solid #f3f4f6' : 'none' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97310" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          Tirar foto
                          <input type="file" accept="image/*" capture="user" onChange={handleSelecionarFotoPerfil} style={{ display: 'none' }} />
                        </label>
                        {fotoUsuario && (
                          <button type="button" onClick={handleRemoverFotoPerfil} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#dc2626', fontFamily: 'inherit' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            Remover foto
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dados Pessoais */}
                  <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Dados Pessoais</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.fieldLabel}>Nome Completo</label>
                        <input style={s.inputEdit} required value={formVoluntario.nome_completo} onChange={e => setFV('nome_completo', e.target.value)} placeholder="Seu nome completo" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Idade</label>
                        <input style={s.inputEdit} required type="number" min="16" max="99" value={formVoluntario.idade} onChange={e => setFV('idade', e.target.value)} placeholder="Ex: 25" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Sexo</label>
                        <select style={s.inputEdit} required value={formVoluntario.sexo} onChange={e => setFV('sexo', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                        </select>
                      </div>
                      <div>
                        <label style={s.fieldLabel}>WhatsApp com DDD</label>
                        <input style={s.inputEdit} required value={formVoluntario.whatsapp} onChange={e => setFV('whatsapp', e.target.value)} placeholder="(31) 99999-9999" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Instagram</label>
                        <input style={s.inputEdit} required value={formVoluntario.instagram} onChange={e => setFV('instagram', e.target.value)} placeholder="@seuinstagram" />
                      </div>
                      <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                        <label style={s.fieldLabel}>Cidade, Estado, País</label>
                        <input style={s.inputEdit} required value={formVoluntario.cidade_estado_pais} onChange={e => buscarCidadePerf(e.target.value)} onBlur={() => setTimeout(() => setCidadeSugestoesPerf([]), 200)} placeholder="Digite sua cidade..." autoComplete="off" />
                        {cidadeSugestoesPerf.length > 0 && (
                          <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, listStyle: 'none', margin: '4px 0 0', padding: 0, overflow: 'hidden' }}>
                            {cidadeSugestoesPerf.map((sg, i) => (
                              <li key={i} style={{ padding: '10px 14px', fontSize: '14px', color: '#1a1d27', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }} onMouseDown={() => { setFV('cidade_estado_pais', sg); setCidadeSugestoesPerf([]) }}>{sg}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Igreja */}
                  <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Igreja</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.fieldLabel}>Nome da Igreja</label>
                        <input style={s.inputEdit} required value={formVoluntario.igreja} onChange={e => setFV('igreja', e.target.value)} placeholder="Nome da sua igreja" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Nome do Pastor / Líder</label>
                        <input style={s.inputEdit} required value={formVoluntario.nome_pastor} onChange={e => setFV('nome_pastor', e.target.value)} placeholder="Nome do pastor ou líder" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Telefone do Pastor / Líder</label>
                        <input style={s.inputEdit} required value={formVoluntario.contato_pastor_lider} onChange={e => setFV('contato_pastor_lider', e.target.value)} placeholder="(31) 99999-9999" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.fieldLabel}>Como você serve na sua igreja local?</label>
                        <textarea style={{ ...s.inputEdit, minHeight: '80px', resize: 'vertical' }} required value={formVoluntario.como_serve_igreja} onChange={e => setFV('como_serve_igreja', e.target.value)} placeholder="Descreva como você serve" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.fieldLabel}>Há quanto tempo está na sua igreja local?</label>
                        <input style={s.inputEdit} required value={formVoluntario.tempo_na_igreja} onChange={e => setFV('tempo_na_igreja', e.target.value)} placeholder="Ex: 3 anos" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Estado Civil</label>
                        <select style={s.inputEdit} required value={formVoluntario.estado_civil} onChange={e => setFV('estado_civil', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="solteiro">Solteiro</option>
                          <option value="casado">Casado</option>
                        </select>
                      </div>
                      {formVoluntario.estado_civil === 'casado' && (
                        <>
                          <div>
                            <label style={s.fieldLabel}>Seu cônjuge irá na missão?</label>
                            <select style={s.inputEdit} required value={formVoluntario.conjuge_na_missao} onChange={e => setFV('conjuge_na_missao', e.target.value)}>
                              <option value="">Selecione</option>
                              <option value="sim">Sim</option>
                              <option value="nao">Não</option>
                            </select>
                          </div>
                          {formVoluntario.conjuge_na_missao === 'nao' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={s.fieldLabel}>Se não, por quê?</label>
                              <textarea style={{ ...s.inputEdit, minHeight: '70px', resize: 'vertical' }} required value={formVoluntario.motivo_conjuge_ausente} onChange={e => setFV('motivo_conjuge_ausente', e.target.value)} placeholder="Explique o motivo" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Saúde e Experiência */}
                  <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Saúde e Experiência</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={s.fieldLabel}>Nome de Emergência</label>
                        <input style={s.inputEdit} required value={formVoluntario.nome_emergencia} onChange={e => setFV('nome_emergencia', e.target.value)} placeholder="Nome do contato" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Contato de Emergência</label>
                        <input style={s.inputEdit} required value={formVoluntario.telefone_emergencia} onChange={e => setFV('telefone_emergencia', e.target.value)} placeholder="(31) 99999-9999" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.fieldLabel}>Limitação física ou remédio especial?</label>
                        <textarea style={{ ...s.inputEdit, minHeight: '70px', resize: 'vertical' }} value={formVoluntario.limitacao_fisica} onChange={e => setFV('limitacao_fisica', e.target.value)} placeholder="Se não, deixe em branco." />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={s.fieldLabel}>Já participou de viagem missionária?</label>
                        <select style={s.inputEdit} required value={formVoluntario.ja_participou_missao} onChange={e => setFV('ja_participou_missao', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Competências */}
                  <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Competências</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                      {[
                        { key: 'fala_ingles', label: 'Falo Inglês' }, { key: 'fala_espanhol', label: 'Falo Espanhol' },
                        { key: 'canta', label: 'Canto' }, { key: 'toca_instrumento', label: 'Toco instrumento' },
                        { key: 'tira_fotos', label: 'Tiro Fotos' }, { key: 'faz_filmagens', label: 'Faço filmagens' },
                        { key: 'outras_competencias', label: 'Outros' },
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={formVoluntario[key]} onChange={e => setFV(key, e.target.checked)} style={{ accentColor: '#F97310', width: '16px', height: '16px' }} />
                          {label}
                        </label>
                      ))}
                    </div>
                    {formVoluntario.outras_competencias && (
                      <div style={{ marginTop: '14px' }}>
                        <label style={s.fieldLabel}>Outra competência</label>
                        <textarea style={{ ...s.inputEdit, minHeight: '70px', resize: 'vertical' }} required value={formVoluntario.outra_competencia_descricao} onChange={e => setFV('outra_competencia_descricao', e.target.value)} placeholder="Descreva sua competência" />
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={salvandoVoluntario} style={{ background: '#F97310', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '15px', fontWeight: 800, cursor: salvandoVoluntario ? 'default' : 'pointer', opacity: salvandoVoluntario ? 0.7 : 1, fontFamily: 'inherit', marginBottom: '16px', alignSelf: 'flex-start' }}>
                    {salvandoVoluntario ? 'Salvando...' : 'Salvar cadastro'}
                  </button>
                </form>
              )}
            </div>
          )}

          {!modalEditarPerfilAberto && (<>

          {menu === 'cruzada' && (() => {
            const { eventosManha, eventosTarde, comunicados, equipes, totalUsuarios, totalVoluntarios, totalCompletos, fotosAnuncios } = painelCruzada
            const pct = totalVoluntarios > 0 ? Math.round((totalCompletos / totalVoluntarios) * 100) : 0
            const fmtHora = (str) => str ? str.substring(11, 16) : ''
            const fmtData = (str) => {
              if (!str) return ''
              const [y, m, d] = str.substring(0, 10).split('-')
              return `${d}/${m}/${y}`
            }
            const EventoCard = ({ ev }) => (
              <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f1117', marginBottom: '6px' }}>{ev.titulo}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>📅 {fmtData(ev.data)}</span>
                  {ev.hora_inicio && <span>🕒 {ev.hora_inicio.substring(0, 5)}</span>}
                  {ev.locais?.nome && <span>📌 {ev.locais.nome}</span>}
                </div>
              </div>
            )
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Carrossel */}
                {fotosAnuncios.length > 0 && (() => {
                  const idx = carrosselIdx % fotosAnuncios.length
                  clearTimeout(carrosselTimer.current)
                  carrosselTimer.current = setTimeout(() => setCarrosselIdx(i => i + 1), 12000)
                  return (
                    <div className="carrossel-container" style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: '#0f1117' }}>
                      <img src={fotosAnuncios[idx].url} alt="Anúncio" onClick={() => setExpandirAnuncio(idx)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} />
                      <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        {fotosAnuncios.map((_, i) => (
                          <button key={i} onClick={() => setCarrosselIdx(i)} style={{ width: i === idx ? '20px' : '8px', height: '8px', borderRadius: '999px', background: i === idx ? '#F97310' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
                        ))}
                      </div>
                      <button onClick={() => setCarrosselIdx(i => (i - 1 + fotosAnuncios.length) % fotosAnuncios.length)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                      <button onClick={() => setCarrosselIdx(i => (i + 1) % fotosAnuncios.length)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                    </div>
                  )
                })()}

                {/* Próximas Ações */}
                <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '14px', padding: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                    {painelCruzada.proximaDataAgenda
                      ? `Próxima agenda — ${new Date(painelCruzada.proximaDataAgenda + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`
                      : 'Agenda de Hoje'}
                  </p>
                  {[...eventosManha, ...eventosTarde].length === 0
                    ? <div style={{ fontSize: '13px', color: '#d1d5db' }}>Nenhum evento cadastrado</div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{[...eventosManha, ...eventosTarde].map(ev => <EventoCard key={ev.id} ev={ev} />)}</div>
                  }
                </div>

                {/* Comunicados */}
                <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '14px', padding: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Comunicados (Grupo Geral)</p>
                  {comunicados.length === 0
                    ? <div style={{ fontSize: '13px', color: '#d1d5db' }}>Nenhum comunicado</div>
                    : comunicados.map((c, i) => (
                      <div key={i} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '10px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{c.mensagem}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{c.usuarios?.nome}</div>
                      </div>
                    ))
                  }
                </div>

                {/* Progresso */}
                <div style={{ background: '#fff', border: '1.5px solid #f3f4f6', borderRadius: '14px', padding: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Cadastros de Voluntário</p>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f1117', marginBottom: '4px' }}>{pct}%</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>{totalCompletos} de {totalVoluntarios} voluntários com cadastro completo</div>
                  <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#F97310', borderRadius: '999px', transition: 'width 0.5s' }} />
                  </div>
                </div>

              </div>
            )
          })()}

          {menu === 'grupos' && grupoIdPage && grupoAtivo && (
            <div className="grupo-chat-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <button onClick={() => navigate('/sistema/grupos')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Voltar
                </button>
                <div style={{ width: '36px', height: '36px', background: '#fff4ec', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97310" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117' }}>{grupoAtivo.nome}</div>
                  {papelNoGrupo && <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>{papelNoGrupo === 'admin' ? 'Administrador' : 'Membro'}</div>}
                </div>
                {(perfilUsuario === 'admin' || papelNoGrupo === 'admin') && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setMenuGrupoAberto(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f1117', padding: '4px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                  </button>
                  {menuGrupoAberto && (
                    <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '180px', overflow: 'hidden' }} onClick={() => setMenuGrupoAberto(false)}>
                      <button onClick={() => { setNomeEditarGrupo(grupoAtivo.nome); setModalEditarGrupo(true) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f9fafb'} onMouseLeave={e => e.currentTarget.style.background='none'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editar nome
                      </button>
                      <button onClick={async () => {
                        const { data } = await supabase.from('usuario_grupos').select('papel, usuarios(id, nome)').eq('grupo_id', grupoAtivo.id)
                        setMembrosGrupo(data || [])
                        setModalMembrosGrupo(true)
                      }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f9fafb'} onMouseLeave={e => e.currentTarget.style.background='none'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Gerenciar membros
                      </button>
                      <button onClick={() => setConfirmExcluirGrupo(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background='#fef2f2'} onMouseLeave={e => e.currentTarget.style.background='none'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        Excluir grupo
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Mensagens */}
              <div style={{ flex: 1, overflowY: 'auto', background: '#e8eaec', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }} onClick={() => setMsgMenuAberto(null)}>
                {mensagensGrupo.length === 0 && <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>Nenhuma mensagem ainda.</p>}
                {mensagensGrupo.map(m => {
                  const isMinha = m.usuario_id === user?.id
                  const hora = new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  const data = new Date(m.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  const menuAberto = msgMenuAberto === m.id
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMinha ? 'flex-end' : 'flex-start' }}
                      onMouseEnter={() => setMsgHovered(m.id)} onMouseLeave={() => setMsgHovered(null)}>
                      {!isMinha && <div style={{ fontSize: '11px', fontWeight: 700, color: '#F97310', marginBottom: '3px' }}>{m.usuarios?.nome}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isMinha ? 'row-reverse' : 'row', position: 'relative' }}>
                        {editandoMsg === m.id ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input value={textoEditandoMsg} onChange={e => setTextoEditandoMsg(e.target.value)} onKeyDown={async e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                await supabase.from('mensagens_grupo').update({ mensagem: textoEditandoMsg }).eq('id', m.id)
                                setMensagensGrupo(prev => prev.map(x => x.id === m.id ? { ...x, mensagem: textoEditandoMsg } : x))
                                setEditandoMsg(null)
                              } else if (e.key === 'Escape') { setEditandoMsg(null) }
                            }} autoFocus style={{ padding: '8px 12px', border: '1.5px solid #F97310', borderRadius: '50px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', minWidth: '180px' }} />
                            <button onClick={async () => {
                              await supabase.from('mensagens_grupo').update({ mensagem: textoEditandoMsg }).eq('id', m.id)
                              setMensagensGrupo(prev => prev.map(x => x.id === m.id ? { ...x, mensagem: textoEditandoMsg } : x))
                              setEditandoMsg(null)
                            }} style={{ background: '#F97310', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#fff', fontSize: '16px' }}>✓</button>
                            <button onClick={() => setEditandoMsg(null)} style={{ background: '#e5e7eb', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ background: isMinha ? '#F97310' : '#fff', color: isMinha ? '#fff' : '#0f1117', borderRadius: isMinha ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', maxWidth: '75%', fontSize: '14px', lineHeight: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                              {m.mensagem}
                            </div>
                            {(msgHovered === m.id || menuAberto) && (
                              <button onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMsgMenuPos({ x: r.left, y: r.top }); setMsgMenuIsMinha(isMinha); setMsgMenuAberto(menuAberto ? null : m.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', padding: '2px 4px', lineHeight: 1 }}>›</button>
                            )}
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>{data} {hora}</div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              {papelNoGrupo === 'admin' ? (
                <div style={{ display: 'flex', marginTop: '12px', border: '1.5px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                  <input
                    value={novaMensagem}
                    onChange={e => setNovaMensagem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                    placeholder="Digite uma mensagem..."
                    className="grupo-chat-input"
                    style={{ flex: 1, padding: '12px 16px', border: 'none', fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: '#0f1117', background: 'transparent', opacity: 1 }}
                  />
                  <button onClick={enviarMensagem} disabled={enviandoMensagem || !novaMensagem.trim()} style={{ background: '#F97310', border: 'none', borderRadius: '0', width: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: 1 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              ) : null}

              {/* Menu flutuante de mensagem */}
              {msgMenuAberto && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setMsgMenuAberto(null)} />
                  <div style={{ position: 'fixed', ...(msgMenuPos.x + 150 > window.innerWidth ? { right: window.innerWidth - msgMenuPos.x - 20 } : { left: msgMenuPos.x }), ...(msgMenuPos.y > 160 ? { top: msgMenuPos.y - 10, transform: 'translateY(-100%)' } : { top: msgMenuPos.y + 30 }), background: '#1a1d27', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000, minWidth: '140px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    {msgMenuIsMinha && <button onClick={() => { const m = mensagensGrupo.find(x => x.id === msgMenuAberto); if (m) { setEditandoMsg(m.id); setTextoEditandoMsg(m.mensagem) } setMsgMenuAberto(null) }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#e5e7eb', cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>}
                    <button onClick={() => { const m = mensagensGrupo.find(x => x.id === msgMenuAberto); if (m) navigator.clipboard.writeText(m.mensagem); setMsgMenuAberto(null) }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#e5e7eb', cursor: 'pointer', fontFamily: 'inherit' }}>Copiar</button>
                    {msgMenuIsMinha && <button onClick={async () => { await supabase.from('mensagens_grupo').delete().eq('id', msgMenuAberto); setMensagensGrupo(prev => prev.filter(x => x.id !== msgMenuAberto)); setMsgMenuAberto(null) }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>Apagar</button>}
                  </div>
                </>
              )}

              {/* Modal editar nome */}
              {modalEditarGrupo && (
                <div style={s.modalOverlay} onClick={() => setModalEditarGrupo(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Editar nome</h3>
                    <label style={s.fieldLabel}>Nome do grupo</label>
                    <input style={{ ...s.inputEdit, marginBottom: '20px' }} value={nomeEditarGrupo} onChange={e => setNomeEditarGrupo(e.target.value)} autoFocus />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button style={s.backBtn} onClick={() => setModalEditarGrupo(false)}>Cancelar</button>
                      <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={async () => {
                        if (!nomeEditarGrupo.trim()) return
                        await supabase.from('grupos').update({ nome: nomeEditarGrupo.trim() }).eq('id', grupoAtivo.id)
                        setGrupoAtivo(g => ({ ...g, nome: nomeEditarGrupo.trim() }))
                        await carregarGrupos()
                        setModalEditarGrupo(false)
                      }}>Salvar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal gerenciar membros */}
              {modalMembrosGrupo && (
                <div style={s.modalOverlay} onClick={() => setModalMembrosGrupo(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Membros do grupo</h3>
                    {membrosGrupo.length === 0 && <p style={{ color: '#9ca3af', fontSize: '14px' }}>Nenhum membro vinculado.</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {membrosGrupo.map(m => (
                        <div key={m.usuarios?.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: '10px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f1117' }}>{m.usuarios?.nome}</span>
                          <select value={m.papel || 'membro'} onChange={async e => {
                            const novoPapel = e.target.value
                            setMembrosGrupo(prev => prev.map(x => x.usuarios?.id === m.usuarios?.id ? { ...x, papel: novoPapel } : x))
                            if (m.usuarios?.id === user?.id) setPapelNoGrupo(novoPapel)
                            await supabase.from('usuario_grupos').update({ papel: novoPapel }).eq('grupo_id', grupoAtivo.id).eq('usuario_id', m.usuarios?.id)
                          }} style={{ ...s.inputEdit, width: 'auto', padding: '6px 10px', fontSize: '13px' }}>
                            <option value="membro">Membro</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={() => setModalMembrosGrupo(false)}>Fechar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal confirmar exclusão */}
              {confirmExcluirGrupo && (
                <div style={s.modalOverlay} onClick={() => setConfirmExcluirGrupo(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '8px' }}>Excluir grupo?</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>O grupo <strong>{grupoAtivo.nome}</strong> e todas as mensagens serão excluídos permanentemente.</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button style={s.backBtn} onClick={() => setConfirmExcluirGrupo(false)}>Cancelar</button>
                      <button style={{ ...s.editBtn, background: '#ef4444', color: '#fff' }} onClick={async () => {
                        await supabase.from('grupos').delete().eq('id', grupoAtivo.id)
                        await carregarGrupos()
                        setConfirmExcluirGrupo(false)
                        navigate('/sistema/grupos')
                      }}>Excluir</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {menu === 'grupos' && !grupoIdPage && (
            <div>
              <div className="vol-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ ...s.pageTitle, margin: 0 }}>Grupos</h2>
                {perfilUsuario === 'admin' && (
                  <button className="btn-novo-vol" onClick={() => setModalNovoGrupo(true)} style={{ ...s.editBtn, background: '#F97310', color: '#fff' }}>+ Novo Grupo</button>
                )}
              </div>
              {(() => {
                const descricoes = {
                  'Alinhamento': 'Alinharemos diretrizes e comunicação entre as equipes da missão.',
                  'Geral': 'Faremos parte do grupo central que envolverá todos os participantes da Cruzada.',
                  'Escolas': 'Atuaremos em escolas e instituições de ensino com atividades missionárias.',
                  'Mídia': 'Produziremos fotos, vídeos e conteúdo para registrar e divulgar a missão.',
                  'Alimentação': 'Organizaremos e distribuiremos refeições para a equipe durante a Cruzada.',
                  'Administração': 'Cuidaremos da logística, finanças e organização geral do evento.',
                  'Mapeamento': 'Realizaremos o levantamento de locais e pessoas para as abordagens.',
                  'Cultos': 'Seremos responsáveis pela programação e execução dos cultos e momentos de adoração.',
                  'Devocional': 'Conduziremos momentos de oração e devoção diária com a equipe.',
                  'Social': 'Desenvolveremos ações sociais e de cuidado com a comunidade local.',
                  'Consolidação': 'Acompanharemos e discipularemos os novos convertidos após as abordagens.',
                  'Evangelismo': 'Realizaremos abordagens diretas e compartilharemos o evangelho nas ruas.',
                }
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {grupos.map(g => (
                      <div key={g.id} onClick={() => navigate(`/sistema/grupos/${g.id}`)} style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background='#fff4ec'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <div style={{ width: '40px', height: '40px', background: '#fff4ec', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97310" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f1117', marginBottom: '6px' }}>{g.nome}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>{descricoes[g.nome] || 'Grupo de apoio à missão da Cruzada Ibirité 2026.'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {modalNovoGrupo && (
                <div style={s.modalOverlay} onClick={() => setModalNovoGrupo(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Novo Grupo</h3>
                    <label style={s.fieldLabel}>Nome do grupo</label>
                    <input
                      style={{ ...s.inputEdit, marginBottom: '20px' }}
                      value={nomeNovoGrupo}
                      onChange={e => setNomeNovoGrupo(e.target.value)}
                      placeholder="Ex: Intercessão"
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button style={s.backBtn} onClick={() => { setModalNovoGrupo(false); setNomeNovoGrupo('') }}>Cancelar</button>
                      <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={async () => {
                        if (!nomeNovoGrupo.trim()) return
                        await supabase.from('grupos').insert({ nome: nomeNovoGrupo.trim() })
                        await carregarGrupos()
                        setModalNovoGrupo(false)
                        setNomeNovoGrupo('')
                      }}>Salvar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {menu === 'treinamento' && (() => {
            const VIDEOS = [
              { id: 'KbSOebKfEBk', titulo: 'EU SOU MAIOR INIMIGO DO TERMO NEOPENTECOSTAL \'DECRETE\'', categoria: 'Evangelismo' },
              { id: 'kQy3en6AkEY', titulo: 'Opiniões sobre o meio gospel que são boas, mas...', categoria: 'Evangelismo' },
              { id: 'YLS8rAWwmvk', titulo: 'Frases gospel que parecem espirituais, mas são perigosas', categoria: 'Oração' },
              { id: 'e0jTC8iaHvs', titulo: '#43 - Jesus é o centro da história - Zé Bruno - Quem é Jesus?', categoria: 'Louvor' },
            ]
            const ativo = videoAtivo || VIDEOS[0]
            return (
              <div>
                <h2 style={s.pageTitle}>Treinamento</h2>
                <div className="treinamento-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 780px) 1fr', gap: '20px', alignItems: 'start' }}>
                  {/* Player */}
                  <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        key={ativo.id}
                        src={`https://www.youtube.com/embed/${ativo.id}`}
                        title={ativo.titulo}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      />
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{ativo.categoria}</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{ativo.titulo}</div>
                    </div>
                  </div>

                  {/* Lista */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {VIDEOS.map((v, i) => (
                      <div key={i} onClick={() => setVideoAtivo(v)}
                        style={{ display: 'flex', gap: '10px', alignItems: 'center', background: ativo.id === v.id ? '#fff4ec' : '#fff', borderRadius: '10px', padding: '10px', cursor: 'pointer', border: ativo.id === v.id ? '1.5px solid #F97310' : '1.5px solid transparent', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ position: 'relative', flexShrink: 0, width: '120px' }}>
                          <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.titulo} style={{ width: '120px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '24px', height: '24px', background: 'rgba(249,115,16,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                            </div>
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#F97310', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{v.categoria}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f1117', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titulo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          {menu === 'galeria' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={s.pageTitle}>Galeria</h2>
                {podeGerenciarGaleria && (
                  <button onClick={() => galeriaAba === 'fotos' ? setModalNovoAlbum(true) : setModalNovoVideo(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F97310', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + {galeriaAba === 'fotos' ? 'Novo Álbum' : 'Novo Vídeo'}
                  </button>
                )}
              </div>

              {/* Abas */}
              <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '10px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
                {['fotos', 'videos'].map(aba => (
                  <button key={aba} onClick={() => { setGaleriaAba(aba); setAlbumAtivo(null); setVideoGaleriaAtivo(null) }} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, background: galeriaAba === aba ? '#fff' : 'transparent', color: galeriaAba === aba ? '#F97310' : '#6b7280', boxShadow: galeriaAba === aba ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                    {aba === 'fotos' ? 'Fotos' : 'Vídeos'}
                  </button>
                ))}
              </div>

              {/* ABA FOTOS */}
              {galeriaAba === 'fotos' && (
                <div>
                  {/* Breadcrumb */}
                  {albumAtivo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <button onClick={() => { setAlbumAtivo(null); setAlbumBreadcrumb([]); carregarAlbuns(null); setFotosAlbum([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontWeight: 700, fontSize: '14px', padding: 0, fontFamily: 'inherit' }}>Galeria</button>
                      {albumBreadcrumb.map((b, i) => (
                        <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#9ca3af' }}>›</span>
                          <button onClick={() => { const novo = albumBreadcrumb.slice(0, i + 1); setAlbumAtivo(b); setAlbumBreadcrumb(novo.slice(0, -1)); carregarAlbuns(b.id); carregarFotosAlbum(b.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontWeight: 700, fontSize: '14px', padding: 0, fontFamily: 'inherit' }}>{b.nome}</button>
                        </span>
                      ))}
                      <span style={{ color: '#9ca3af' }}>›</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f1117' }}>{albumAtivo.nome}</span>
                      {podeGerenciarGaleria && (uploadandoFoto ? (
                          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: '140px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F97310' }}>{uploadProgresso.atual}/{uploadProgresso.total} fotos</span>
                            <div style={{ width: '140px', height: '6px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#F97310', borderRadius: '99px', width: `${(uploadProgresso.atual / uploadProgresso.total) * 100}%`, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        ) : (
                          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: '#F97310', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            + Fotos
                            <input type="file" accept="image/*" multiple onChange={e => uploadFoto(e, albumAtivo.id)} style={{ display: 'none' }} />
                          </label>
                        ))}
                    </div>
                  )}

                  {/* Subálbuns */}
                  {albuns.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: fotosAlbum.length > 0 ? '24px' : 0 }}>
                      {albuns.map(a => (
                        <div key={a.id} onClick={() => abrirAlbum(a, albumAtivo ? [...albumBreadcrumb, albumAtivo] : [])} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', cursor: 'pointer', border: '1.5px solid #f3f4f6' }}>
                          <div style={{ height: '120px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {a.capa_url ? <img src={a.capa_url} alt={a.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                          </div>
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f1117' }}>{a.nome}</span>
                            {podeGerenciarGaleria && <button onClick={e => { e.stopPropagation(); setConfirmExcluirAlbum(a) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '2px' }}>×</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fotos do álbum atual */}
                  {albumAtivo && fotosAlbum.length === 0 && albuns.length === 0 && <p style={s.info}>Álbum vazio.</p>}
                  {albumAtivo && fotosAlbum.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                      {fotosAlbum.map(f => (
                        <div key={f.id} style={{ borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', cursor: 'pointer' }} onClick={() => setFotoAmpliada(f)}>
                            <img src={f.url} alt={f.nome} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                            {podeGerenciarGaleria && <button onClick={e => { e.stopPropagation(); excluirFoto(f) }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: '#fff', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
                            {podeGerenciarGaleria && albumAtivo.capa_url !== f.url && <button onClick={async e => { e.stopPropagation(); await supabase.from('albuns').update({ capa_url: f.url }).eq('id', albumAtivo.id); setAlbumAtivo(a => ({ ...a, capa_url: f.url })); setAlbuns(prev => prev.map(a => a.id === albumAtivo.id ? { ...a, capa_url: f.url } : a)) }} style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '6px', padding: '3px 7px', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'inherit' }}>Capa</button>}
                            {albumAtivo.capa_url === f.url && <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: '#F97310', borderRadius: '6px', padding: '3px 7px', color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓ Capa</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!albumAtivo && albuns.length === 0 && <p style={s.info}>Nenhum álbum criado ainda.</p>}
                </div>
              )}

              {/* ABA VÍDEOS */}
              {galeriaAba === 'videos' && !videoGaleriaAtivo && (
                <div>
                  {videos.length === 0 && <p style={s.info}>Nenhum vídeo adicionado ainda.</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                    {videos.map(v => {
                      const ytId = getYoutubeId(v.link)
                      return (
                        <div key={v.id} onClick={() => setVideoGaleriaAtivo(v)} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', cursor: 'pointer', border: '1.5px solid #f3f4f6' }}>
                          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
                            {ytId ? <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg></div>}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '36px', height: '36px', background: 'rgba(249,115,16,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                              </div>
                            </div>
                          </div>
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f1117', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titulo}</span>
                            {podeGerenciarGaleria && <button onClick={async e => { e.stopPropagation(); await supabase.from('videos').delete().eq('id', v.id); setVideos(prev => prev.filter(x => x.id !== v.id)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '2px', flexShrink: 0 }}>×</button>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* PLAYER DE VÍDEO */}
              {galeriaAba === 'videos' && videoGaleriaAtivo && (
                <div>
                  <button onClick={() => setVideoGaleriaAtivo(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit', marginBottom: '16px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Voltar
                  </button>
                  <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', maxWidth: '780px' }}>
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      {getYoutubeId(videoGaleriaAtivo.link) ? (
                        <iframe src={`https://www.youtube.com/embed/${getYoutubeId(videoGaleriaAtivo.link)}`} title={videoGaleriaAtivo.titulo} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                      ) : (
                        <video src={videoGaleriaAtivo.link} controls style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                      )}
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{videoGaleriaAtivo.titulo}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal foto ampliada */}
              {fotoAmpliada && (() => {
                const idx = fotosAlbum.findIndex(f => f.id === fotoAmpliada.id)
                const ir = (delta) => { const novo = fotosAlbum[idx + delta]; if (novo) setFotoAmpliada(novo) }
                return (
                  <div style={{ ...s.modalOverlay, background: 'rgba(0,0,0,0.9)', top: isMobile() ? '64px' : 0 }} onClick={() => setFotoAmpliada(null)}
                    onKeyDown={e => { if (e.key === 'ArrowLeft') ir(-1); if (e.key === 'ArrowRight') ir(1); if (e.key === 'Escape') setFotoAmpliada(null) }} tabIndex={0} ref={el => el?.focus()}>
                    <button onClick={async e => { e.stopPropagation(); const path = fotoAmpliada.url.split('/galeria/')[1]; const { data } = await supabase.storage.from('galeria').download(path); if (data) { const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = fotoAmpliada.nome || 'foto.jpg'; a.click(); URL.revokeObjectURL(a.href) } }} style={{ position: 'fixed', top: isMobile() ? '72px' : '16px', right: '60px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button onClick={() => setFotoAmpliada(null)} style={{ position: 'fixed', top: isMobile() ? '72px' : '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>×</button>
                    {!isMobile() && idx > 0 && <button onClick={e => { e.stopPropagation(); ir(-1) }} style={{ position: 'fixed', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', color: '#fff', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>‹</button>}
                    {!isMobile() && idx < fotosAlbum.length - 1 && <button onClick={e => { e.stopPropagation(); ir(1) }} style={{ position: 'fixed', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', color: '#fff', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>›</button>}
                    <img src={fotoAmpliada.url} alt={fotoAmpliada.nome} style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }} onClick={e => e.stopPropagation()}
                      onTouchStart={e => { e.stopPropagation(); e.currentTarget._tx = e.touches[0].clientX }}
                      onTouchEnd={e => { e.stopPropagation(); const dx = e.changedTouches[0].clientX - e.currentTarget._tx; if (dx > 50) ir(-1); else if (dx < -50) ir(1) }} />
                    <div style={{ position: 'fixed', bottom: isMobile() ? '80px' : '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 16px', overflowX: 'auto' }} onClick={e => e.stopPropagation()}>
                      {fotosAlbum.map((f, i) => (
                        <img key={f.id} src={f.url} alt={f.nome} onClick={e => { e.stopPropagation(); setFotoAmpliada(f) }} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: i === idx ? '2px solid #F97310' : '2px solid transparent', opacity: i === idx ? 1 : 0.6, flexShrink: 0 }} />
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Modal confirmar exclusão de álbum */}
              {confirmExcluirAlbum && (
                <div style={s.modalOverlay} onClick={() => setConfirmExcluirAlbum(null)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '8px' }}>Excluir álbum?</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>O álbum <strong>{confirmExcluirAlbum.nome}</strong> e todo seu conteúdo será excluído permanentemente.</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button style={s.backBtn} onClick={() => setConfirmExcluirAlbum(null)}>Cancelar</button>
                      <button style={{ ...s.editBtn, background: '#ef4444', color: '#fff' }} onClick={() => { excluirAlbum(confirmExcluirAlbum.id); setConfirmExcluirAlbum(null) }}>Excluir</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal novo álbum */}
              {modalNovoAlbum && (
                <div style={s.modalOverlay} onClick={() => setModalNovoAlbum(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Novo Álbum</h3>
                    <label style={s.fieldLabel}>Nome do álbum</label>
                    <input style={{ ...s.inputEdit, marginBottom: '20px' }} value={nomeNovoAlbum} onChange={e => setNomeNovoAlbum(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && criarAlbum()} placeholder="Ex: Dia 1 - Chegada" />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button style={s.backBtn} onClick={() => setModalNovoAlbum(false)}>Cancelar</button>
                      <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={criarAlbum}>Criar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal novo vídeo */}
              {modalNovoVideo && (
                <div style={s.modalOverlay} onClick={() => setModalNovoVideo(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Novo Vídeo</h3>
                    <label style={s.fieldLabel}>Título</label>
                    <input style={{ ...s.inputEdit, marginBottom: '14px' }} value={formNovoVideo.titulo} onChange={e => setFormNovoVideo(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Culto de abertura" />
                    <label style={s.fieldLabel}>Link (YouTube, Drive...)</label>
                    <input style={{ ...s.inputEdit, marginBottom: '20px' }} value={formNovoVideo.link} onChange={e => setFormNovoVideo(f => ({ ...f, link: e.target.value }))} placeholder="https://..." />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button style={s.backBtn} onClick={() => setModalNovoVideo(false)}>Cancelar</button>
                      <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={criarVideo}>Adicionar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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

          {menu === 'controle' && (
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f1117', marginBottom: '16px' }}>Controle de Acesso</h2>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Marque quais perfis podem acessar cada página do sistema.</p>
              <div style={{ overflow: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', maxHeight: '70vh' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, textAlign: 'left', padding: '12px 16px', fontWeight: 800, color: '#0f1117', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Página</th>
                      {PERFIS_CONTROLE.map(perfil => (
                        <th key={perfil} style={{ position: 'sticky', top: 0, zIndex: 2, textAlign: 'center', padding: '12px 16px', fontWeight: 800, color: '#0f1117', borderBottom: '1px solid #e5e7eb', textTransform: 'capitalize', background: '#f9fafb' }}>{perfil}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MENU.filter(item => item.key !== 'controle').map(item => (
                      <tr key={item.key}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 1, padding: '12px 16px', fontWeight: 700, color: '#374151', borderBottom: '1px solid #f3f4f6', background: '#fff' }}>{item.label}</td>
                        {PERFIS_CONTROLE.map(perfil => {
                          const liberado = acessoLiberado(perfil, item.key, permissoes)
                          const isAdmin = perfil === 'admin'
                          return (
                            <td key={perfil} style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                              <input
                                type="checkbox"
                                checked={liberado}
                                disabled={isAdmin}
                                onChange={e => alterarPermissao(item.key, perfil, e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: isAdmin ? 'not-allowed' : 'pointer', accentColor: '#F97310' }}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button onClick={cancelarPermissoes} disabled={!permissoesAlteradas() || salvandoPermissoes} style={{ padding: '10px 24px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: !permissoesAlteradas() || salvandoPermissoes ? 'not-allowed' : 'pointer', opacity: !permissoesAlteradas() || salvandoPermissoes ? 0.5 : 1, fontFamily: 'inherit' }}>Cancelar</button>
                <button onClick={salvarPermissoes} disabled={!permissoesAlteradas() || salvandoPermissoes} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#F97310', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: !permissoesAlteradas() || salvandoPermissoes ? 'not-allowed' : 'pointer', opacity: !permissoesAlteradas() || salvandoPermissoes ? 0.5 : 1, fontFamily: 'inherit' }}>{salvandoPermissoes ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          )}

          {menu === 'voluntarios' && !selected && !novoVoluntario && (
            <>
              <div className="vol-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ ...s.pageTitle, margin: 0 }}>Voluntários</h2>
                <button className="btn-novo-vol" onClick={() => setNovoVoluntario(true)} style={{ ...s.editBtn, background: '#F97310', color: '#fff' }}>+ Novo Voluntário</button>
              </div>
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  style={{ ...s.inputEdit, paddingLeft: '38px', paddingRight: buscaVoluntario ? '36px' : '12px' }}
                  placeholder="Pesquisar por nome, WhatsApp ou cidade..."
                  value={buscaVoluntario}
                  onChange={e => setBuscaVoluntario(e.target.value)}
                />
                {buscaVoluntario && (
                  <button onClick={() => setBuscaVoluntario('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: 0 }}>✕</button>
                )}
              </div>
              {loadingVol && <p style={s.info}>Carregando...</p>}
              {!loadingVol && voluntarios.length === 0 && <p style={s.info}>Nenhum voluntário cadastrado ainda.</p>}
              {(() => {
                const lista = buscaVoluntario.trim()
                  ? voluntarios.filter(v => {
                      const q = buscaVoluntario.toLowerCase()
                      return v.nome_completo?.toLowerCase().includes(q) || v.whatsapp?.includes(q) || v.cidade_estado_pais?.toLowerCase().includes(q)
                    })
                  : voluntarios
                return (
                  <>
                    {buscaVoluntario && <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{lista.length} resultado{lista.length !== 1 ? 's' : ''}</p>}
                    <div style={s.cards}>
                      {lista.map(v => (
                        <VoluntarioCard key={v.id} v={v} onClick={() => { const f = camposFaltando(v); setAlertaCampos(f.length > 0 ? { nome: v.nome_completo, campos: f } : null); setSelected(v) }} />
                      ))}
                    </div>
                  </>
                )
              })()}
            </>
          )}

          {menu === 'voluntarios' && novoVoluntario && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => { setNovoVoluntario(false); setErroNovoVol('') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Voltar
                </button>
              </div>

              {/* Dados Pessoais */}
              <div style={s.formSection} className="dash-form-section">
                <h3 style={s.formSectionTitle}>Dados Pessoais</h3>
                <div style={s.formGrid} className="dash-form-grid">
                  {editField('Nome Completo', 'nome_completo', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Idade', 'idade', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})), 'number')}
                  <div>
                    <label style={s.fieldLabel}>Sexo</label>
                    <select style={s.inputEdit} value={formNovoVol.sexo || ''} onChange={e => setFormNovoVol(f=>({...f,sexo:e.target.value}))}>
                      <option value="">Selecione</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                    </select>
                  </div>
                  {editField('WhatsApp', 'whatsapp', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Instagram', 'instagram', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Cidade / Estado / País', 'cidade_estado_pais', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  <div>
                    <label style={s.fieldLabel}>Estado Civil</label>
                    <select style={s.inputEdit} value={formNovoVol.estado_civil || ''} onChange={e => setFormNovoVol(f=>({...f,estado_civil:e.target.value}))}>
                      <option value="">Selecione</option>
                      <option value="solteiro">Solteiro</option>
                      <option value="casado">Casado</option>
                    </select>
                  </div>
                  {formNovoVol.estado_civil === 'casado' && (
                    <div>
                      <label style={s.fieldLabel}>Cônjuge vai na missão?</label>
                      <select style={s.inputEdit} value={formNovoVol.conjuge_na_missao || ''} onChange={e => setFormNovoVol(f=>({...f,conjuge_na_missao:e.target.value}))}>
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  )}
                  {formNovoVol.estado_civil === 'casado' && formNovoVol.conjuge_na_missao === 'nao' && editField('Por que o cônjuge não irá?', 'motivo_conjuge_ausente', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                </div>
              </div>

              {/* Igreja */}
              <div style={{ ...s.formSection, marginTop: '16px' }} className="dash-form-section">
                <h3 style={s.formSectionTitle}>Igreja</h3>
                <div style={s.formGrid} className="dash-form-grid">
                  {editField('Nome da Igreja', 'igreja', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Nome do Pastor / Líder', 'nome_pastor', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Telefone do Pastor / Líder', 'contato_pastor_lider', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Como serve na igreja?', 'como_serve_igreja', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Há quanto tempo está na igreja?', 'tempo_na_igreja', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                </div>
              </div>

              {/* Saúde e Experiência */}
              <div style={{ ...s.formSection, marginTop: '16px' }} className="dash-form-section">
                <h3 style={s.formSectionTitle}>Saúde e Experiência</h3>
                <div style={s.formGrid} className="dash-form-grid">
                  {editField('Nome de Emergência', 'nome_emergencia', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Telefone de Emergência', 'telefone_emergencia', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  {editField('Limitação física / Medicação', 'limitacao_fisica', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
                  <div>
                    <label style={s.fieldLabel}>Já foi em missão?</label>
                    <select style={s.inputEdit} value={formNovoVol.ja_participou_missao || ''} onChange={e => setFormNovoVol(f=>({...f,ja_participou_missao:e.target.value}))}>
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Competências */}
              <div style={{ ...s.formSection, marginTop: '16px' }} className="dash-form-section">
                <h3 style={s.formSectionTitle}>Competências</h3>
                <div style={s.checkGrid} className="dash-check-grid">
                  {[{k:'fala_ingles',l:'Fala Inglês'},{k:'fala_espanhol',l:'Fala Espanhol'},{k:'canta',l:'Canta'},{k:'toca_instrumento',l:'Toca instrumento'},{k:'tira_fotos',l:'Tira fotos'},{k:'faz_filmagens',l:'Faz filmagens'},{k:'outras_competencias',l:'Outros'}].map(({k,l}) => (
                    <label key={k} style={{ ...s.checkLabel, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!formNovoVol[k]} onChange={e => setFormNovoVol(f=>({...f,[k]:e.target.checked}))} style={s.checkbox} />
                      {l}
                    </label>
                  ))}
                </div>
                {formNovoVol.outras_competencias && editField('Descreva a competência', 'outra_competencia_descricao', formNovoVol, (k,v) => setFormNovoVol(f=>({...f,[k]:v})))}
              </div>

              {erroNovoVol && <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600, marginTop: '12px' }}>{erroNovoVol}</p>}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button style={s.backBtn} onClick={() => { setNovoVoluntario(false); setErroNovoVol('') }}>Cancelar</button>
                <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={salvarNovoVoluntario} disabled={salvandoNovoVol}>
                  {salvandoNovoVol ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
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
                    <button onClick={() => { setSelected(null); setEditandoStatus(false); setAlertaCampos(null) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Voltar
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{ ...s.backBtn, color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setConfirmExcluirVoluntario(true)}>Excluir</button>
                      <button style={s.editBtn} onClick={iniciarEdicao}>Editar</button>
                    </div>
                  </>
                )}
              </div>


              {/* Seção: Dados Pessoais */}
              <div style={s.formSection} className="dash-form-section">
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
              <div style={s.formSection} className="dash-form-section">
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
              <div style={s.formSection} className="dash-form-section">
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
              <div style={s.formSection} className="dash-form-section">
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
              setFormEvento({ titulo: '', data: toInputDate(dia), horaInicio: '09:00', horaFim: '10:00', cor: '#F97310', descricao: '', local: '', localId: null, equipe: '', equipeId: null, equipesSelecionadas: [] })
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
                equipe_id: formEvento.equipesSelecionadas?.length === 1 ? formEvento.equipesSelecionadas[0].id : (formEvento.equipeId || null),
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
                            onClick={() => perfilUsuario === 'admin' && abrirNovoEvento(new Date(d.getFullYear(), d.getMonth(), d.getDate()))}>
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
                        onClick={() => perfilUsuario === 'admin' && abrirNovoEvento(new Date(agendaData.getFullYear(), agendaData.getMonth(), agendaData.getDate()))}>
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
                  <div style={window.innerWidth < 768
                    ? { position: 'fixed', inset: 0, background: '#fff', zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column' }
                    : s.modalOverlay} onClick={window.innerWidth < 768 ? undefined : () => { setModalEvento(null); setConfirmarExclusao(false) }}>
                    {window.innerWidth < 768 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                        <button onClick={() => { setModalEvento(null); setConfirmarExclusao(false) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                          Voltar
                        </button>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117' }}>
                          {modalEvento.tipo === 'novo' ? 'Novo evento' : modalEvento.tipo === 'editar' ? 'Editar evento' : modalEvento.evento?.titulo}
                        </span>
                      </div>
                    )}
                    <div style={window.innerWidth < 768
                      ? { padding: '24px 16px', flex: 1, overflow: 'hidden', boxSizing: 'border-box', width: '100%' }
                      : { background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                      {modalEvento.tipo === 'novo' ? (
                        <>
                          {window.innerWidth >= 768 && <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>
                            Novo evento — {modalEvento.dia.getDate()} de {MESES[modalEvento.dia.getMonth()]}
                          </h3>}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Título - linha inteira */}
                            <div>
                              <label style={s.fieldLabel}>Título</label>
                              <input style={s.inputEdit} value={formEvento.titulo} onChange={e => setFormEvento(f => ({ ...f, titulo: e.target.value }))} placeholder="Nome do evento" autoFocus />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <label style={s.fieldLabel}>Data</label>
                              <input type="date" style={{ ...s.inputEdit, width: '100%', boxSizing: 'border-box' }} value={formEvento.data} onChange={e => setFormEvento(f => ({ ...f, data: e.target.value }))} />
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Início</label>
                              <input type="time" style={{ ...s.inputEdit, width: '100%', boxSizing: 'border-box' }} value={formEvento.horaInicio} onChange={e => setFormEvento(f => ({ ...f, horaInicio: e.target.value }))} />
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Fim</label>
                              <input type="time" style={{ ...s.inputEdit, width: '100%', boxSizing: 'border-box' }} value={formEvento.horaFim} onChange={e => setFormEvento(f => ({ ...f, horaFim: e.target.value }))} />
                            </div>
                            {/* Local */}
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
                            {/* Equipes - dropdown multi-select */}
                            <div style={{ position: 'relative' }}>
                              <label style={s.fieldLabel}>Equipes</label>
                              <div onClick={() => setDropEquipe(d => !d)}
                                style={{ ...s.inputEdit, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '42px' }}>
                                {(formEvento.equipesSelecionadas || []).length === 0
                                  ? <span style={{ color: '#9ca3af', fontSize: '14px' }}>Selecionar equipes...</span>
                                  : (formEvento.equipesSelecionadas || []).map(e => (
                                      <span key={e.id} title={e.nome} style={{ width: '20px', height: '20px', borderRadius: '50%', background: e.cor || '#ccc', display: 'inline-block', border: '2px solid #fff', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.15)', flexShrink: 0 }} />
                                    ))
                                }
                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>{dropEquipe ? '▲' : '▼'}</span>
                              </div>
                              {dropEquipe && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 20, overflow: 'hidden' }}>
                                  <div onClick={() => { setFormEvento(f => ({ ...f, equipesSelecionadas: [] })); setDropEquipe(false) }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: '#fafafa' }}>
                                    <span style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>Nenhuma</span>
                                  </div>
                                  {equipes.map(o => {
                                    const sel = (formEvento.equipesSelecionadas || []).some(e => e.id === o.id)
                                    return (
                                      <div key={o.id} onClick={() => setFormEvento(f => {
                                        const lista = f.equipesSelecionadas || []
                                        return { ...f, equipesSelecionadas: sel ? lista.filter(e => e.id !== o.id) : [...lista, { id: o.id, nome: o.nome, cor: o.cor }] }
                                      })}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: sel ? '#fff8f3' : '#fff' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={e => e.currentTarget.style.background = sel ? '#fff8f3' : '#fff'}>
                                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: o.cor || '#ccc', flexShrink: 0, border: '2px solid #e5e7eb' }} />
                                        <span style={{ fontSize: '14px', fontWeight: sel ? 700 : 400, color: '#0f1117', flex: 1 }}>{o.nome}</span>
                                        {sel && <span style={{ color: '#F97310', fontWeight: 700, fontSize: '16px' }}>✓</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Descrição</label>
                              <textarea style={{ ...s.inputEdit, minHeight: '80px', resize: 'vertical' }} value={formEvento.descricao} onChange={e => setFormEvento(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Cor</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {['#F97310','#0f1117','#ffffff','#d1d5db','#6b7280'].map(cor => (
                                  <div key={cor} onClick={() => setFormEvento(f => ({ ...f, cor }))}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: cor, cursor: 'pointer', border: formEvento.cor === cor ? '3px solid #F97310' : '2px solid #e5e7eb', boxSizing: 'border-box' }} />
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', justifyContent: 'center' }}>
                              <button style={{ ...s.backBtn, flex: 1, textAlign: 'center' }} onClick={() => setModalEvento(null)}>Cancelar</button>
                              <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', flex: 1, textAlign: 'center' }} onClick={salvarEvento}>Salvar</button>
                            </div>
                          </div>
                        </>
                      ) : modalEvento.tipo === 'editar' ? (
                        <>
                          {window.innerWidth >= 768 && <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Editar evento</h3>}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <label style={s.fieldLabel}>Título</label>
                              <input style={s.inputEdit} value={formEditEvento.titulo} onChange={e => setFormEditEvento(f => ({ ...f, titulo: e.target.value }))} autoFocus />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <label style={s.fieldLabel}>Data</label>
                              <input type="date" style={{ ...s.inputEdit, width: '100%', boxSizing: 'border-box' }} value={formEditEvento.data} onChange={e => setFormEditEvento(f => ({ ...f, data: e.target.value }))} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', minWidth: 0 }}>
                              <div style={{ minWidth: 0 }}>
                                <label style={s.fieldLabel}>Início</label>
                                <input type="time" style={{ ...s.inputEdit, width: '100%', boxSizing: 'border-box' }} value={formEditEvento.horaInicio} onChange={e => setFormEditEvento(f => ({ ...f, horaInicio: e.target.value }))} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <label style={s.fieldLabel}>Fim</label>
                                <input type="time" style={{ ...s.inputEdit, width: '100%', boxSizing: 'border-box' }} value={formEditEvento.horaFim} onChange={e => setFormEditEvento(f => ({ ...f, horaFim: e.target.value }))} />
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
                                <label style={s.fieldLabel}>Equipe</label>
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
                                {['#F97310','#0f1117','#ffffff','#d1d5db','#6b7280'].map(cor => (
                                  <div key={cor} onClick={() => setFormEditEvento(f => ({ ...f, cor }))}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: cor, cursor: 'pointer', border: formEditEvento.cor === cor ? '3px solid #F97310' : '2px solid #e5e7eb', boxSizing: 'border-box' }} />
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', justifyContent: 'center' }}>
                              <button style={{ ...s.backBtn, flex: 1, textAlign: 'center' }} onClick={() => setModalEvento({ tipo: 'ver', evento: modalEvento.evento })}>Cancelar</button>
                              <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', flex: 1, textAlign: 'center' }} onClick={async () => {
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
                          {/* X fechar — só desktop */}
                          {window.innerWidth >= 768 && <button onClick={() => { setModalEvento(null); setConfirmarExclusao(false) }} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>}

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

              {modalNovoLocal && (
                <div className="local-modal-overlay" style={s.modalOverlay} onClick={() => setModalNovoLocal(false)}>
                  <div className="local-modal-inner" style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setModalNovoLocal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151' }}>✕</button>
                    <div className="local-modal-voltar" style={{ display: 'none', marginBottom: '16px' }}>
                      <button onClick={() => setModalNovoLocal(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Voltar
                      </button>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '24px' }}>Novo local</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={s.fieldLabel}>Nome *</label>
                        <input style={s.inputEdit} value={formNovoLocal.nome} onChange={e => setFormNovoLocal(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do local" autoFocus />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Tipo</label>
                        <input style={s.inputEdit} value={formNovoLocal.tipo} onChange={e => setFormNovoLocal(f => ({ ...f, tipo: e.target.value }))} placeholder="Ex: Igreja, Escola..." />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Endereço</label>
                        <input style={s.inputEdit} value={formNovoLocal.endereco} onChange={e => setFormNovoLocal(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número..." />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Bairro</label>
                        <input style={s.inputEdit} value={formNovoLocal.bairro} onChange={e => setFormNovoLocal(f => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Região</label>
                        <input style={s.inputEdit} value={formNovoLocal.regiao} onChange={e => setFormNovoLocal(f => ({ ...f, regiao: e.target.value }))} placeholder="Região" />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 2 }}>
                          <label style={s.fieldLabel}>Município</label>
                          <input style={s.inputEdit} value={formNovoLocal.municipio} onChange={e => setFormNovoLocal(f => ({ ...f, municipio: e.target.value }))} placeholder="Município" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.fieldLabel}>UF</label>
                          <input style={s.inputEdit} value={formNovoLocal.uf} onChange={e => setFormNovoLocal(f => ({ ...f, uf: e.target.value }))} placeholder="MG" maxLength={2} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button style={{ ...s.backBtn, flex: 1, textAlign: 'center' }} onClick={() => setModalNovoLocal(false)}>Cancelar</button>
                        <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', flex: 1, textAlign: 'center', border: 'none' }} onClick={salvarNovoLocal} disabled={salvandoLocal}>{salvandoLocal ? 'Salvando...' : 'Salvar'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalEditarLocal && (
                <div className="local-modal-overlay" style={s.modalOverlay} onClick={() => setModalEditarLocal(false)}>
                  <div className="local-modal-inner" style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setModalEditarLocal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151' }}>✕</button>
                    <div className="local-modal-voltar" style={{ display: 'none', marginBottom: '16px' }}>
                      <button onClick={() => setModalEditarLocal(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Voltar
                      </button>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '24px' }}>Editar local</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={s.fieldLabel}>Nome *</label>
                        <input style={s.inputEdit} value={formEditarLocal.nome || ''} onChange={e => setFormEditarLocal(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do local" autoFocus />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Tipo</label>
                        <input style={s.inputEdit} value={formEditarLocal.tipo || ''} onChange={e => setFormEditarLocal(f => ({ ...f, tipo: e.target.value }))} placeholder="Ex: Igreja, Escola..." />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Endereço</label>
                        <input style={s.inputEdit} value={formEditarLocal.endereco || ''} onChange={e => setFormEditarLocal(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número..." />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Bairro</label>
                        <input style={s.inputEdit} value={formEditarLocal.bairro || ''} onChange={e => setFormEditarLocal(f => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Região</label>
                        <input style={s.inputEdit} value={formEditarLocal.regiao || ''} onChange={e => setFormEditarLocal(f => ({ ...f, regiao: e.target.value }))} placeholder="Região" />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 2 }}>
                          <label style={s.fieldLabel}>Município</label>
                          <input style={s.inputEdit} value={formEditarLocal.municipio || ''} onChange={e => setFormEditarLocal(f => ({ ...f, municipio: e.target.value }))} placeholder="Município" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.fieldLabel}>UF</label>
                          <input style={s.inputEdit} value={formEditarLocal.uf || ''} onChange={e => setFormEditarLocal(f => ({ ...f, uf: e.target.value }))} placeholder="MG" maxLength={2} />
                        </div>
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Observação</label>
                        <textarea style={{ ...s.inputEdit, minHeight: '72px', resize: 'vertical' }} value={formEditarLocal.observacao || ''} onChange={e => setFormEditarLocal(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações..." />
                      </div>
                      {confirmExcluirLocal ? (
                        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '14px', marginTop: '4px' }}>
                          <p style={{ fontSize: '14px', color: '#b91c1c', fontWeight: 600, marginBottom: '12px' }}>Tem certeza que deseja excluir este local?</p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button style={{ ...s.backBtn, flex: 1, textAlign: 'center' }} onClick={() => setConfirmExcluirLocal(false)}>Cancelar</button>
                            <button style={{ ...s.editBtn, background: '#dc2626', color: '#fff', flex: 1, textAlign: 'center', border: 'none' }} onClick={excluirLocal}>Excluir</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                          <button style={{ ...s.editBtn, background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' }} onClick={() => setConfirmExcluirLocal(true)}>Excluir</button>
                          <button style={{ ...s.backBtn, flex: 1, textAlign: 'center' }} onClick={() => setModalEditarLocal(false)}>Cancelar</button>
                          <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', flex: 1, textAlign: 'center', border: 'none' }} onClick={salvarEdicaoLocal} disabled={salvandoLocal}>{salvandoLocal ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                {perfilUsuario === 'admin' && (
                  <button onClick={() => setModalNovoLocal(true)} style={{ ...s.editBtn, background: '#F97310', color: '#fff', border: 'none', flexShrink: 0 }}>+ Novo local</button>
                )}
              </div>

              {buscaLocal.length > 0 && buscaLocal !== localSelecionado?.nome && (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' }}>
                  {locais.filter(l => { const termo = buscaLocal.toLowerCase().replace(/\brua\b/g, 'r.').replace(/\bavenida\b/g, 'av.').replace(/\bpraça\b/g, 'pç.'); return l.nome.toLowerCase().includes(termo) || l.bairro?.toLowerCase().includes(termo) || l.endereco?.toLowerCase().includes(termo) }).slice(0, 8).map(l => (
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
                  {perfilUsuario === 'admin' && localSelecionado && (
                    <button
                      onClick={() => { setFormEditarLocal({ nome: localSelecionado.nome, endereco: localSelecionado.endereco || '', bairro: localSelecionado.bairro || '', regiao: localSelecionado.regiao || '', municipio: localSelecionado.municipio || '', uf: localSelecionado.uf || '', tipo: localSelecionado.tipo || '', observacao: localSelecionado.observacao || '' }); setModalEditarLocal(true) }}
                      style={{ ...s.editBtn, position: 'absolute', top: '12px', left: '12px', zIndex: 1000, fontSize: '13px', background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb' }}
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!navigator.geolocation) return alert('Seu navegador não suporta geolocalização.')
                      if (navigator.permissions) {
                        const perm = await navigator.permissions.query({ name: 'geolocation' })
                        if (perm.state === 'denied') {
                          alert('Localização bloqueada. Acesse as configurações do navegador → Permissões do site → Localização e permita este site.')
                          return
                        }
                      }
                      mapaLocalRef.current?.ativarLocalizacao()
                    }}
                    style={{ ...s.editBtn, position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000, fontSize: '13px', background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', display: 'flex', alignItems: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 25 41" style={{ marginRight: '6px', flexShrink: 0 }}><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#f97316" stroke="#fff" strokeWidth="1.5"/><circle cx="12.5" cy="12.5" r="5" fill="#fff" opacity="0.8"/></svg>
                    Ativar localização
                  </button>
                  <MapaLocal ref={mapaLocalRef} local={localSelecionado} />
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #F97310' }}>
                        {['Tipo', 'Nome', 'Endereço'].map(h => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {menu === 'pessoas' && (
            <>
              {modalPessoa ? (
                /* ── Tela de detalhes da pessoa ── */
                <div className="pessoa-detalhe" style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '32px 32px 24px' }}>
                  {/* Cabeçalho */}
                  <div style={{ marginBottom: '16px' }}>
                    <button onClick={() => { setModalPessoa(null); if (pessoaIdPage) navigate('/sistema/pessoas') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit', marginBottom: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Voltar
                    </button>
                    <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f1117', margin: 0 }}>{modalPessoa.nome}</h2>
                  </div>

                  {/* Status + Telefone */}
                  {(() => {
                    const col = KANBAN_COLUNAS.find(c => c.key === (modalPessoa.status_contato || 'pendente')) || KANBAN_COLUNAS[0]
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setDropStatus(o => !o)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '99px', border: 'none', background: col.cor, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '12px' }}>
                            {col.label} <span style={{ fontSize: '10px' }}>▾</span>
                          </button>
                          {dropStatus && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden', minWidth: '160px' }}>
                              {KANBAN_COLUNAS.map(c => (
                                <div key={c.key} onClick={async () => {
                                  setDropStatus(false)
                                  if (c.key === (modalPessoa.status_contato || 'pendente')) return
                                  await moverPessoa(modalPessoa.id, c.key)
                                  setModalPessoa(prev => ({ ...prev, status_contato: c.key }))
                                }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', background: c.key === (modalPessoa.status_contato || 'pendente') ? c.bg : '#fff' }}
                                  onMouseEnter={e => e.currentTarget.style.background = c.bg}
                                  onMouseLeave={e => e.currentTarget.style.background = c.key === (modalPessoa.status_contato || 'pendente') ? c.bg : '#fff'}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: c.cor }}>{c.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {modalPessoa.observacao && (
                          <button onClick={() => setShowObs(o => !o)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '99px', border: 'none', background: showObs ? '#374151' : '#f3f4f6', color: showObs ? '#fff' : '#374151', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '12px' }}>
                            Observação
                          </button>
                        )}
                        {modalPessoa.telefone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '99px', background: '#f3f4f6', color: '#374151', fontWeight: 700, fontSize: '12px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                            {modalPessoa.telefone}
                          </span>
                        )}
                      </div>
                    )
                  })()}

                  {/* Dependentes */}
                  {dependentesDaPessoa.length > 0 && (
                    <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                        {modalPessoa.nome} tem {dependentesDaPessoa.length === 1 ? 'uma pessoa dependente' : `${dependentesDaPessoa.length} pessoas dependentes`}: {dependentesDaPessoa.map(d => d.nome).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Observação original */}
                  {modalPessoa.observacao && showObs && (
                    <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#374151' }}>{modalPessoa.observacao}</div>
                    </div>
                  )}

                  {/* Chat histórico */}
                  {(() => {
                    let anotacoes = []
                    try { anotacoes = modalPessoa.observacao_2 ? JSON.parse(modalPessoa.observacao_2) : [] } catch { anotacoes = [] }
                    return (
                      <div style={{ flex: '1 1 0', minHeight: 0, background: '#f9fafb', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {anotacoes.length === 0 && (
                          <div style={{ fontSize: '13px', color: '#d1d5db', textAlign: 'center', margin: 'auto' }}>Sem anotações ainda</div>
                        )}
                        {anotacoes.map((a, i) => (
                          <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#F97310' }}>{a.autor}</span>
                              <span style={{ fontSize: '10px', color: '#9ca3af' }}>{new Date(a.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#374151' }}>{a.texto}</div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    )
                  })()}

                  {/* Input enviar */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                      value={obs2Value}
                      onChange={e => setObs2Value(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && obs2Value.trim() && !salvandoObs2) {
                          setSalvandoObs2(true)
                          let anotacoes = []
                          try { anotacoes = modalPessoa.observacao_2 ? JSON.parse(modalPessoa.observacao_2) : [] } catch { anotacoes = [] }
                          const nova = { autor: nomeUsuario, texto: obs2Value.trim(), data: new Date().toISOString() }
                          const novaLista = [...anotacoes, nova]
                          const valor = JSON.stringify(novaLista)
                          await supabase.from('evangelizados').update({ observacao_2: valor }).eq('id', modalPessoa.id)
                          setPessoasKanban(list => list.map(p => p.id === modalPessoa.id ? { ...p, observacao_2: valor } : p))
                          setModalPessoa(prev => ({ ...prev, observacao_2: valor }))
                          setObs2Value('')
                          setSalvandoObs2(false)
                        }
                      }}
                      placeholder="Escreva uma anotação..."
                    />
                    <button
                      disabled={salvandoObs2 || !obs2Value.trim()}
                      onClick={async () => {
                        setSalvandoObs2(true)
                        let anotacoes = []
                        try { anotacoes = modalPessoa.observacao_2 ? JSON.parse(modalPessoa.observacao_2) : [] } catch { anotacoes = [] }
                        const nova = { autor: nomeUsuario, texto: obs2Value.trim(), data: new Date().toISOString() }
                        const novaLista = [...anotacoes, nova]
                        const valor = JSON.stringify(novaLista)
                        await supabase.from('evangelizados').update({ observacao_2: valor }).eq('id', modalPessoa.id)
                        setPessoasKanban(list => list.map(p => p.id === modalPessoa.id ? { ...p, observacao_2: valor } : p))
                        setModalPessoa(prev => ({ ...prev, observacao_2: valor }))
                        setObs2Value('')
                        setSalvandoObs2(false)
                      }}
                      style={{ padding: '12px 18px', borderRadius: '12px', border: 'none', background: '#F97310', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>

                  {/* Botões de ação */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {modalPessoa.telefone ? (
                      <a
                        href={`https://wa.me/55${modalPessoa.telefone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#22c55e', color: '#fff', borderRadius: '12px', padding: '12px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', fontFamily: 'inherit' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </a>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '12px', padding: '12px', fontSize: '14px', color: '#9ca3af', fontWeight: 600 }}>
                        Sem telefone
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        const { data } = await supabase.from('abordagens').select('*, usuarios(nome), equipes(nome)').eq('id', modalPessoa.abordagem_id).single()
                        if (data) { setAbordagemSelecionada(data); carregarEvangelizados(data.id) }
                        setModalPessoa(null)
                        navigate('/sistema/evangelismo')
                      }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      Ver abordagem
                    </button>
                  </div>
                </div>
              ) : (
              /* ── Kanban ── */
              <>
              <h2 style={s.pageTitle}>Pessoas</h2>
              {loadingPessoas && <p style={s.info}>Carregando...</p>}
              {!loadingPessoas && (
                <>
                  {/* Desktop: colunas horizontais */}
                  <div className="kanban-desktop" style={{ display: 'flex', gap: '10px', paddingBottom: '16px', alignItems: 'flex-start' }}>
                    {KANBAN_COLUNAS.map(col => {
                      const cartoes = pessoasKanban.filter(p => (p.status_contato || 'pendente') === col.key)
                      return (
                        <div key={col.key}
                          onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                          onDrop={e => { e.preventDefault(); if (dragPessoa && dragPessoa.status !== col.key) moverPessoa(dragPessoa.id, col.key); setDragPessoa(null); setDragOver(null) }}
                          onDragLeave={() => setDragOver(null)}
                          style={{ flex: '1 1 0', minWidth: 0, background: dragOver === col.key ? col.bg : '#f3f4f6', borderRadius: '14px', padding: '10px', border: dragOver === col.key ? `2px solid ${col.cor}` : '2px solid transparent', transition: 'border 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.cor }} />
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.label}</span>
                            <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: col.cor, background: col.bg, borderRadius: '99px', padding: '2px 8px' }}>{cartoes.length}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {cartoes.map(p => (
                              <div key={p.id}
                                draggable
                                onDragStart={() => setDragPessoa({ id: p.id, status: p.status_contato || 'pendente' })}
                                onDragEnd={() => { setDragPessoa(null); setDragOver(null) }}
                                onClick={() => navigate(`/sistema/pessoas/${p.id}`)}
                                style={{ background: '#fff', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'grab', borderLeft: `3px solid ${col.cor}` }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f1117', marginBottom: '4px' }}>{p.nome}</div>
                                {p.telefone && <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{p.telefone}</div>}
                                {p.observacao && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.observacao}</div>}
                              </div>
                            ))}
                            {cartoes.length === 0 && (
                              <div style={{ textAlign: 'center', padding: '24px 0', color: '#d1d5db', fontSize: '13px', fontWeight: 600 }}>Nenhuma pessoa</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Mobile: acordeão */}
                  <div className="kanban-mobile" style={{ display: 'none', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
                    {KANBAN_COLUNAS.map(col => {
                      const cartoes = pessoasKanban.filter(p => (p.status_contato || 'pendente') === col.key)
                      const aberto = !!acordeaoAberto[col.key]
                      return (
                        <div key={col.key} style={{ borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${aberto ? col.cor : '#e5e7eb'}`, background: '#fff' }}>
                          <button
                            onClick={() => setAcordeaoAberto(o => ({ ...o, [col.key]: !o[col.key] }))}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.cor, flexShrink: 0 }} />
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1, textAlign: 'left' }}>{col.label}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: col.cor, background: col.bg, borderRadius: '99px', padding: '2px 8px' }}>{cartoes.length}</span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>{aberto ? '▼' : '►'}</span>
                          </button>
                          {aberto && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px 12px' }}>
                              {cartoes.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '16px 0', color: '#d1d5db', fontSize: '13px', fontWeight: 600 }}>Nenhuma pessoa</div>
                              )}
                              {cartoes.map(p => (
                                <div key={p.id}
                                  onClick={() => navigate(`/sistema/pessoas/${p.id}`)}
                                  style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', borderLeft: `3px solid ${col.cor}` }}>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f1117', marginBottom: '2px' }}>{p.nome}</div>
                                  {p.telefone && <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.telefone}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              </>
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
              {/* Modal confirmar exclusão de voluntário */}
              {confirmExcluirVoluntario && selected && (
                <div style={s.modalOverlay} onClick={() => setConfirmExcluirVoluntario(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '28px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f1117', marginBottom: '8px' }}>Excluir voluntário</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Tem certeza que deseja excluir <strong>{selected.nome_completo}</strong>? Esta ação não pode ser desfeita.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setConfirmExcluirVoluntario(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                      <button onClick={async () => {
                        await supabase.from('voluntarios').delete().eq('id', selected.id)
                        setVoluntarios(list => list.filter(v => v.id !== selected.id))
                        setSelected(null)
                        setConfirmExcluirVoluntario(false)
                      }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal nova abordagem */}
              {/* Modal confirmar exclusão de abordagem */}
              {confirmExcluirAbordagem && (
                <div style={s.modalOverlay} onClick={() => setConfirmExcluirAbordagem(false)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '28px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f1117', marginBottom: '8px' }}>Excluir abordagem</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Tem certeza que deseja excluir esta abordagem? Todas as pessoas vinculadas também serão removidas. Esta ação não pode ser desfeita.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setConfirmExcluirAbordagem(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                      <button onClick={async () => {
                        await supabase.from('evangelizados').delete().eq('abordagem_id', abordagemSelecionada.id)
                        await supabase.from('abordagens').delete().eq('id', abordagemSelecionada.id)
                        setAbordagens(list => list.filter(a => a.id !== abordagemSelecionada.id))
                        setAbordagemSelecionada(null)
                        setEditandoAbordagem(false)
                        setConfirmExcluirAbordagem(false)
                      }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal confirmar exclusão de evangelizado */}
              {confirmExcluirEvangelizado && (
                <div style={s.modalOverlay} onClick={() => setConfirmExcluirEvangelizado(null)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '28px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f1117', marginBottom: '8px' }}>Excluir pessoa</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Tem certeza que deseja excluir <strong>{confirmExcluirEvangelizado.nome}</strong>? Esta ação não pode ser desfeita.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setConfirmExcluirEvangelizado(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                      <button onClick={async () => {
                        await supabase.from('evangelizados').delete().eq('id', confirmExcluirEvangelizado.id)
                        setEvangelizados(list => list.filter(e => e.id !== confirmExcluirEvangelizado.id))
                        setEditandoEvangelizado(null)
                        setConfirmExcluirEvangelizado(null)
                      }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal vincular dependente individual */}
              {modalVincularDependente && (
                <div style={s.modalOverlay} onClick={() => setModalVincularDependente(null)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '28px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f1117', marginBottom: '8px' }}>{modalVincularDependente.nome}</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Selecione o responsável ou deixe em branco para independente.</p>
                    <select
                      value={novoResponsavelId}
                      onChange={e => setNovoResponsavelId(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '14px', fontFamily: 'inherit', background: '#fff', color: '#374151', marginBottom: '20px' }}>
                      <option value="">— Independente —</option>
                      {evangelizados.filter(e => e.id !== modalVincularDependente.id).map(e => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setModalVincularDependente(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                      <button onClick={async () => {
                        if (novoResponsavelId) {
                          await supabase.from('evangelizados').update({ dependente: true, responsavel_id: novoResponsavelId }).eq('id', modalVincularDependente.id)
                        } else {
                          await supabase.from('evangelizados').update({ dependente: false, responsavel_id: null }).eq('id', modalVincularDependente.id)
                        }
                        setEvangelizados(list => list.map(e => e.id === modalVincularDependente.id ? { ...e, dependente: !!novoResponsavelId, responsavel_id: novoResponsavelId || null } : e))
                        setModalVincularDependente(null)
                      }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#F97310', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Salvar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de vínculos de dependentes */}
              {modalDependentes && (
                <div style={s.modalOverlay} onClick={() => setModalDependentes(null)}>
                  <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f1117', marginBottom: '8px' }}>Alguma pessoa é dependente de outra?</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Selecione o responsável de cada dependente. Deixe em branco quem for independente.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                      {modalDependentes.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#0f1117' }}>{p.nome}</span>
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>depende de</span>
                          <select
                            value={vinculosDependentes[p.id] || ''}
                            onChange={e => setVinculosDependentes(v => ({ ...v, [p.id]: e.target.value || undefined }))}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', background: '#fff', color: '#374151' }}>
                            <option value="">— Independente —</option>
                            {modalDependentes.filter(o => o.id !== p.id).map(o => (
                              <option key={o.id} value={o.id}>{o.nome}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={salvarVinculosDependentes} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: '#F97310', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Salvar vínculos</button>
                    </div>
                  </div>
                </div>
              )}

              {modalAbordagem && (
                <div className="nova-abordagem-overlay" style={s.modalOverlay} onClick={() => { setModalAbordagem(false); setSugestoesEndereco([]); setEnderecoConfirmado(false); setErroAbordagem('') }}>
                  <div className="nova-abordagem-inner" style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '960px', padding: '24px 32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div className="nova-abordagem-voltar" style={{ display: 'none', marginBottom: '16px' }}>
                      <button onClick={() => { setModalAbordagem(false); setSugestoesEndereco([]); setEnderecoConfirmado(false); setErroAbordagem(''); navigate('/sistema/evangelismo') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Voltar
                      </button>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px' }}>Nova Abordagem</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {pessoas.map((pessoa, idx) => (
                        <div key={idx} className="abordagem-pessoa-card" style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px', border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280' }}>Pessoa {idx + 1}</span>
                            {pessoas.length > 1 && (
                              <button onClick={() => setPessoas(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', fontWeight: 700 }}>✕</button>
                            )}
                          </div>
                          <div className="abordagem-pessoa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={s.fieldLabel}>Nome</label>
                              <input style={s.inputEdit} value={pessoa.nome} onChange={e => setPessoas(p => p.map((x, i) => i === idx ? { ...x, nome: e.target.value } : x))} />
                            </div>
                            <div>
                              <label style={s.fieldLabel}>Telefone</label>
                              <input style={s.inputEdit} value={pessoa.telefone} onChange={e => setPessoas(p => p.map((x, i) => i === idx ? { ...x, telefone: e.target.value } : x))} />
                            </div>
                            <div style={{ position: 'relative' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <label style={{ ...s.fieldLabel, marginBottom: 0 }}>Endereço (onde mora)</label>
                                <button type="button" onClick={async () => {
                                  if (!navigator.geolocation) return
                                  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
                                    try {
                                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)
                                      const data = await res.json()
                                      const a = data.address
                                      const end = [a.road, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.municipality || a.village].filter(Boolean).join(', ')
                                      setPessoas(p => p.map((x, i) => i === idx ? { ...x, endereco_pessoa: end } : x))
                                      setPessoasConfirmadas(prev => ({ ...prev, [idx]: true }))
                                      setSugestoesPessoa(prev => ({ ...prev, [idx]: [] }))
                                    } catch {}
                                  })
                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontSize: '12px', fontWeight: 700, padding: 0, fontFamily: 'inherit' }}>
                                  Preenchimento automático
                                </button>
                              </div>
                              <input
                                style={{ ...s.inputEdit, borderColor: pessoasConfirmadas[idx] ? '#e5e7eb' : pessoa.endereco_pessoa ? '#F97310' : '#e5e7eb' }}
                                placeholder="Digite o endereço e selecione uma opção"
                                value={pessoa.endereco_pessoa}
                                onChange={e => buscarSugestoesPessoa(idx, e.target.value)}
                                autoComplete="off"
                              />
                              {(sugestoesPessoa[idx] || []).length > 0 && !pessoasConfirmadas[idx] && (
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

                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f1117', marginBottom: '20px', marginTop: '8px' }}>Local do Evangelismo</h3>

                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <label style={{ ...s.fieldLabel, marginBottom: 0 }}>Endereço do evangelismo</label>
                          <button type="button" onClick={usarLocalizacaoAtual} disabled={buscandoLocalizacao} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', padding: 0, fontFamily: 'inherit' }}>
                            {buscandoLocalizacao ? 'Buscando...' : 'Preenchimento automático'}
                          </button>
                        </div>
                        <input
                          style={s.inputEdit}
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
                      <button style={{ ...s.backBtn, textAlign: 'center' }} onClick={() => { setModalAbordagem(false); setErroAbordagem('') }}>Cancelar</button>
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
                      <button onClick={() => { setAbordagemSelecionada(null); setEvangelizados([]); setEditandoEvangelizado(null); setEditandoAbordagem(false) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Voltar
                      </button>
                      {!editandoAbordagem && (perfilUsuario === 'admin' || abordagemSelecionada.usuario_id === user?.id) && <button style={{ ...s.editBtn, background: '#F97310', border: 'none', color: '#fff' }} onClick={() => { setEditandoAbordagem(true); setFormEditAbordagem({ endereco: abordagemSelecionada.endereco || abordagemSelecionada.local, data_hora: abordagemSelecionada.data_hora ? abordagemSelecionada.data_hora.slice(0,16) : '', observacao: abordagemSelecionada.observacao || '', equipe_id: abordagemSelecionada.equipe_id || '' }) }}>Editar abordagem</button>}
                    </div>

                    {editandoAbordagem ? (
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div><label style={s.fieldLabel}>Endereço / Local</label><input style={s.inputEdit} value={formEditAbordagem.endereco || ''} onChange={e => setFormEditAbordagem(f => ({ ...f, endereco: e.target.value }))} /></div>
                        <div><label style={s.fieldLabel}>Data e hora</label><input style={s.inputEdit} type="datetime-local" value={formEditAbordagem.data_hora || ''} onChange={e => setFormEditAbordagem(f => ({ ...f, data_hora: e.target.value }))} /></div>
                        <div><label style={s.fieldLabel}>Observação</label><textarea style={{ ...s.inputEdit, minHeight: '60px', resize: 'vertical' }} value={formEditAbordagem.observacao || ''} onChange={e => setFormEditAbordagem(f => ({ ...f, observacao: e.target.value }))} /></div>
                        <div className="edit-abordagem-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button style={{ ...s.editBtn, background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => setConfirmExcluirAbordagem(true)}>Excluir</button>
                          <button style={s.backBtn} onClick={() => setEditandoAbordagem(false)}>Cancelar</button>
                          <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={salvarEdicaoAbordagem} disabled={salvandoEditAbordagem}>{salvandoEditAbordagem ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#F97310', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Abordagem</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f1117', marginBottom: '16px', lineHeight: 1.3 }}>{abordagemSelecionada.local}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {abordagemSelecionada.data_hora && (
                            <span style={{ background: '#f3f4f6', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                              {new Date(abordagemSelecionada.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                          {abordagemSelecionada.usuarios?.nome && (
                            <span style={{ background: '#fff4ec', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: '#F97310' }}>
                              {abordagemSelecionada.usuarios.nome}
                            </span>
                          )}
                          {abordagemSelecionada.equipes?.nome && (
                            <span style={{ background: '#eff6ff', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                              {abordagemSelecionada.equipes.nome}
                            </span>
                          )}
                          <span style={{ background: '#f3f4f6', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                            {evangelizados.length} pessoa{evangelizados.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {abordagemSelecionada.observacao && (
                          <div style={{ marginTop: '14px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>{abordagemSelecionada.observacao}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {evangelizados.length === 0 && <p style={s.info}>Nenhuma pessoa registrada.</p>}
                    {evangelizados.map(ev => (
                      <div key={ev.id} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        {editandoEvangelizado === ev.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div><label style={s.fieldLabel}>Nome</label><input style={s.inputEdit} value={formEditEvangelizado.nome || ''} onChange={e => setFormEditEvangelizado(f => ({ ...f, nome: e.target.value }))} /></div>
                              <div><label style={s.fieldLabel}>Telefone</label><input style={s.inputEdit} value={formEditEvangelizado.telefone || ''} onChange={e => setFormEditEvangelizado(f => ({ ...f, telefone: e.target.value }))} /></div>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <label style={s.fieldLabel}>Endereço (onde mora)</label>
                              <input
                                style={{ ...s.inputEdit, borderColor: editEvangelizadoEnderecoConfirmado ? '#e5e7eb' : formEditEvangelizado.endereco_pessoa ? '#F97310' : '#e5e7eb' }}
                                placeholder="Digite e selecione uma opção"
                                value={formEditEvangelizado.endereco_pessoa || ''}
                                onChange={e => {
                                  const txt = e.target.value
                                  setFormEditEvangelizado(f => ({ ...f, endereco_pessoa: txt }))
                                  setEditEvangelizadoEnderecoConfirmado(false)
                                  clearTimeout(buscaEditEvangelizadoTimer.current)
                                  if (txt.length < 4) { setSugestoesEditEvangelizado([]); return }
                                  buscaEditEvangelizadoTimer.current = setTimeout(async () => {
                                    try {
                                      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(txt)}&format=json&limit=5&addressdetails=1`)
                                      const data = await res.json()
                                      setSugestoesEditEvangelizado(data.map(d => {
                                        const a = d.address
                                        return [a.road, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.municipality || a.village].filter(Boolean).join(', ')
                                      }))
                                    } catch { setSugestoesEditEvangelizado([]) }
                                  }, 400)
                                }}
                              />
                              {sugestoesEditEvangelizado.length > 0 && !editEvangelizadoEnderecoConfirmado && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 300 }}>
                                  {sugestoesEditEvangelizado.map((sg, i) => (
                                    <div key={i} onMouseDown={() => { setFormEditEvangelizado(f => ({ ...f, endereco_pessoa: sg })); setSugestoesEditEvangelizado([]); setEditEvangelizadoEnderecoConfirmado(true) }}
                                      style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#0f1117' }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                      {sg}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div><label style={s.fieldLabel}>Observação</label><input style={s.inputEdit} value={formEditEvangelizado.observacao || ''} onChange={e => setFormEditEvangelizado(f => ({ ...f, observacao: e.target.value }))} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <button style={{ ...s.editBtn, background: '#374151', color: '#fff', border: 'none', textAlign: 'center' }} onClick={() => { setEditandoEvangelizado(null); setModalVincularDependente(ev); setNovoResponsavelId(ev.responsavel_id || '') }}>Vincular</button>
                              <button style={{ ...s.editBtn, background: '#ef4444', color: '#fff', border: 'none', textAlign: 'center' }} onClick={() => setConfirmExcluirEvangelizado(ev)}>Excluir</button>
                              <button style={{ ...s.backBtn, textAlign: 'center' }} onClick={() => { setEditandoEvangelizado(null); setFormEditEvangelizado({}); setSugestoesEditEvangelizado([]); setEditEvangelizadoEnderecoConfirmado(false) }}>Cancelar</button>
                              <button style={{ ...s.editBtn, background: '#F97310', color: '#fff', textAlign: 'center' }} onClick={salvarEdicaoEvangelizado} disabled={salvandoEvangelizado}>{salvandoEvangelizado ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '0' }}>
                            <div style={{ background: '#f3f4f6', borderRadius: '12px 12px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', overflow: 'hidden' }}>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f1117' }}>{ev.nome}</div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                                  {ev.status_contato === 'sem_resposta' ? 'Sem resposta' : ev.status_contato}
                                </div>
                              </div>
                              {(perfilUsuario === 'admin' || abordagemSelecionada.usuario_id === user?.id) && (
                                <button
                                  onClick={() => { setEditandoEvangelizado(ev.id); setFormEditEvangelizado({ nome: ev.nome, telefone: ev.telefone, endereco_pessoa: ev.endereco_pessoa, observacao: ev.observacao }); setSugestoesEditEvangelizado([]); setEditEvangelizadoEnderecoConfirmado(true) }}
                                  style={{ background: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, color: '#0f1117', cursor: 'pointer', fontFamily: 'inherit' }}
                                >Editar</button>
                              )}
                            </div>
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {ev.telefone && <div style={{ fontSize: '13px', color: '#374151' }}><span style={{ color: '#9ca3af', fontWeight: 700, marginRight: '6px' }}>Telefone</span>{ev.telefone}</div>}
                              {ev.endereco_pessoa && <div style={{ fontSize: '13px', color: '#374151' }}><span style={{ color: '#9ca3af', fontWeight: 700, marginRight: '6px' }}>Endereço</span>{ev.endereco_pessoa}</div>}
                              {ev.observacao && <div style={{ fontSize: '13px', color: '#374151' }}><span style={{ color: '#9ca3af', fontWeight: 700, marginRight: '6px' }}>Obs</span>{ev.observacao}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {(perfilUsuario === 'admin' || abordagemSelecionada.usuario_id === user?.id) && (
                    adicionandoPessoa ? (
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div><label style={s.fieldLabel}>Nome</label><input style={s.inputEdit} placeholder="Nome" value={formNovaPessoa.nome} onChange={e => setFormNovaPessoa(f => ({ ...f, nome: e.target.value }))} /></div>
                            <div><label style={s.fieldLabel}>Telefone</label><input style={s.inputEdit} placeholder="Telefone" value={formNovaPessoa.telefone} onChange={e => setFormNovaPessoa(f => ({ ...f, telefone: e.target.value }))} /></div>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <label style={s.fieldLabel}>Endereço (onde mora)</label>
                            <input
                              style={{ ...s.inputEdit, borderColor: novaPessoaEnderecoConfirmado ? '#e5e7eb' : formNovaPessoa.endereco_pessoa ? '#F97310' : '#e5e7eb' }}
                              placeholder="Digite e selecione uma opção"
                              value={formNovaPessoa.endereco_pessoa}
                              onChange={e => {
                                const txt = e.target.value
                                setFormNovaPessoa(f => ({ ...f, endereco_pessoa: txt }))
                                setNovaPessoaEnderecoConfirmado(false)
                                clearTimeout(buscaNovaPessoaTimer.current)
                                if (txt.length < 4) { setSugestoesNovaPessoa([]); return }
                                buscaNovaPessoaTimer.current = setTimeout(async () => {
                                  try {
                                    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(txt)}&format=json&limit=5&addressdetails=1`)
                                    const data = await res.json()
                                    setSugestoesNovaPessoa(data.map(d => {
                                      const a = d.address
                                      return [a.road, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.municipality || a.village].filter(Boolean).join(', ')
                                    }))
                                  } catch { setSugestoesNovaPessoa([]) }
                                }, 400)
                              }}
                            />
                            {sugestoesNovaPessoa.length > 0 && !novaPessoaEnderecoConfirmado && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 300 }}>
                                {sugestoesNovaPessoa.map((s, i) => (
                                  <div key={i} onMouseDown={() => { setFormNovaPessoa(f => ({ ...f, endereco_pessoa: s })); setSugestoesNovaPessoa([]); setNovaPessoaEnderecoConfirmado(true) }}
                                    style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#0f1117' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                    {s}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div><label style={s.fieldLabel}>Observação</label><input style={s.inputEdit} placeholder="Observação" value={formNovaPessoa.observacao} onChange={e => setFormNovaPessoa(f => ({ ...f, observacao: e.target.value }))} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button style={{ ...s.backBtn, background: '#9ca3af', border: 'none', color: '#fff' }} onClick={() => { setAdicionandoPessoa(false); setFormNovaPessoa({ nome: '', telefone: '', endereco_pessoa: '', observacao: '' }); setSugestoesNovaPessoa([]); setNovaPessoaEnderecoConfirmado(false) }}>Cancelar</button>
                          <button style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={salvarNovaPessoa} disabled={salvandoNovaPessoa}>{salvandoNovaPessoa ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                      </div>
                    ) : (
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97310', fontSize: '13px', fontWeight: 700, padding: '8px 0', fontFamily: 'inherit', marginTop: '4px' }} onClick={() => setAdicionandoPessoa(true)}>+ Adicionar pessoa</button>
                    )
                  )}
                </>
              ) : (
                <>
                  <div className="vol-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h2 style={{ ...s.pageTitle, marginBottom: 0 }}>Evangelismo</h2>
                    <button className="btn-novo-vol" style={{ ...s.editBtn, background: '#F97310', color: '#fff' }} onClick={() => {
                      const agora = new Date()
                      const dataHoraLocal = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}T${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
                      setFormAbordagem(f => ({ ...f, data_hora: dataHoraLocal }))
                      navigate('/sistema/evangelismo/nova-abordagem')
                    }}>+ Nova abordagem</button>
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
                          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            {ab.data_hora ? new Date(ab.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                            {[ab.usuarios?.nome, ab.equipes?.nome].filter(Boolean).join(' · ')}
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

              {/* Busca e filtros */}
              <div className="usuarios-filtros" style={{ display: 'none', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={filtroUsuarioNome}
                    onChange={e => setFiltroUsuarioNome(e.target.value)}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button onClick={() => setFiltrosExpandidos(v => !v)} style={{ padding: '7px 12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: filtrosExpandidos ? '#F97310' : '#fff', color: filtrosExpandidos ? '#fff' : '#374151', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>
                    {filtrosExpandidos ? '▲' : '▼'}
                  </button>
                </div>
                {filtrosExpandidos && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select value={filtroUsuarioPerfil} onChange={e => setFiltroUsuarioPerfil(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', background: '#fff' }}>
                      <option value="" disabled hidden>Perfil</option>
                      <option value="">Todos</option>
                      <option value="admin">Admin</option>
                      <option value="lider">Líder</option>
                      <option value="voluntario">Voluntário</option>
                      <option value="igreja">Igreja</option>
                      <option value="prefeitura">Prefeitura</option>
                    </select>
                    <select value={filtroUsuarioEquipe} onChange={e => setFiltroUsuarioEquipe(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', background: '#fff' }}>
                      <option value="" disabled hidden>Equipe</option>
                      <option value="">Todos</option>
                      {equipes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <select value={filtroUsuarioGrupo} onChange={e => setFiltroUsuarioGrupo(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', background: '#fff' }}>
                      <option value="" disabled hidden>Grupo</option>
                      <option value="">Todos</option>
                      {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {loadingUsers && <p style={s.info}>Carregando...</p>}
              {!loadingUsers && usuarios.length === 0 && <p style={s.info}>Nenhum usuário cadastrado.</p>}
              {selectedUsuario && (
                <div className="usuario-modal-overlay" style={s.modalOverlay} onClick={() => { setSelectedUsuario(null); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]); setErroEquipeObrigatoria(false); setShowDetalheUsuario(false); if (usuarioIdPage) navigate('/sistema/usuarios') }}>
                  <div className="usuario-modal-inner" style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div className="usuario-modal-voltar" style={{ display: 'none', marginBottom: '16px' }}>
                      <button onClick={() => { setSelectedUsuario(null); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]); setErroEquipeObrigatoria(false); setShowDetalheUsuario(false); navigate('/sistema/usuarios') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 700, fontSize: '15px', padding: 0, fontFamily: 'inherit' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Voltar
                      </button>
                    </div>
                    <button className="usuario-modal-close" onClick={() => { setSelectedUsuario(null); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]); setErroEquipeObrigatoria(false); setShowDetalheUsuario(false); if (usuarioIdPage) navigate('/sistema/usuarios') }} style={{ position: 'absolute', top: '16px', right: '16px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#374151' }}>✕</button>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                      <div style={{ ...s.cardAvatar, width: '52px', height: '52px', fontSize: '22px', borderRadius: '50%', flexShrink: 0 }}>{selectedUsuario.nome?.[0]?.toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f1117' }}>{selectedUsuario.nome}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedUsuario.email}</div>
                        {selectedUsuario.telefone && <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedUsuario.telefone}</div>}
                      </div>
                    </div>

                    {showDetalheUsuario && (
                      <div style={{ marginBottom: '20px', background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Informações cadastrais</div>
                          <button onClick={() => setShowDetalheUsuario(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', fontWeight: 700 }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            ['Nome', selectedUsuario.nome],
                            ['E-mail', selectedUsuario.email],
                            ['Telefone', selectedUsuario.telefone || '—'],
                            ['Perfil', selectedUsuario.perfil],
                            ['Status', selectedUsuario.ativo ? 'Ativo' : 'Inativo'],
                            ['Cadastrado em', selectedUsuario.criado_em ? new Date(selectedUsuario.criado_em).toLocaleDateString('pt-BR') : '—'],
                            ['Equipes', usuarioOrgs.equipes.length > 0 ? equipes.filter(e => usuarioOrgs.equipes.includes(e.id)).map(e => e.nome).join(', ') : '—'],
                            ['Grupos', usuarioOrgs.grupos.length > 0 ? grupos.filter(g => usuarioOrgs.grupos.includes(g.id)).map(g => g.nome).join(', ') : '—'],
                          ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
                              <span style={{ fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>{label}</span>
                              <span style={{ color: '#0f1117', fontWeight: 600, textAlign: 'right' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!confirmDeleteUsuario ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Ativar/Desativar + Excluir */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => ativarUsuario(selectedUsuario)} style={{ flex: 1, background: selectedUsuario.ativo ? '#f3f4f6' : '#dcfce7', color: selectedUsuario.ativo ? '#374151' : '#16a34a', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {selectedUsuario.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                          <button onClick={() => setConfirmDeleteUsuario(true)} style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                        </div>

                        {/* Editar campos */}
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Editar</div>

                          <div>
                            <label style={s.fieldLabel}>Perfil</label>
                            <select style={s.inputEdit} value={formEditUsuario.perfil ?? selectedUsuario.perfil ?? ''} onChange={e => setFormEditUsuario(f => ({ ...f, perfil: e.target.value }))}>
                              <option value="admin">Admin</option>
                              <option value="lider">Líder</option>
                              <option value="voluntario">Voluntário</option>
                              <option value="igreja">Igreja</option>
                              <option value="prefeitura">Prefeitura</option>
                            </select>
                          </div>

                          {(formEditUsuario.perfil ?? selectedUsuario.perfil) === 'voluntario' && (
                            <div style={{ position: 'relative' }}>
                              <label style={s.fieldLabel}>Vincular voluntário</label>
                              <input
                                style={s.inputEdit}
                                placeholder="Buscar por nome..."
                                value={buscaVolVinculo}
                                onChange={e => { setBuscaVolVinculo(e.target.value); buscarVolParaVinculo(e.target.value) }}
                              />
                              {sugestoesVolVinculo.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                  {sugestoesVolVinculo.map(v => (
                                    <button key={v.id} type="button" onClick={() => vincularVoluntario(v.id)} disabled={vinculandoVol} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', fontFamily: 'inherit' }}>
                                      {v.nome_completo}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <EquipeRadio
                            itens={equipes}
                            selecionado={formEditUsuario.equipe_id !== undefined ? formEditUsuario.equipe_id : (usuarioOrgs.equipes[0] || null)}
                            onSelect={(id) => { setFormEditUsuario(f => ({ ...f, equipe_id: id })); setErroEquipeObrigatoria(false) }}
                            fieldLabel={s.fieldLabel}
                            erro={erroEquipeObrigatoria}
                          />
                          <EquipeGrupoCheckbox
                            label="Grupos"
                            itens={grupos}
                            marcados={usuarioOrgs.grupos}
                            onToggle={(id, marcado) => toggleGrupoUsuario(selectedUsuario.id, id, marcado)}
                            fieldLabel={s.fieldLabel}
                          />

                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button style={{ ...s.backBtn, flex: 1, textAlign: 'center' }} onClick={() => { setSelectedUsuario(null); setFormEditUsuario({}); setErroEquipeObrigatoria(false) }}>Cancelar</button>
                            <button style={{ ...s.editBtn, flex: 1, background: '#F97310', color: '#fff', textAlign: 'center', border: 'none' }} onClick={salvarEdicaoUsuario} disabled={salvandoEdicaoUsuario}>{salvandoEdicaoUsuario ? 'Salvando...' : 'Salvar'}</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>Tem certeza? Esta ação não pode ser desfeita.</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => setConfirmDeleteUsuario(false)} style={{ ...s.backBtn, flex: 1, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>Cancelar</button>
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
                {usuarios.filter(u => {
                  if (filtroUsuarioNome && !u.nome?.toLowerCase().includes(filtroUsuarioNome.toLowerCase())) return false
                  if (filtroUsuarioPerfil && u.perfil !== filtroUsuarioPerfil) return false
                  if (filtroUsuarioEquipe && !(u.equipes || []).includes(filtroUsuarioEquipe)) return false
                  if (filtroUsuarioGrupo && !(u.grupos || []).includes(filtroUsuarioGrupo)) return false
                  return true
                }).map(u => (
                  <div key={u.id} style={{ ...s.card, cursor: 'pointer', ...(!u.ativo ? { borderLeft: '4px solid #F97310' } : {}) }} onClick={() => { setSelectedUsuario(u); setConfirmDeleteUsuario(false); setBuscaVoluntario(''); setSugestoesVoluntario([]); setFormEditUsuario({ perfil: u.perfil || '' }); setErroEquipeObrigatoria(false); carregarOrgsUsuario(u.id); carregarEquipes(); carregarGrupos(); navigate(`/sistema/usuarios/${u.id}`) }}>
                    <div style={s.cardAvatar}>{u.nome?.[0]?.toUpperCase()}</div>
                    <div style={s.cardInfo}>
                      <div style={s.cardNome}>{(() => { const p = (u.nome || '').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] })()}</div>
                      {u.telefone && <div style={s.cardSub}>{u.telefone}</div>}
                    </div>
                    <div style={s.cardStatus}>{u.perfil}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          </>)}

        </div>
      </div>

      {/* Bottom nav mobile */}
      <div className="dash-bottomnav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px', background: '#fff', borderTop: '1px solid #e5e7eb', zIndex: 1001, alignItems: 'center', justifyContent: 'space-around' }}>

        {/* Menu extra (+ button) */}
        {menuMobileAberto && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1001 }} onClick={() => setMenuMobileAberto(false)} />
            <div style={{ position: 'fixed', bottom: '64px', left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1002, boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', maxHeight: 'calc(100vh - 128px)', overflowY: 'auto' }}>
            {MENU.filter(item => temAcessoDinamico(perfilUsuario, item.key) && !['evangelismo','pessoas','agenda','cruzada'].includes(item.key)).map(item => (
              <button key={item.key} onClick={() => { navigate(item.path); setMenuMobileAberto(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', background: menu === item.key ? '#fff4ec' : 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', color: menu === item.key ? '#F97310' : '#374151', padding: '12px 16px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, textAlign: 'left' }}>
                {item.label}
              </button>
            ))}
            </div>
          </>
        )}

        {[
          { key: 'evangelismo', path: '/sistema/evangelismo', label: 'Evangelismo', perfis: ['admin', 'voluntario'], icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22"/><line x1="4" y1="7" x2="20" y2="7"/>
            </svg>
          )},
          { key: 'pessoas', path: '/sistema/pessoas', label: 'Pessoas', perfis: ['admin', 'voluntario'], icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          )},
          { key: 'agenda', path: '/sistema/agenda', label: 'Agenda', perfis: ['admin', 'voluntario', 'igreja', 'lider'], icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          )},
        ].filter(item => temAcessoDinamico(perfilUsuario, item.key)).map(item => {
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
            <div style={{ ...s.profileAvatar, width: '28px', height: '28px', fontSize: '11px' }}>{fotoUsuario ? <img src={fotoUsuario} alt="Foto de perfil" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(nomeUsuario || user?.email)}</div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af' }}>Perfil</span>
          </button>
          {dropdownOpen && (
            <div style={{ ...s.dropdown, bottom: '64px', top: 'auto', right: 0 }}>
              {minhaEquipe && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: minhaEquipe.cor || '#9ca3af', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{minhaEquipe.nome}</span>
                  </div>
                  <div style={s.dropdownDivider} />
                </>
              )}
              <button style={s.dropdownItem} onClick={() => { setDropdownOpen(false); setModalEditarPerfilAberto(true); carregarVoluntario() }}>Editar perfil</button>
              <div style={s.dropdownDivider} />
              <button style={{ ...s.dropdownItem, color: '#0f1117' }} onClick={handleSignOut}>Sair</button>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}

function EquipeRadio({ itens, selecionado, onSelect, fieldLabel, erro }) {
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
        onChange={e => { setBusca(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => { setAberto(false); setBusca('') }, 200)}
        placeholder={nomeSelecionado || 'Buscar equipes...'}
        autoComplete="off"
        style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${erro ? '#F97310' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: '#1a1d27', outline: 'none', boxSizing: 'border-box', marginTop: '6px' }}
      />
      {aberto && filtrados.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filtrados.map(o => (
              <label key={o.id} onMouseDown={e => e.preventDefault()} onClick={() => { onSelect(o.id); setAberto(false); setBusca('') }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: selecionado === o.id ? 700 : 400, borderBottom: '1px solid #f3f4f6' }}>
                <input type="radio" name="equipe_radio" checked={selecionado === o.id} onChange={() => {}} style={{ accentColor: '#F97310', width: '16px', height: '16px' }} />
                {o.nome}
              </label>
            ))}
          </div>
        </div>
      )}
      {erro && <div style={{ fontSize: '12px', color: '#F97310', fontWeight: 700, marginTop: '4px' }}>Vincule uma equipe antes de ativar o usuário.</div>}
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
        onChange={e => { setBusca(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
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
    <div style={{ ...s.card, ...(pendente ? { borderLeft: '4px solid #F97310' } : {}) }} onClick={onClick}>
      <div style={s.cardAvatar}>{v.nome_completo?.[0]?.toUpperCase()}</div>
      <div style={s.cardInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={s.cardNome}>{(() => { const p = (v.nome_completo || '').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] })()}</span>
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
      <div style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#0f1117', background: '#f9fafb', minHeight: '40px', wordBreak: 'break-word', overflowWrap: 'anywhere', boxSizing: 'border-box' }}>
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
    overflow: 'hidden',
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
    fontSize: '12px',
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
    paddingBottom: '40px',
    overflowY: 'auto',
    minHeight: 0,
    position: 'relative',
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
    minWidth: 0,
  },
  cardNome: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#0f1117',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardSub: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    zIndex: 2000,
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
    background: '#9ca3af',
    border: 'none',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '6px 20px',
    borderRadius: '8px',
    fontFamily: 'inherit',
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
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
    WebkitAlignItems: 'center',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    minWidth: '16px',
    minHeight: '16px',
    accentColor: '#F97310',
    flexShrink: 0,
    margin: 0,
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
