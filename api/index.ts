import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/vercel'
import { createClient } from '@supabase/supabase-js'
import type { Context } from 'hono'
import type { ZodSchema } from 'zod'

import { prisma } from './prisma'
import {
  createListSchema,
  updateListSchema,
  createItemSchema,
  updateItemSchema,
  uuidSchema,
} from './schemas'

export {
  createListSchema,
  updateListSchema,
  createItemSchema,
  updateItemSchema,
  uuidSchema,
}

type Env = {
  Variables: {
    userId: string
  }
}

const app = new Hono<Env>().basePath('/api')

// Safe query param parsers against NaN/DoS attacks
const parseSafePage = (raw: string | undefined): number => {
  const num = parseInt(raw || '1', 10)
  return Number.isFinite(num) && num > 0 ? num : 1
}

const parseSafeLimit = (raw: string | undefined): number => {
  const num = parseInt(raw || '20', 10)
  return Number.isFinite(num) && num > 0 ? Math.min(100, num) : 20
}

// ─── Route helpers (DRY) ────────────────────────────────────────────────────

/** Returns an error response if `id` is not a valid UUID, otherwise undefined. */
const requireValidUuid = (c: Context<Env>, id: string) => {
  if (!uuidSchema.safeParse(id).success) {
    return c.json({ error: 'Identificador inválido' }, 400)
  }
}

/** Finds a list that belongs to `userId`. Returns null if not found. */
const findUserList = (userId: string, listId: string) =>
  prisma.list.findFirst({ where: { id: listId, user_id: userId } })

/** Finds an item that belongs to a list owned by `userId`. Returns null if not found. */
const findUserItem = (userId: string, itemId: string) =>
  prisma.item.findFirst({ where: { id: itemId, list: { user_id: userId } } })

/**
 * Parses and validates the request body against `schema`.
 * Returns `{ data }` on success or sends a 400 response and returns null.
 */
async function parseBody<T>(
  c: Context<Env>,
  schema: ZodSchema<T>,
  fallback: string,
): Promise<{ data: T } | null> {
  const raw = await c.req.json().catch(() => ({}))
  const result = schema.safeParse(raw)
  if (result.success) return { data: result.data }
  void c.json({ error: result.error.issues[0]?.message || fallback }, 400)
  return null
}

/** Extracts and validates pagination query params. */
const getPagination = (c: Context<Env>) => {
  const page = parseSafePage(c.req.query('page'))
  const limit = parseSafeLimit(c.req.query('limit'))
  return { page, limit, skip: (page - 1) * limit }
}

/** Builds the standard paginated response envelope. */
const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  skip: number,
) => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + data.length < total,
  },
})

// ─── Middleware ──────────────────────────────────────────────────────────────

// Global error handler: never leak internal stack traces or connection strings to client
app.onError((err, c) => {
  console.error('[API Error]:', err.message)
  return c.json({ error: 'Erro interno no servidor' }, 500)
})

// Restrictive CORS middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*'
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app') ||
        (process.env.APP_URL && origin === process.env.APP_URL)
      ) {
        return origin
      }
      return null
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth middleware: extracts and verifies JWT from Bearer token
app.use('*', async (c, next) => {
  if (c.req.path === '/api/health') return next()

  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    return c.json({ error: 'Não autorizado: token ausente' }, 401)
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return c.json({ error: 'Não autorizado: token ausente' }, 401)
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return c.json({ error: 'Não autorizado: token inválido' }, 401)
  }

  c.set('userId', data.user.id)
  await next()
})

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

// GET /api/lists with safe pagination (default 20 per page)
app.get('/lists', async (c) => {
  const userId = c.get('userId')
  const archived = c.req.query('archived') === 'true'
  const { page, limit, skip } = getPagination(c)

  const [lists, total] = await Promise.all([
    prisma.list.findMany({
      where: { user_id: userId, is_archived: archived },
      orderBy: archived
        ? [{ archived_at: 'desc' }, { created_at: 'desc' }]
        : [{ created_at: 'desc' }],
      skip,
      take: limit,
      include: {
        items: true,
      },
    }),
    prisma.list.count({
      where: { user_id: userId, is_archived: archived },
    }),
  ])

  return c.json(paginatedResponse(lists, total, page, limit, skip))
})

// POST /api/lists
app.post('/lists', async (c) => {
  const userId = c.get('userId')
  const parsed = await parseBody(c, createListSchema, 'Informe um nome válido para a lista')
  if (!parsed) return c.res

  const list = await prisma.list.create({
    data: {
      user_id: userId,
      name: parsed.data.name,
    },
  })
  return c.json({ data: list }, 201)
})

