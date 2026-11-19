import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { collections, formatPrice, products } from '../data/products';
import { useEscape, useFocusTrap, useLockBody } from '../lib/hooks';
import { ArrowRight, CloseIcon, SearchIcon } from './Icons';

type Props = { open: boolean; onClose: () => void };

export default function SearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useLockBody(open);
  useEscape(onClose, open);
  useFocusTrap(panelRef, open, inputRef);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.filter((p) => p.featured).slice(0, 4);
    return products
      .filter((p) =>
        [p.name, p.collection, p.colour, p.tagline, p.description].join(' ').toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!results.length) return;
    if (results.length === 1) {
      navigate(`/product/${results[0].slug}`);
      onClose();
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="search-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Search the collection"
        >
          <motion.div
            ref={panelRef}
            className="search-panel"
            initial={{ y: -24 }}
            animate={{ y: 0 }}
            exit={{ y: -16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="search-top container">
              <form className="search-form" onSubmit={submit} role="search">
                <SearchIcon className="search-form-icon" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pieces, colours, collections"
                  aria-label="Search pieces"
                  autoComplete="off"
                />
              </form>
              <button className="icon-btn" onClick={onClose} aria-label="Close search">
                <CloseIcon />
              </button>
            </div>

            <div className="search-body container">
              <p className="search-label">{query.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Most loved'}</p>

              {results.length > 0 ? (
                <ul className="search-results">
                  {results.map((p) => (
                    <li key={p.slug}>
                      <Link to={`/product/${p.slug}`} onClick={onClose} className="search-result">
                        <img src={p.image} alt="" loading="lazy" />
                        <span className="search-result-copy">
                          <span className="search-result-name">{p.name}</span>
                          <span className="search-result-meta">
                            {p.colour} · {p.collection}
                          </span>
                        </span>
                        <span className="search-result-price">{formatPrice(p.price)}</span>
                        <ArrowRight className="search-result-arrow" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-empty">
                  <p>
                    Nothing matched “{query.trim()}”. Try <em>teapot</em>, <em>olive</em> or <em>vase</em>.
                  </p>
                </div>
              )}

              {!query.trim() && (
                <div className="search-collections">
                  <span className="search-label">Browse by collection</span>
                  <div className="search-collection-links">
                    {collections.map((c) => (
                      <Link key={c} to={`/shop?collection=${encodeURIComponent(c)}`} onClick={onClose}>
                        {c}
                        <ArrowRight />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
