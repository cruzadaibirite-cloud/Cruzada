# Cruzada Ibirité 2026

## Regras obrigatórias

- **SEMPRE perguntar** ao usuário se deseja fazer commit e push antes de executar qualquer `git commit` ou `git push`.
- **NUNCA fazer commit ou push automaticamente** sem confirmação explícita do usuário.
- **Mensagens de commit** devem sempre iniciar com a versão (`v1`, `v2`, `v3`...) seguida de um detalhamento do que foi feito. Exemplo: `v3 - Adiciona tela de login, corrige estilos do header e configura Supabase Auth`.
- O número da versão deve ser incrementado a cada commit.

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

## Perfis de usuário

- `admin` — acesso total
- `lider` — gerencia setor e equipe
- `voluntario` — acesso à área do missionário
- `igreja` — acesso apenas a vídeos institucionais

## Supabase

- Projeto: `hlrnxwyudqhhvuerldfo`
- Região: South America (São Paulo)
