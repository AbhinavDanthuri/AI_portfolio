import { hero, site } from '../content/profile';
import type { Theme } from '../hooks/useTheme';
import { ArrowRight, FileIcon, GitHubIcon, LinkedInIcon, MailIcon } from './Icons';
import { VectorField } from './vector/VectorField';
import './hero.css';

export function Hero({ theme }: { theme: Theme }) {
  const lines = hero.headline;
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="wrap hero__grid">
        <div className="hero__copy">
          <p className="mono hero__eyebrow">
            <span className="hero__dot" aria-hidden="true" />
            {hero.eyebrow}
          </p>

          <h1 id="hero-title" className="hero__title">
            <span className="visually-hidden">{site.name}. </span>
            {lines.map((line, i) => (
              <span className="hero__line" key={line} style={{ animationDelay: `${120 + i * 90}ms` }}>
                {i === lines.length - 1 ? (
                  <>
                    {line}
                    <LoopMark />
                  </>
                ) : (
                  line
                )}
              </span>
            ))}
          </h1>

          <p className="hero__name">
            <strong>{site.name}</strong>
            <span aria-hidden="true"> · </span>
            {site.role}
          </p>
          <p className="hero__intro">{hero.intro}</p>

          <div className="hero__ctas">
            <a className="btn btn--primary" href="#work">
              Explore my work
              <ArrowRight />
            </a>
            <a className="btn" href={site.links.resume} target="_blank" rel="noopener">
              <FileIcon />
              View resume
            </a>
          </div>

          <ul className="hero__links" aria-label="Profiles and contact">
            <li>
              <a href={site.links.github} target="_blank" rel="noopener me">
                <GitHubIcon /> GitHub
              </a>
            </li>
            <li>
              <a href={site.links.linkedin} target="_blank" rel="noopener me">
                <LinkedInIcon /> LinkedIn
              </a>
            </li>
            <li>
              <a href={`mailto:${site.links.email}`}>
                <MailIcon /> Email
              </a>
            </li>
          </ul>
        </div>

        <div className="hero__visual">
          <VectorField theme={theme} />
        </div>
      </div>

      <div className="wrap">
        <p className="hero__status">
          <span className="mono hero__status-key">Status</span>
          <span>{site.availability}</span>
          <span className="hero__status-sep" aria-hidden="true" />
          <span className="mono hero__status-key">Based in</span>
          <span>{site.location}</span>
        </p>
      </div>
    </section>
  );
}

/** A loop arrow that curls back on itself: the "check your own work" idea, drawn once on load. */
function LoopMark() {
  return (
    <svg className="loopmark" viewBox="0 0 120 70" aria-hidden="true" focusable="false">
      <path
        className="loopmark__path"
        d="M6 52 C 40 58, 86 56, 100 38 C 112 22, 96 6, 80 12 C 64 18, 70 40, 92 46 C 100 48, 108 46, 114 42"
        pathLength={1}
      />
      <path className="loopmark__head" d="M104 36 L114 42 L104 49" pathLength={1} />
    </svg>
  );
}
