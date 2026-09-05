import { describe, expect, it } from 'vitest'

import { itemSchema, nameSchema, parseBrazilianPrice } from './forms'

describe('shopping form validation', () => {
  it('accepts nonnegative decimal item values typed in Brazilian format', () => {
    expect(itemSchema.parse({ quantity: '1,5', price: '12,50' })).toEqual({
      quantity: 1.5,
      price: 12.5,
    })
  })

  it('rejects a negative item value', () => {
    expect(() => itemSchema.parse({ quantity: '-1', price: '0' })).toThrow()
  })

  it('trims names and rejects an empty name', () => {
    expect(nameSchema.parse('  Arroz  ')).toBe('Arroz')
    expect(() => nameSchema.parse('   ')).toThrow()
  })

  it('converts a comma decimal price to a number', () => {
    expect(parseBrazilianPrice('12,50')).toBe(12.5)
  })
})
