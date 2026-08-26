# Tipiti — Design System

> Guia visual e de interface para o aplicativo mobile **Tipiti**.
>
> O produto permite criar listas de mercado, registrar preços, compartilhar ofertas entre usuários e acompanhar gastos mensais.

## 1. Direção visual

O Tipiti deve transmitir:

- organização e simplicidade;
- proximidade com a realidade amazônica;
- colaboração entre pessoas;
- economia doméstica sem aparência de aplicativo bancário;
- referências à fauna, flora e grafismos amazônicos de forma abstrata e discreta.

A interface deve ser clara, leve e funcional. Elementos culturais não devem ser usados como ornamento genérico ou imitação direta de grafismos de um povo específico sem pesquisa, contexto e autorização.

### Princípios

1. **Conteúdo primeiro:** listas, preços e valores gastos têm prioridade visual.
2. **Poucas ações por tela:** uma ação principal evidente por contexto.
3. **Informação comparável:** preço, mercado, unidade e data devem aparecer juntos.
4. **Visual regional discreto:** referências amazônicas ficam em ilustrações, padrões de fundo e detalhes, não competindo com dados.
5. **Cores claras com contraste real:** aparência suave sem comprometer legibilidade.

---

## 2. Identidade da marca

### Nome

Usar preferencialmente em caixa baixa:

```text
tipiti
```

### Personalidade visual

- orgânica;
- acolhedora;
- contemporânea;
- comunitária;
- confiável;
- regional sem estereótipos.

### Assinatura sugerida

```text
Compras, preços e economia compartilhada.
```

### Logotipo

- Tipografia serifada de baixo contraste ou serifada contemporânea.
- Cor padrão: `brand.900`.
- Pode receber um pequeno detalhe de folha ou losango, sem comprometer a leitura.
- Não combinar o nome com mais de dois elementos ilustrativos.

---

## 3. Paleta de cores

A paleta abaixo deriva da tela de login criada. O verde principal de interação foi ligeiramente escurecido para garantir contraste adequado com texto branco.

### Cores da marca

| Token | Hex | Uso |
|---|---:|---|
| `brand.900` | `#2C3A2A` | títulos, logotipo, texto de alto destaque |
| `brand.700` | `#5D6551` | texto secundário, ícones e links discretos |
| `brand.600` | `#68785F` | botões principais e estados selecionados |
| `brand.500` | `#7F8D76` | elementos visuais, gráficos e ilustrações |
| `brand.300` | `#BCBEA2` | chips, divisores decorativos e estados suaves |
| `brand.100` | `#D5E1D8` | fundos selecionados, cards informativos e destaques leves |

### Superfícies

| Token | Hex | Uso |
|---|---:|---|
| `surface.canvas` | `#FDF9F3` | fundo principal das telas |
| `surface.subtle` | `#FAF4EA` | blocos alternativos e áreas ilustradas |
| `surface.card` | `#FFFFFF` | cards, modais, inputs e bottom sheets |
| `surface.sand` | `#EEE0C7` | padrões, divisores e fundos decorativos |

### Acentos

| Token | Hex | Uso |
|---|---:|---|
| `accent.terracotta` | `#C27B51` | promoções, marcadores e ilustrações |
| `accent.aqua` | `#DCEBE5` | referência a rios, comparações e gráficos leves |
| `accent.yellow` | `#D6A342` | economia, estrelas e pequenos destaques |
| `accent.olive` | `#99A084` | vegetação, badges e elementos secundários |

### Cores semânticas

| Token | Hex | Uso |
|---|---:|---|
| `success` | `#3F7654` | economia confirmada, item concluído |
| `warning` | `#A96F2B` | preço desatualizado, atenção |
| `error` | `#A94F47` | erro, exclusão e validação inválida |
| `info` | `#4E7480` | informação neutra e sincronização |

### Texto

| Token | Hex | Uso |
|---|---:|---|
| `text.primary` | `#2C3A2A` | títulos e corpo principal |
| `text.secondary` | `#5D6551` | descrições e metadados |
| `text.muted` | `#7B7E73` | placeholders e informações de baixa prioridade |
| `text.inverse` | `#FFFFFF` | texto sobre fundos escuros |
| `text.disabled` | `#A8AAA2` | controles desabilitados |

