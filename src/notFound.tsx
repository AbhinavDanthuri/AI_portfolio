import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque/index.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import '@fontsource/martian-mono/400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/notfound.css';

function NotFound() {
  return (
    <main className="nf wrap">
      <p className="mono nf__code">404 · no match in the index</p>
      <h1 className="nf__title">Nothing retrieved for this URL.</h1>
      <p className="nf__body">The page you asked for doesn’t exist. The portfolio itself is one page, so everything is a scroll away.</p>
      <p className="nf__actions">
        <a className="btn btn--primary" href="/">
          Back to the portfolio
        </a>
        <a className="btn" href="/#work">
          See the projects
        </a>
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotFound />
  </StrictMode>,
);
