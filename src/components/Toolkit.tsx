import { useState } from 'react';
import { projects, skillGroups, type ProjectId } from '../content/profile';
import './sections.css';

const COLS: { id: ProjectId; abbr: string }[] = [
  { id: 'bug-investigator', abbr: 'Bug Inv.' },
  { id: 'silent', abbr: 'SILENT' },
  { id: 'rl-scaling', abbr: 'RL' },
];

export function Toolkit() {
  const [focus, setFocus] = useState<ProjectId | null>(null);
  const titleOf = (id: ProjectId) => projects.find((p) => p.id === id)?.shortTitle ?? id;

  return (
    <section id="toolkit" className="section toolkit" aria-labelledby="toolkit-title">
      <div className="wrap">
        <header className="section-head reveal">
          <p className="mono section-head__kicker">Toolkit</p>
          <h2 id="toolkit-title">What I use, and where I’ve used it</h2>
          <p className="section-head__lede">
            Skills mapped to the projects that use them. The ones without a mark come from coursework, certifications
            and day-to-day work rather than a project on this page.
          </p>
        </header>

        <div className="toolkit__filter reveal" role="group" aria-label="Highlight tools used in a project">
          <span className="mono toolkit__filter-label">Highlight</span>
          <button type="button" aria-pressed={focus === null} onClick={() => setFocus(null)}>
            All
          </button>
          {COLS.map((c) => (
            <button key={c.id} type="button" aria-pressed={focus === c.id} onClick={() => setFocus(focus === c.id ? null : c.id)}>
              {titleOf(c.id)}
            </button>
          ))}
        </div>

        <div className="matrix-scroll reveal">
          <table className={`matrix${focus ? ' has-focus' : ''}`}>
            <caption className="visually-hidden">Skills by project. A filled mark means the skill is used in that project.</caption>
            <thead>
              <tr>
                <th scope="col" className="matrix__skill-h">
                  <span className="visually-hidden">Skill</span>
                </th>
                {COLS.map((c) => (
                  <th key={c.id} scope="col" className={`matrix__col${focus === c.id ? ' is-focus' : ''}`}>
                    <abbr title={titleOf(c.id)} className="mono">
                      {c.abbr}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            {skillGroups.map((g) => (
              <tbody key={g.name}>
                <tr className="matrix__group">
                  <th scope="rowgroup" colSpan={COLS.length + 1}>
                    <span className="matrix__group-name">{g.name}</span>
                    <span className="matrix__group-note">{g.note}</span>
                  </th>
                </tr>
                {g.skills.map((s) => {
                  const lit = focus ? s.usedIn.includes(focus) : true;
                  return (
                    <tr key={s.name} className={lit ? 'is-lit' : 'is-dim'}>
                      <th scope="row" className="matrix__skill">
                        {s.name}
                      </th>
                      {COLS.map((c) => {
                        const used = s.usedIn.includes(c.id);
                        return (
                          <td key={c.id} className={`matrix__cell${focus === c.id ? ' is-focus' : ''}`}>
                            <span className={`matrix__mark${used ? ' is-used' : ''}`} aria-hidden="true" />
                            <span className="visually-hidden">{used ? 'Used' : 'Not used'}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </section>
  );
}
