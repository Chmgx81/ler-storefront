import { Link } from 'react-router-dom';
import { defaultOptions, formatPrice, type Product } from '../data/products';
import { useCart } from '../lib/cart';
import { PlusIcon } from './Icons';

type Props = { product: Product; index?: number; compact?: boolean };

export default function ProductCard({ product, index = 0, compact = false }: Props) {
  const { add, open } = useCart();

  const quickAdd = () => {
    add(product, defaultOptions(product), 1);
    open();
  };

  return (
    <article
      className={`pcard${compact ? ' is-compact' : ''}`}
      data-reveal
      style={{ ['--d' as string]: `${(index % 4) * 70}ms` }}
    >
      <div className="pcard-media">
        <Link to={`/product/${product.slug}`} className="pcard-link" aria-label={`View ${product.name}`}>
          <img
            src={product.image}
            alt={`${product.name} in ${product.colour.toLowerCase()} stoneware`}
            width="768"
            height="1376"
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </Link>
        <button className="quick-add" onClick={quickAdd} aria-label={`Quick add ${product.name} to bag`}>
          Quick add
          <PlusIcon />
        </button>
      </div>
      <div className="pcard-info">
        <div className="pcard-copy">
          <h3>
            <Link to={`/product/${product.slug}`}>{product.name}</Link>
          </h3>
          <p>{product.tagline}</p>
        </div>
        <span className="price">{formatPrice(product.price)}</span>
      </div>
    </article>
  );
}
