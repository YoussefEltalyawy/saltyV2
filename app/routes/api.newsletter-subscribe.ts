import { z } from 'zod';

/**
 * Normalize Egyptian + international numbers to E.164 before validation:
 * - strips spaces, dashes, parens, dots
 * - 01xxxxxxxxx (11 digits) -> +20xxxxxxxxxx
 * - 0020xxxxxxxxxx -> +20xxxxxxxxxx
 * - 201xxxxxxxxxx -> +20xxxxxxxxxx
 * - bare digit strings get a leading +
 * Empty stays empty (phone is optional everywhere).
 */
function normalizePhone(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  let value = raw.trim().replace(/[\s\-().]/g, '');
  if (!value) return undefined;
  if (/^01\d{9}$/.test(value)) {
    value = `+20${value.slice(1)}`;
  } else if (/^0020\d{9}$/.test(value)) {
    value = `+${value.slice(2)}`;
  } else if (/^20\d{10}$/.test(value)) {
    value = `+${value}`;
  } else if (/^\d{7,15}$/.test(value)) {
    value = `+${value}`;
  }
  return value;
}

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Please enter your name'),
  phone: z.preprocess(
    normalizePhone,
    z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, 'Please enter a valid phone number')
      .optional(),
  ),
});

export async function action({ request, context }: any) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const name = formData.get('name');
    const phone = formData.get('phone');

    const validation = subscribeSchema.safeParse({ email, name, phone });
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error.errors[0].message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      email: validatedEmail,
      name: validatedName,
      phone: validatedPhone,
    } = validation.data;
    const adminApiToken = context.env.SHOPIFY_ADMIN_API_TOKEN;
    const shopDomain = context.env.PUBLIC_STORE_DOMAIN;

    if (!adminApiToken || !shopDomain) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingCustomer = await findCustomerByEmail(
      validatedEmail,
      shopDomain,
      adminApiToken,
    );

    let customerId;
    if (existingCustomer) {
      await updateCustomerEmailMarketingConsent(
        existingCustomer.id,
        shopDomain,
        adminApiToken,
        validatedName,
      );
      // Returning subscriber: fill in anything they skipped last time
      // (name and/or phone) so re-submitting with a phone number updates
      // the customer instead of dropping the new info.
      if (validatedPhone || validatedName) {
        await updateCustomerContact(
          existingCustomer.id,
          shopDomain,
          adminApiToken,
          {firstName: validatedName, phone: validatedPhone},
        );
      }
      if (validatedPhone) {
        // SMS consent is separate from email consent — never let it fail
        // the whole signup (e.g. region limits); the number is still saved.
        try {
          await updateCustomerSmsMarketingConsent(
            existingCustomer.id,
            shopDomain,
            adminApiToken,
          );
        } catch (smsError) {
          console.error('Newsletter SMS consent error:', smsError);
        }
      }
      customerId = existingCustomer.id;
    } else {
      const newCustomer = await createCustomerWithEmailMarketingConsent(
        validatedEmail,
        validatedName,
        validatedPhone,
        shopDomain,
        adminApiToken,
      );
      customerId = newCustomer.id;
    }

    const source = formData.get('source');
    const dropDateRaw = formData.get('dropDate');
    
    let tags = ['SaltyClub_Popup'];
    if (source === 'lock_screen_drop') {
      if (dropDateRaw && typeof dropDateRaw === 'string' && dropDateRaw.trim() !== '') {
        const datePart = dropDateRaw.split('T')[0].split(' ')[0]; // Gets just the date portion e.g. 2024-03-30
        tags = [`EarlyAccess_Drop_${datePart}`];
      } else {
        tags = ['EarlyAccess_Drop_UnknownDate'];
      }
    }
    // Makes phone owners segmentable in Shopify admin (Customers > Tagged with).
    if (validatedPhone) {
      tags.push('Has_Phone');
    }

    await addTagsToCustomer(customerId, tags, shopDomain, adminApiToken);

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully subscribed!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Newsletter Sub Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to subscribe. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function findCustomerByEmail(
  email: string,
  shopDomain: string,
  adminApiToken: string,
) {
  const query = `
    query getCustomerByEmail($email: String!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            id
            email
            emailMarketingConsent {
              marketingState
              marketingOptInLevel
            }
          }
        }
      }
    }
  `;

  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminApiToken,
    },
    body: JSON.stringify({
      query,
      variables: { email: `email:${email}` },
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  return data.data?.customers?.edges?.[0]?.node || null;
}

async function createCustomerWithEmailMarketingConsent(
  email: string,
  name: string,
  phone: string | undefined,
  shopDomain: string,
  adminApiToken: string,
) {
  const mutation = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          emailMarketingConsent {
            marketingState
            marketingOptInLevel
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminApiToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          email,
          firstName: name,
          ...(phone ? {phone} : {}),
          emailMarketingConsent: {
            marketingState: 'SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
          ...(phone
            ? {
                smsMarketingConsent: {
                  marketingState: 'SUBSCRIBED',
                  marketingOptInLevel: 'SINGLE_OPT_IN',
                },
              }
            : {}),
        },
      },
    }),
  });

  const data = (await response.json()) as any;

  if (data.data?.customerCreate?.userErrors?.length > 0) {
    throw new Error(data.data.customerCreate.userErrors[0].message);
  }

  return data.data?.customerCreate?.customer;
}

