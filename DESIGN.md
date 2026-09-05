---
name: Tipiti
description: Lista de mercado mensal em neo-brutalismo pixelado.
colors:
  paper: "#F4F0EB"
  ink: "#000000"
  neon-green: "#39FF14"
  electric-yellow: "#FFFF00"
  safety-orange: "#FF5F1F"
  bought-gray: "#D6D0C8"
typography:
  display:
    fontFamily: "Impact, Arial Black, sans-serif"
    fontSize: "32px"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "0.02em"
  body:
    fontFamily: "Courier New, monospace"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.35
  label:
    fontFamily: "Courier New, monospace"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  none: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "28px"
components:
  button-primary:
    backgroundColor: "{colors.neon-green}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  button-warning:
    backgroundColor: "{colors.safety-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px"
---

# Design System: Tipiti

## Overview

**Creative North Star: "Manual de Mercado de Fliperama"**

Tipiti parece uma folha de controle de compra impressa, marcada à mão e
transformada em tela de fliperama de bairro. É um produto doméstico, usado no
celular enquanto se planeja o mês ou se empurra o carrinho no supermercado. A tela ocupa
o espaço com informação útil: lista atual, itens pendentes, itens comprados,
linha do tempo e consumo mensal, sem o vazio estéril de um dashboard SaaS.

O sistema rejeita terminantemente cantos arredondados, transparências, gradientes, sombras nebulosas,
ícones de bibliotecas modernas (como Lucide, FontAwesome ou Heroicons), emojis e interfaces que parecem uma planilha sem
hierarquia. Cada elemento é uma caixa ou linha deliberada, com tinta
preta, blocos de cor chapada e resposta física ao toque.

**Key Characteristics:**

- Bordas pretas grossas (4px sólida) e grades retas (`border-radius: 0px` absoluto).
- Informação financeira e resumos em blocos de leitura rápida (painéis destacados).
- Pixel art funcional para compra, moeda, carrinho e checagem.
- Estado comprado explícito por texto, ícone, fundo cinza e risco, nunca apenas por cor.
- Modais e diálogos customizados em neo-brutalismo (sem usar `window.confirm` ou alertas nativos do navegador).

---

## Colors

A paleta é limitada, impressa e de contraste agressivo. Cor é sempre estado ou
ação, nunca mero enfeite.

### Primary
- **Verde de confirmação (`#39FF14`):** usado em botões de salvar, criar lista, adicionar item, marcar como comprado e no total de compra concluída.

### Secondary
- **Amarelo de atenção (`#FFFF00`):** usado para o banner de consumo mensal, avisos importantes e barras de histórico do mês atual.

### Tertiary
- **Laranja de ação irreversível (`#FF5F1F`):** usado para finalizar compra, excluir item/lista e botões de perigo em modais.

### Neutral
- **Papel de mercado (`#F4F0EB`):** fundo de página, inputs e superfícies neutras de leitura.
- **Tinta preta (`#000000`):** tipografia, bordas estruturais de 4px, divisórias, sombras rígidas e contornos de foco.
- **Cinza comprado (`#D6D0C8`):** fundo de linha finalizada, combinado com rótulo textual e risco.

> **The Ink Rule:** Todo contêiner, campo, painel e botão tem borda preta sólida de 4px (`border: 4px solid #000000`). Não existe borda cinza, translúcida ou com menos de 3px. `border-radius: 0px` em tudo.

---

## Typography

- **Display Font:** `Impact, Arial Black, sans-serif`
- **Body Font:** `Courier New, monospace`
- **Label/Mono Font:** `Courier New, monospace`

**Character:** Títulos e dinheiro gritam como cabeçalhos de encarte promocional de mercado; produtos, quantidades, status e datas parecem saída de cupom fiscal em terminal. Somente títulos principais e totais financeiros usam a fonte display pesada.

### Hierarchy
- **Display** (900, 32px, 0.95): títulos de página e totais mensais/da lista. Sempre em caixa alta.
- **Headline** (900, 24px, 1.0): cabeçalhos de seção (ex: `LISTA ATUAL`, `CONSUMO DO MÊS`).
- **Title** (700, 18px, 1.1): nomes de listas e itens no formulário.
- **Body** (700, 16px, 1.35): produto, preço, quantidade, botões e mensagens informativas.
- **Label** (700, 12px, 0.08em, maiúsculas): títulos de coluna, tags e rótulos de campos.

> **The Receipt Rule:** Dados de compra, inputs e tabelas usam monoespaçada (`Courier New`). Não usar fontes decorativas ou display em campos ou dados de tabelas.

---

## Elevation & Motion

Não há sombras suaves nem `blur`. Profundidade é representada como uma impressão deslocada: o elemento parece ter sido carimbado sobre o papel.

