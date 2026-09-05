# PWA de Lista de Mercado MVP

## Objetivo

Entregar primeiro como PWA instalável para validar a lista de mercado no
navegador antes de uma futura interface React Native. O produto permite entrar
por Magic Link, criar e reutilizar listas, marcar itens e ver o gasto da compra.

## Arquitetura

O cliente é React com Vite, React Router e `vite-plugin-pwa`, hospedado na
Vercel. Ele acessa Supabase diretamente pela chave publishable pública;
TanStack Query faz as leituras e invalida o cache após mutações.

Não há backend próprio, cálculo de total no banco ou suporte a mutações offline.
A PWA cacheia apenas os arquivos da interface para instalação e carregamento do
app shell; toda escrita exige conexão com o Supabase.

## Autenticação e rotas

- `/login`: e-mail e envio do Magic Link.
- `/auth/callback`: conclui a sessão e redireciona para `/home`.
- `/home`: listas ativas próprias.
- `/history`: listas arquivadas próprias.
- `/list/:id`: compra ativa ou lista arquivada somente para leitura.

O cliente Supabase usa seu armazenamento padrão de navegador para restaurar a
sessão. Sem sessão, as rotas privadas redirecionam para `/login`. O Supabase
Auth deve permitir `http://localhost:5173/auth/callback` e a URL de produção
provisória da Vercel com `/auth/callback`.

O deploy Vercel precisa reescrever rotas da SPA para `index.html`, para que
links diretos de Magic Link e URLs de listas carreguem o aplicativo.

## Dados e segurança

`lists` contém `id`, `user_id`, `name`, `is_archived`, `created_at` e
`archived_at`. `archived_at` é preenchido ao finalizar e volta a `null` ao
reabrir; ele define a ordem do Histórico e a última lista clonável.
`items` contém `id`, `list_id`, `name`, `quantity`, `price` e `is_purchased`.
Preço é unitário em reais, com duas casas decimais na interface. Quantidade é
decimal e tanto ela quanto o preço não podem ser negativos.

RLS fica ativa em ambas as tabelas. `lists` só permite operações quando
`user_id = auth.uid()`. Políticas de `items` verificam, inclusive em
`WITH CHECK`, que a lista de `list_id` pertence ao usuário autenticado. Não
duplicar `user_id` em `items` e nunca expor uma service-role key ao navegador.

## Fluxos

Home mostra listas não arquivadas, ordenadas por criação decrescente. Criar
adiciona a lista "Nova lista", que pode ser renomeada. Sem histórico, não há
botão de cópia. Clonar usa a lista finalizada mais recentemente, cria uma lista
ativa e copia nome, quantidade e preço dos itens, definindo todos como não
comprados.

Na compra, o input superior cria itens com quantidade 1 e preço R$ 0,00. Nome
do item não é editável; para corrigir, a pessoa o exclui e cria novamente.
Tocar em item ativo expande a própria linha para editar quantidade e preço,
com salvar e cancelar. Pendentes aparecem antes dos itens no carrinho. O
rodapé soma localmente `price * quantity` apenas dos itens comprados. Finalizar
pede confirmação, preenche `archived_at`, arquiva a lista e volta para Home.

Histórico ordena listas por `archived_at` decrescente; cada card mostra nome,
total e data de finalização. Lista arquivada abre sem controles de escrita,
exceto "Reabrir lista", que a torna ativa preservando seus itens e estados de
compra. Não há exclusão de listas no MVP, mas há exclusão de itens.

Listas e Histórico vazios mostram, respectivamente, uma mensagem com botão
"Criar lista" e "Nenhuma compra finalizada". A interface usa skeleton durante
leituras. Falha de escrita mantém o estado exibido e oferece "Tentar
novamente". Lista inexistente ou de outra pessoa mostra "Lista não
encontrada". Após pedir Magic Link, Login informa "Confira seu e-mail".

O manifest da PWA contém ícones PNG 192x192 e 512x512 com a letra "T".

## Critérios de aceite

- A PWA instala pelo navegador em Android e iOS.
- Magic Link funciona localmente e na URL provisória da Vercel.
- Uma pessoa só lê ou altera seus próprios dados; RLS bloqueia acesso cruzado.
- Criar, marcar, editar preço/quantidade, finalizar e clonar atualiza as telas
  e o total corretamente.
- Reabrir uma lista preserva seus itens e estados; Histórico e clonagem usam a
  data de finalização.
- URLs diretas de callback e lista funcionam no deploy Vercel.
