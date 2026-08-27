# Tipiti

Este arquivo descreve o código que existe hoje. Atualize-o quando a estrutura ou os padrões do repositório mudarem.

## Estrutura atual

- `backend/` contém o projeto Django; `config/` concentra settings, URLs e o admin customizado.
- `backend/accounts/` contém perfil, sessão e autenticação por senha, Google e Facebook.
- `backend/shopping/` contém listas, convites, mercados, catálogo, preços, promoções, compras, sync, links compartilhados e moderação.
- `backend/notifications/` contém as notificações internas.
- `backend/core/` contém os blocos reutilizados, incluindo `BaseModel`, `ViewSetBase`, mídia e exceções.
- `docs/superpowers/specs/` contém specs separadas por `backend/` e `android/`.

## Padrões presentes no código

- Modelos públicos do domínio herdam de `core.models.BaseModel` e expõem `public_id` UUID.
- As APIs usam Django REST Framework; CRUDes existentes usam `core.viewsets.ViewSetBase` e rotas em `urls.py` ou `rfc_urls.py`.
- Coleções da API usam `core.pagination.FlexiblePageNumberPagination` (Django `Paginator`); filtros públicos declarativos ficam em `shopping/filters.py` com `django-filter`.
- A API legada está sob `/api/`; os recursos RFC atuais estão sob `/api/v1/`.
- Serializers validam a entrada HTTP; regras transacionais de lista e compra estão em `shopping/services.py`.
- Administração usa `config.admin_site.site` e `unfold.admin.ModelAdmin`.
- O fluxo operacional do admin começa em uma lista: a rota de registrar compra mostra somente itens pendentes daquela lista; mercado é opcional.
- No admin, `ShoppingPurchase` é registrada uma única vez com itens inline; `Purchase` legada só é corrigida ou estornada pelas telas auditáveis que chamam `shopping.services`.
- A posse de uma lista é transferida pelo fluxo administrativo que chama `shopping.services.transfer_ownership`; novos membros criados no admin sempre entram como `MEMBER`.
- Formulários operacionais do admin mostram apenas decisões da tarefa; relações de lista ficam em abas nativas do Unfold e metadados técnicos ficam fora do fluxo de edição.
- Ao criar uma `ShoppingList` no admin, o administrador criador recebe automaticamente o papel `OWNER`.
- Compras de item registradas, corrigidas ou estornadas preservam eventos append-only em `PurchaseChange`; transferências de posse ficam em `ListOwnershipChange`.
- O dashboard administrativo prioriza uma fila de atenção antes das métricas de contexto.
- O profiler opcional `django-sonar` só é ativado fora dos testes com `DJANGO_DEBUG=True` e `DJANGO_SONAR=True`; seu painel fica em `/sonar/`.
- `shopping` possui a migration inicial `0001_initial`; `core` não possui migrations por conter apenas modelos abstratos.
- Testes usam pytest: unitários ficam em `backend/tests/unit/` e usam `MagicMock` sem banco; integrações ficam em `backend/tests/integration/` e usam o banco temporário do Django.

## Ao alterar

- Leia o fluxo e os modelos afetados antes de editar; preserve mudanças não relacionadas.
- Atualize este arquivo se a alteração mudar algum item acima.
- Verifique Python com `python3 -m compileall -q backend` e mudanças rastreadas com `git diff --check` quando possível.

## Skills obrigatórias para o backend

- Use `$django-expert` ao criar ou alterar modelos, migrations, serializers, autenticação, consultas ORM ou APIs Django REST Framework.
- Use `$django-patterns` para decisões de arquitetura Django, organização de apps, APIs REST, cache, signals e desempenho.
- Use `@Ponytail` em qualquer mudança de código: siga a solução menor que preserve validação, segurança e regras de negócio; não adicione dependências ou abstrações sem necessidade.
