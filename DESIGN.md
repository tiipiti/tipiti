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
celular enquanto se planeja o mês ou se empurra o carrinho. A tela deve ocupar
o espaço com informação útil: lista atual, itens pendentes, itens comprados e
consumo mensal, sem o vazio de um dashboard SaaS.

O sistema rejeita cartões macios, transparência, gradientes, sombras nebulosas,
ícones de biblioteca modernos e interfaces que parecem uma planilha sem
hierarquia. Cada área é uma caixa ou linha de tabela deliberada, com tinta
preta, blocos de cor chapada e resposta física ao toque.

**Key Characteristics:**

- Bordas pretas grossas e grades retas, nunca contornos sutis.
- Informação financeira em blocos de leitura rápida, não em cards genéricos.
- Pixel art funcional para compra, moeda e carrinho.
- Estado comprado explícito por texto, ícone e risco, nunca apenas por cor.

## Colors

A paleta é limitada, impressa e de contraste agressivo. Cor é sempre estado ou
ação, nunca enfeite.

### Primary

- **Verde de confirmação:** usado em criar, salvar, marcar como comprado e no
  total de compra concluída.

### Secondary

- **Amarelo de atenção:** usado para consumo mensal e avisos que pedem leitura.

### Tertiary

- **Laranja de ação irreversível:** usado para finalizar compra e excluir item.

### Neutral

- **Papel de mercado:** fundo de página, inputs e superfícies de leitura.
- **Tinta preta:** texto, borda, divisória, sombra rígida e foco.
- **Cinza comprado:** fundo de linha finalizada, combinado com rótulo textual.

**The Ink Rule.** Todo contêiner, campo e botão tem borda preta sólida de 4px.
Não existe borda cinza, transparente ou com menos de 3px.

## Typography

**Display Font:** Impact ou Arial Black.
**Body Font:** Courier New.
**Label/Mono Font:** Courier New.

**Character:** títulos e dinheiro gritam como cabeçalhos de encarte; produtos,
quantidades e datas parecem saída de terminal. Somente títulos e totais usam a
fonte pesada.

### Hierarchy

- **Display** (900, 32px, 0.95): título da lista e total mensal, sempre em
  caixa alta.
- **Headline** (900, 24px, 1): cabeçalhos de seção, como LISTA ATUAL.
- **Title** (700, 18px, 1.1): nome de item ou lista.
- **Body** (700, 16px, 1.35): produto, preço, quantidade e mensagens.
- **Label** (700, 12px, 0.08em, maiúsculas): títulos de coluna e campos.

**The Receipt Rule.** Dados de compra usam monoespaçada. Não usar display em
botões, campos ou linhas da tabela.

## Elevation

Não há sombra suave. Profundidade é uma impressão deslocada: o elemento parece
ter sido carimbado sobre o papel.

### Shadow Vocabulary

- **Carimbo ativo** (`box-shadow: 6px 6px 0 #000000`): botões e painéis de
  resumo em repouso.
- **Carimbo pressionado** (`box-shadow: 0 0 0 #000000; transform: translate(6px, 6px)`):
  estado `:active`.

**The Hard Shadow Rule.** `blur` é proibido. Se uma sombra parecer macia, ela
está errada.

## Components

### Buttons

- **Shape:** retângulo quadrado (0px), borda preta de 4px e sombra rígida.
- **Primary:** verde de confirmação, texto preto, mínimo de 44px de altura.
- **Warning:** laranja de segurança para finalizar e excluir, sempre com texto
  explícito da consequência.
- **Hover / Focus:** sem brilho; foco é contorno preto deslocado. No toque, o
  botão ocupa a posição da própria sombra.

### Cards / Containers

- **Corner Style:** quadrado (0px).
- **Background:** papel para leitura, amarelo para consumo mensal, verde para
  totais concluídos.
- **Shadow Strategy:** somente sombra rígida de 6px quando a caixa for uma
  ação ou resumo financeiro.
- **Border:** preto sólido de 4px.
- **Internal Padding:** 20px em mobile, 28px em painéis de resumo.

### Inputs / Fields

- **Style:** papel, borda preta de 4px, tipografia mono e altura mínima de
  48px.
- **Focus:** contorno preto de 4px com deslocamento externo, sem `ring` suave.
- **Error / Disabled:** erro usa laranja e texto; desabilitado mantém borda e
  reduz apenas a saturação, não a legibilidade.

### Navigation

- **Style:** faixa superior de 4px, links mono sublinhados e uma área de
  retorno sempre no topo esquerdo.
- **Mobile:** uma coluna. O dashboard mensal fica antes da lista e as ações
  permanecem visíveis sem menu oculto.

### Lista e dashboard mensal

- **Nome da lista:** ao criar, pedir o nome antes de abrir a compra. Não criar
  outra lista chamada “Nova lista” sem confirmação. O título fica no cabeçalho
  de forma editável.
- **Dashboard mensal:** no topo da Home, um painel amarelo mostra `CONSUMO DO
  MÊS`, a soma de listas finalizadas no mês atual e o número de compras
  concluídas. Sem orçamento definido, não inventar meta ou porcentagem.
- **Tabela de itens:** cabeçalho fixo com `ITEM`, `QTD`, `PREÇO` e `STATUS`.
  Divisórias pretas de 3px separam cada linha.
- **Compra concluída:** caixa pixelada e texto `COMPRADO`; linha recebe cinza,
  nome riscado e continua acessível por contraste e texto.
- **Pixel art:** carrinho, moeda e marca de comprado são SVGs 8-bit próprios,
  com pixels grandes, `shape-rendering: crispEdges` e no máximo três cores.
  Não usar Lucide, Material Icons ou emoji.

## Do's and Don'ts

### Do:

- **Do** usar papel, tinta preta, verde, amarelo e laranja nas funções
  documentadas, com borda preta de 4px.
- **Do** mostrar consumo mensal como total de listas finalizadas, antes do
  histórico detalhado.
- **Do** pedir e exibir nome da lista de forma permanente.
- **Do** comunicar item comprado com texto, ícone pixelado, risco e cor.
- **Do** respeitar teclado, foco visível e `prefers-reduced-motion`.

### Don't:

- **Don't** usar cartões SaaS genéricos, telas minimalistas vazias ou uma
  planilha sem hierarquia.
- **Don't** usar superfícies translúcidas, `backdrop-blur`, gradientes ou
  sombras difusas.
- **Don't** usar bordas arredondadas suaves, bordas cinza ou raio acima de 0px.
- **Don't** usar ícones modernos de biblioteca, emoji ou pixel art com
  anti-aliasing.
- **Don't** indicar compra somente com verde ou somente com texto riscado.
