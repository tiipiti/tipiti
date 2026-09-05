# Especificação Técnica: Refinamentos de UX e Paradigma de Lista Viva

> **Origem:** Feedback real de uso em supermercado (usuária Paulaa).  
> **Data:** 2026-09-05  
> **Status:** Em Revisão / Planejamento  

---

## 1. Visão Geral e Mudança de Paradigma

O teste com usuários reais revelou uma incompatibilidade entre o modelo mental atual da aplicação (**"Modelo de Checkout de E-commerce / Arquivamento"**) e a rotina real de compras domésticas (**"Modelo de Lista Viva / Recorrente"**).

### Comparativo de Modelos:

| Aspecto | Modelo Anterior (Arquivamento) | Novo Modelo Proposto (Lista Viva) |
| :--- | :--- | :--- |
| **Ciclo da Lista** | Criar -> Comprar -> Finalizar (Arquivar) -> Copiar para nova lista no mês seguinte. | Uma lista viva e contínua que nunca morre. |
| **Fim da Compra** | Botão destrutivo "Finalizar compra" que fecha a lista. | Ação "Desmarcar comprados" para reiniciar a lista para o próximo mercado. |
| **Gasto Mensal** | Calculado pelas listas arquivadas no mês. | Incrementado em tempo real conforme itens são marcados como `comprado` no mês vigente. |
| **Esforço do Usuário** | Alto: precisa recriar ou clonar listas todo mês. | Mínimo: mantém os itens fixos da despensa e apenas altera quantidades/preços. |

---

## 2. Detalhamento dos Problemas Identificados e Soluções

### 2.1. Clareza do Botão de Compra no Item
- **Problema:** O botão alternando entre `PENDENTE` e `COMPRADO` confunde o usuário na primeira interação. O texto `PENDENTE` parece um aviso passivo, não uma ação clicável.
- **Solução de UX:** 
  - O botão sempre apresenta a ação clara: **`COMPRAR`** ou um checkbox tátil com o rótulo **`COMPRADO`**.
  - **Estado Não-Comprado:** Caixa de seleção branca vazia com texto `COMPRADO` (indicando o que acontece ao clicar).
  - **Estado Comprado:** Caixa preenchida com ícone pixelado de check, linha riscada, fundo cinza `#D6D0C8` e texto `COMPRADO`.

---

### 2.2. Fim do "Finalizar Compra" e Introdução do "Desmarcar Comprados"
- **Problema:** Compras domésticas são infinitas e recorrentes. Forçar o usuário a "finalizar" e criar outra lista chamada "Mês X" gera burocracia desnecessária.
- **Soluções:**
  1. **Remover:** Botão "Finalizar compra" da tela ativa.
  2. **Remover:** Botão "Copiar última compra" (já que a lista viva preserva os itens).
  3. **Adicionar Ação "Desmarcar todos os comprados":** 
     - Um botão de reset (ex: `RESETAR LISTA` ou `DESMARCAR COMPRADOS`) protegido por `ConfirmModal`.
     - Ao acionar, todos os itens voltam para `is_purchased = false`, prontos para a próxima ida ao supermercado.

---

### 2.3. Impacto no "Consumo do Mês" e Linha do Tempo
- **Desafio Arquitetural:** Se a lista não é arquivada com uma data de encerramento (`archived_at`), como calculamos o consumo do mês?
- **Solução Técnica Recomendada:**
  - Adicionar um timestamp de compra no item: `purchased_at timestamptz`.
  - Ao marcar como comprado (`is_purchased = true`): `purchased_at = now()`.
  - Ao desmarcar (`is_purchased = false`): `purchased_at = null`.
  - **Cálculo do mês:** Soma de `quantity * price` de todos os itens onde `is_purchased = true` e `purchased_at` pertence ao mês corrente.
  - Ao usar "Desmarcar comprados" no mês seguinte, os novos itens comprados passarão a pontuar no novo mês automaticamente.

---

### 2.4. Ajuste de Rolagem e Footer Fixo
- **Problema:** O último item da lista fica cortado ou escondido atrás do rodapé/totalizador flutuante.
- **Solução de UX:**
  - Aumentar o `padding-bottom` da tabela e do contêiner para `pb-32` ou `pb-40`.
  - Garantir que qualquer barra flutuante respeite a safe area de rolagem do celular.

---

### 2.5. Botão "Voltar" Fixo e Confiabilidade ("Salvar e Voltar")
- **Problema:** Listas longas de 40 a 60 itens obrigam o usuário a rolar toda a tela até o topo para conseguir voltar.
- **Soluções:**
  - Tornar o cabeçalho de navegação superior fixo (`sticky top-0 z-20 bg-[#F4F0EB] border-b-4 border-black`).
  - Mudar o rótulo de `< VOLTAR` para **`← SALVAR E VOLTAR`** (traz tranquilidade psicológica de que a lista está guardada).

---

### 2.6. Simplificação da Home e Direcionamento ao Dashboard
- **Problema:** O acordeão "Abrir Linha do Tempo" polui a Home com gráficos pesados enquanto o usuário está no mercado querendo apenas entrar na lista.
- **Solução de UX:**
  - O card de "Consumo do Mês" na Home deve ser um resumo limpo e direto.
  - O botão ou clique no card navega diretamente para `/dashboard` em vez de expandir a tela ali mesmo.

---

## 3. Fases Propostas de Execução

### Fase 1: Usabilidade Imediata (UI/CSS/Layout)
- [ ] Fixar cabeçalho com `← SALVAR E VOLTAR` (`sticky top-0`).
- [ ] Corrigir padding inferior da `ListPage` (`pb-32`) para nunca mais cobrir o último item.
- [ ] Ajustar texto do botão de compra na linha de item para clareza intuitiva.
- [ ] Simplificar o card da Home direcionando direto para `/dashboard`.

### Fase 2: Transição para o Paradigma de Lista Viva
- [ ] Criar ação e modal de confirmação para **"Desmarcar Itens Comprados"**.
- [ ] Ocultar/Remover fluxos obsoletos de "Finalizar Compra" e "Copiar Última Lista".

### Fase 3: Dados e Persistência do Consumo do Mês
- [ ] Adicionar campo `purchased_at` na tabela `items` via migration Supabase.
- [ ] Ajustar lógica de agregação mensal para somar por `purchased_at` do mês corrente.

---

## 4. Critérios de Aceite

1. ✅ O último item da lista é 100% visível e clicável, mesmo com telas cheias.
2. ✅ O botão de voltar está sempre acessível na tela sem necessidade de rolagem.
3. ✅ O usuário pode reiniciar a lista para a próxima compra em 1 clique (com confirmação).
4. ✅ Itens comprados alimentam o gasto do mês em tempo real.
5. ✅ O design system neo-brutalista (0px radius, 4px black borders, fontes e cores) é estritamente mantido em todas as alterações.
