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

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Informe um nome')
  .max(100, 'Máximo de 100 caracteres')

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido')
    .max(254, 'E-mail muito longo'),
})

export const passwordSchema = z
  .string()
  .min(6, 'A senha deve ter no mínimo 6 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')

export const strongPasswordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')

export const passwordAuthSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido')
    .max(254, 'E-mail muito longo'),
  password: z
    .string()
    .min(1, 'Informe sua senha')
    .max(72, 'A senha deve ter no máximo 72 caracteres'),
})

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe seu nome')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  preferred_name: z
    .string()
    .trim()
    .max(50, 'Apelido deve ter no máximo 50 caracteres')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido')
    .max(254, 'E-mail muito longo'),
  password: strongPasswordSchema,
})

export const updateProfileSchema = z.object({
  preferred_name: z
    .string()
    .trim()
    .min(1, 'Informe como deseja ser chamado')
    .max(50, 'Máximo de 50 caracteres'),
})

export const updatePasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirm_password: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'As senhas não coincidem',
    path: ['confirm_password'],
  })

export const editItemPriceSchema = z.object({
  price: z.preprocess(
    parseDecimal,
    z
      .number()
      .finite()
      .nonnegative('O preço não pode ser negativo')
      .max(999999.99, 'Preço máximo permitido é R$ 999.999,99'),
  ),
})

export const itemSchema = z.object({
  quantity: z.preprocess(
    parseDecimal,
    z
      .number()
      .finite()
      .nonnegative('A quantidade não pode ser negativa')
      .max(99999, 'Quantidade máxima permitida é 99.999'),
  ),
  price: z.preprocess(
    parseDecimal,
    z
      .number()
      .finite()
      .nonnegative('O preço não pode ser negativo')
      .max(999999.99, 'Preço máximo permitido é R$ 999.999,99'),
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
