# Performance OS

Sistema pessoal mobile-first para acompanhar a jornada de junho, julho e agosto de 2026, com foco em tenis, composicao corporal, sono, recuperacao do ombro direito e habitos semanais.

## Estrutura

- `index.html`: interface principal.
- `styles.css`: layout responsivo e visual executivo.
- `app.js`: estado, formularios, autenticacao e persistencia.
- `dashboard.js`: metricas, metas, classificacoes e insights.
- `charts.js`: graficos em canvas sem framework.
- `supabase.js`: conexao direta com Supabase JS usando apenas `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- `database.sql`: tabelas, relacionamentos, triggers, grants e politicas RLS.

## Supabase

Use o projeto oficial `wagner-performance-os`.

1. Abra o projeto no Supabase.
2. Em `SQL Editor`, cole e execute todo o conteudo de `database.sql`.
3. Em `Authentication > Providers`, mantenha `Email` habilitado.
4. Em `Authentication > URL Configuration`, configure `Site URL` com a URL do GitHub Pages.
5. Adicione tambem a URL local de teste se for testar em servidor local.

Todas as tabelas tem RLS habilitado. As politicas usam `auth.uid()` para garantir que cada usuario so acesse os proprios dados.

## Conexao do frontend

No arquivo `supabase.js`, substitua `SUPABASE_URL` e `SUPABASE_ANON_KEY` pelos valores publicos do projeto. Nunca use `SERVICE_ROLE_KEY` no frontend.

## Login

O app implementa cadastro com nome, email e senha, login com email e senha, recuperacao de senha via `resetPasswordForEmail` e sessao persistida pelo Supabase Auth. Sem as chaves configuradas, roda em modo demo local com `localStorage`.

## GitHub Pages

Este repositorio e estatico e nao precisa de build.

1. Va em `Settings > Pages`.
2. Em `Build and deployment`, selecione `Deploy from a branch`.
3. Escolha a branch `main`.
4. Escolha a pasta `/root`.
5. Salve e aguarde a publicacao.

Depois da publicacao, configure a URL em `Authentication > URL Configuration` no Supabase.

## Regras

Semana Verde: >= 80%. Semana Amarela: 60% a 79%. Semana Vermelha: < 60%.

O ombro e classificado pelo maior valor entre dor em repouso, dor em movimento e dor no saque: Verde 0 a 2, Amarelo 3 a 5, Vermelho acima de 5.
