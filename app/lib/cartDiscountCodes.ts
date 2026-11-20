import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';

/**
 * Discount-code writes need a hand-written mutation.
 *
 * Hydrogen 2025.5.0 ships `cartDiscountCodesUpdate` declaring
 * `$discountCodes: [String!]`, but the Storefront API expects `[String!]!`.
 * Passing a nullable list variable to a non-null argument is rejected by the
 * API before the operation runs ("Nullability mismatch on variable
 * $discountCodes"), so every `cart.updateDiscountCodes` call fails.
 *
 * This is the same mutation with the variable marked non-null. A non-null list
 * is still valid where the argument is nullable (older API versions), and a
 * list is always supplied, so it works on both.
 *
 * `...CartApiQuery` is spread so the response carries the full cart (lines,
 * discount codes, costs) instead of Hydrogen's minimal mutation payload. The
 * caller needs the lines to decide which bundle codes belong on the cart.
 */
const CART_DISCOUNT_CODES_UPDATE = `#graphql
  mutation cartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartApiQuery
      }
      userErrors {
        code
        field
        message
      }
    }
  }
  ${CART_QUERY_FRAGMENT}
`;

type DiscountCodesUpdatePayload = {
  cart?: CartQueryDataReturn['cart'];
  userErrors?: CartQueryDataReturn['userErrors'];
  warnings?: CartQueryDataReturn['warnings'];
};

/**
 * Replace the cart's discount codes through the corrected mutation.
 *
 * Mirrors `cart.updateDiscountCodes` (deduplicates, returns the same
 * `CartQueryDataReturn` shape) without the nullability bug.
 */
export async function updateCartDiscountCodes(
  storefront: any,
  cartId: string,
  discountCodes: string[],
): Promise<CartQueryDataReturn> {
  const uniqueCodes = [...new Set(discountCodes.map((code) => code?.trim()).filter(Boolean))];

  const response = await storefront.mutate(CART_DISCOUNT_CODES_UPDATE, {
    variables: {cartId, discountCodes: uniqueCodes},
  });

  const payload: DiscountCodesUpdatePayload =
    response?.cartDiscountCodesUpdate ?? {};

  return {
    cart: payload.cart as CartQueryDataReturn['cart'],
    userErrors: payload.userErrors,
    warnings: payload.warnings,
    ...(response?.errors ? {errors: response.errors} : {}),
  };
}
