import { site } from '../content/profile';
import './sections.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <p>
          © {new Date().getFullYear()} {site.name}
        </p>
        <p className="footer__made">Designed and built with React, TypeScript and Three.js.</p>
        <a href="#top" className="footer__top">
          Back to top
        </a>
      </div>
    </footer>
  );
}
