import * as React from 'react';
import { Pagination } from '@shopify/hydrogen';

/**
 * <PaginatedResourceSection > is a component that encapsulate how the previous and next behaviors throughout your application.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  resourcesClassName,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: React.FunctionComponent<{ node: NodesType; index: number }>;
  resourcesClassName?: string;
}) {
  return (
    <Pagination connection={connection}>
      {({ nodes, isLoading, PreviousLink, NextLink }) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({ node, index }),
        );

        return (
          <div>
            <PreviousLink>
              {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
            </PreviousLink>
            {resourcesClassName ? (
              <div className={resourcesClassName}>{resourcesMarkup}</div>
            ) : (
              resourcesMarkup
            )}
            <div style={{textAlign: 'center'}}>
              <NextLink>
                {isLoading ? 'Loading...' : (
                  <span style={{
                    border: '1px solid black',
                    borderRadius: 0,
                    padding: '0.5em 1em',
                    display: 'inline-block',
                    marginTop: '1em',
                    cursor: 'pointer',
                  }}>
                    Load more
                  </span>
                )}
              </NextLink>
            </div>
          </div>
        );
      }}
    </Pagination>
  );
}
