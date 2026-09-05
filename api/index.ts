import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/vercel'
import { createClient } from '@supabase/supabase-js'

import { prisma } from './prisma'
import {
  createListSchema,
  updateListSchema,
  createItemSchema,
  updateItemSchema,
} from './schemas'

export {
  createListSchema,
  updateListSchema,
  createItemSchema,
  updateItemSchema,
}

type Env = {
  Variables: {
    userId: string
  }
}

const app = new Hono<Env>().basePath('/api')

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
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return c.json({ error: 'Não autorizado: token inválido' }, 401)
  }

  c.set('userId', data.user.id)
  await next()
})

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

// GET /api/lists with pagination (default 20 per page)
app.get('/lists', async (c) => {
  const userId = c.get('userId') as string
  const archived = c.req.query('archived') === 'true'
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
  const skip = (page - 1) * limit

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

  return c.json({
    data: lists,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + lists.length < total,
    },
  })
})

// POST /api/lists
app.post('/lists', async (c) => {
  const userId = c.get('userId') as string
  const rawBody = await c.req.json().catch(() => ({}))
  const parse = createListSchema.safeParse(rawBody)
  if (!parse.success) {
    return c.json({ error: parse.error.issues[0]?.message || 'Informe um nome válido para a lista' }, 400)
  }

  const list = await prisma.list.create({
    data: {
      user_id: userId,
      name: parse.data.name,
    },
  })
  return c.json({ data: list }, 201)
})

// GET /api/lists/:id
app.get('/lists/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
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
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const rawBody = await c.req.json().catch(() => ({}))
  const parse = updateListSchema.safeParse(rawBody)
  if (!parse.success) {
    return c.json({ error: parse.error.issues[0]?.message || 'Dados inválidos' }, 400)
  }

  const existing = await prisma.list.findFirst({ where: { id, user_id: userId } })
  if (!existing) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }

  const data: { name?: string; is_archived?: boolean; archived_at?: Date | null } = {}
  if (parse.data.name !== undefined) data.name = parse.data.name
  if (parse.data.is_archived !== undefined) {
    data.is_archived = parse.data.is_archived
    data.archived_at = parse.data.is_archived ? new Date() : null
  }

  const updated = await prisma.list.update({
    where: { id },
    data,
  })
  return c.json({ data: updated })
})

// POST /api/lists/clone-latest
app.post('/lists/clone-latest', async (c) => {
  const userId = c.get('userId') as string
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

// GET /api/lists/:id/items with pagination (20 per page) - Protected against BOLA/IDOR
app.get('/lists/:id/items', async (c) => {
  const userId = c.get('userId') as string
  const listId = c.req.param('id')

  // Security check: verify list ownership before exposing items
  const list = await prisma.list.findFirst({
    where: { id: listId, user_id: userId },
  })
  if (!list) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where: { list_id: listId },
      orderBy: { id: 'asc' },
      skip,
      take: limit,
    }),
    prisma.item.count({ where: { list_id: listId } }),
  ])

  return c.json({
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + items.length < total,
    },
  })
})

// POST /api/lists/:id/items - Protected against BOLA/IDOR with schema bounds
app.post('/lists/:id/items', async (c) => {
  const userId = c.get('userId') as string
  const listId = c.req.param('id')

  // Security check: verify list ownership before adding items
  const list = await prisma.list.findFirst({
    where: { id: listId, user_id: userId },
  })
  if (!list) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }

  const rawBody = await c.req.json().catch(() => ({}))
  const parse = createItemSchema.safeParse(rawBody)
  if (!parse.success) {
    return c.json({ error: parse.error.issues[0]?.message || 'Informe dados válidos para o item' }, 400)
  }

  const item = await prisma.item.create({
    data: {
      list_id: listId,
      name: parse.data.name,
      quantity: parse.data.quantity,
      price: parse.data.price,
      is_purchased: false,
    },
  })
  return c.json({ data: item }, 201)
})

// PATCH /api/items/:id - Protected against BOLA/IDOR with schema bounds
app.patch('/items/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')

  // Security check: verify item belongs to a list owned by this user
  const item = await prisma.item.findFirst({
    where: { id, list: { user_id: userId } },
  })
  if (!item) {
    return c.json({ error: 'Item não encontrado' }, 404)
  }

  const rawBody = await c.req.json().catch(() => ({}))
  const parse = updateItemSchema.safeParse(rawBody)
  if (!parse.success) {
    return c.json({ error: parse.error.issues[0]?.message || 'Dados inválidos' }, 400)
  }

  const updated = await prisma.item.update({
    where: { id },
    data: parse.data,
  })
  return c.json({ data: updated })
})

// DELETE /api/items/:id - Protected against BOLA/IDOR
app.delete('/items/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')

  // Security check: verify item belongs to a list owned by this user
  const item = await prisma.item.findFirst({
    where: { id, list: { user_id: userId } },
  })
  if (!item) {
    return c.json({ error: 'Item não encontrado' }, 404)
  }

  await prisma.item.delete({ where: { id } })
  return c.json({ ok: true })
})

export { app }
export default handle(app)
