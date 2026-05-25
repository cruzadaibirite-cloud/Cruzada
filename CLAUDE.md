# Cruzada Ibirité 2026

## Regras obrigatórias

- **SEMPRE perguntar** ao usuário se deseja fazer commit e push antes de executar qualquer `git commit` ou `git push`.
- **NUNCA fazer commit ou push automaticamente** sem confirmação explícita do usuário.
- **Mensagens de commit** devem sempre iniciar com a versão (`v1`, `v2`, `v3`...) seguida de um detalhamento do que foi feito. Exemplo: `v3 - Adiciona tela de login, corrige estilos do header e configura Supabase Auth`.
- O número da versão deve ser incrementado a cada commit.
- **Versão atual:** v7

## Stack

- **Frontend:** React + Vite — pasta `frontend/`
- **Backend:** Node.js + Express — pasta `backend/`
- **Banco de dados:** PostgreSQL via Supabase
- **Auth:** Supabase Auth
- **Deploy frontend:** Vercel (branch `main`, root directory `frontend`)
- **Deploy backend:** a definir

## Portas locais

- Frontend: `http://localhost:5182`
- Backend: `http://localhost:3182`

## Rotas

- `/cruzada` — Landing page pública
- `/login` — Tela de login
- `/cadastro-voluntario` — Formulário de cadastro de voluntários (público)
- `/dashboard` — Área administrativa (protegida por auth)

## Perfis de usuário

- `admin` — acesso total
- `lider` — gerencia setor e equipe
- `voluntario` — acesso à área do missionário
- `igreja` — acesso apenas a vídeos institucionais

## Supabase

- Projeto: `hlrnxwyudqhhvuerldfo`
- Região: South America (São Paulo)

### Tabelas

**usuarios**
| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| id | UUID | ✓ |
| nome | TEXT | ✓ |
| email | TEXT | ✓ |
| telefone | TEXT | |
| perfil | TEXT | ✓ (admin/lider/voluntario/igreja) |
| setor_id | UUID | |
| ativo | BOOLEAN | |
| criado_em | TIMESTAMPTZ | |

**voluntarios**
| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| id | UUID | ✓ |
| nome_completo | TEXT | ✓ |
| idade | INTEGER | ✓ |
| whatsapp | TEXT | ✓ |
| instagram | TEXT | |
| cidade_estado_pais | TEXT | ✓ |
| igreja | TEXT | ✓ |
| nome_pastor | TEXT | |
| contato_pastor_lider | TEXT | ✓ |
| como_serve_igreja | TEXT | ✓ |
| tempo_na_igreja | TEXT | ✓ |
| estado_civil | TEXT | ✓ |
| conjuge_na_missao | BOOLEAN | |
| motivo_conjuge_ausente | TEXT | |
| nome_emergencia | TEXT | |
| telefone_emergencia | TEXT | |
| ja_participou_missao | BOOLEAN | ✓ |
| limitacao_fisica | TEXT | |
| fala_ingles | BOOLEAN | |
| fala_espanhol | BOOLEAN | |
| canta | BOOLEAN | |
| toca_instrumento | BOOLEAN | |
| tira_fotos | BOOLEAN | |
| faz_filmagens | BOOLEAN | |
| outras_competencias | BOOLEAN | |
| outra_competencia_descricao | TEXT | |
| status | TEXT | (pendente/aprovado/reprovado) |
| criado_em | TIMESTAMPTZ | |

## Imagens

- Imagens locais ficam em `C:\Users\renan\Desktop\Cruzada\imagens\` organizadas por seção
- Ao substituir imagem: copiar para `frontend/public/` com nome único por seção
- Pasta `imagens/` está no `.gitignore` (não sobe para o repositório)

## Arquivos protegidos (.gitignore)

- `**/.env` — variáveis de ambiente com credenciais do Supabase
- `imagens/` — fotos locais
- `.claude/settings.local.json` — configurações locais do Claude
- `node_modules/`

## PWA

- `frontend/public/manifest.json` — configuração do PWA
- `frontend/public/icon-192.png` e `icon-512.png` — ícones da tela inicial
- `frontend/index.html` referencia o manifest e o favicon
