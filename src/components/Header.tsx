import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { useSession } from '../lib/auth';
import { useEscape, useFocusTrap, useLockBody } from '../lib/hooks';
import SearchOverlay from './SearchOverlay';
import { ArrowRight, BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';

const nav = [
  { label: 'Shop all', to: '/shop' },
  { label: 'Table', to: '/shop?collection=Table' },
  { label: 'Tea & coffee', to: '/shop?collection=Tea%20%26%20coffee' },
  { label: 'Serve', to: '/shop?collection=Serve' },
  { label: 'Homeware', to: '/shop?collection=Homeware' },
  { label: 'Our story', to: '/story' },
];

export default function Header() {
  const { count, open } = useCart();
  const { data: session } = useSession();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const activeCollection = pathname === '/shop' ? (params.get('collection') ?? 'All') : '';
  const isCurrent = (label: string, to: string) => {
    if (to === '/story') return pathname === '/story';
    if (to === '/shop') return pathname === '/shop' && activeCollection === 'All';
    return pathname === '/shop' && activeCollection === label;
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstName = session?.user.name?.trim().split(/\s+/)[0];

  useLockBody(menuOpen);
  useEscape(() => setMenuOpen(false), menuOpen);
  useFocusTrap(menuRef, menuOpen);

  return (
    <>
      <div className="announce">
        <p>
          Complimentary shipping over $120
        </p>
      </div>

      <header className="site-head">
        <div className="head-inner">
          <div className="head-left">
            <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <MenuIcon />
            </button>
            <nav className="desk-nav" aria-label="Main">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`nav-link${isCurrent(item.label, item.to) ? ' is-active' : ''}`}
                  aria-current={isCurrent(item.label, item.to) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link to="/" className="logo" aria-label="LER home">
            ler<span>.</span>
          </Link>

          <div className="head-right">
            <button className="util" onClick={() => setSearchOpen(true)} aria-label="Search">
              <span className="util-text">Search</span>
              <SearchIcon />
            </button>
            <Link
              to="/account"
              className="util util-account"
              aria-label={session ? `Your account, ${firstName}` : 'Sign in'}
            >
              <span className="util-text">{session ? firstName : 'Sign in'}</span>
              <UserIcon />
            </Link>
            <button className="util util-bag" onClick={open} aria-label={`Open bag, ${count} items`}>
              <span className="util-text">Bag</span>
              <span className="bag-count">({count})</span>
              <BagIcon className="bag-icon" />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            className="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="mobile-menu-top">
              <span className="logo small">
                ler<span>.</span>
              </span>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>
            <nav className="mobile-nav" aria-label="Mobile">
              {nav.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={isCurrent(item.label, item.to) ? 'is-active' : undefined}
                    aria-current={isCurrent(item.label, item.to) ? 'page' : undefined}
                  >
                    {item.label}
                    <ArrowRight />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mobile-menu-utils">
              <Link to="/account" onClick={() => setMenuOpen(false)}>
                {session ? 'Your account' : 'Sign in'}
                <ArrowRight />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  open();
                }}
              >
                Bag ({count})
              </button>
            </div>
            <div className="mobile-menu-foot">
              <p>Stoneware for the everyday table.</p>
              <a href="mailto:hello@ler.studio">hello@ler.studio</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
