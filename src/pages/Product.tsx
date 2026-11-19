import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CARE,
  SHIPPING,
  defaultOptions,
  formatPrice,
  getProduct,
  products,
  type Product,
} from '../data/products';
import { useCart } from '../lib/cart';
import { fetchStock } from '../lib/orders';
import { openAssistant } from '../lib/assistant';
import ProductCard from '../components/ProductCard';
import { Accordion, QtyStepper } from '../components/UI';
import { ArrowRight, ChatIcon, CheckIcon } from '../components/Icons';
import NotFound from './NotFound';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const product = getProduct(slug);
  const { add, open } = useCart();

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [available, setAvailable] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchStock(slug)
      .then((result) => {
        if (alive) setAvailable(result.available);
      })
      .catch(() => {
        /* the server still enforces stock at checkout */
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    setSelected(defaultOptions(product));
    setQty(1);
    setAdded(false);
  }, [product]);

  const related = useMemo(() => {
    if (!product) return [];
    const same = products.filter((p) => p.collection === product.collection && p.slug !== product.slug);
    const rest = products.filter((p) => p.slug !== product.slug && p.collection !== product.collection && p.featured);
    const pool = [...same, ...rest, ...products.filter((p) => p.slug !== product.slug)];
    const seen = new Set<string>();
    return pool.filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true))).slice(0, 4);
  }, [product]);

  if (!product) return <NotFound />;

  const onAdd = () => {
    add(product, selected, qty);
    setAdded(true);
    open();
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <main id="top" className="pdp-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link>
          <span>/</span>
          <Link to={`/shop?collection=${encodeURIComponent(product.collection)}`}>{product.collection}</Link>
          <span>/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="pdp">
          <div className="pdp-gallery">
            <figure className="pdp-main">
              <img
                src={product.image}
                alt={`${product.name} in ${product.colour.toLowerCase()} stoneware`}
                width="768"
                height="1376"
                fetchPriority="high"
              />
            </figure>
            <div className="pdp-detail">
              <figure>
                <img
                  src={product.detailImage}
                  alt={`Detail of the ${product.name.toLowerCase()} glaze and rim`}
                  width="540"
                  height="960"
                  loading="lazy"
                />
                <figcaption>A closer look at the glaze</figcaption>
              </figure>
              <div className="pdp-note">
                <p>
                  Each piece is thrown individually. Small differences in form, glaze and weight are part of
                  the piece you receive.
                </p>
              </div>
            </div>
          </div>

          <div className="pdp-info">
            <p className="pdp-collection">{product.collection}</p>
            <h1>{product.name}</h1>
            <p className="pdp-price">{formatPrice(product.price)}</p>
            <p className="pdp-desc">{product.description}</p>

            <div className="pdp-colour">
              <span className="swatch" style={{ background: product.swatch }} aria-hidden="true" />
              <span>
                Colour: <strong>{product.colour}</strong>
              </span>
            </div>

            {product.options.map((opt) => (
              <div className="pdp-option" key={opt.name}>
                <div className="pdp-option-head">
                  <span>{opt.name}</span>
                  <span className="pdp-option-value">{selected[opt.name]}</span>
                </div>
                <div className="option-btns" role="group" aria-label={opt.name}>
                  {opt.values.map((v) => (
                    <button
                      key={v}
                      className={selected[opt.name] === v ? 'is-active' : ''}
                      onClick={() => setSelected((s) => ({ ...s, [opt.name]: v }))}
                      aria-pressed={selected[opt.name] === v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pdp-buy">
              <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(99, n)))} />
              <button className="btn btn-buy" onClick={onAdd}>
                {added ? (
                  <>
                    Added to bag <CheckIcon />
                  </>
                ) : (
                  <>
                    Add to bag <span className="btn-price">{formatPrice(product.price * qty)}</span>
                  </>
                )}
              </button>
            </div>

            <div className="pdp-agent">
              <button
                type="button"
                className="pdp-agent-main"
                onClick={() =>
                  openAssistant({
                    slug: product.slug,
                    question: `Tell me about the ${product.name} and who it suits.`,
                  })
                }
              >
                <ChatIcon />
                Ask the studio about this piece
                <ArrowRight />
              </button>
              <button
                type="button"
                className="pdp-agent-task"
                onClick={() =>
                  openAssistant({
                    slug: product.slug,
                    question: `Build a small table setting around the ${product.name}. Search the catalogue, choose a few pieces that go with it, and propose adding them to my bag.`,
                    autoSend: true,
                  })
                }
              >
                <span aria-hidden="true">✳</span> Style it for me — let the studio agent choose
              </button>
            </div>

            <p className="pdp-stock">
              <span className="pdp-dot" aria-hidden="true" />
              {available === 0
                ? 'Out of stock. Write to the studio for the next batch.'
                : available !== null && available <= 5
                  ? `Only ${available} left in this batch. Ships within 2–3 days.`
                  : 'In stock. Ships within 2–3 days.'}
            </p>

            <div className="pdp-accs">
              <Accordion title="Details" defaultOpen>
                <ul className="detail-list">
                  {product.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                  <li>Because each piece is made by hand, dimensions may vary slightly.</li>
                </ul>
              </Accordion>
              <Accordion title="Care">
                <p>{CARE}</p>
              </Accordion>
              <Accordion title="Shipping & returns">
                <p>{SHIPPING}</p>
              </Accordion>
            </div>

            <div className="pdp-help">
              <p>Questions about a piece?</p>
              <a href="mailto:hello@ler.studio" className="link-arrow small">
                Write to the studio <ArrowRight />
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="section related">
        <div className="container">
          <header className="section-head" data-reveal>
            <div>
              <h2>Completes the table</h2>
            </div>
            <Link to="/shop" className="link-arrow">
              Shop all <ArrowRight />
            </Link>
          </header>
          <div className="product-grid four">
            {related.map((p: Product, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
