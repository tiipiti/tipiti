# AGENTS.md — Regras de Desenvolvimento do Tipiti

> **Instruções para Agentes de IA (LLMs, Cursor, Windsurf, Copilot, Antigravity):**
> Este repositório segue regras estritas de arquitetura, padrões visuais neo-brutalistas e convenções de código. Antes de propor ou implementar alterações, leia e respeite atentamente este documento.

---

## 1. Visão Geral & Filosofia

- **Produto:** PWA de lista de mercado e controle de compras com cálculo automático em tempo real.
- **Identidade Visual:** **"Manual de Mercado de Fliperama"** (Neo-brutalismo pixelado de alto contraste).
- **Sensação do Usuário:** Folha de papel carimbada, física, ágil, com botões mecânicos e pixel art funcional. Nada de visual corporativo SaaS ou interfaces vazias.

---

## 2. Regras Visuais Inegociáveis (The Non-Negotiable Design System)

Ao criar ou editar qualquer componente de interface, siga rigorosamente as diretrizes extraídas de `DESIGN.md` e `.impeccable/design.json`:

### 2.1. The Ink Rule (Bordas & Cantos)
- **Borda Obrigatória:** Todo contêiner, botão, input, painel ou modal **DEVE** ter borda preta sólida de 4px (`border: 4px solid #000000`).
- **Zero Arredondamento:** É terminantemente **PROIBIDO** usar cantos arredondados (`border-radius: 0px` / `rounded-none`). Nunca use `rounded`, `rounded-md`, `rounded-full` ou similares.

### 2.2. The Hard Shadow Rule (Elevação Sem Blur)
- **Sombra Rígida:** Sombras devem ser blocos pretos deslocados sem desfoque:
  - Repouso: `box-shadow: 6px 6px 0 #000000` (ou `4px 4px 0 #000000` em itens menores).
  - Pressionado (`:active`): `box-shadow: 0 0 0 #000000; transform: translate(6px, 6px);` (o elemento afunda fisicamente no espaço da sua sombra).
- **Proibição de Blur:** `filter: blur()`, sombras com difusão (`rgba(0,0,0,0.1)`) e `backdrop-blur` são **estritamente proibidos**.

### 2.3. Paleta de Cores e Semântica Estrita
- **Papel de Mercado (`#F4F0EB`):** Fundo padrão de páginas, cartões neutros e inputs.
- **Tinta Preta (`#000000`):** Toda tipografia, bordas estruturais e sombras.
- **Verde de Confirmação (`#39FF14`):** Ações afirmativas principais (Salvar, Criar lista, Adicionar item, Marcar comprado, Total final).
- **Amarelo Elétrico (`#FFFF00`):** Atenção, avisos, banner de consumo mensal e destaques de relatórios.
- **Laranja de Segurança (`#FF5F1F`):** Ações irreversíveis ou destrutivas (Finalizar compra, Excluir item/lista, Erros de validação).
- **Cinza Comprado (`#D6D0C8`):** Fundo exclusivo de itens marcados como comprados.

### 2.4. Ícones & Pixel Art (Sem Emojis / Sem Ícones Vetoriais Modernos)
- **NÃO use** Lucide, FontAwesome, Heroicons ou Material Icons nas telas do usuário.
- **NÃO use** emojis nativos em rótulos ou botões.
- **USE** SVGs pixelados manuais com `shape-rendering="crispEdges"` com no máximo 2 a 3 cores chapadas (como já implementado nos botões de carrinho, moeda, lixeira e check).