### Regras de contraste

- Texto normal deve atingir contraste mínimo WCAG AA de `4.5:1`.
- `#FFFFFF` sobre `brand.600` possui contraste suficiente para botões comuns.
- `brand.500` deve ser usado principalmente em elementos visuais; com texto branco, reservar para texto grande.
- `accent.terracotta` não deve ser usado para corpo de texto sobre fundos claros.
- Nunca comunicar erro, sucesso ou economia apenas pela cor; usar texto e ícone.

---

## 4. Tipografia

### Família principal

```text
Inter
```

Usar em toda a interface por legibilidade, suporte amplo e boa renderização em Android e iOS.

### Família de marca e títulos especiais

```text
Fraunces
```

Usar apenas em:

- logotipo;
- splash screen;
- títulos editoriais ou institucionais;
- números de destaque em campanhas específicas.

Não usar Fraunces em listas, preços ou formulários.

### Escala tipográfica

| Token | Tamanho | Altura de linha | Peso | Uso |
|---|---:|---:|---:|---|
| `display` | 40 px | 48 px | 500 | marca e splash |
| `heading.1` | 28 px | 34 px | 700 | título principal da tela |
| `heading.2` | 22 px | 28 px | 700 | títulos de seção |
| `heading.3` | 18 px | 24 px | 600 | títulos de cards |
| `body.large` | 17 px | 24 px | 400 | textos importantes |
| `body` | 15 px | 22 px | 400 | conteúdo padrão |
| `label` | 14 px | 20 px | 600 | botões, campos e filtros |
| `caption` | 12 px | 16 px | 500 | data, mercado e metadados |

### Valores monetários

- Usar números tabulares quando disponíveis: `font-variant-numeric: tabular-nums`.
- Usar vírgula decimal e símbolo monetário brasileiro: `R$ 12,90`.
- Não esconder centavos em comparações de preços.

---

## 5. Grid, espaçamento e dimensões

### Unidade base

```text
4 px
```

### Escala de espaçamento

| Token | Valor |
|---|---:|
| `space.1` | 4 px |
| `space.2` | 8 px |
| `space.3` | 12 px |
| `space.4` | 16 px |
| `space.5` | 20 px |
| `space.6` | 24 px |
| `space.8` | 32 px |
| `space.10` | 40 px |
| `space.12` | 48 px |

### Layout de tela

- Padding horizontal padrão: `24 px`.
- Padding horizontal compacto: `16 px`.
- Distância entre seções: `32 px`.
- Distância entre título e conteúdo: `16 px`.
- Largura máxima de conteúdo em tablets: `720 px`.
- Respeitar as safe areas do sistema operacional.

### Alvos de toque

- Área mínima: `44 × 44 px` no iOS.
- Área recomendada: `48 × 48 px` no Android.
- Distância mínima entre ações destrutivas e ações principais: `8 px`.

---

## 6. Bordas, raios e sombras

### Raios

| Token | Valor | Uso |
|---|---:|---|
| `radius.sm` | 8 px | tags pequenas e elementos internos |
| `radius.md` | 14 px | inputs e botões |
| `radius.lg` | 20 px | cards e blocos de resumo |
| `radius.xl` | 28 px | bottom sheets e modais grandes |
| `radius.pill` | 999 px | chips, filtros e badges |

### Bordas

```text
1 px solid #DDD8CF
```

Estados:

- foco: `2 px solid #68785F`;
- erro: `2 px solid #A94F47`;
- desabilitado: `1 px solid #E7E3DC`.

### Sombras

```css
--shadow-sm: 0 2px 8px rgba(44, 58, 42, 0.06);
--shadow-md: 0 8px 24px rgba(44, 58, 42, 0.10);
--shadow-lg: 0 16px 40px rgba(44, 58, 42, 0.14);
```

Não usar sombras fortes em todas as superfícies. Cards em listas podem usar apenas borda.

---

## 7. Iconografia

### Estilo

- traço arredondado;
- espessura visual entre `1.75 px` e `2 px`;
- ícones simples, sem preenchimento excessivo;
- tamanho padrão: `24 px`;
- tamanho compacto: `20 px`;
- tamanho de destaque: `32 px`.

### Biblioteca recomendada

```text
Lucide Icons
```

