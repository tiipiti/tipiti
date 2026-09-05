type PricedItem = {
  price: number
  quantity: number
  is_purchased: boolean
}

export const purchasedTotal = (items: PricedItem[]) =>
  items
    .filter((item) => item.is_purchased)
    .reduce((total, item) => total + item.price * item.quantity, 0)