### 2.5. Diálogos Nativos Proibidos
- **NUNCA use** `window.confirm()` ou `window.alert()`.
- **SEMPRE use** o componente [`ConfirmModal`](file:///home/smovisk/PycharmProjects/tipiti/src/components/ConfirmModal.tsx) estilizado em neo-brutalismo para confirmar ações críticas ou destrutivas.

---

## 3. Stack Tecnológica & Arquitetura

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4 (`@tailwindcss/vite`), React Router v7.
- **Gráficos:** Recharts com customização neo-brutalista (stroke preto rígido, radius 0).
- **Autenticação & Banco:** Supabase Client (`@supabase/supabase-js`) com Postgres e RLS ativo.
- **ORM & Backend Serverless:** Prisma ORM (`prisma/schema.prisma`) configurado para PostgreSQL com connection pooling via Vercel Serverless Functions (`api/index.ts`).
- **Validação:** Zod e limites explícitos de inputs.
- **Testes & Linter:** Vitest + React Testing Library (`npm test`), Oxlint (`npm run lint`).

---

## 4. Estrutura de Diretórios

```
tipiti/
├── api/                      # Serverless functions (Vercel) com Prisma ORM
│   ├── index.ts              # Handlers de paginação e rotas da API
│   └── prisma.ts             # Instância do PrismaClient com tratamento de pooling
├── prisma/
│   └── schema.prisma         # Modelos List e Item mapeados para PostgreSQL
├── public/                   # Manifest PWA, service worker, ícones
├── src/
│   ├── components/           # Componentes reutilizáveis (ConfirmModal, etc.)
│   ├── features/
│   │   ├── auth/             # Login, Signup, Magic Link, SessionGate, useSession
│   │   └── shopping/         # Telas de compra (HomePage, ListPage, HistoryPage, DashboardPage)
│   │       ├── api.ts        # Camada de comunicação de dados Supabase
│   │       ├── forms.ts      # Validações, sanitização e limites de formulários
│   │       ├── monthly.ts    # Cálculos financeiros e linha do tempo de consumo
│   │       └── total.ts      # Cálculo de somatórios de carrinho e compras
│   ├── lib/                  # Inicialização e validação de env do Supabase
│   ├── App.tsx               # Roteador com proteção de rotas (PrivatePage)
│   └── main.tsx              # Entrada da aplicação React
├── supabase/
│   └── migrations/           # Migrações SQL com DDL e políticas RLS
├── DESIGN.md                 # Especificação completa do design system
├── PRODUCT.md                # Visão de produto, personas e requisitos
├── AGENTS.md                 # Este guia de regras para LLMs e agentes
└── README.md                 # Instruções de setup, deploy e execução
```

---

## 5. Regras de Negócio e Limites de Dados (Bounds)

Todo formulário e processamento de dados deve respeitar os seguintes limites estritos:

| Dado / Campo | Limite Máximo | Regra de Negócio |
| :--- | :--- | :--- |
| **Nome da Lista** | 100 caracteres | Obrigatório ao criar. Não criar "Nova Lista" sem nome. |
| **Nome do Produto** | 100 caracteres | Obrigatório. Sanitizado com trim. |
| **Apelido / Nickname** | 50 caracteres | Opcional no cadastro de usuário. |
| **E-mail** | 254 caracteres | Formato RFC válido para autenticação. |
| **Senha** | 72 caracteres | Limite máximo do algoritmo bcrypt. Mínimo de 6. |
| **Quantidade** | 99.999 | Decimal suportado (permite compras em Kg/litros). |
| **Preço Unitário** | R$ 999.999,99 | Decimal formatado em moeda brasileira (`BRL`). |

### 5.1. Regras de Compra e Carrinho
1. **Comprado:** Um item comprado tem 4 marcadores simultâneos: texto `COMPRADO`, ícone pixelado de check, tachado no nome e fundo cinza `#D6D0C8`.
2. **Copiar Última Compra:** Ao acionar, busca a compra finalizada (`is_archived = true`) mais recente do usuário e clona seus itens com status `is_purchased: false` para a lista ativa.
3. **Exclusão:** Toda exclusão exige confirmação via `ConfirmModal`.

---

## 6. Segurança e Proteção de Rotas

1. **Camada de Rotas (Front-end):**
   - No arquivo [`src/App.tsx`](file:///home/smovisk/PycharmProjects/tipiti/src/App.tsx), toda rota privada é envolvida por `<PrivatePage>`.
   - [`SessionGate`](file:///home/smovisk/PycharmProjects/tipiti/src/features/auth/gate.tsx) exibe a tela neo-brutalista `AuthLoading` enquanto autentica e redireciona requisições não autenticadas imediatamente para `/login`.
2. **Camada de Banco de Dados (Back-end / Supabase):**
   - Todas as tabelas têm **RLS (Row Level Security)** habilitado.
   - Nenhuma query ao banco deve ser feita com chave service-role no navegador; somente a `VITE_SUPABASE_PUBLISHABLE_KEY` é permitida no bundle do cliente.

---

## 7. Diretrizes para Modificações de Código (Checklist do Agente)

Sempre que fizer alterações no projeto, você deve:
1. ✅ **Respeitar o Design System:** Nunca quebre as regras de 0px border-radius, bordas de 4px e sombras rígidas.
2. ✅ **Preservar Testes:** Rode `npm test` antes de concluir sua resposta. Todos os testes (atualmente 45 testes em 12 arquivos) devem passar com 100% de sucesso.
3. ✅ **Preservar Qualidade do Código:** Execute `npm run lint` (`oxlint`) e garanta 0 erros.
4. ✅ **Validar Build:** Certifique-se de que `npm run build` gera o bundle sem erros de tipo no TypeScript.
5. ✅ **Links no Chat:** Sempre que citar arquivos ou símbolos de código para o usuário, use links markdown clicáveis no padrão `[nome_do_arquivo](file:///caminho/absoluto)`.
