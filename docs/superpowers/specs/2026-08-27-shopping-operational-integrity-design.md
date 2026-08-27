# Integridade Operacional de Shopping

## Objetivo

Fechar as lacunas entre o domínio remodelado, a API pública e o admin usado
para validar o produto antes do Android. O admin é uma interface operacional,
não um atalho para gravar modelos diretamente.

## Escopo

- Persistir corretamente conflitos de sync.
- Tornar compra e estorno fluxos transacionais auditáveis.
- Restringir o CRUD público ao papel e à intenção corretos.
- Completar contratos de catálogo, promoções, links e denúncias.
- Remover estado que anuncia um fluxo inexistente.

Não há migração de dados: o banco de desenvolvimento permanece descartável e
shopping continua com uma única migration fundacional.

## Decisões de domínio

### Compra e evento

PurchaseEvent.Kind.CORRECTED será removido. Não existe correção de linhas:
uma correção material é um estorno seguido de uma nova compra. Os únicos
eventos são CREATED e VOIDED.

void_purchase(actor, purchase, reason) aceita o participante que registrou
a compra, ou um administrador no fluxo administrativo. Em ambos os casos,
voided_by e PurchaseEvent.changed_by recebem o ator real; purchase.user
continua sendo o comprador registrado. Estorno exige motivo não vazio.

O admin apresenta a compra e suas linhas como leitura, com a ação explícita
“Estornar compra”. A ação confirma motivo, chama o serviço transacional e não
oferece edição ou exclusão de compra, linha ou evento.

### Sync

Uma SyncOperation é criada e recebe o status retornado por
apply_sync_operation na mesma transação. Conflito de versão fica
persistido como CONFLICT; replay do mesmo client_operation_id devolve o
status previamente persistido e não reaplica mudanças.

### Catálogo, preço e moderação

Mercados, produtos e promoções são leitura para usuários autenticados e
escrita somente para administradores. Observações de preço podem ser criadas
por usuários autenticados, mas alterar, invalidar ou apagar uma observação é
operação administrativa.

Denúncias podem ser criadas por usuário autenticado. Somente administradores
podem listar, consultar ou resolver denúncias; resolver preenche
automaticamente autor e data. Links compartilhados só podem ser vistos e
revogados pelo seu criador.

Promotion.clean() volta a garantir que uma filial informada pertence à rede
informada. O serializer chama essa validação. ListItemSerializer aceita um
product_id opcional para associar catálogo ao item da lista.

ShareLink.location precisa ser um objeto JSON não vazio quando for o alvo.
O serializer e a validação de modelo rejeitam {}, listas e valores escalares.

### Invariantes de lista

Criação, transferência de posse e fluxo administrativo continuam sendo os
únicos caminhos de escrita para ShoppingList.owner; todos garantem
ListMembership do dono. A remoção do membro dono continua bloqueada.
Operações sobre item, inclusive exclusão, rejeitam listas arquivadas.

## Admin

- Lista: dono, participantes somente leitura, itens no contexto e ação
  “Registrar compra”.
- Compra: linhas e eventos somente leitura; estorno com motivo.
- Relatórios: filtros por estado e ação de resolver; alvo e relato imutáveis.
- Catálogo: busca e filtros para mercado, produto, preço e promoção; a
  validação de promoção aparece no formulário.
- Sync, links, eventos e mudanças de posse: inspeção somente leitura.
- Dashboard: total diário derivado de linhas de compras não estornadas.

## Critérios de aceite

- Não há referência a CORRECTED.
- Estorno administrativo cria exatamente um evento VOIDED, preserva ator e
  motivo e torna a compra inelegível para totais.
- Conflito de sync persiste como CONFLICT e replay não muda o agregado.
- Usuário comum não cria nem altera catálogo/promoção, nem lê ou resolve
  denúncias de terceiros.
- Promoção de rede+filial inválida e localização vazia são rejeitadas.
- API permite associar e remover produto de item; item arquivado não é
  alterado nem apagado.
- O admin cobre criação de lista, registro de compra, estorno e resolução de
  denúncia sem edição direta de registros imutáveis.
- Testes, makemigrations --check, compileall e git diff --check passam.
