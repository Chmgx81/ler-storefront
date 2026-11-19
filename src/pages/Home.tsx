import { Link } from 'react-router-dom';
import { formatPrice, getProduct, products } from '../data/products';
import ProductCard from '../components/ProductCard';
import { ArrowRight, ArrowUpRight } from '../components/Icons';

const heroProduct = getProduct('round-bellied-teapot')!;

const values = [
  ['Thrown by hand', 'Small batches, never moulds'],
  ['Free shipping', 'On all orders over $120'],
  ['30-day returns', 'On unused pieces, no fuss'],
];

const collectionCards = [
  {
    title: 'Table',
    to: '/shop?collection=Table',
    image: '/editorial/flatlay.webp',
    meta: 'Plates, bowls and the everyday set',
  },
  {
    title: 'Tea & coffee',
    to: '/shop?collection=Tea%20%26%20coffee',
    image: '/products/teacup-and-saucer-set.webp',
    meta: 'Cups, pots and slow mornings',
  },
  {
    title: 'Serve',
    to: '/shop?collection=Serve',
    image: '/products/oval-serving-platter.webp',
    meta: 'Platters, bowls and the shared table',
  },
  {
    title: 'Homeware',
    to: '/shop?collection=Homeware',
    image: '/products/narrow-neck-vase.webp',
    meta: 'Vases, planters and quiet corners',
  },
];

export default function Home() {
  const featured = products.filter((p) => p.featured).slice(0, 4);

  return (
    <main id="top">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Made by hand,
            <br />
            for <em>every day.</em>
          </h1>
          <p className="hero-lede">
            Stoneware thrown in small batches, glazed in warm, quiet colours. Pieces that feel good in the
            hand and better after years of use.
          </p>
          <div className="hero-actions">
            <Link to="/shop" className="btn">
              Shop the collection
            </Link>
            <Link to="/story" className="link-arrow">
              Inside the studio <ArrowRight />
            </Link>
          </div>
          <p className="hero-foot">Small-batch stoneware · Copenhagen</p>
        </div>

        <div className="hero-media">
          <img
            src={heroProduct.image}
            alt="The Round-Bellied Teapot in olive stoneware on a linen tablecloth"
            width="768"
            height="1376"
            fetchPriority="high"
          />
          <Link to={`/product/${heroProduct.slug}`} className="hero-tag">
            <span className="hero-tag-copy">
              <span className="hero-tag-name">{heroProduct.name}</span>
              <span className="hero-tag-meta">
                {heroProduct.colour} · {formatPrice(heroProduct.price)}
              </span>
            </span>
            <ArrowUpRight />
          </Link>
        </div>
      </section>

      <div className="value-strip">
        <div className="container value-grid">
          {values.map(([title, copy]) => (
            <div className="value" key={title}>
              <span className="value-dot" aria-hidden="true" />
              <div>
                <p className="value-title">{title}</p>
                <p className="value-copy">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <header className="section-head" data-reveal>
            <div>
              <h2>Pieces that earn their place</h2>
              <p className="section-sub">The four we reach for most, in the studio and at home.</p>
            </div>
            <Link to="/shop" className="link-arrow">
              View all pieces <ArrowRight />
            </Link>
          </header>

          <div className="product-grid four">
            {featured.map((product, i) => (
              <ProductCard key={product.slug} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="editorial">
        <div className="editorial-media">
          <img
            src="/editorial/table-scene.webp"
            alt="A linen-covered table set with stoneware bowls, cups and a sculptural vase"
            width="768"
            height="1376"
            loading="lazy"
          />
        </div>
        <div className="editorial-copy">
          <h2>Every piece carries the marks of the hand that made it.</h2>
          <p>
            We throw in small runs, glaze by eye and keep the imperfect parts. A slightly uneven rim or a
            pooled edge of colour is not a flaw. It is the difference between something made and something
            manufactured.
          </p>
          <Link to="/story" className="link-arrow light">
            How it’s made <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <header className="section-head" data-reveal>
            <div>
              <h2>Start with a room</h2>
              <p className="section-sub">Four collections, one material. They mix without trying.</p>
            </div>
            <Link to="/shop" className="link-arrow">
              Shop all <ArrowRight />
            </Link>
          </header>

          <div className="collection-grid">
            {collectionCards.map((c, i) => (
              <Link
                key={c.title}
                to={c.to}
                className="collection-card"
                data-reveal
                style={{ ['--d' as string]: `${i * 90}ms` }}
              >
                <div className="collection-media">
                  <img src={c.image} alt={`${c.title} collection`} width="768" height="1376" loading="lazy" />
                  <span className="collection-arrow">
                    <ArrowUpRight />
                  </span>
                </div>
                <div className="collection-info">
                  <h3>{c.title}</h3>
                  <p>{c.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="quote-band" data-reveal>
        <div className="container quote-inner">
          <span className="quote-mark" aria-hidden="true">
            “
          </span>
          <blockquote>The best pots are the ones you reach for without thinking.</blockquote>
          <p className="quote-cite">Inger Holm, founder and potter</p>
        </div>
      </section>
    </main>
  );
}
