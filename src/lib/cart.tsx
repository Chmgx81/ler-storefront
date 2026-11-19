import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import { getProduct, type Product } from '../data/products';
import { MAX_LINE_QTY, MAX_ORDER_LINES } from './pricing';

export type CartLine = {
  key: string;
  slug: string;
  qty: number;
  options: Record<string, string>;
};

type CartState = { lines: CartLine[] };
type Action =
  | { type: 'add'; line: CartLine }
  | { type: 'remove'; key: string }
  | { type: 'qty'; key: string; qty: number }
  | { type: 'clear' };

const STORAGE_KEY = 'ler.bag.v1';
export const FREE_SHIPPING = 120;

const lineKey = (slug: string, options: Record<string, string>) =>
  `${slug}::${Object.entries(options)
    .map(([k, v]) => `${k}=${v}`)
    .join('|')}`;

/** Rebuild a line from untrusted storage or a stale catalogue, never trusting saved values. */
function normalizeLine(raw: unknown): CartLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.slug !== 'string') return null;
  const product = getProduct(candidate.slug);
  if (!product) return null;

  const qty = Math.floor(Number(candidate.qty));
  if (!Number.isFinite(qty) || qty < 1) return null;

  const saved = candidate.options && typeof candidate.options === 'object'
    ? (candidate.options as Record<string, unknown>)
    : {};
  const options: Record<string, string> = {};
  for (const option of product.options) {
    const value = saved[option.name];
    options[option.name] =
      typeof value === 'string' && option.values.includes(value) ? value : option.values[0];
  }

  return { key: lineKey(product.slug, options), slug: product.slug, qty: Math.min(MAX_LINE_QTY, qty), options };
}

/** Read the saved bag before first paint so the full page renders in one pass. */
function initialCart(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.lines)) return { lines: [] };

    const lines: CartLine[] = [];
    for (const rawLine of parsed.lines.slice(0, MAX_ORDER_LINES)) {
      const line = normalizeLine(rawLine);
      if (!line) continue;
      const existing = lines.find((item) => item.key === line.key);
      if (existing) existing.qty = Math.min(MAX_LINE_QTY, existing.qty + line.qty);
      else lines.push(line);
    }
    return { lines };
  } catch {
    return { lines: [] };
  }
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((l) => l.key === action.line.key);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.key === action.line.key
              ? { ...l, qty: Math.min(MAX_LINE_QTY, l.qty + Math.max(0, Math.floor(action.line.qty))) }
              : l,
          ),
        };
      }
      return { lines: [...state.lines, action.line] };
    }
    case 'remove':
      return { lines: state.lines.filter((l) => l.key !== action.key) };
    case 'qty':
      if (action.qty <= 0) return { lines: state.lines.filter((l) => l.key !== action.key) };
      return {
        lines: state.lines.map((l) =>
          l.key === action.key ? { ...l, qty: Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(action.qty))) } : l,
        ),
      };
    case 'clear':
      return { lines: [] };
  }
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  add: (product: Product, options: Record<string, string>, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage can be unavailable */
    }
  }, [state]);

  const add = useCallback((product: Product, options: Record<string, string>, qty = 1) => {
    dispatch({
      type: 'add',
      line: { key: lineKey(product.slug, options), slug: product.slug, qty, options },
    });
  }, []);

  const remove = useCallback((key: string) => dispatch({ type: 'remove', key }), []);
  const setQty = useCallback((key: string, qty: number) => dispatch({ type: 'qty', key, qty }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const count = useMemo(() => state.lines.reduce((n, l) => n + l.qty, 0), [state.lines]);
  const subtotal = useMemo(
    () =>
      state.lines.reduce((sum, l) => {
        const p = getProduct(l.slug);
        return sum + (p ? p.price * l.qty : 0);
      }, 0),
    [state.lines],
  );

  const value = useMemo(
    () => ({ lines: state.lines, count, subtotal, isOpen, add, remove, setQty, clear, open, close }),
    [state.lines, count, subtotal, isOpen, add, remove, setQty, clear, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export const makeLineKey = lineKey;