async function updateCustomerEmailMarketingConsent(
  customerId: string,
  shopDomain: string,
  adminApiToken: string,
  name: string,
) {
  // We can update their name if we want, but the priority is the consent
  const mutation = `
    mutation customerEmailMarketingConsentUpdate($input: CustomerEmailMarketingConsentUpdateInput!) {
      customerEmailMarketingConsentUpdate(input: $input) {
        customer {
          id
          email
          firstName
          emailMarketingConsent {
            marketingState
            marketingOptInLevel
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminApiToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          customerId: customerId,
          emailMarketingConsent: {
            marketingState: 'SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
        },
      },
    }),
  });

  const data = (await response.json()) as any;

  if (data.data?.customerEmailMarketingConsentUpdate?.userErrors?.length > 0) {
    throw new Error(data.data.customerEmailMarketingConsentUpdate.userErrors[0].message);
  }

  // Optionally update their name as a separate mutation if needed, but not critical for newsletter sub
  return data.data?.customerEmailMarketingConsentUpdate?.customer;
}

/**
 * Fill in contact details a returning subscriber skipped last time
 * (name and/or phone). Called only for existing customers, so a second
 * signup that adds a phone number updates the customer instead of
 * dropping the new info.
 */
async function updateCustomerContact(
  customerId: string,
  shopDomain: string,
  adminApiToken: string,
  contact: {firstName?: string; phone?: string},
) {
  const mutation = `
    mutation customerUpdate($input: CustomerUpdateInput!) {
      customerUpdate(input: $input) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminApiToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          id: customerId,
          ...(contact.firstName ? {firstName: contact.firstName} : {}),
          ...(contact.phone ? {phone: contact.phone} : {}),
        },
      },
    }),
  });

  const data = (await response.json()) as any;

  if (data.data?.customerUpdate?.userErrors?.length > 0) {
    throw new Error(data.data.customerUpdate.userErrors[0].message);
  }

  return data.data?.customerUpdate?.customer;
}

/** Opt an existing customer into SMS marketing (separate from email consent). */
async function updateCustomerSmsMarketingConsent(
  customerId: string,
  shopDomain: string,
  adminApiToken: string,
) {
  const mutation = `
    mutation customerSmsMarketingConsentUpdate($input: CustomerSmsMarketingConsentUpdateInput!) {
      customerSmsMarketingConsentUpdate(input: $input) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminApiToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          customerId,
          smsMarketingConsent: {
            marketingState: 'SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
        },
      },
    }),
  });

  const data = (await response.json()) as any;

  if (data.data?.customerSmsMarketingConsentUpdate?.userErrors?.length > 0) {
    throw new Error(data.data.customerSmsMarketingConsentUpdate.userErrors[0].message);
  }

  return data.data?.customerSmsMarketingConsentUpdate?.customer;
}

async function addTagsToCustomer(customerId: string, tags: string[], shopDomain: string, adminApiToken: string) {
  const mutation = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        userErrors {
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': adminApiToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        id: customerId,
        tags,
      },
    }),
  });

  const data = (await response.json()) as any;
  if (data.data?.tagsAdd?.userErrors?.length > 0) {
    console.error("Failed to add tags:", data.data.tagsAdd.userErrors[0].message);
  }
} 