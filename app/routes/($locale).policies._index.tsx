import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from 'react-router';
import {ArrowUpRight} from 'lucide-react';

export async function loader({context}: LoaderFunctionArgs) {
  const data = await context.storefront.query(POLICIES_QUERY);
  const policies = Object.values(data.shop || {});

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <div className="w-full bg-white">
      <section className="border-b border-black/10">
        <div className="mx-auto w-full max-w-6xl px-5 pt-12 pb-12 sm:px-8 sm:pt-16 sm:pb-16">
          <div className="flex flex-col items-center text-center">
            <p className="mb-5 text-[11px] font-bold tracking-[0.3em] text-black/35 uppercase">
              Legal
            </p>
            <h1 className="text-3xl font-black tracking-tight text-black uppercase sm:text-4xl md:text-5xl">
              Policies
            </h1>
            <div className="my-6 h-1 w-16 bg-black" />
            <p className="max-w-xl text-sm font-medium tracking-wide text-black/45 lowercase">
              everything you need to know about orders, shipping, and returns.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-5 pt-10 pb-20 sm:px-8 sm:pt-14 sm:pb-28">
        <ul className="grid gap-px border border-black/10 bg-black/10 sm:grid-cols-2">
          {policies.map((policy) => {
            if (!policy) return null;
            return (
              <li key={policy.id} className="bg-white">
                <Link
                  to={`/policies/${policy.handle}`}
                  prefetch="intent"
                  className="group flex items-center justify-between gap-4 p-8 transition-colors hover:bg-[#f7f4f1] sm:p-10"
                >
                  <span className="text-lg font-bold tracking-tight text-black uppercase">
                    {policy.title}
                  </span>
                  <ArrowUpRight
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden
                    className="shrink-0 text-black/30 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-black"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;
