import { useId } from 'react';
import { Aside } from '~/components/Aside';
import { Link } from 'react-router';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import { SearchResultsPredictive } from '~/components/SearchResultsPredictive';

export function SearchAside() {
  const queriesDatalistId = useId();
  return (
    <Aside type="search" animation="top" showHeader={false} heading={null}>
      <div className="predictive-search">
        <br />
        <SearchFormPredictive>
          {({ fetchResults, goToSearch, inputRef }) => (
            <>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search for anything"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
                className="w-full !text-2xl placeholder:text-3xl placeholder:text-gray-400 border-none outline-none focus:ring-0 bg-transparent px-0 py-2"
                style={{ boxShadow: 'none', border: 'none' }}
              />
            </>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({ items, total, term, state, closeSearch }) => {
            const { products, ...rest } = items;
            const showViewAll = products && products.length > 4;
            const firstFour = products ? products.slice(0, 4) : [];

            if (state === 'loading' && term.current) {
              return <div>Loading...</div>;
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={term} />;
            }

            return (
              <>
                {/* Only show first 4 products */}
                <SearchResultsPredictive.Products
                  products={firstFour}
                  closeSearch={closeSearch}
                  term={term}
                />
                {/* Show view all button if more than 4 */}
                {showViewAll && (
                  <button
                    className="w-full mt-4 py-3 rounded bg-black text-white text-lg font-semibold hover:bg-gray-900 transition"
                    onClick={() => closeSearch()}
                  >
                    <Link to={`${SEARCH_ENDPOINT}?q=${term.current}`}>View all results</Link>
                  </button>
                )}
                {/* Render other result types as before */}
                <SearchResultsPredictive.Queries
                  queries={rest.queries}
                  queriesDatalistId={queriesDatalistId}
                />
                <SearchResultsPredictive.Collections
                  collections={rest.collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={rest.pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={rest.articles}
                  closeSearch={closeSearch}
                  term={term}
                />
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
} 