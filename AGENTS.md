# Tipiti

Este arquivo descreve a estrutura atual do projeto. Atualize-o quando ela mudar.

## Estrutura

- `backend/` contém o projeto Django; `config/` concentra settings, URLs e o admin customizado.
- `backend/accounts/` contém autenticação, perfil e sessão.
- `backend/shopping/` contém somente listas de compras e itens de texto.
- `backend/notifications/` contém notificações internas.
- `backend/core/` contém blocos reutilizados, incluindo `BaseModel` e `ViewSetBase`.
- `docs/superpowers/specs/` e `docs/superpowers/plans/` guardam decisões e planos.

## Padrões

- Modelos públicos herdam de `core.models.BaseModel` e expõem `public_id` UUID.
- A API usa Django REST Framework e `core.viewsets.ViewSetBase`; os recursos atuais ficam sob `/api/v1/`.
- Listas pertencem a um usuário; itens são texto livre com estado booleano `completed`.
- Cada consulta de lista/item da API é filtrada pelo usuário autenticado.
- O admin usa `config.admin_site.site` e `unfold.admin.ModelAdmin`; a lista é o CRUD principal e os itens entram como inline nativo.
- `shopping/migrations/0001_initial.py` é histórico e imutável; remodelagens usam nova migration.
- Testes usam pytest: integrações ficam em `backend/tests/integration/` e usam o banco temporário do Django.

## Ao alterar

- Leia o fluxo e os modelos afetados antes de editar e preserve mudanças não relacionadas.
- Rode `python3 -m compileall -q backend` e `git diff --check` quando possível.

## Skills obrigatórias para o backend

- Use `$django-expert` ao criar ou alterar modelos, migrations, serializers, autenticação, consultas ORM ou APIs Django REST Framework.
- Use `$django-patterns` para decisões de arquitetura Django, organização de apps, APIs REST, cache, signals e desempenho.
- Use `@Ponytail` em qualquer mudança de código: siga a solução menor que preserve validação, segurança e regras de negócio.
