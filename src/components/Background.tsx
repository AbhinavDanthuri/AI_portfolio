import { certifications, timeline } from '../content/profile';
import './sections.css';

export function Background() {
  const entries = [...timeline].sort((a, b) => a.sortKey - b.sortKey);
  return (
    <section id="background" className="section background" aria-labelledby="background-title">
      <div className="wrap background__grid">
        <header className="section-head reveal">
          <p className="mono section-head__kicker">Background</p>
          <h2 id="background-title">Education and the projects in between</h2>
          <p className="section-head__lede">A B.Tech in Computer Science with an AI/ML specialisation, and what I built along the way.</p>
        </header>

        <ol className="timeline">
          {entries.map((e) => (
            <li key={e.title} className={`timeline__item timeline__item--${e.kind} reveal`}>
              <p className="mono timeline__when">{e.when}</p>
              <div className="timeline__body">
                <h3>{e.title}</h3>
                <p>{e.detail}</p>
              </div>
              <span className="mono timeline__kind">{e.kind}</span>
            </li>
          ))}
        </ol>

        <div className="certs reveal">
          <h3 className="mono certs__title">Certifications</h3>
          <ul>
            {certifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
