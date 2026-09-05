# Especificação Técnica: Hardening e Segurança da Aplicação

> **Referência:** OWASP Top 10, OWASP API Security Top 10 e Skill `security-and-hardening`.  
> **Data:** 2026-09-05  
> **Status:** Aprovado para implementação  

---

## 1. Visão Geral e Objetivos

Esta especificação define os requisitos, arquitetura e passos de implementação para eliminar vulnerabilidades de segurança identificadas na aplicação **Tipiti**, com foco primordial na eliminação de **BOLA / IDOR** na API serverless, adição de **Security Headers** no deploy da Vercel, validação estrita de payloads no backend e restrição de **CORS**.

---

## 2. Ameaças Identificadas e Mapeamento STRIDE

| Componente | Ameaça (STRIDE) | Descrição do Risco | Nível |
| :--- | :--- | :--- | :---: |
| **API Serverless (`api/index.ts`)** | **Elevation of Privilege / Tampering** | Manipulação e leitura de itens pertencentes a listas de outros usuários (BOLA / IDOR). | 🔴 **Alta** |
| **API Serverless (`api/index.ts`)** | **Denial of Service / Tampering** | Payloads sem validação de limite de tamanho (`name` sem teto, `price`/`quantity` sem range check). | 🟠 **Média** |
| **Configuração Web (`vercel.json`)** | **Information Disclosure / Tampering** | Ausência de headers de proteção contra clickjacking, MIME-sniffing e downgrade HTTP. | 🟠 **Média** |
| **Middleware CORS** | **Spoofing / Data Leakage** | `cors()` irrestrito permitindo qualquer origem realizar requisições autenticadas. | 🟡 **Baixa** |

---

## 3. Requisitos Técnicos

### 3.1. Eliminação de BOLA / IDOR no Serverless (`api/index.ts`)

Como o Prisma conecta ao banco via `DATABASE_URL` contornando as políticas de RLS do Supabase, **toda consulta e mutação de itens DEVE validar o vínculo com o `userId` autenticado**.

1. **`GET /api/lists/:id/items`**:
   - Validar previamente se a lista com ID `:id` pertence ao `userId` autenticado (`prisma.list.findFirst({ where: { id: listId, user_id: userId } })`).
   - Se a lista não for do usuário, retornar **404 Not Found** (evita enumerar a existência de recursos de terceiros).
2. **`POST /api/lists/:id/items`**:
   - Validar se a lista alvo pertence ao `userId` antes de inserir o item.
   - Retornar **404 Not Found** se o usuário não for o proprietário.
3. **`PATCH /api/items/:id`**:
   - Verificar se o item existe E pertence a uma lista de propriedade do `userId`:
     ```ts
     const item = await prisma.item.findFirst({
       where: { id, list: { user_id: userId } }
     })
     if (!item) return c.json({ error: 'Item não encontrado' }, 404)
     ```
   - Atualizar somente se a validação passar.
4. **`DELETE /api/items/:id`**:
   - Verificar se o item pertence ao `userId` antes de deletar, ou usar deleção condicionada pela relação com a lista do usuário.

---

### 3.2. Validação Estrita de Entrada com Zod na API (`api/index.ts`)

Todas as rotas que recebem dados do usuário devem validar tamanho, formato e limites numéricos antes de interagir com o banco:

1. **Schema de Lista (`createListSchema`, `updateListSchema`):**
   - `name`: string obrigatória, `min(1)`, `max(100)`, sanitizada com `trim()`.
   - `is_archived`: boolean opcional.
2. **Schema de Item (`createItemSchema`, `updateItemSchema`):**
   - `name`: string obrigatória, `min(1)`, `max(100)`, sanitizada com `trim()`.
   - `quantity`: número positivo, finito, `max(99999)`, opcional em updates.
   - `price`: número positivo, finito, `max(999999.99)`, opcional em updates.
   - `is_purchased`: boolean opcional.
3. **Tratamento de Erro:**
   - Em caso de falha de validação Zod, retornar **400 Bad Request** com mensagem de erro descritiva e consistente.

---

### 3.3. Cabeçalhos de Segurança HTTP (`vercel.json`)

Adicionar a seção `headers` no `vercel.json` aplicando cabeçalhos padrão para todas as rotas (`/(.*)`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    }
  ]
}
```

---

### 3.4. Restrição de CORS (`api/index.ts`)

Configurar o middleware de CORS para aceitar apenas origens confiáveis:
- Ambiente de desenvolvimento: `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`.
- Ambiente de produção: Origem da aplicação no Vercel especificada via variável de ambiente `APP_URL` ou URL do host da requisição.

---

## 4. Plano de Implementação em Fases

### Fase 1: Hardening da API Serverless e Autorização BOLA
- [ ] Atualizar [`api/index.ts`](file:///home/smovisk/PycharmProjects/tipiti/api/index.ts) com schemas Zod para payloads.
- [ ] Adicionar checagem relacional (`list.user_id = userId`) em `GET /api/lists/:id/items`, `POST /api/lists/:id/items`, `PATCH /api/items/:id` e `DELETE /api/items/:id`.
- [ ] Refatorar CORS para origens permitidas.

### Fase 2: Configuração de Cabeçalhos HTTP no Deploy
- [ ] Atualizar [`vercel.json`](file:///home/smovisk/PycharmProjects/tipiti/vercel.json) com a política de cabeçalhos de segurança recomendada.

### Fase 3: Testes Automatizados de Segurança
- [ ] Criar testes unitários/de integração cobrindo os cenários de tentativa de acesso a itens/listas de terceiros (deve retornar 404).
- [ ] Testar rejeição de payloads com valores fora dos limites (deve retornar 400).

---

## 5. Critérios de Aceite

1. ✅ Um usuário autenticado `A` não consegue visualizar itens da lista do usuário `B` chamando `GET /api/lists/:id/items` (retorna 404).
2. ✅ Um usuário autenticado `A` não consegue alterar ou deletar itens do usuário `B` chamando `PATCH /api/items/:id` ou `DELETE /api/items/:id` (retorna 404).
3. ✅ Requisições com nomes vazios ou maiores que 100 caracteres são rejeitadas com status 400.
4. ✅ Requisições com preços/quantidades negativos, infinitos ou maiores que os limites são rejeitadas com status 400.
5. ✅ Os headers `X-Content-Type-Options`, `X-Frame-Options` e `Strict-Transport-Security` estão presentes na configuração da Vercel.
6. ✅ Todos os testes da suíte (`npm test`) continuam passando com 100% de sucesso.
