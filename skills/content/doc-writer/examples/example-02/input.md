Write a how-to guide for our REST API's pagination. Here are the details:

- All list endpoints return `{ data: [...], meta: { page, per_page, total, total_pages } }`
- Pagination params: `?page=1&per_page=20` (default per_page is 20, max is 100)
- If you request a page beyond total_pages, you get an empty data array (not a 404)
- We also support cursor-based pagination for real-time data endpoints: `?cursor=<opaque_string>&limit=50`
- The cursor is returned in `meta.next_cursor` (null if no more pages)

Audience: developers integrating our API for the first time.
