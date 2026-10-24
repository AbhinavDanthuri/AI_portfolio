import { about } from '../content/profile';
import './sections.css';

export function About() {
  return (
    <section className="about" aria-labelledby="about-title">
      <div className="wrap about__grid">
        <div className="about__copy reveal">
          <h2 id="about-title" className="mono about__kicker">
            About
          </h2>
          <p className="about__lead">{about.lead}</p>
          {about.body.map((p, i) => (
            <p key={i} className="about__body">
              {p}
            </p>
          ))}
        </div>
        <dl className="about__facts reveal">
          {about.facts.map((f) => (
            <div key={f.label}>
              <dt className="mono">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
