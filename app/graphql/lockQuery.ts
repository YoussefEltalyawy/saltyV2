export const LOCK_PAGE_QUERY = `#graphql
  query LOCK_PAGE {
    page(handle: "lock-with-password") {
      metafields(identifiers: [
        {namespace: "custom", key: "store_locked"},
        {namespace: "custom", key: "store_password"},
        {namespace: "custom", key: "background_image"},
        {namespace: "custom", key: "title"},
        {namespace: "custom", key: "description"}
      ]) {
        key
        value
        type
        reference {
          __typename
          ... on MediaImage {
            id
            image {
              url
              altText
              width
              height
            }
          }
        }
      }
    }
  }
`;