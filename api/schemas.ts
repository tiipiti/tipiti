import { z } from 'zod'

export const createListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe um nome para a lista')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
})

export const updateListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome não pode ser vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  is_archived: z.boolean().optional(),
})

export const createItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe um nome para o item')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  quantity: z
    .number()
    .finite('Quantidade inválida')
    .positive('Quantidade deve ser maior que zero')
    .max(99999, 'Quantidade máxima permitida é 99.999')
    .default(1),
  price: z
    .number()
    .finite('Preço inválido')
    .nonnegative('Preço não pode ser negativo')
    .max(999999.99, 'Preço máximo permitido é R$ 999.999,99')
    .default(0),
})

export const updateItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome não pode ser vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  quantity: z
    .number()
    .finite('Quantidade inválida')
    .positive('Quantidade deve ser maior que zero')
    .max(99999, 'Quantidade máxima permitida é 99.999')
    .optional(),
  price: z
    .number()
    .finite('Preço inválido')
    .nonnegative('Preço não pode ser negativo')
    .max(999999.99, 'Preço máximo permitido é R$ 999.999,99')
    .optional(),
  is_purchased: z.boolean().optional(),
})
