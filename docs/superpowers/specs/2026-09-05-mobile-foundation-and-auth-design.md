# Fundação e autenticação do app mobile

## Objetivo

Substituir o backend Django por um aplicativo Expo para Android e iOS, usando
Supabase para autenticação e dados. Esta spec cobre somente inicialização,
roteamento e sessão.

## Decisões

- Expo com TypeScript e Expo Router.
- Supabase é acessado diretamente pelo app; não haverá API própria.
- O cliente Supabase usa `AsyncStorage` para persistir e restaurar a sessão.
- O único método de entrada é Magic Link por e-mail.
- O redirecionamento do e-mail usa `tipiti://auth/callback` e o app conclui a
  sessão nessa rota.

## Rotas

- `/login`: e-mail, envio do Magic Link e estado de envio/erro.
- `/auth/callback`: recebe o deep link e deixa o cliente Supabase estabelecer a
  sessão.
- `/(tabs)/home`, `/(tabs)/history` e `/list/[id]`: exigem sessão autenticada.

O layout raiz espera a recuperação inicial da sessão. Sem sessão, direciona
para `/login`; com sessão, para `/(tabs)/home`. Links de autenticação não
devem expor as tabs enquanto a sessão estiver ausente.

## Configuração necessária

- O esquema `tipiti` precisa ser registrado no Expo e nos provedores Android e
  iOS para abrir links do e-mail.
- A URL de redirecionamento precisa estar permitida no Supabase Auth.
- URL e chave pública anon do Supabase ficam em variáveis `EXPO_PUBLIC_*`; não
  há chave de serviço no aplicativo.

## Não escopo

Senha, cadastro por senha, OAuth, recuperação de senha, backend próprio,
notificações e funcionamento offline.

## Critérios de aceite

- O mesmo build abre no Android e no iOS.
- Um e-mail válido solicita o Magic Link e mostra confirmação de envio.
- Abrir o link `tipiti://auth/callback` cria/restaura a sessão e leva ao início.
- Reiniciar o app com sessão persistida não mostra a tela de login.
- Sem sessão, nenhuma rota de lista, histórico ou compra fica acessível.
