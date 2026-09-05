// Business constraint constants — single source of truth for both API and frontend validators
export const LIMITS = {
  NAME: 100,
  PREFERRED_NAME: 50,
  EMAIL: 254,
  PASSWORD_MIN: 6,
  PASSWORD_STRONG_MIN: 8,
  PASSWORD_MAX: 72,
  QUANTITY: 99999,
  PRICE: 999999.99,
} as const