### Ícones principais

| Contexto | Ícone sugerido |
|---|---|
| Início | `House` |
| Lista | `ListChecks` |
| Ofertas | `Tags` |
| Gastos | `ChartNoAxesCombined` |
| Perfil | `UserRound` |
| Mercado | `Store` |
| Preço | `CircleDollarSign` |
| Compartilhar | `Share2` |
| Adicionar | `Plus` |
| Produto concluído | `Check` |
| Localização | `MapPin` |
| Data | `CalendarDays` |

---

## 8. Componentes principais

## 8.1 Botão primário

- Altura: `52 px`.
- Fundo: `brand.600`.
- Texto: `text.inverse`.
- Raio: `radius.md`.
- Peso do texto: `600`.
- Largura total por padrão.

Estados:

- pressionado: fundo `brand.900`;
- desabilitado: fundo `#D8DBD4`, texto `#8A8D85`;
- carregando: manter largura e exibir spinner sem alterar o rótulo abruptamente.

## 8.2 Botão secundário

- Fundo: `surface.card`.
- Borda: `1 px solid #D8D5CD`.
- Texto: `brand.900`.
- Pressionado: `surface.subtle`.

## 8.3 Botão textual

- Cor: `brand.700`.
- Sem fundo por padrão.
- Sublinhado apenas quando necessário para diferenciar links de texto comum.

## 8.4 Campo de entrada

- Altura mínima: `52 px`.
- Fundo: `surface.card`.
- Borda padrão: `#DDD8CF`.
- Raio: `radius.md`.
- Padding horizontal: `16 px`.
- Ícone opcional à esquerda: `20–24 px`.
- Label sempre visível em formulários importantes; placeholder não substitui label.

## 8.5 Card

- Fundo: `surface.card`.
- Raio: `radius.lg`.
- Padding: `16 px` ou `20 px`.
- Borda: `1 px solid #E7E2D9`.
- Sombra apenas em cards de destaque ou flutuantes.

## 8.6 Item da lista de compras

Estrutura:

```text
[checkbox] Produto                    [menu]
           quantidade/unidade
           menor preço · mercado
```

Regras:

- Nome do produto: `body.large`, peso `600`.
- Quantidade: `caption`, `text.secondary`.
- Preço: peso `700`, números tabulares.
- Produto concluído: reduzir ênfase e aplicar linha opcional no nome.
- Swipe pode revelar editar e excluir, mas essas ações também devem existir em menu acessível.

## 8.7 Badge de preço

Variações:

- **Melhor preço:** fundo `#E5F1E8`, texto `success`.
- **Preço antigo:** fundo `surface.subtle`, texto `text.secondary`.
- **Preço em alta:** fundo `#F7E8E5`, texto `error`.
- **Preço compartilhado:** fundo `accent.aqua`, texto `brand.900`.

Formato:

```text
R$ 8,49
```

## 8.8 Chip de mercado

Exemplo:

```text
Supermercado X · 2,4 km
```

- Raio: `radius.pill`.
- Fundo: `surface.subtle`.
- Ícone opcional: `Store` ou `MapPin`.
- Altura: `32–36 px`.

## 8.9 Resumo de gastos

Exibir:

- total do mês;
- comparação com mês anterior;
- economia estimada;
- categoria com maior gasto.

O total deve ser o elemento de maior destaque. Gráficos devem usar no máximo cinco cores da paleta.

## 8.10 Navegação inferior

Cinco destinos máximos:

1. Início
2. Listas
3. Ofertas
4. Gastos
5. Perfil

Regras:

- Altura aproximada: `72–80 px`, além da safe area.
- Item ativo: `brand.900` com fundo suave `brand.100` opcional.
- Item inativo: `text.muted`.
- Labels sempre visíveis.

## 8.11 Botão flutuante

Usar apenas em telas com uma ação de criação evidente:

- nova lista;
- novo item;
- registrar preço.

Não exibir junto com outro botão primário fixo de mesma função.

---

## 9. Grafismos, fauna e flora

### Grafismos

Usar padrões geométricos abstratos baseados em:

- losangos;
- linhas quebradas;
- repetições diagonais;
- tramas lineares;
- ondas e caminhos.

Aplicações permitidas:

