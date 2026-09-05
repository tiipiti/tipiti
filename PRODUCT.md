# Product: Tipiti

## Visão Geral

**Tipiti** é uma aplicação PWA progressiva de lista de mercado e controle financeiro doméstico com estética neo-brutalista pixelada ("Manual de Mercado de Fliperama"). 
Projetada para substituir a folha de papel e o bloco de notas do celular por uma experiência rápida, tátil e focada em resultados práticos no caixa do supermercado.

---

## Público-Alvo e Contexto de Uso

- **Usuários Principais:** Famílias, mães e filhos, casais ou moradores que dividem compras domésticas.
- **Ambiente de Uso Principal:**
  - **No supermercado:** Usado em pé, empurrando o carrinho de compras com uma mão e checando itens no celular com a outra. Exige botões grandes, contraste extremo sob luz artificial do mercado e feedback instantâneo ao adicionar ao carrinho.
  - **Em casa:** No planejamento prévio das compras do mês ou consulta rápida do quanto já foi gasto.
- **Principais Dores Resolvidas:**
  - Não saber o valor acumulado do carrinho até chegar ao caixa.
  - Esquecer itens essenciais recorrentes da última compra.
  - Perder o controle de quanto foi gasto no mês com alimentação e suprimentos domésticos.
  - Apps de lista genéricos que são complexos demais, cheios de menus ocultos ou lentos para atualizar no mercado.

---

## Pilares do Produto

1. **A compra atual em primeiro lugar:** A tela de compra não esconde a lista nem o total. O valor total atualiza imediatamente a cada item marcado como comprado ou alterado.
2. **Registro de compra, não apenas checklist:** Cada item suporta quantidade e preço unitário, permitindo calcular o valor real acumulado antes de passar no caixa.
3. **Agilidade com "Copiar Última Compra":** Como 80% dos itens de mercado são repetitivos mês a mês, o usuário pode duplicar os itens da última compra finalizada diretamente para a lista ativa atual com um único toque.
4. **Inteligência Financeira Descomplicada:** Painel de consumo mensal e linha do tempo histórica em gráficos de barras que mostram o total gasto e a quantidade de listas finalizadas mês a mês sem criar orçamentos complexos ou desnecessários.
5. **Estética com Propósito:** Visual neo-brutalista de alta energia, com bordas pretas de 4px, sombras rígidas, botões com afundamento mecânico e ícones em pixel art que facilitam a leitura imediata sem distrações.

---

## Funcionalidades Principais Implementadas

### 1. Autenticação & Sessão Segura
- Login simplificado via **E-mail e Senha** ou link mágico sem senha (**Magic Link**) gerenciado pelo Supabase Auth.
- Proteção estrita de rotas com `SessionGate`: rotas de compra e dashboard redirecionam automaticamente para `/login` quando deslogado.
- Limites de validação de formulários: e-mail até 254 caracteres e senha até 72 caracteres (compatível com bcrypt).

### 2. Gestão da Lista Ativa
- Criação explícita de lista com nome obrigatório (limite de 100 caracteres).
- Adição rápida de itens com campos de nome (até 100 caracteres), quantidade (até 99.999) e preço (até R$ 999.999,99).
- Cálculo automático de subtotais e valor total da lista em tempo real.
- Exclusão de itens protegida por modal neo-brutalista customizado (`ConfirmModal`), impedindo exclusões acidentais com as mãos ocupadas.

### 3. Modo de Compra no Mercado ("No Carrinho")
- Alternância rápida com um clique para marcar o item como **COMPRADO**.
- Feedback visual quádruplo: fundo cinza comprado, risco no texto, badge explicativa e ícone pixelado de verificação.
- Somatório do carrinho calculado com precisão.

### 4. Recorrência ("Copiar Última Compra")
- Identifica a compra finalizada mais recente e clona todos os seus itens para a lista em andamento, mantendo o histórico intacto e poupando tempo de digitação.

### 5. Consumo Mensal e Linha do Tempo (Dashboard)
- Banner amarelo em destaque na página inicial exibindo:
  - Total gasto no mês corrente.
  - Quantidade de listas concluídas.
- Expansão interativa da **Linha do Tempo**:
  - Gráfico de barras neo-brutalista estilizado com Recharts (bordas pretas, barras amarelas e laranja para o mês atual).
  - Listagem dos últimos meses com valores e quantidades para rápida comparação financeira.

### 6. Arquitetura Híbrida & Escalabilidade
- **Supabase PostgreSQL + RLS (Row Level Security):** Segurança a nível de linha garantindo que cada usuário só acesse e modifique seus próprios dados.
- **Prisma ORM & Vercel Serverless:** Camada ORM pronta com suporte a paginação de 20 em 20 itens para listas e compras volumosas.

---

## Princípios de Design & Anti-referências

- **Anti-referências:** Dashboards corporativos SaaS monocromáticos, planilhas sem hierarquia visual, interfaces arredondadas e translúcidas (`glassmorphism`), sombras borradas (`blur`), ícones genéricos e emojis no lugar de arte funcional.
- **Acessibilidade:** Navegação completa por teclado, foco visível com contorno preto deslocado, contraste agressivo de cores e compatibilidade com `prefers-reduced-motion`.
