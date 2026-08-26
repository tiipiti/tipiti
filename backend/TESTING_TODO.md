# TODO de cobertura de testes

Escopo: funções, serviços, serializers, autenticação e endpoints. `models.py`,
`migrations/`, admin e arquivos de configuração não são alvos de teste direto.

## accounts

- [x] `AccountLifecycleService`: perfil, token, reenvio e exclusão (unitário com mocks).
- [ ] `GoogleAuthService` e `FacebookAuthService`: identidade válida, e-mail não verificado e conflito.
- [ ] `build_export_payload`: perfil e identidade presentes/ausentes.
- [x] autenticação de sessão: chave de cache e invalidação.
- [ ] serializers de cadastro, senha e perfil: entradas inválidas e atualização de mídia.
- [x] integração: `GET /api/auth/me/` autenticado.
- [ ] integração: cadastro, login/refresh/logout, senha, exclusão, termos e verificação de e-mail.

## shopping

- [x] serviços: membership, owner, lista ativa, criação de lista e conflito de sync.
- [ ] `create_invite`, `accept_invite`, `finalize_purchase` e `apply_sync_operation` confirmado: todos os ramos.
- [ ] serializers: preço calculado, datas futuras, mercado/produto inexistente e payload de sync.
- [x] integração: compras listadas somente para o proprietário autenticado.
- [ ] integração: listas, itens, mercados, catálogo, preços, promoções, convites, links, denúncias e sync.

## notifications

- [x] serviço: criar, marcar uma e marcar todas como lidas (unitário com mocks).
- [x] integração: listar apenas notificações não lidas e marcar como lida.

## core

- [x] validação de URLs, URL pública de mídia e normalização de erros.
- [ ] `validate_image_upload`: tipo, tamanho, SVG, arquivo corrompido e imagem válida.
- [ ] `ImageService`: criptografia, fallback, storage e substituição de campo.
- [ ] throttles, mixins de viewset e `serve_user_media`.
- [ ] integração: acesso autenticado à mídia própria e rejeição de mídia de outro usuário.
