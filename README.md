# Performance OS

Performance OS é um sistema pessoal mobile-first para acompanhar a jornada oficial de 01/06/2026 a 31/08/2026, com foco em tênis, composição corporal, sono, recuperação do ombro direito, prevenção de lesões e hábitos semanais.

## Estrutura

- `index.html`: interface principal.
- `styles.css`: layout responsivo e visual executivo.
- `app.js`: estado, formulários, autenticação e persistência.
- `dashboard.js`: métricas, metas, classificações e insights.
- `charts.js`: gráficos em canvas sem framework.
- `supabase.js`: conexão direta com Supabase JS usando apenas `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- `database.sql`: tabelas, relacionamentos, triggers, grants e políticas RLS.
- `migration-2026-06-01-performance-os-v2.sql`: atualização incremental aplicada no projeto Supabase oficial.

## Supabase

Use o projeto oficial `wagner-performance-os`.

1. Abra o projeto no Supabase.
2. Em `SQL Editor`, cole e execute todo o conteúdo de `database.sql`.
3. Em `Authentication > Providers`, mantenha `Email` habilitado.
4. Em `Authentication > URL Configuration`, configure `Site URL` com a URL do GitHub Pages.
5. Adicione também a URL local de teste se for testar em servidor local.

O SQL cria:

- `users_profile`
- `weekly_reviews`
- `weekly_checklist`
- `tennis_matches`
- `shoulder_tracking`
- `body_composition`
- `technical_lessons`
- `technical_progress`

Todas as tabelas têm RLS habilitado. As políticas usam `auth.uid()` para garantir que cada usuário só acesse os próprios dados.

### Atualização v2 aplicada

A migration `migration-2026-06-01-performance-os-v2.sql` foi criada para:

- definir a baseline oficial de 01/06/2026 a 31/08/2026;
- adicionar metas de aulas particulares e ranking inicial ao perfil;
- criar o módulo `Plano de Evolução Técnica`;
- criar histórico de notas técnicas por habilidade;
- limpar os registros de teste das tabelas de acompanhamento.

As contas de autenticação não foram removidas. A limpeza foi feita apenas nos dados operacionais da jornada.

## Conexão do frontend

No arquivo `supabase.js`, substitua:

```js
export const SUPABASE_URL = "SUPABASE_URL";
export const SUPABASE_ANON_KEY = "SUPABASE_ANON_KEY";
```

pelos valores públicos do projeto:

```js
export const SUPABASE_URL = "https://seu-projeto.supabase.co";
export const SUPABASE_ANON_KEY = "sua-chave-anon-publica";
```

Nunca use `SERVICE_ROLE_KEY` no frontend.

## Login

O app implementa:

- cadastro com nome, email e senha;
- login com email e senha;
- opção "Lembrar-me" para persistir a sessão no dispositivo;
- recuperação de senha via `resetPasswordForEmail`;
- logout visível no menu principal;
- recuperação de sessão após reload;
- tratamento silencioso para sessão ausente ou expirada.

Sem as chaves configuradas, o app roda em modo demo local com `localStorage`.

## GitHub Pages

Este repositório é estático e não precisa de build.

1. Vá em `Settings > Pages`.
2. Em `Build and deployment`, selecione `Deploy from a branch`.
3. Escolha a branch `main`.
4. Escolha a pasta `/root`.
5. Salve e aguarde a publicação.

Depois da publicação, configure a URL em `Authentication > URL Configuration` no Supabase.

## Regras de avaliação

- Semana Verde: aderência maior ou igual a 80%.
- Semana Amarela: 60% a 79%.
- Semana Vermelha: abaixo de 60%.

O ombro é classificado pelo maior valor entre dor em repouso, dor em movimento e dor no saque:

- Verde: 0 a 2.
- Amarelo: 3 a 5.
- Vermelho: acima de 5.

## Módulos v2

### Plano de Evolução Técnica

Registra aulas particulares, professor, observações e evolução de notas de 0 a 10 para:

- Forehand
- Backhand
- Movimentação
- Tática
- Saque
- Voleio
- Devolução de saque
- Transição ataque/defesa
- Consistência mental durante os jogos

A meta do período é realizar até 4 aulas particulares.

### Prevenção e Preparação

Biblioteca de consulta com estrutura preparada para imagens e vídeos em:

- Mobilidade
- Ativação Muscular
- Preparação específica para o tênis

### Análise semanal

O histórico semanal agora calcula itens realizados, itens não realizados, gargalos recorrentes, hábitos fortes, hábitos fracos e comparação com semanas anteriores.

### Ranking

O módulo de tênis acompanha ranking inicial, posição atual, evolução de posições e gráfico histórico.

## Próximas evoluções

A base está preparada para anexar mídias reais na biblioteca de prevenção, IA de recomendações, Garmin, Apple Health, Google Fit, relatórios semanais automáticos e PWA.
