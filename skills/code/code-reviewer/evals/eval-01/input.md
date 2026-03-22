Please review this TypeScript function:

```ts
async function fetchUserOrders(userId: string) {
  const user = await db.users.findOne({ id: userId })
  const orders = await db.orders.find({ userId: user.id })
  return orders
}
```
