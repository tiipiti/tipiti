import { describe, expect, it } from 'vitest'

import {
  createListSchema,
  updateListSchema,
  createItemSchema,
  updateItemSchema,
  uuidSchema,
} from '../../../api/schemas'

describe('Serverless API Input Validation Schemas', () => {
  describe('createListSchema', () => {
    it('accepts valid list names up to 100 characters', () => {
      const valid = createListSchema.safeParse({ name: 'Compras de Sábado' })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.name).toBe('Compras de Sábado')
      }
    })

    it('rejects empty or whitespace-only list names', () => {
      const empty = createListSchema.safeParse({ name: '   ' })
      expect(empty.success).toBe(false)
    })

    it('rejects list names exceeding 100 characters', () => {
      const tooLong = createListSchema.safeParse({ name: 'A'.repeat(101) })
      expect(tooLong.success).toBe(false)
      if (!tooLong.success) {
        expect(tooLong.error.issues[0]?.message).toContain('100 caracteres')
      }
    })
  })

  describe('updateListSchema', () => {
    it('accepts partial updates and rejects excessive lengths', () => {
      const valid = updateListSchema.safeParse({ is_archived: true })
      expect(valid.success).toBe(true)

      const invalid = updateListSchema.safeParse({ name: 'B'.repeat(105) })
      expect(invalid.success).toBe(false)
    })
  })

  describe('createItemSchema', () => {
    it('accepts valid item payloads with defaults', () => {
      const valid = createItemSchema.safeParse({ name: 'Feijão Carioca 1kg' })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.quantity).toBe(1)
        expect(valid.data.price).toBe(0)
      }
    })

    it('rejects negative or excessive quantities', () => {
      const negative = createItemSchema.safeParse({ name: 'Leite', quantity: -2 })
      expect(negative.success).toBe(false)

      const tooLarge = createItemSchema.safeParse({ name: 'Leite', quantity: 100000 })
      expect(tooLarge.success).toBe(false)
    })

    it('rejects negative or excessive prices', () => {
      const negative = createItemSchema.safeParse({ name: 'Café', price: -10 })
      expect(negative.success).toBe(false)

      const tooLarge = createItemSchema.safeParse({ name: 'Café', price: 1000000 })
      expect(tooLarge.success).toBe(false)
    })

    it('rejects infinite or NaN numbers', () => {
      const inf = createItemSchema.safeParse({ name: 'Açúcar', price: Infinity })
      expect(inf.success).toBe(false)
    })
  })

  describe('updateItemSchema', () => {
    it('validates partial item updates with bounds', () => {
      const valid = updateItemSchema.safeParse({ is_purchased: true, price: 12.5 })
      expect(valid.success).toBe(true)

      const invalid = updateItemSchema.safeParse({ price: -1 })
      expect(invalid.success).toBe(false)
    })
  })

  describe('uuidSchema', () => {
    it('accepts valid RFC-4122 UUIDs', () => {
      expect(uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true)
    })

    it('rejects malformed or injected identifiers', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
      expect(uuidSchema.safeParse('../admin').success).toBe(false)
      expect(uuidSchema.safeParse('').success).toBe(false)
    })
  })
})
