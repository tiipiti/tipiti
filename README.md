# 🛒 Tipiti

> **PWA de lista de mercado e controle de consumo mensal em neo-brutalismo pixelado.**  
> Criado para substituir o papel e o bloco de notas por uma ferramenta rápida, tátil e focada na experiência real de empurrar o carrinho e passar no caixa.

---

## ⚡ Tecnologias

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router v7.
- **Gráficos & Visualização:** Recharts estilizado em neo-brutalismo.
- **Banco de Dados & Autenticação:** Supabase (PostgreSQL + RLS + Supabase Auth com Magic Link e Senha).
- **ORM & Serverless API:** Prisma ORM com PostgreSQL Connection Pooling e Vercel Serverless Functions.
- **PWA:** Suporte offline e instalação nativa no celular via `vite-plugin-pwa`.
- **Qualidade & Testes:** Vitest + React Testing Library (100% de cobertura nos fluxos críticos) e Oxlint.

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos
- **Node.js:** Versão 20 ou superior recomendada.
- **NPM** instalado.
- Projeto criado no [Supabase](https://supabase.com).

### 2. Clonar e Instalar Dependências
```bash
git clone https://github.com/seu-usuario/tipiti.git
cd tipiti
npm install
```

### 3. Configurar as Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# Configurações do Supabase no Frontend (Vite)
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-chave-anon-publica"

# Configurações do Prisma ORM (Backend Serverless)
# DATABASE_URL: Pooler de transações (porta 6543) com pgbouncer=true
DATABASE_URL="postgresql://postgres.[SEU-REF]:[SUA-SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true"

# DIRECT_URL: Conexão direta ao banco (porta 5432) usada para migrations e schema engine
DIRECT_URL="postgresql://postgres:[SUA-SENHA]@db.[SEU-REF].supabase.co:5432/postgres"
```

> ⚠️ **Atenção:** Nunca insira a chave `service-role` no navegador ou em variáveis com prefixo `VITE_`.

### 4. Executar as Migrações no Supabase
No painel do seu projeto no Supabase, abra o **SQL Editor** e execute os scripts da pasta `supabase/migrations/` na seguinte ordem:
1. `supabase/migrations/20260905113000_shopping_mvp.sql` (Cria tabelas `lists` e `items` com RLS)
2. `supabase/migrations/20260905121500_grant_authenticated_shopping_access.sql` (Garante permissões de acesso aos usuários autenticados)

### 5. Gerar o Cliente Prisma
```bash
npx prisma generate
```

### 6. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:5173`.

---

## 🌐 Como Fazer Deploy na Vercel

O Tipiti já vem configurado com rotas SPA e funções serverless prontas para a Vercel.

### 1. Importar o Repositório
1. Acesse o dashboard da [Vercel](https://vercel.com) e clique em **Add New > Project**.
2. Conecte o repositório Git do projeto.

### 2. Configurar Variáveis de Ambiente na Vercel
Nas configurações do projeto (**Settings > Environment Variables**), adicione as 4 variáveis:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

#### 💡 Onde encontrar as Connection Strings no Supabase?
1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem) > **Database**.
2. Role até a seção **Connection string** e selecione a aba **URI**:
   - **Para `DATABASE_URL`**: Marque o modo **Transaction** (porta `6543`) e adicione `?pgbouncer=true` ao final.
   - **Para `DIRECT_URL`**: Marque o modo **Session** ou conexão direta (porta `5432`).
3. Lembre-se de substituir `[YOUR-PASSWORD]` pela senha que você definiu ao criar o banco no Supabase.

### 3. Configurar Redirecionamento de Auth no Supabase
Para que o Magic Link e logins funcionem em produção:
1. No Supabase, vá em **Authentication** > **URL Configuration** > **Redirect URLs**.
2. Adicione a URL do seu app em produção:
   - `https://SEU-PROJETO.vercel.app/auth/callback`
   - (Para testes locais, mantenha também `http://localhost:5173/auth/callback`).

### 4. Build e Deploy
O comando de build no `package.json` já inclui a geração do cliente Prisma:
```json
"build": "prisma generate && tsc -b && vite build"
```
A Vercel executará o build automaticamente e publicará sua aplicação.

---

## 🧪 Scripts e Comandos Úteis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor Vite para desenvolvimento local. |
| `npm test` | Roda todos os testes unitários e de integração com Vitest. |
| `npm run lint` | Executa a verificação estática de código com Oxlint. |
| `npm run build` | Gera o Prisma Client, checa tipos TypeScript e compila o bundle de produção. |
| `npm run preview` | Executa o preview local da build compilada. |

---

## 📚 Documentação Adicional

- [DESIGN.md](file:///home/smovisk/PycharmProjects/tipiti/DESIGN.md): Especificação completa do design system neo-brutalista pixelado e The Ink Rule.
- [PRODUCT.md](file:///home/smovisk/PycharmProjects/tipiti/PRODUCT.md): Visão detalhada de produto, dores de mercado e personas de uso.
- [AGENTS.md](file:///home/smovisk/PycharmProjects/tipiti/AGENTS.md): Guia e manual de regras inegociáveis para agentes de IA e desenvolvedores.
