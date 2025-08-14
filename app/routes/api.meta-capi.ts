import { type LoaderFunctionArgs } from 'react-router';

type MetaCapiRequest = {
  event_name: string;
  event_time?: number; // seconds
  event_id?: string;
  event_source_url?: string;
  action_source?: 'website';
  user_data?: {
    em?: string; // email (plain or sha256)
    ph?: string; // phone (plain or sha256)
    external_id?: string;
    client_user_agent?: string;
    client_ip_address?: string;
  };
  custom_data?: Record<string, any> & {
    currency?: string;
    value?: number;
    content_type?: string;
    content_ids?: string[];
    contents?: Array<{ id: string; quantity?: number; item_price?: number }>;
  };
  test_event_code?: string;
};

async function sha256Hex(input: string) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function looksHashed(value?: string) {
  return !!value && /^[a-f0-9]{64}$/i.test(value);
}

export async function action({ request, context }: LoaderFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = (await request.json()) as MetaCapiRequest;

    const pixelId =
      (context.env as any).META_PIXEL_ID ||
      (context.env as any).PUBLIC_META_PIXEL_ID ||
      '1023189219674873';
    const accessToken = (context.env as any).META_CAPI_ACCESS_TOKEN;
    const testEventCode = body.test_event_code || (context.env as any).META_CAPI_TEST_EVENT_CODE;

    if (!pixelId || !accessToken) {
      return new Response('Server not configured for Meta CAPI', { status: 500 });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const event_time = body.event_time || nowSeconds;
    const url = new URL(request.url);
    const referer = request.headers.get('referer') || `${url.origin}`;
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const clientIp =
      request.headers.get('cf-connecting-ip') || forwardedFor.split(',')[0]?.trim() || undefined;

    // Hash PII if not hashed
    const user_data = Object.assign({}, body.user_data);
    if (user_data?.em && !looksHashed(user_data.em)) {
      user_data.em = await sha256Hex(user_data.em);
    }
    if (user_data?.ph && !looksHashed(user_data.ph)) {
      user_data.ph = await sha256Hex(user_data.ph);
    }
    if (!user_data) {
      // ensure object
    }
    const final_user_data = {
      ...user_data,
      client_user_agent: user_data?.client_user_agent || userAgent,
      client_ip_address: user_data?.client_ip_address || clientIp,
    };

    const payload = {
      data: [
        {
          event_name: body.event_name,
          event_time,
          event_source_url: body.event_source_url || referer,
          action_source: body.action_source || 'website',
          event_id: body.event_id,
          user_data: final_user_data,
          custom_data: body.custom_data || {},
        },
      ],
      access_token: accessToken,
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    } as any;

    const graphVersion = (context.env as any).META_GRAPH_VERSION || 'v20.0';
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${pixelId}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    const resultText = await response.text();
    const status = response.status;
    return new Response(resultText, {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export function loader() {
  return new Response('Not Found', { status: 404 });
}


