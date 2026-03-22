Please review this Python function. It's supposed to batch-process items from a queue and save results to a database.

```python
import time

def process_queue(queue, db):
    results = []
    while True:
        item = queue.get()
        if item is None:
            break
        try:
            result = expensive_operation(item)
            results.append(result)
        except Exception as e:
            print(f"Error: {e}")
            continue

        if len(results) >= 100:
            db.insert_many(results)
            results = []

    db.insert_many(results)
    return len(results)
