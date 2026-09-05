import { describe, expect, it } from 'vitest'

import { purchasedTotal } from './total'

describe('purchasedTotal', () => {
  it('sums only purchased items using unit price and quantity', () => {
    expect(
      purchasedTotal([
        { price: 12.5, quantity: 2, is_purchased: true },
        { price: 9, quantity: 1, is_purchased: false },
      ]),
    ).toBe(25)
  })
})
