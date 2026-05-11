API used:
- User lookup for `github`
- Recent profile tweets for the returned user ID

Findings:
- Product-related posts cluster around developer workflows, repository collaboration, and platform updates.
- Posts that include links should be grouped by destination type: documentation, changelog, launch page, or repository.
- Non-product community posts were filtered out of the theme summary.

Sources:
- Username: `github`
- Tweet IDs: include the IDs returned by the API for each cited product-related post.

Caveat: Deleted, protected, or inaccessible posts are not represented.
