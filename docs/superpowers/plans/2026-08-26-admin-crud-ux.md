# Admin CRUD UX

## TODO

- [x] Registrar uma compra completa no admin, com itens obrigatórios e total calculado.
- [x] Corrigir e estornar a compra legada somente por ações auditáveis.
- [x] Organizar cadastros e a barra lateral por tarefas, com formulários menos ambíguos.
- [x] Transferir posse pelo admin e impedir troca manual de owner.
- [x] Padronizar unidades nos formulários do admin.

## Implementação

1. Em `backend/tests/integration/shopping/test_purchase_views.py`, criar testes de admin que comprovem: uma compra finalizada ganha `client_operation_id`, soma os itens e atualiza os itens da lista; a página de compra legada expõe as ações de correção/estorno; e a navegação contém os atalhos de tarefa. Executar o teste e confirmar a falha antes de alterar produção.
2. Em `backend/shopping/admin.py`, adicionar um inline de item e validação de formulário para `ShoppingPurchase`. No salvamento inicial, definir o usuário atual, gerar o identificador de operação e recalcular o total e o progresso dos itens da lista. Tornar o registro criado apenas consultável para não duplicar esse efeito.
3. Em `backend/shopping/admin.py` e `backend/templates/admin/shopping/purchase/`, bloquear a edição direta de `Purchase`, mostrar seu histórico como inline somente leitura e implementar as telas explícitas de corrigir e estornar usando `correct_purchase()` e `void_purchase()`.
4. Em `backend/shopping/admin.py` e `backend/config/settings.py`, aplicar `fieldsets`, defaults e rótulos de contexto aos cadastros de listas, preços, promoções e mercados; alterar a sidebar para “Planejar”, “Registrar” e “Acompanhar”.
5. Atualizar `AGENTS.md` com o fluxo administrativo de compras, rodar os testes de integração, a suíte completa, `compileall`, `manage.py check` e `git diff --check`.
6. Em `backend/tests/integration/shopping/test_purchase_views.py`, criar testes que fazem POST da transferência de posse pelo admin e rejeitam uma unidade fora do catálogo no formulário de item. Confirmar as falhas, então adicionar a tela de transferência que chama `transfer_ownership()` e os choices apenas nos formulários administrativos.
