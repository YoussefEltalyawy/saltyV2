import { Aside } from '~/components/Aside';
import { HeaderMenu } from '~/components/Header';
import type { HeaderQuery } from 'storefrontapi.generated';

interface MenuAsideProps {
  header: HeaderQuery;
  publicStoreDomain: string;
}

export function MenuAside({
  header,
  publicStoreDomain,
}: MenuAsideProps) {
  return (
    header.menu &&
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading="MENU">
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
      </Aside>
    )
  );
} 