import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collections, products } from '../data/products';
import ProductCard from '../components/ProductCard';
import SortMenu from '../components/SortMenu';
import { CloseIcon } from '../components/Icons';

const sorts = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price, low to high' },
  { id: 'price-desc', label: 'Price, high to low' },
  { id: 'name', label: 'Name, A to Z' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('collection') ?? 'All';
  const active = requested === 'Home' ? 'Homeware' : requested;
  const sort = params.get('sort') ?? 'featured';
  const query = params.get('q') ?? '';

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (key === 'collection') next.delete('q');
    if (value && value !== 'All' && value !== 'featured') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = products.filter((p) => {
      const inCollection = active === 'All' || p.collection === active;
      const matches = !q || [p.name, p.collection, p.colour, p.tagline, p.description].join(' ').toLowerCase().includes(q);
      return inCollection && matches;
    });
    switch (sort) {
      case 'price-asc':
        out = [...out].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        out = [...out].sort((a, b) => b.price - a.price);
        break;
      case 'name':
        out = [...out].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        out = [...out].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    return out;
  }, [active, sort, query]);

  const title = active === 'All' ? 'The collection' : active;

  return (
    <main id="top" className="shop-page">
      <div className="container">
        <header className="shop-head" data-reveal>
          <h1>{title}</h1>
          <p>
            {active === 'All'
              ? 'Sixteen pieces, thrown by hand and made to be used. Mix the glazes, stack the plates, set the table.'
              : collections.includes(active as (typeof collections)[number])
                ? 'Hand-thrown stoneware, glazed in the colours of the studio.'
                : 'Hand-thrown stoneware for the everyday table.'}
          </p>
        </header>
      </div>

      <div className="shop-bar-wrap">
        <div className="container shop-bar">
          <div className="filters" role="group" aria-label="Filter by collection">
            <button
              className={`filter${active === 'All' && !query ? ' is-active' : ''}`}
              onClick={() => update('collection', 'All')}
            >
              All
            </button>
            {collections.map((c) => (
              <button
                key={c}
                className={`filter${active === c ? ' is-active' : ''}`}
                onClick={() => update('collection', c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="shop-tools">
            {query && (
              <button className="query-chip" onClick={() => update('q', null)}>
                “{query}” <CloseIcon />
              </button>
            )}
            <span className="shop-count">
              {list.length} {list.length === 1 ? 'piece' : 'pieces'}
            </span>
            <SortMenu value={sort} options={sorts} onChange={(id) => update('sort', id)} />
          </div>
        </div>
      </div>

      <section className="container shop-grid-wrap">
        {list.length > 0 ? (
          <div className="product-grid four shop-grid" key={`${active}-${sort}-${query}`}>
            {list.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="shop-empty">
            <p className="shop-empty-title">Nothing here just yet.</p>
            <p>
              {query
                ? `No pieces in ${active === 'All' ? 'the collection' : active} match “${query}”. Try another word or clear the search.`
                : 'Try another collection, or have a look at everything we make.'}
            </p>
            <div className="empty-actions">
              <Link
                to="/shop"
                className="btn"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Reset the filters
              </Link>
              {query && (
                <button type="button" className="link-quiet" onClick={() => update('q', null)}>
                  Clear search
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="container shop-end" data-reveal>
        <p>Not sure where to start?</p>
        <Link to="/story" className="link-arrow">
          Read how each piece is made <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
