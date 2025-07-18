export const LOCK_PAGE_QUERY = `#graphql
  query LOCK_PAGE {
    page(handle: "lock-with-password") {
      metafields(identifiers: [
        {namespace: "custom", key: "store_locked"},
        {namespace: "custom", key: "store_password"}
      ]) {
        key
        value
      }
    }
  }
`;