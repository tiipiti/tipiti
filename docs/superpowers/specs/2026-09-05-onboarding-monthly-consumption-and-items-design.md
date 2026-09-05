# Onboarding, consumo mensal e itens

## Objetivo

Permitir que qualquer pessoa crie sua conta e comece uma lista sem treinamento,
preservando listas privadas por usuário. A Home deve mostrar o gasto real do
mês, comparado ao mês anterior. O cadastro de itens deve ser rápido no celular.

## Cadastro e acesso

- A tela pública pede somente e-mail. `signInWithOtp` cria a conta no primeiro
  acesso e envia o link de entrada nos seguintes.
- Depois do envio, a tela confirma o endereço e explica: abrir o e-mail e tocar
  no link. Há ações para corrigir o e-mail e reenviar o link.
- Mensagens do Supabase são traduzidas para linguagem simples. Limite de e-mail
  informa para aguardar antes de tentar de novo.
- O botão de sessão anônima de teste sai da tela pública. Sessões existentes
  continuam funcionando até expirarem.
- As políticas RLS existentes mantêm cada usuário restrito às próprias listas
  e itens.

## Consumo mensal

- A Home mostra, antes das listas ativas, um único painel `CONSUMO DO MÊS`.
- O total é a soma de `quantidade × preço unitário` dos itens marcados como
  comprados em listas finalizadas no mês corrente.
- Também mostra o número de compras finalizadas e a diferença absoluta contra
  o mês anterior: `R$ X A MAIS`, `R$ X A MENOS` ou `IGUAL AO MÊS PASSADO`.
- Meses sem compras valem R$ 0,00. Não há limite, orçamento, gráfico ou meta.
- A data de referência é `archived_at`, que já representa a finalização da
  compra. Nenhuma nova tabela é necessária.

## Cadastro e compra de itens

- A lista recebe o nome antes de ser criada; não há nova lista com o título
  automático `Nova lista`.
- O campo principal aceita somente o nome do produto. Ao adicionar com sucesso,
  limpa e recebe foco novamente.
- Cada linha expõe quantidade e preço unitário em edição direta, com validação
  Zod e React Hook Form. O preço começa em R$ 0,00 para não inventar gasto.
- A linha tem controle pixelado com texto `COMPRADO` ou `PENDENTE`. Marcar
  comprado atualiza imediatamente o total mostrado e usa texto, ícone, risco e
  fundo, nunca somente cor.
- Finalizar uma lista não cria dados adicionais: o consumo futuro é calculado
  dos itens comprados daquela lista.

## Interface e acessibilidade

- Aplicar `DESIGN.md`: papel, tinta, bordas de 4px, sombras rígidas, tipografia
  display somente em títulos e valores, e SVGs pixelados próprios.
- Home e lista usam uma coluna no celular, divisórias de tabela e ações com ao
  menos 44px de altura.
- Todos os controles têm rótulo, foco visível, estados de carregamento/erro e
  funcionamento por teclado. Respeitar `prefers-reduced-motion`.

## Testes

- Testar o cálculo do mês atual, mês anterior e ausência de compras.
- Testar o envio do e-mail, erro de limite e remoção do acesso anônimo público.
- Testar que adicionar item limpa e devolve foco ao campo, e que o estado
  comprado é anunciado e atualiza o total.
