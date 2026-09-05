# Projeto: App de Lista de Mercado MVP

## 1. Visão Geral
Aplicativo mobile focado em velocidade e reaproveitamento de listas de compras. O objetivo é permitir ao usuário registrar itens, marcar o que foi colocado no carrinho, calcular o gasto em tempo real e clonar listas passadas para agilizar a próxima compra.

## 2. Stack Tecnológico
* **Framework:** React Native com Expo (TypeScript).
* **Navegação:** Expo Router (File-based routing).
* **Backend as a Service:** Supabase (PostgreSQL, Auth).
* **Gerenciamento de Estado/Cache:** TanStack Query (React Query).
* **Armazenamento Local:** AsyncStorage (para persistência de sessão).

## 3. Banco de Dados (Supabase)

### Tabela: `lists`
Armazena as listas de compras ativas e finalizadas.
* `id`: uuid (Primary Key, default: gen_random_uuid())
* `user_id`: uuid (Foreign Key -> auth.users)
* `name`: text
* `is_archived`: boolean (default: false). Define se a compra foi finalizada e virou histórico.
* `created_at`: timestamp with time zone (default: now())

### Tabela: `items`
Armazena os produtos de cada lista.
* `id`: uuid (Primary Key, default: gen_random_uuid())
* `list_id`: uuid (Foreign Key -> lists.id, on delete cascade)
* `name`: text
* `quantity`: numeric (default: 1)
* `price`: numeric (default: 0). Refere-se ao preço unitário.
* `is_purchased`: boolean (default: false)

### Row Level Security (RLS)
* Ambas as tabelas devem ter políticas RLS ativadas.
* O usuário só pode inserir, selecionar, atualizar e deletar registros onde `user_id == auth.uid()`.

## 4. Autenticação
* **Método:** Supabase Magic Link (Apenas e-mail, sem senha).
* **Comportamento:** A sessão deve ser persistida usando AsyncStorage. Se houver sessão ativa, o usuário é redirecionado imediatamente para a rota principal.

## 5. Arquitetura de Telas (Rotas)

### `/login`
* Campo de input para e-mail.
* Botão "Enviar Link de Acesso".
* Feedback visual aguardando verificação.

### `/(tabs)/home` (Listas Ativas)
* Exibe listas com `is_archived = false`.
* Botão "Criar Nova Lista Vazia".
* Botão "Copiar Última Compra".
* Ao clicar em uma lista, navega para `/list/[id]`.

### `/(tabs)/history` (Histórico)
* Exibe listas com `is_archived = true` ordenadas por data descrescente.
* Exibe o total gasto em cada lista no próprio card.
* Ao clicar, abre a lista em modo de leitura.

### `/list/[id]` (Tela de Compras)
* Input de texto no topo para adicionar item rapidamente.
* Seção 1: Itens pendentes (`is_purchased = false`).
* Seção 2: Itens no carrinho (`is_purchased = true`).
* Rodapé fixo exibindo: `Total: R$ {soma (price * quantity) dos itens purchased}`.
* Botão "Finalizar Compra" (Muda `is_archived` para true e redireciona para `/home`).

## 6. Lógica de Negócios Central

### Fluxo de Clonagem
Quando o usuário clica em "Copiar Última Compra":
1. Busca a lista mais recente onde `is_archived = true`.
2. Cria uma nova lista em `lists` com a data atual.
3. Busca todos os itens da lista antiga.
4. Insere os itens na lista nova copiando `name`, `quantity` e `price`, mas forçando `is_purchased = false`.
5. Redireciona o usuário para a nova lista.

### Cálculo de Preços
Não processar cálculo de totais no backend durante o MVP. O cliente (aplicativo) baixa os itens da lista ativa e executa a matemática localmente usando métodos de array do JavaScript.
