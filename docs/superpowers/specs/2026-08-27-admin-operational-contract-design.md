# Contrato Operacional do Admin

## Objetivo

Fazer do `tipiti_admin` uma superfície operacional verificável antes do
Android. Um superusuário não pode encontrar erro 500, página vazia, formulário
inútil ou `403` ao seguir uma rota GET que o próprio admin expõe ou que seja a
rota canônica de uma operação administrativa.

## Escopo

- `config`: dashboard em `/` e em `/admin/`, navegação e registro do site.
- `accounts`: usuários, grupos, identidades, perfis, sessões, consentimentos,
  tokens e agenda Celery.
- `notifications`: consulta e criação/edição que o produto decidir expor.
- `shopping`: listas, catálogo, preços, promoções, compras, moderação e
  registros de auditoria.

O objetivo não é testar internals do Django, Unfold, Simple History ou Celery.
É testar os contratos próprios que o projeto expõe através deles.

## Contrato global

1. A home (`/`) e o índice (`/admin/`) retornam 200 para superusuário com o
   banco vazio e com uma amostra de cada dado usado no dashboard.
2. Todo modelo registrado em `config.admin_site.site._registry` tem changelist
   que responde 200 para superusuário. O teste percorre o registro real, sem
   lista manual de modelos, para que um registro novo não escape da cobertura.
3. Toda rota GET canônica de escrita responde 200 ou redireciona para o fluxo
   correto. Não pode responder 403/500 a um administrador. Operações que não
   existem devem redirecionar com mensagem curta; operações proibidas só podem
   devolver 403 para métodos mutáveis.
4. Cada formulário operacional executa seu serviço/regra de domínio, persiste
   o efeito e redireciona para um registro existente. Não há formulário que
   grave diretamente estado que o domínio declara imutável.
5. Cada teste cria somente os dados mínimos e afirma resultado HTTP, efeito
   persistido e, quando houver, evento de auditoria. Não usar snapshots de HTML
   nem testar widgets do Unfold.

## Contrato por app

### `accounts`

- Changelists de todos os registros carregam para superusuário.
- Criar usuário e grupo pelo admin funciona; os inlines de perfil e sessão não
  quebram a tela de usuário.
- Identidades, perfil, sessões, consentimentos e tokens carregam com registros
  reais. As telas declaradas sem criação não mostram botão de criação e a URL
  direta de `add/` redireciona para o changelist com explicação.
- As telas da agenda Celery carregam sem depender de uma tarefa existente.

### `notifications`

- Changelist, criação e edição de notificação carregam com um usuário real.
- A listagem mostra registros com relações carregadas e não quebra quando
  `read_at` ou `expires_at` são nulos.

### `shopping`

- Cada changelist e o dashboard carregam com dados de lista, compra, item,
  preço, promoção, link, denúncia e auditoria.
- Lista cria dono e membership; o registro de compra começa na lista aberta e
  só lista seus itens. A URL direta de adicionar compra redireciona para a
  lista, nunca gera 403.
- Compra, linhas e eventos são leitura; estorno usa formulário próprio, exige
  motivo e gera `PurchaseEvent.VOIDED` com o administrador ator.
- Catálogo, preços, promoções e denúncias possuem GET e POST válidos para as
  ações que o admin expõe. A resolução de denúncia preenche autor e data.
- Sync, links, memberships, convites, linhas, eventos e mudanças de posse são
  inspeção. Suas URLs de adição redirecionam; não existem botões ou fluxos de
  edição/exclusão que contrariem essa inspeção.

## Estrutura de testes

- Criar `tests/integration/admin/test_site.py` para dashboard e travessia do
  registro do site.
- Criar `tests/integration/accounts/test_admin.py` e
  `tests/integration/notifications/test_admin.py` para os fluxos desses apps.
- Manter os cenários de negócio de compras em
  `tests/integration/shopping/test_admin.py`; mover para lá apenas asserções
  próprias de `shopping`.
- Usar helpers locais pequenos para login de superusuário e construção de URL;
  não criar framework de teste nem tabela paralela de permissões.

## Migrações e banco local

Migration aplicada é contrato imutável. Depois que uma migration chega a um
banco persistente, alterações de schema entram em uma nova migration; não se
reescreve `0001_initial`. Para uma remodelagem fundacional que exige reset, o
procedimento explícito é remover o volume local, subir o banco e executar
`manage.py migrate` antes de abrir o admin.

## Critérios de aceite

- A suíte percorre o registro real de `tipiti_admin` e carrega dashboard,
  changelists e rotas GET operacionais dos três apps.
- Todos os fluxos de escrita expostos têm teste POST com efeito persistido.
- Todo fluxo somente leitura ou indisponível possui comportamento navegável
  definido para `add/`; nenhum GET administrativo canônico devolve 403/500.
- `pytest`, `manage.py check`, `makemigrations --check --dry-run`, `compileall`
  e `git diff --check` passam.
