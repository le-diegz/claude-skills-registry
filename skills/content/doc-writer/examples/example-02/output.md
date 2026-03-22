# Pagination

All list endpoints in the API support two pagination strategies: **offset-based** for most resources, and **cursor-based** for endpoints where real-time ordering matters.

## Offset-based pagination

Use offset-based pagination for stable datasets where you need to jump to a specific page (user lists, reports, search results).

### Request

Add `page` and `per_page` to any list endpoint:

```http
GET /api/v1/users?page=2&per_page=50
Authorization: Bearer <token>
```

| Parameter | Type | Default | Max |
|---|---|---|---|
| `page` | integer | `1` | — |
| `per_page` | integer | `20` | `100` |

### Response

```json
{
  "data": [
    { "id": "usr_01", "name": "Alice" },
    { "id": "usr_02", "name": "Bob" }
  ],
  "meta": {
    "page": 2,
    "per_page": 50,
    "total": 1240,
    "total_pages": 25
  }
}
```

| Field | Type | Description |
|---|---|---|
| `meta.page` | integer | The current page number |
| `meta.per_page` | integer | Items per page as requested |
| `meta.total` | integer | Total items across all pages |
| `meta.total_pages` | integer | Total number of pages at the current `per_page` |

### Requesting beyond the last page

Requesting a page number greater than `total_pages` returns an empty `data` array — not a 404:

```http
GET /api/v1/users?page=999
```

```json
{
  "data": [],
  "meta": { "page": 999, "per_page": 20, "total": 1240, "total_pages": 62 }
}
```

Check `data.length === 0` or compare `page > total_pages` to detect the end of results.

### Iterating all pages

```js
async function fetchAllUsers(client) {
  const users = []
  let page = 1

  while (true) {
    const res = await client.get('/api/v1/users', { params: { page, per_page: 100 } })
    users.push(...res.data.data)

    if (page >= res.data.meta.total_pages) break
    page++
  }

  return users
}
```

---

## Cursor-based pagination

Use cursor-based pagination for real-time or frequently updated feeds where offset pagination would produce duplicates or skip items as new data is added (activity streams, event logs, notifications).

### Request

```http
GET /api/v1/events?limit=50
Authorization: Bearer <token>
```

To fetch the next page, pass the cursor from the previous response:

```http
GET /api/v1/events?cursor=eyJpZCI6IjEyMzQ1In0&limit=50
```

| Parameter | Type | Default | Max |
|---|---|---|---|
| `limit` | integer | `20` | `50` |
| `cursor` | string | — | — |

The cursor string is opaque — do not parse or construct it manually. Its format may change without notice.

### Response

```json
{
  "data": [
    { "id": "evt_991", "type": "login", "ts": "2026-03-22T14:00:00Z" }
  ],
  "meta": {
    "next_cursor": "eyJpZCI6Ijg4OCI7fQ",
    "limit": 50
  }
}
```

When `meta.next_cursor` is `null`, you have reached the end of the feed:

```json
{
  "data": [],
  "meta": {
    "next_cursor": null,
    "limit": 50
  }
}
```

### Iterating a cursor feed

```js
async function fetchAllEvents(client) {
  const events = []
  let cursor = null

  do {
    const params = { limit: 50, ...(cursor ? { cursor } : {}) }
    const res = await client.get('/api/v1/events', { params })

    events.push(...res.data.data)
    cursor = res.data.meta.next_cursor
  } while (cursor !== null)

  return events
}
```

---

## Choosing a strategy

| Use case | Strategy |
|---|---|
| User list, product catalog, search results | Offset |
| Activity feed, notifications, audit log | Cursor |
| Export all records to a file | Offset (predictable page count) |
| Live polling for new events | Cursor (no duplicates as items are added) |
