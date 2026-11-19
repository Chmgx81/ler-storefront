import { useEffect, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Adds `.is-visible` to `[data-reveal]` elements as they enter the viewport.
 * Re-scans on navigation and whenever new elements are mounted (filters, search),
 * so a client-side route or query change never leaves cards invisible.
 */
export function useReveal() {
  const location = useLocation();

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -2% 0px', threshold: 0 },
    );

    let scheduled = 0;
    const scan = () => {
      scheduled = 0;
      document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => observer.observe(el));
    };
    const schedule = () => {
      if (!scheduled) scheduled = requestAnimationFrame(scan);
    };

    schedule();
    const mutations =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(schedule);
    mutations?.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (scheduled) cancelAnimationFrame(scheduled);
      mutations?.disconnect();
      observer.disconnect();
    };
  }, [location.pathname, location.search]);
}

export function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    const previousPad = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = previous;
      document.body.style.paddingRight = previousPad;
    };
  }, [locked]);
}

/** Keeps keyboard focus inside a modal panel and returns it to the trigger on close. */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  initialFocus?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previous = document.activeElement as HTMLElement | null;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => element.offsetParent !== null,
      );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => {
      (initialFocus?.current ?? focusables()[0] ?? node).focus();
    }, 40);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [ref, active, initialFocus]);
}

export function useEscape(handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, active]);
}

export function useScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
}
