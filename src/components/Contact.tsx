import { useRef, useState } from 'react';
import { site } from '../content/profile';
import { ArrowUpRight, CheckIcon, CopyIcon, FileIcon, GitHubIcon, LinkedInIcon } from './Icons';
import './sections.css';

export function Contact() {
  const [copied, setCopied] = useState(false);
  const emailRef = useRef<HTMLAnchorElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.links.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be blocked; select the address so it can be copied by hand.
      const el = emailRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="wrap">
        <div className="contact__panel reveal">
          <p className="mono section-head__kicker">Contact</p>
          <h2 id="contact-title" className="contact__title">
            Building something with LLMs that has to be right? I’d like to hear about it.
          </h2>
          <p className="contact__lede">{site.contactNote}</p>

          <div className="contact__email">
            <a ref={emailRef} href={`mailto:${site.links.email}`} className="contact__address">
              {site.links.email}
            </a>
            <button type="button" className="btn contact__copy" onClick={copy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className="visually-hidden" aria-live="polite">
              {copied ? 'Email address copied' : ''}
            </span>
          </div>

          <ul className="contact__links">
            <li>
              <a href={site.links.linkedin} target="_blank" rel="noopener me">
                <LinkedInIcon />
                <span>LinkedIn</span>
                <span className="contact__handle">in/abhinav-danthuri</span>
                <ArrowUpRight className="contact__arrow" />
              </a>
            </li>
            <li>
              <a href={site.links.github} target="_blank" rel="noopener me">
                <GitHubIcon />
                <span>GitHub</span>
                <span className="contact__handle">AbhinavDanthuri</span>
                <ArrowUpRight className="contact__arrow" />
              </a>
            </li>
            <li>
              <a href={site.links.resume} target="_blank" rel="noopener">
                <FileIcon />
                <span>Resume</span>
                <span className="contact__handle">PDF, one page</span>
                <ArrowUpRight className="contact__arrow" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
