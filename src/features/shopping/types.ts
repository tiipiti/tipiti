export type List = {
  id: string
  user_id: string
  name: string
  is_archived: boolean
  created_at: string
  archived_at: string | null
}

export type Item = {
  id: string
  list_id: string
  name: string
  quantity: number
  price: number
  is_purchased: boolean
}
