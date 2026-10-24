import { principles } from '../content/profile';
import './sections.css';

export function Approach() {
  return (
    <section id="approach" className="section approach" aria-labelledby="approach-title">
      <div className="wrap">
        <header className="section-head reveal">
          <p className="mono section-head__kicker">Approach</p>
          <h2 id="approach-title">How I build AI systems</h2>
          <p className="section-head__lede">
            Four habits that came out of the projects above. Each one is tied to the place I first needed it.
          </p>
        </header>
        <ol className="principles">
          {principles.map((p) => (
            <li key={p.title} className="principle reveal">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <p className="mono principle__from">
                <span aria-hidden="true">↳ </span>
                {p.from}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
