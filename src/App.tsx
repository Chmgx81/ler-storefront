import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CartProvider } from './lib/cart';
import { useReveal, useScrollTop } from './lib/hooks';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AssistantChat from './components/AssistantChat';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductPage from './pages/Product';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Account from './pages/Account';
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Admin = lazy(() => import('./pages/Admin'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));
const Legal = lazy(() => import('./pages/Legal'));
import Story from './pages/Story';
import NotFound from './pages/NotFound';

const TITLES: Record<string, string> = {
  '/': 'LER — Stoneware for the everyday table',
  '/shop': 'Shop all pieces — LER',
  '/checkout': 'Checkout — LER',
  '/order/confirmed': 'Order confirmed — LER',
  '/payment/return': 'Confirming payment — LER',
  '/account': 'Your account — LER',
  '/account/forgot': 'Reset password — LER',
  '/account/reset': 'Choose a password — LER',
  '/admin': 'Order ledger — LER',
  '/story': 'Our story — LER',
  '/legal/privacy': 'Privacy — LER',
  '/legal/terms': 'Terms — LER',
  '/legal/shipping-returns': 'Shipping & returns — LER',
};

function Shell() {
  const { pathname } = useLocation();
  useScrollTop();
  useReveal();

  useEffect(() => {
    document.title = TITLES[pathname] ?? (pathname.startsWith('/product/') ? 'A piece — LER' : 'Not found — LER');
  }, [pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <div id="main-content" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<div className="container route-loading">Opening…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/confirmed" element={<OrderConfirmed />} />
            <Route path="/payment/return" element={<PaymentReturn />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/forgot" element={<ForgotPassword />} />
            <Route path="/account/reset" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/legal/:topic" element={<Legal />} />
            <Route path="/story" element={<Story />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />
      <CartDrawer />
      <AssistantChat />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Shell />
      </CartProvider>
    </BrowserRouter>
  );
}