- fundos com opacidade entre `4%` e `10%`;
- cabeçalhos ilustrados;
- empty states;
- splash screen;
- bordas decorativas pontuais.

Evitar:

- padrões atrás de textos longos;
- combinar mais de dois padrões na mesma tela;
- reproduzir grafismos identificáveis de povos específicos sem origem e autorização;
- usar cocares, rostos ou símbolos sagrados como decoração genérica.

### Fauna e flora

Referências possíveis:

- folhas largas e helicônias;
- palmeiras e açaizeiros;
- peixe estilizado;
- garça ou pássaro em silhueta;
- rio em formas curvas;
- frutos e sementes em ilustrações secundárias.

O estilo deve ser vetorial, simples, com poucas formas e sem realismo fotográfico.

---

## 10. Ilustrações

### Estilo

- formas orgânicas;
- contornos mínimos;
- textura muito leve;
- sem gradientes intensos;
- contraste reduzido em fundos;
- paleta limitada a `brand.300`, `brand.500`, `accent.terracotta`, `accent.aqua` e `surface.sand`.

### Uso por contexto

| Contexto | Ilustração sugerida |
|---|---|
| Lista vazia | cesta ou sacola com folhas discretas |
| Nenhuma oferta | etiqueta de preço e pequeno peixe abstrato |
| Gastos vazios | gráfico simples acompanhado de ramo ou semente |
| Sucesso | folhas e formas geométricas em expansão |
| Sem conexão | rio interrompido ou caminho fragmentado, sem tom alarmista |

---

## 11. Estados e feedback

### Carregamento

- Skeleton para listas e cards.
- Spinner apenas para ações curtas.
- Manter dimensões do conteúdo para evitar saltos de layout.

### Vazio

Todo empty state deve conter:

1. ilustração simples;
2. título objetivo;
3. explicação curta;
4. ação principal quando aplicável.

### Erro

- Explicar o que falhou.
- Preservar os dados digitados.
- Oferecer nova tentativa quando possível.
- Não usar apenas mensagens genéricas como “Algo deu errado”.

### Sucesso

- Confirmação curta por snackbar ou feedback inline.
- Não abrir modal para ações simples como concluir item.

---

## 12. Movimento

- Duração curta: `120 ms`.
- Duração padrão: `180 ms`.
- Duração de entrada de modal: `240 ms`.
- Curva sugerida: `cubic-bezier(0.2, 0, 0, 1)`.

Usar movimento para:

- confirmar conclusão de item;
- abrir bottom sheets;
- atualizar total da lista;
- transicionar entre estados de preço.

Respeitar a preferência de redução de movimento do sistema.

---

## 13. Acessibilidade

- Suportar aumento de fonte sem cortar textos.
- Não fixar altura de cards que contenham texto dinâmico.
- Associar labels aos campos.
- Informar estado de checkbox para leitores de tela.
- Formatar preço de forma legível por tecnologia assistiva.
- Garantir foco visível em web ou desktop.
- Evitar texto menor que `12 px`.
- Gráficos devem possuir resumo textual equivalente.
- Ações destrutivas exigem confirmação quando não puderem ser desfeitas.

---

## 14. Arquitetura inicial de telas

### Autenticação

1. Splash
2. Login
3. Cadastro
4. Recuperação de senha
5. Onboarding curto

### Navegação principal

1. **Início**
   - resumo das listas abertas;
   - gasto do mês;
   - economia estimada;
   - ofertas próximas ou recentes.

2. **Listas**
   - todas as listas;
   - detalhes de uma lista;
   - adicionar ou editar item;
   - compartilhar lista;
   - finalizar compra.

3. **Ofertas**
   - feed de preços compartilhados;
   - filtros por produto, mercado e distância;
   - detalhes da oferta;
   - registrar preço;
   - confirmar se o preço ainda está disponível.

4. **Gastos**
   - visão mensal;
   - comparação entre meses;
   - gastos por categoria;
   - histórico de compras;
   - detalhes de uma compra.

5. **Perfil**
   - dados pessoais;
   - mercados favoritos;
   - privacidade e compartilhamento;
   - notificações;
   - aparência e acessibilidade.

### Modais e bottom sheets

- selecionar unidade;
- selecionar mercado;
- filtrar ofertas;
- confirmar exclusão;
- compartilhar lista;
- registrar valor pago;
- informar preço desatualizado.

