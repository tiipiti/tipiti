import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/vercel'
import { createClient } from '@supabase/supabase-js'

import { prisma } from './prisma'

const app = new Hono().basePath('/api')

app.use('*', cors())

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth middleware
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
  const body = await c.req.json<{ name: string }>()
  if (!body.name?.trim()) {
    return c.json({ error: 'Informe um nome para a lista' }, 400)
  }

  const list = await prisma.list.create({
    data: {
      user_id: userId,
      name: body.name.trim(),
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
  const body = await c.req.json<{ name?: string; is_archived?: boolean }>()

  const existing = await prisma.list.findFirst({ where: { id, user_id: userId } })
  if (!existing) {
    return c.json({ error: 'Lista não encontrada' }, 404)
  }

  const data: { name?: string; is_archived?: boolean; archived_at?: Date | null } = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.is_archived !== undefined) {
    data.is_archived = body.is_archived
    data.archived_at = body.is_archived ? new Date() : null
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

// GET /api/lists/:id/items with pagination (20 per page)
app.get('/lists/:id/items', async (c) => {
  const listId = c.req.param('id')
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

// POST /api/lists/:id/items
app.post('/lists/:id/items', async (c) => {
  const listId = c.req.param('id')
  const body = await c.req.json<{ name: string }>()
  if (!body.name?.trim()) {
    return c.json({ error: 'Informe um nome para o item' }, 400)
  }

  const item = await prisma.item.create({
    data: {
      list_id: listId,
      name: body.name.trim(),
      quantity: 1,
      price: 0,
      is_purchased: false,
    },
  })
  return c.json({ data: item }, 201)
})

// PATCH /api/items/:id
app.patch('/items/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ quantity?: number; price?: number; is_purchased?: boolean }>()

  const item = await prisma.item.update({
    where: { id },
    data: body,
  })
  return c.json({ data: item })
})

// DELETE /api/items/:id
app.delete('/items/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.item.delete({ where: { id } })
  return c.json({ ok: true })
})

export default handle(app)
