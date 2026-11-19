import { useId, useState, type ReactNode } from 'react';
import { MinusIcon, PlusIcon } from './Icons';

export function QtyStepper({
  value,
  onChange,
  small = false,
  label = 'Quantity',
}: {
  value: number;
  onChange: (n: number) => void;
  small?: boolean;
  label?: string;
}) {
  return (
    <div className={`qty${small ? ' small' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <MinusIcon />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <PlusIcon />
      </button>
    </div>
  );
}

export function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={`acc${open ? ' is-open' : ''}`}>
      <button
        className="acc-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
      >
        <span>{title}</span>
        <span className="acc-sign" aria-hidden="true">
          <span />
          <span />
        </span>
      </button>
      <div className="acc-panel" id={`${id}-panel`} role="region">
        <div className="acc-inner">{children}</div>
      </div>
    </div>
  );
}