### Shadow Vocabulary
- **Carimbo ativo em repouso:** `box-shadow: 6px 6px 0 #000000` (ou `4px 4px 0 #000000` em itens menores).
- **Carimbo pressionado (`:active`):** `box-shadow: 0 0 0 #000000; transform: translate(6px, 6px);` (o elemento afunda no exato espaço de sua sombra).
- **Transição:** Rápida e mecânica (`transition: transform 100ms ease-out, box-shadow 100ms ease-out`).

> **The Hard Shadow Rule:** Sombras com desfoque (`blur`) são estritamente proibidas. Se uma sombra tiver gradiente ou difusão, ela viola o design system.

---

## Components & Patterns

### 1. Botões
- **Formato:** Retângulo rígido (`rounded-none`), borda preta de 4px e sombra rígida.
- **Primário:** Verde de confirmação (`#39FF14`), texto preto, altura mínima de 44px.
- **Perigo/Warning:** Laranja de segurança (`#FF5F1F`), texto preto, para finalizações e exclusões.
- **Secundário/Neutro:** Fundo amarelo (`#FFFF00`) ou papel (`#F4F0EB`) com borda preta.
- **Toque:** Ao clicar/pressionar, desloca 6px para baixo e para a direita, eliminando a sombra.

### 2. Painéis e Containers
- Fundo papel (`#F4F0EB`), amarelo (`#FFFF00`) ou verde (`#39FF14`) dependendo do propósito semântico.
- Borda preta de 4px e sombra rígida de 6px quando o container representar uma ação ou resumo financeiro.
- `rounded-none` (0px) em todos os cantos.

### 3. Inputs e Formulários
- Fundo papel (`#F4F0EB`), borda de 4px preta, tipografia mono (`Courier New`) e altura mínima de 48px.
- **Foco visível:** `outline: 4px solid #000000; outline-offset: 3px;` sem halo azul ou sombras suaves.
- **Limites de Entrada Rígidos:**
  - Nome de lista / produto: Máximo de 100 caracteres.
  - Apelido / Nickname: Máximo de 50 caracteres.
  - E-mail: Máximo de 254 caracteres.
  - Senha: Máximo de 72 caracteres.
  - Quantidade: Máximo de 99.999 (com suporte a decimais para peso/kg).
  - Preço unitário: Máximo de R$ 999.999,99.

### 4. Modais de Confirmação (`ConfirmModal`)
- É expressamente proibido usar `window.confirm` ou `window.alert` nativos do browser.
- Todo diálogo crítico de confirmação (como finalizar compra ou excluir item) utiliza o componente neo-brutalista com:
  - Overlay escuro semi-sólido (`bg-black/60`).
  - Caixa central com borda de 4px preta, sombra rígida de 8px e fundo papel/amarelo/laranja.
  - Botão de confirmação em laranja `#FF5F1F` ou verde `#39FF14` e botão de cancelamento neutro.

### 5. Gráficos & Linha do Tempo (`Recharts`)
- O consumo mensal expansível no Dashboard utiliza gráficos estilizados sob o neo-brutalismo:
  - Barras com contorno preto grosso de 3px a 4px e `radius={0}`.
  - Fundo amarelo elétrico `#FFFF00` para meses anteriores e laranja `#FF5F1F` para o mês corrente.
  - Grade e eixos desenhados com linha preta pura `#000000`.
  - Tooltips customizados no formato de etiqueta impressa: caixa branca/papel com borda preta de 4px e sombra rígida.

### 6. Pixel Art & Ícones
- Ícones de interface (carrinho, moeda, check de comprado, lixeira) devem ser SVGs pixelados nativos com `shape-rendering="crispEdges"`.
- Máximo de 2 a 3 cores chapadas por ícone.
- Não utilizar bibliotecas externas de ícones vetoriais modernos (Lucide, Heroicons, Material Icons) nem emojis em elementos de interface.

---

## Do's and Don'ts

### Do:
- **Do** manter borda preta sólida de 4px em botões, campos e painéis.
- **Do** manter `border-radius: 0px` absoluto em toda a aplicação.
- **Do** exibir total da compra no cabeçalho ou rodapé fixo de forma imediata durante o uso.
- **Do** comunicar item comprado de 4 formas simultâneas: texto `COMPRADO`, ícone pixelado, risco no nome e fundo cinza.
- **Do** usar o componente `ConfirmModal` para ações destrutivas ou definitivas.
- **Do** garantir navegação por teclado e foco visível em todos os controles.

### Don't:
- **Don't** usar cantos arredondados (`rounded-md`, `rounded-full`, etc.).
- **Don't** usar sombras com blur (`box-shadow: 0 4px 6px rgba(...)`).
- **Don't** usar gradientes, transparências de vidro (`backdrop-blur`) ou cartões SaaS minimalistas.
- **Don't** usar `window.confirm()` ou diálogos nativos do sistema operacional.
- **Don't** importar ícones vetoriais genéricos ou usar emojis coloridos nos fluxos de compra.
- **Don't** indicar o status de comprado apenas com cor verde.
