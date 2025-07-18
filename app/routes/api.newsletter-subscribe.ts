import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Please enter your name'),
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

    const validation = subscribeSchema.safeParse({ email, name });
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error.errors[0].message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email: validatedEmail, name: validatedName } = validation.data;
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

    if (existingCustomer) {
      await updateCustomerEmailMarketingConsent(
        existingCustomer.id,
        shopDomain,
        adminApiToken,
        validatedName,
      );
    } else {
      await createCustomerWithEmailMarketingConsent(
        validatedEmail,
        validatedName,
        shopDomain,
        adminApiToken,
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully subscribed!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to subscribe. Please try again.' }),
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
          emailMarketingConsent: {
            marketingState: 'SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
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
  const mutation = `
    mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
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
          id: customerId,
          firstName: name,
          emailMarketingConsent: {
            marketingState: 'SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
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