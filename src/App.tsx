import { About } from './components/About';
import { Approach } from './components/Approach';
import { Background } from './components/Background';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { Toolkit } from './components/Toolkit';
import { Work } from './components/Work';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useReveal } from './hooks/useReveal';
import { useTheme } from './hooks/useTheme';

// Asta, the site guide, is its own chunk and only loads once the page has settled.
const Asta = lazy(() => import('./components/asta/Asta').then((m) => ({ default: m.Asta })));

function useAfterLoad() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const hasIdle = typeof window.requestIdleCallback === 'function';
    let id: number | undefined;
    const go = () => {
      id = hasIdle
        ? window.requestIdleCallback(() => setReady(true), { timeout: 1500 })
        : (globalThis.setTimeout(() => setReady(true), 300) as unknown as number);
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    return () => {
      window.removeEventListener('load', go);
      if (id === undefined) return;
      if (hasIdle) window.cancelIdleCallback(id);
      else globalThis.clearTimeout(id);
    };
  }, []);
  return ready;
}

export default function App() {
  const { theme, toggle } = useTheme();
  const astaReady = useAfterLoad();
  useReveal();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav theme={theme} onToggleTheme={toggle} />
      <main id="main">
        <Hero theme={theme} />
        <About />
        <Work />
        <Approach />
        <Toolkit />
        <Background />
        <Contact />
      </main>
      <Footer />
      {astaReady && (
        <Suspense fallback={null}>
          <Asta />
        </Suspense>
      )}
    </>
  );
}
