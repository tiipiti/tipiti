# Tipiti

PWA de lista de mercado com Magic Link e Supabase.

## Rodar localmente

```bash
npm install
npm run dev
```

O `.env` local precisa conter `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY`. Não use chave service-role no navegador.

## Configurar Supabase

1. Abra o SQL Editor do projeto Supabase e execute
   `supabase/migrations/20260905113000_shopping_mvp.sql`.
2. Em Authentication > URL Configuration, inclua:
   - `http://localhost:5173/auth/callback`
   - `https://SEU-APP.vercel.app/auth/callback`
3. Configure as mesmas variáveis `VITE_*` no projeto da Vercel e publique.

`vercel.json` mantém URLs diretas da SPA, inclusive o callback do Magic Link.

## Verificar

```bash
npm run lint
npm test
npm run build
```
