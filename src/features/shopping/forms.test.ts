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

  it('rejects names longer than 100 characters', () => {
    expect(() => nameSchema.parse('a'.repeat(101))).toThrow('Máximo de 100 caracteres')
    expect(nameSchema.parse('a'.repeat(100))).toBe('a'.repeat(100))
  })

  it('rejects item quantity and price exceeding upper bounds', () => {
    expect(() => itemSchema.parse({ quantity: 100000, price: 10 })).toThrow('Quantidade máxima permitida é 99.999')
    expect(() => itemSchema.parse({ quantity: 1, price: 1000000 })).toThrow('Preço máximo permitido é R$ 999.999,99')
    expect(itemSchema.parse({ quantity: 99999, price: 999999.99 })).toEqual({
      quantity: 99999,
      price: 999999.99,
    })
  })

  it('converts a comma decimal price to a number', () => {
    expect(parseBrazilianPrice('12,50')).toBe(12.5)
  })
})
