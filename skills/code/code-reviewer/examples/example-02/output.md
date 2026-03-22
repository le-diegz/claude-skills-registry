## Code Review

### Critical

None.

### Major

**`process_queue` — lines 14–16: partial batch lost on normal exit**

When `item is None` breaks the loop, any results accumulated since the last `db.insert_many` are written by the `db.insert_many(results)` call at line 20. But the function then returns `len(results)` — which is the length of the *partial batch*, not the total number of processed items. The return value is misleading and cannot be used to verify total throughput.

Fix:
```python
def process_queue(queue, db):
    results = []
    total = 0
    while True:
        item = queue.get()
        if item is None:
            break
        try:
            result = expensive_operation(item)
            results.append(result)
            total += 1
        except Exception as e:
            print(f"Error processing item: {e}")
            continue

        if len(results) >= 100:
            db.insert_many(results)
            results = []

    if results:
        db.insert_many(results)

    return total
```

**`process_queue` — line 9: `expensive_operation` errors are swallowed silently**

A bare `print` and `continue` means failed items are discarded with no tracking. If `expensive_operation` fails for 30% of items due to a schema change, the caller has no way to know — the function returns a success count and exits. At minimum, log with enough context to identify the failed item; ideally, collect failures separately.

Fix:
```python
failures = []
try:
    result = expensive_operation(item)
    results.append(result)
except Exception as e:
    failures.append({'item': item, 'error': str(e)})

# at end of function:
if failures:
    logger.error(f"process_queue: {len(failures)} items failed", extra={'failures': failures})
return {'processed': total, 'failed': len(failures)}
```

### Minor

**Lines 14–16: the flush condition uses `>=` but could miss exactly-100 batches at loop exit**

Not a bug — the final `db.insert_many(results)` handles the remainder — but the guard `if results:` is missing before it. If the queue is empty on first call and no items are processed, `db.insert_many([])` is called with an empty list. Depending on the database driver, this may be a no-op or may raise.

Fix: add `if results:` before the final insert.

### Nits

- `queue.get()` with no timeout will block forever if the producer never sends `None`. Consider `queue.get(timeout=30)` with a `queue.Empty` handler if this runs in a background thread.

### Summary

No correctness bugs that would corrupt data, but two significant issues: the return value is wrong (partial count instead of total), and errors are silently discarded. Both are easy fixes. The batching logic itself is correct; the sentinel-based termination pattern is fine.
