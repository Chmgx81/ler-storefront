import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatPrice, getProduct } from '../data/products';
import { askAssistant, type AssistantReply, type CartAction, type ChatTurn, type ProductHint } from '../lib/assistant';
import { useCart } from '../lib/cart';
import { useEscape, useFocusTrap, useLockBody } from '../lib/hooks';
import { ArrowRight, ChatIcon, CloseIcon } from './Icons';

type Entry = {
  role: 'user' | 'assistant';
  text: string;
  products?: ProductHint[];
  actions?: CartAction[];
  mode?: AssistantReply['mode'];
  notice?: string;
};

const STARTERS = [
  'What should I put on the dinner table?',
  'Do you have anything for coffee?',
  'Which pieces are good for gifts?',
];

const FOLLOW_UPS = ['What goes well with it?', 'Tell me about shipping', 'Show me something for a gift'];

export default function AssistantChat() {
  const { add, open: openBag } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [contextSlug, setContextSlug] = useState('');
  const [attentive, setAttentive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragY, setDragY] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dragStart = useRef<number | null>(null);
  const dragCurrent = useRef(0);
  const sendRef = useRef<(text: string, slug?: string) => Promise<void>>(async () => {});

  useLockBody(isOpen);
  useEscape(() => setIsOpen(false), isOpen);
  useFocusTrap(panelRef, isOpen, inputRef);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  useEffect(() => {
    scrollToEnd();
  }, [entries, busy]);

  // iOS Safari does not shrink dvh when the keyboard opens; use the visual viewport instead.
  useEffect(() => {
    if (!isOpen) return;
    const viewport = window.visualViewport;
    const update = () => {
      const height = viewport?.height ?? window.innerHeight;
      panelRef.current?.style.setProperty('--vv-height', `${Math.round(height)}px`);
      scrollToEnd();
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      panelRef.current?.style.removeProperty('--vv-height');
    };
  }, [isOpen]);

  // Keep the composer compact but let long questions grow to a few lines.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(112, Math.max(24, field.scrollHeight))}px`;
  }, [input, isOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAttentive(false), 5000);
    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string; question?: string; autoSend?: boolean }>).detail;
      if (detail?.slug) setContextSlug(detail.slug);
      else setContextSlug('');
      setIsOpen(true);
      if (detail?.question) {
        if (detail.autoSend) void sendRef.current(detail.question, detail.slug);
        else setInput(detail.question);
      }
    };
    window.addEventListener('ler:assistant-open', handler);
    return () => window.removeEventListener('ler:assistant-open', handler);
  }, []);

  const send = async (text: string, slugOverride?: string) => {
    const question = text.trim().slice(0, 500);
    if (!question || busy) return;
    setError('');
    setInput('');
    setEntries((current) => [...current, { role: 'user', text: question }]);
    setBusy(true);
    scrollToEnd();

    const history: ChatTurn[] = [
      ...entries.filter((entry) => entry.role !== 'assistant' || entry.text).map((entry) => ({
        role: entry.role,
        content: entry.text,
      })),
      { role: 'user' as const, content: question },
    ].slice(-8);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await askAssistant(history, controller.signal, slugOverride ?? contextSlug);
      setEntries((current) => [
        ...current,
        {
          role: 'assistant',
          text: reply.message,
          products: reply.products,
          actions: reply.actions,
          mode: reply.mode,
          notice: reply.notice,
        },
      ]);
    } catch (problem) {
      if (problem instanceof DOMException && problem.name === 'AbortError') return;
      setError(problem instanceof Error ? problem.message : 'The assistant could not answer that.');
    } finally {
      setBusy(false);
      abortRef.current = null;
      scrollToEnd();
    }
  };

  sendRef.current = send;

  const endDrag = () => {
    if (dragStart.current === null) return;
    if (dragCurrent.current > 110) setIsOpen(false);
    dragStart.current = null;
    dragCurrent.current = 0;
    setDragY(0);
  };

  return (
    <>
      <button
        type="button"
        className={`assistant-fab${attentive ? ' is-attentive' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Ask LER — open the studio assistant"
        aria-expanded={isOpen}
      >
        <span className="assistant-spark" aria-hidden="true">✳</span>
        <ChatIcon />
        <span>Ask LER</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="assistant-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Studio assistant"
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              ref={panelRef}
              className="assistant-panel"
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: dragY, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={dragY ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 30 }}
            >
              <div
                className="assistant-grab"
                aria-hidden="true"
                onPointerDown={(event) => {
                  dragStart.current = event.clientY;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (dragStart.current === null) return;
                  dragCurrent.current = Math.max(0, event.clientY - dragStart.current);
                  setDragY(dragCurrent.current);
                }}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <span />
              </div>

              <header className="assistant-head">
                <div>
                  <p className="assistant-kicker">The studio desk</p>
                  <h2>Ask LER</h2>
                  {contextSlug && (
                    <p className="assistant-context">About: {getProduct(contextSlug)?.name ?? contextSlug}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close assistant"
                >
                  <CloseIcon />
                </button>
              </header>

              <div className="assistant-transcript" ref={scrollRef} aria-live="polite" aria-atomic="false">
                {entries.length === 0 && (
                  <div className="assistant-welcome">
                    <p>Ask about a piece, a glaze, or what to put on the table.</p>
                    <div className="assistant-starters">
                      {STARTERS.map((starter) => (
                        <button key={starter} type="button" onClick={() => send(starter)}>
                          {starter} <ArrowRight />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {entries.map((entry, index) => (
                  <div key={index} className={`assistant-msg assistant-msg-${entry.role}`}>
                    <p className="assistant-msg-label">{entry.role === 'user' ? 'You' : 'LER'}</p>
                    <p className="assistant-msg-text">{entry.text}</p>
                    {entry.notice && <p className="assistant-notice">{entry.notice}</p>}
                    {entry.products && entry.products.length > 0 && (
                      <ul className="assistant-products">
                        {entry.products.map((product) => (
                          <li key={product.slug}>
                            <Link to={product.href} onClick={() => setIsOpen(false)}>
                              {product.image && (
                                <img src={product.image} alt="" width="80" height="110" loading="lazy" />
                              )}
                              <span className="assistant-product-copy">
                                <strong>{product.name}</strong>
                                <small>{product.colour} · {product.collection}</small>
                              </span>
                              <span className="assistant-product-price">{formatPrice(product.price)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {entry.actions && entry.actions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-block assistant-add-all"
                        onClick={() => {
                          entry.actions?.forEach((action) => {
                            const product = getProduct(action.slug);
                            if (product) add(product, action.options, action.qty);
                          });
                          setIsOpen(false);
                          openBag();
                        }}
                      >
                        Add all {entry.actions.length} pieces to bag <ArrowRight />
                      </button>
                    )}
                    {entry.actions && entry.actions.length > 0 && (
                      <div className="assistant-actions">
                        {entry.actions.map((action, actionIndex) => {
                          const product = getProduct(action.slug);
                          if (!product) return null;
                          return (
                            <button
                              key={`${action.slug}-${actionIndex}`}
                              type="button"
                              className="btn btn-block"
                              onClick={() => {
                                add(product, action.options, action.qty);
                                setIsOpen(false);
                                openBag();
                              }}
                            >
                              Add {action.qty} × {product.name} to bag <ArrowRight />
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {entry.mode && (
                      <p className="assistant-mode">
                        {entry.mode === 'nim' ? 'Live assistant' : 'Local catalogue guidance'}
                      </p>
                    )}
                  </div>
                ))}

                {busy && (
                  <p className="assistant-typing" role="status">
                    <span /><span /><span />
                    <span className="sr-only">Thinking</span>
                  </p>
                )}
                {error && <p className="form-error">{error}</p>}
              </div>

              {entries.length > 0 && !busy && (
                <div className="assistant-followups" aria-label="Suggested questions">
                  {FOLLOW_UPS.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => send(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <form
                className="assistant-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(input);
                }}
              >
                <label htmlFor="assistant-input" className="sr-only">
                  Message the studio assistant
                </label>
                <textarea
                  ref={inputRef}
                  id="assistant-input"
                  rows={1}
                  value={input}
                  maxLength={500}
                  placeholder="Ask about the collection…"
                  onChange={(event) => setInput(event.target.value)}
                  onFocus={scrollToEnd}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                />
                <button type="submit" disabled={busy || !input.trim()} aria-label="Send message">
                  <ArrowRight />
                </button>
              </form>
              <p className="assistant-foot">No account needed. Never enter card or personal details here.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
