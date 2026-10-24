import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { site } from '../content/profile';
import { useActiveSection } from '../hooks/useActiveSection';
import type { Theme } from '../hooks/useTheme';
import { CloseIcon, FileIcon, MenuIcon, MoonIcon, SunIcon } from './Icons';
import './nav.css';

export const NAV_ITEMS = [
  { id: 'work', label: 'Work' },
  { id: 'approach', label: 'Approach' },
  { id: 'toolkit', label: 'Toolkit' },
  { id: 'background', label: 'Background' },
  { id: 'contact', label: 'Contact' },
];
const IDS = NAV_ITEMS.map((n) => n.id);

type Props = { theme: Theme; onToggleTheme: () => void };

export function Nav({ theme, onToggleTheme }: Props) {
  const active = useActiveSection(IDS);
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Slide the underline to the active link.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const place = () => {
      const link = active ? list.querySelector<HTMLElement>(`[data-id="${active}"]`) : null;
      if (!link) return setIndicator(null);
      setIndicator({ x: link.offsetLeft, w: link.offsetWidth });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile sheet: lock scroll, close on Escape, keep focus inside.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('a, button'));
        const first = items[0];
        const lastItem = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastItem?.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap nav__inner">
        <a className="nav__brand" href="#top">
          <span className="nav__mark" aria-hidden="true">
            AD
          </span>
          <span className="nav__name">Abhinav Danthuri</span>
        </a>

        <nav className="nav__links" aria-label="Sections">
          <ul ref={listRef}>
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  data-id={item.id}
                  aria-current={active === item.id ? 'true' : undefined}
                  className={active === item.id ? 'is-active' : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <span
            className="nav__indicator"
            aria-hidden="true"
            style={indicator ? { transform: `translateX(${indicator.x}px)`, width: indicator.w, opacity: 1 } : { opacity: 0 }}
          />
        </nav>

        <div className="nav__actions">
          <button type="button" className="nav__icon-btn" onClick={onToggleTheme} aria-label={themeLabel} title={themeLabel}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <a className="btn nav__resume" href={site.links.resume} target="_blank" rel="noopener">
            <FileIcon />
            Resume
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            className="nav__icon-btn nav__menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <div id="mobile-menu" ref={sheetRef} className={`sheet${open ? ' is-open' : ''}`} hidden={!open}>
        <nav aria-label="Sections" className="wrap sheet__inner">
          <ul>
            {NAV_ITEMS.map((item, i) => (
              <li key={item.id} style={{ transitionDelay: `${i * 40}ms` }}>
                <a href={`#${item.id}`} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="btn btn--primary sheet__resume" href={site.links.resume} target="_blank" rel="noopener">
            <FileIcon />
            View resume (PDF)
          </a>
        </nav>
      </div>
    </header>
  );
}