// GET /api/lists/:id - Protected with UUID check and ownership check
app.get('/lists/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const uuidErr = requireValidUuid(c, id)
  if (uuidErr) return uuidErr

  const list = await prisma.list.findFirst({
    where: { id, user_id: userId },
    include: { items: true },
  })

  if (!list) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }
  return c.json({ data: list })
})

// PATCH /api/lists/:id (rename, archive, reopen)
app.patch('/lists/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const uuidErr = requireValidUuid(c, id)
  if (uuidErr) return uuidErr

  const parsed = await parseBody(c, updateListSchema, 'Dados inválidos')
  if (!parsed) return c.res

  const existing = await findUserList(userId, id)
  if (!existing) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }

  const data: { name?: string; is_archived?: boolean; archived_at?: Date | null } = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.is_archived !== undefined) {
    data.is_archived = parsed.data.is_archived
    data.archived_at = parsed.data.is_archived ? new Date() : null
  }

  const updated = await prisma.list.update({
    where: { id },
    data,
  })
  return c.json({ data: updated })
})

// POST /api/lists/clone-latest
app.post('/lists/clone-latest', async (c) => {
  const userId = c.get('userId')
  const latest = await prisma.list.findFirst({
    where: {
      user_id: userId,
      is_archived: true,
      items: { some: {} },
    },
    orderBy: [{ archived_at: 'desc' }, { created_at: 'desc' }],
    include: { items: true },
  })

  if (!latest) {
    return c.json({ data: null })
  }

  const copy = await prisma.list.create({
    data: {
      user_id: userId,
      name: latest.name,
      items: {
        create: latest.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          is_purchased: false,
        })),
      },
    },
    include: { items: true },
  })

  return c.json({ data: copy }, 201)
})

// GET /api/lists/:id/items with safe pagination (20 per page) - Protected against BOLA/IDOR
app.get('/lists/:id/items', async (c) => {
  const userId = c.get('userId')
  const listId = c.req.param('id')

  const uuidErr = requireValidUuid(c, listId)
  if (uuidErr) return uuidErr

  // Security check: verify list ownership before exposing items
  const list = await findUserList(userId, listId)
  if (!list) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }

  const { page, limit, skip } = getPagination(c)

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where: { list_id: listId },
      orderBy: { id: 'asc' },
      skip,
      take: limit,
    }),
    prisma.item.count({ where: { list_id: listId } }),
  ])

  return c.json(paginatedResponse(items, total, page, limit, skip))
})

// POST /api/lists/:id/items - Protected against BOLA/IDOR with schema bounds
app.post('/lists/:id/items', async (c) => {
  const userId = c.get('userId')
  const listId = c.req.param('id')

  const uuidErr = requireValidUuid(c, listId)
  if (uuidErr) return uuidErr

  // Security check: verify list ownership before adding items
  const list = await findUserList(userId, listId)
  if (!list) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }

  const parsed = await parseBody(c, createItemSchema, 'Informe dados válidos para o item')
  if (!parsed) return c.res

  const item = await prisma.item.create({
    data: {
      list_id: listId,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      price: parsed.data.price,
      is_purchased: false,
    },
  })
  return c.json({ data: item }, 201)
})

// PATCH /api/items/:id - Protected against BOLA/IDOR with schema bounds
app.patch('/items/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const uuidErr = requireValidUuid(c, id)
  if (uuidErr) return uuidErr

  // Security check: verify item belongs to a list owned by this user
  const item = await findUserItem(userId, id)
  if (!item) {
    return c.json({ error: 'Item não encontrado' }, 404)
  }

  const parsed = await parseBody(c, updateItemSchema, 'Dados inválidos')
  if (!parsed) return c.res

  const updated = await prisma.item.update({
    where: { id },
    data: parsed.data,
  })
  return c.json({ data: updated })
})

// DELETE /api/items/:id - Protected against BOLA/IDOR
app.delete('/items/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const uuidErr = requireValidUuid(c, id)
  if (uuidErr) return uuidErr

  // Security check: verify item belongs to a list owned by this user
  const item = await findUserItem(userId, id)
  if (!item) {
    return c.json({ error: 'Item não encontrado' }, 404)
  }

  await prisma.item.delete({ where: { id } })
  return c.json({ ok: true })
})

export { app }
export default handle(app)
