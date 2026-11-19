import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatPrice, getProduct } from '../data/products';
import { FREE_SHIPPING, useCart } from '../lib/cart';
import { useEscape, useFocusTrap, useLockBody } from '../lib/hooks';
import { CloseIcon, MinusIcon, PlusIcon } from './Icons';

export default function CartDrawer() {
  const { lines, count, subtotal, isOpen, close, setQty, remove } = useCart();
  const panelRef = useRef<HTMLElement>(null);

  useLockBody(isOpen);
  useEscape(close, isOpen);
  useFocusTrap(panelRef, isOpen);

  const remaining = Math.max(0, FREE_SHIPPING - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="cart-layer">
          <motion.button
            className="cart-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
            aria-label="Close bag"
            tabIndex={-1}
          />
          <motion.aside
            ref={panelRef}
            tabIndex={-1}
            className="cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
          >
            <div className="cart-head">
              <h2>
                Your bag <span>({count})</span>
              </h2>
              <button className="icon-btn" onClick={close} aria-label="Close bag">
                <CloseIcon />
              </button>
            </div>

            {lines.length > 0 && (
              <div className="ship-meter">
                <p>
                  {remaining > 0 ? (
                    <>
                      You’re <strong>{formatPrice(remaining)}</strong> from free shipping
                    </>
                  ) : (
                    <>Free shipping is on us</>
                  )}
                </p>
                <div className="ship-track" aria-hidden="true">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="cart-body">
              {lines.length === 0 ? (
                <div className="cart-empty">
                  <p className="cart-empty-title">Your bag is empty.</p>
                  <p className="cart-empty-copy">Good things take their time. Have a look around.</p>
                  <Link to="/shop" className="btn" onClick={close}>
                    Shop the collection
                  </Link>
                </div>
              ) : (
                <ul className="cart-lines">
                  {lines.map((line) => {
                    const product = getProduct(line.slug);
                    if (!product) return null;
                    const opts = Object.entries(line.options)
                      .map(([, v]) => v)
                      .join(' · ');
                    return (
                      <motion.li
                        key={line.key}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="cart-line"
                      >
                        <Link to={`/product/${product.slug}`} onClick={close} className="cart-thumb">
                          <img src={product.image} alt={product.name} width="768" height="1376" />
                        </Link>
                        <div className="cart-line-info">
                          <div className="cart-line-top">
                            <Link to={`/product/${product.slug}`} onClick={close}>
                              {product.name}
                            </Link>
                            <span>{formatPrice(product.price * line.qty)}</span>
                          </div>
                          <p className="cart-line-meta">
                            {product.colour}
                            {opts ? ` · ${opts}` : ''}
                          </p>
                          <div className="cart-line-bottom">
                            <div className="qty small">
                              <button
                                onClick={() => setQty(line.key, line.qty - 1)}
                                aria-label={`Decrease quantity of ${product.name}`}
                              >
                                <MinusIcon />
                              </button>
                              <span aria-live="polite">{line.qty}</span>
                              <button
                                onClick={() => setQty(line.key, line.qty + 1)}
                                aria-label={`Increase quantity of ${product.name}`}
                              >
                                <PlusIcon />
                              </button>
                            </div>
                            <button className="cart-remove" onClick={() => remove(line.key)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <div className="cart-foot">
                <div className="cart-total">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <p className="cart-note">Taxes and shipping calculated at checkout.</p>
                <Link to="/checkout" className="btn btn-block" onClick={close}>
                  Continue to checkout
                </Link>
                <button className="link-quiet" onClick={close}>
                  Keep shopping
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
