import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDown } from './Icons';

type Option = { id: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  label?: string;
};

/** Branded replacement for the browser's native select popup. */
export default function SortMenu({ value, options, onChange, label = 'Sort by' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = options.find((option) => option.id === value) ?? options[0];
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.id === value)));
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[activeIndex]?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, activeIndex]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const move = (delta: number) => {
    setActiveIndex((index) => (index + delta + options.length) % options.length);
  };

  return (
    <div className="sort" ref={rootRef}>
      <button
        type="button"
        className="sort-trigger"
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) {
            setAnchor({
              top: rect.bottom + 8,
              left: Math.max(8, Math.min(rect.left, window.innerWidth - 210)),
              width: Math.max(rect.width, 196),
            });
          }
          setActiveIndex(Math.max(0, options.findIndex((option) => option.id === value)));
          setOpen((wasOpen) => !wasOpen);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="sr-only">{label}: </span>
        <span>{current.label}</span>
        <ChevronDown className={open ? 'is-open' : undefined} />
      </button>

      {open &&
        createPortal(
            <>
              <div className="sort-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
              <motion.ul
              ref={listRef}
              id={listId}
              className="sort-menu"
              style={!isMobile && anchor ? { top: anchor.top, left: anchor.left, minWidth: anchor.width, right: 'auto' } : undefined}
              role="listbox"
              aria-label={label}
              tabIndex={-1}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  move(1);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  move(-1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  setActiveIndex(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  setActiveIndex(options.length - 1);
                } else if (event.key === 'Escape' || event.key === 'Tab') {
                  setOpen(false);
                  if (event.key === 'Escape') buttonRef.current?.focus();
                }
              }}
            >
              {options.map((option, index) => (
                <li key={option.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.id === value}
                    tabIndex={index === activeIndex ? 0 : -1}
                    onClick={() => choose(option.id)}
                  >
                    <span>{option.label}</span>
                    {option.id === value && <CheckIcon />}
                  </button>
                </li>
              ))}
          </motion.ul>
          </>,
          document.body,
        )}
    </div>
  );
}