---

## 15. Conteúdo e linguagem

### Tom

- direto;
- simples;
- regional apenas quando natural;
- sem excesso de informalidade;
- sem linguagem financeira complexa.

### Exemplos

Preferir:

```text
Adicionar item
Registrar preço
Compartilhar oferta
Você gastou R$ 428,30 neste mês
Preço informado há 2 dias
```

Evitar:

```text
Cadastrar novo registro de item
Efetuar lançamento financeiro
Usuário colaborador reportou uma promoção
```

### Datas e unidades

- Data: `5 de ago. de 2026` ou `05/08/2026`.
- Distância: `2,4 km`.
- Peso: `500 g`, `1 kg`.
- Volume: `350 ml`, `1 L`.
- Unidade: `2 un.`.

---

## 16. Tokens de implementação

### CSS

```css
:root {
  --color-brand-900: #2c3a2a;
  --color-brand-700: #5d6551;
  --color-brand-600: #68785f;
  --color-brand-500: #7f8d76;
  --color-brand-300: #bcbea2;
  --color-brand-100: #d5e1d8;

  --color-canvas: #fdf9f3;
  --color-surface-subtle: #faf4ea;
  --color-surface-card: #ffffff;
  --color-surface-sand: #eee0c7;

  --color-terracotta: #c27b51;
  --color-aqua: #dcebe5;
  --color-yellow: #d6a342;
  --color-olive: #99a084;

  --color-success: #3f7654;
  --color-warning: #a96f2b;
  --color-error: #a94f47;
  --color-info: #4e7480;

  --color-text-primary: #2c3a2a;
  --color-text-secondary: #5d6551;
  --color-text-muted: #7b7e73;
  --color-text-inverse: #ffffff;
  --color-text-disabled: #a8aaa2;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  --shadow-sm: 0 2px 8px rgba(44, 58, 42, 0.06);
  --shadow-md: 0 8px 24px rgba(44, 58, 42, 0.1);
  --shadow-lg: 0 16px 40px rgba(44, 58, 42, 0.14);
}
```

### TypeScript

```ts
export const tipitiTheme = {
  colors: {
    brand: {
      900: '#2C3A2A',
      700: '#5D6551',
      600: '#68785F',
      500: '#7F8D76',
      300: '#BCBEA2',
      100: '#D5E1D8',
    },
    surface: {
      canvas: '#FDF9F3',
      subtle: '#FAF4EA',
      card: '#FFFFFF',
      sand: '#EEE0C7',
    },
    accent: {
      terracotta: '#C27B51',
      aqua: '#DCEBE5',
      yellow: '#D6A342',
      olive: '#99A084',
    },
    semantic: {
      success: '#3F7654',
      warning: '#A96F2B',
      error: '#A94F47',
      info: '#4E7480',
    },
    text: {
      primary: '#2C3A2A',
      secondary: '#5D6551',
      muted: '#7B7E73',
      inverse: '#FFFFFF',
      disabled: '#A8AAA2',
    },
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
  },
} as const;
```

---

## 17. Regras de consistência

- Não criar novas cores sem adicionar um token semântico.
- Não usar valores de espaçamento fora da escala sem justificativa.
- Não usar mais de uma ação primária por área visual.
- Não misturar ícones preenchidos e lineares na mesma navegação.
- Não usar padrões amazônicos como fundo de conteúdo denso.
- Não alterar a cor principal por tela.
- Todo novo componente deve documentar estados normal, pressionado, focado, carregando, vazio, erro e desabilitado quando aplicável.

---

## 18. Checklist de revisão de tela

- [ ] A ação principal está evidente.
- [ ] Há contraste suficiente entre texto e fundo.
- [ ] Os valores monetários são fáceis de comparar.
- [ ] Mercado, data e unidade estão presentes quando necessários.
- [ ] A tela funciona com fonte ampliada.
- [ ] Estados vazio, carregando e erro foram considerados.
- [ ] O grafismo não reduz a legibilidade.
- [ ] A tela usa apenas tokens deste documento.
- [ ] A navegação inferior mantém os mesmos destinos.
- [ ] Elementos culturais foram usados com contexto e sem imitação específica indevida.
