import { ActionFunctionArgs } from '@shopify/remix-oxygen';
import { LOCK_PAGE_QUERY } from '~/graphql/lockQuery';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const formData = await request.formData();
  const password = formData.get('password');
  
  const { storefront } = context;
  const lockData = await storefront.query(LOCK_PAGE_QUERY, { cache: storefront.CacheNone() });
  const metafields = lockData?.page?.metafields || [];
  const storePassword = metafields.find((m: any) => m && m.key === 'store_password')?.value || 'test';

  if (password === storePassword && storePassword.trim() !== '') {
    context.session.set('unlockedPassword', password);
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': await context.session.commit(),
      }
    });
  } else {
    return new Response(JSON.stringify({ success: false, error: 'Incorrect password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
