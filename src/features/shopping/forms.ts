import { z } from 'zod'

const parseDecimal = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return Number.NaN

  const trimmed = value.trim()
  if (!trimmed) return Number.NaN

  return Number(
    trimmed.includes(',')
      ? trimmed.replaceAll('.', '').replace(',', '.')
      : trimmed,
  )
}

export const parseBrazilianPrice = (value: string) => parseDecimal(value)

export const nameSchema = z.string().trim().min(1, 'Informe um nome')

export const emailSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
})

export const passwordSchema = z.string().min(6, 'A senha deve ter no mínimo 6 caracteres')

export const passwordAuthSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: passwordSchema,
})

export const itemSchema = z.object({
  quantity: z.preprocess(
    parseDecimal,
    z.number().finite().nonnegative('A quantidade não pode ser negativa'),
  ),
  price: z.preprocess(
    parseDecimal,
    z.number().finite().nonnegative('O preço não pode ser negativo'),
  ),
})

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
    new Date(value),
  )
