import { projects, site, type Project } from '../content/profile';
import { AgentGraph } from './case/AgentGraph';
import { ConfidenceGate } from './case/ConfidenceGate';
import { BenchmarkChart, QLoop } from './case/RLViz';
import { ArrowUpRight, GitHubIcon } from './Icons';
import './case/case.css';

const byId = (id: Project['id']) => projects.find((p) => p.id === id)!;

export function Work() {
  return (
    <section id="work" className="section work" aria-labelledby="work-title">
      <div className="wrap">
        <header className="section-head reveal">
          <p className="mono section-head__kicker">Selected work</p>
          <h2 id="work-title">Three systems, three ways of catching a mistake.</h2>
          <p className="section-head__lede">
            A critic that rejects weak answers. A confidence gate that calls for help. A reward signal that learns from
            missed SLAs. Each project is laid out the way I’d walk an engineer through it.
          </p>
        </header>

        <ol className="work__index reveal" aria-label="Projects on this page">
          {projects.map((p) => (
            <li key={p.id}>
              <a href={`#${p.id}`}>
                <span className="mono work__index-period">{p.period}</span>
                <span className="work__index-title">{p.shortTitle}</span>
                <span className="work__index-sum">{p.summary}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>

      <BugInvestigatorCase project={byId('bug-investigator')} />
      <SilentCase project={byId('silent')} />
      <RLCase project={byId('rl-scaling')} />
    </section>
  );
}

function CaseMeta({ project }: { project: Project }) {
  return (
    <div className="case__meta">
      <p className="mono case__period">{project.period}</p>
      <ul className="case__stack" aria-label="Technologies">
        {project.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <ProjectLinks project={project} />
    </div>
  );
}

function ProjectLinks({ project }: { project: Project }) {
  return (
    <p className="case__links">
      {project.repo ? (
        <a href={project.repo} target="_blank" rel="noopener">
          <GitHubIcon /> Source code
        </a>
      ) : (
        <a href={site.links.github} target="_blank" rel="noopener">
          <GitHubIcon /> More on GitHub
        </a>
      )}
      {project.demo && (
        <a href={project.demo} target="_blank" rel="noopener">
          <ArrowUpRight /> Live demo
        </a>
      )}
    </p>
  );
}

function Approach({ project, label = 'How it works' }: { project: Project; label?: string }) {
  return (
    <div className="case__block">
      <h4 className="mono case__block-title">{label}</h4>
      <ol className="case__steps">
        {project.approach.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ol>
    </div>
  );
}

function Decisions({ project }: { project: Project }) {
  return (
    <div className="case__block">
      <h4 className="mono case__block-title">Engineering decisions</h4>
      <dl className="case__decisions">
        {project.decisions.map((d) => (
          <div key={d.title}>
            <dt>{d.title}</dt>
            <dd>{d.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* 01 — Full-width: title band, the agent graph as the centrepiece, then text in two columns. */
function BugInvestigatorCase({ project }: { project: Project }) {
  return (
    <article id={project.id} className="case case--bug" aria-labelledby={`${project.id}-title`}>
      <div className="wrap">
        <header className="case__head reveal">
          <div className="case__title-col">
            <p className="mono case__tag">Agentic RAG · most recent</p>
            <h3 id={`${project.id}-title`} className="case__title">
              {project.title}
            </h3>
            <p className="case__summary">{project.summary}</p>
          </div>
          <CaseMeta project={project} />
        </header>

        <div className="case__figure reveal">
          <AgentGraph />
        </div>

        <div className="case__cols">
          <div className="case__block reveal">
            <h4 className="mono case__block-title">The problem</h4>
            <p className="case__problem">{project.problem}</p>
          </div>
          <div className="reveal">
            <Approach project={project} />
          </div>
          <div className="reveal case__span">
            <Decisions project={project} />
          </div>
        </div>
      </div>
    </article>
  );
}

/* 02 — Asymmetric: narrow text column beside a wide, sticky interactive figure.
   Children are flat so the figure can sit right after the intro on phones. */
function SilentCase({ project }: { project: Project }) {
  return (
    <article id={project.id} className="case case--silent" aria-labelledby={`${project.id}-title`}>
      <div className="wrap case__split">
        <header className="case__split-head reveal">
          <p className="mono case__tag">Computer vision + agents</p>
          <h3 id={`${project.id}-title`} className="case__title">
            {project.title}
          </h3>
          <p className="case__subtitle">Agentic AI-based silent speech recognition</p>
          <p className="case__summary">{project.summary}</p>
        </header>
        <div className="case__split-figure">
          <div className="case__figure case__figure--sticky">
            <ConfidenceGate />
          </div>
        </div>
        <div className="case__block case__split-text reveal">
          <h4 className="mono case__block-title">The problem</h4>
          <p className="case__problem">{project.problem}</p>
        </div>
        <div className="case__split-text reveal">
          <Approach project={project} />
        </div>
        <div className="case__split-text reveal">
          <Decisions project={project} />
        </div>
        <div className="case__split-text reveal">
          <CaseMeta project={project} />
        </div>
      </div>
    </article>
  );
}

/* 03 — Evidence first: the measured result leads, the method follows. */
function RLCase({ project }: { project: Project }) {
  return (
    <article id={project.id} className="case case--rl" aria-labelledby={`${project.id}-title`}>
      <div className="wrap">
        <header className="case__head reveal">
          <div className="case__title-col">
            <p className="mono case__tag">Reinforcement learning</p>
            <h3 id={`${project.id}-title`} className="case__title case__title--long">
              {project.title}
            </h3>
            <p className="case__summary">{project.summary}</p>
          </div>
          <CaseMeta project={project} />
        </header>

        <div className="rl__results reveal">
          <div className="rl__stats">
            <p className="rl__stat">
              <span className="rl__num">−28%</span>
              <span className="rl__what">SLA violations</span>
            </p>
            <p className="rl__stat">
              <span className="rl__num">−19%</span>
              <span className="rl__what">resource consumption</span>
            </p>
            <p className="rl__stat-note">Compared with static autoscaling across varying cloud workloads.</p>
          </div>
          <BenchmarkChart />
        </div>

        <div className="case__cols case__cols--rl">
          <div className="reveal">
            <QLoop />
          </div>
          <div className="reveal rl__text">
            <div className="case__block">
              <h4 className="mono case__block-title">The problem</h4>
              <p className="case__problem">{project.problem}</p>
            </div>
            <Approach project={project} label="What I did" />
          </div>
          <div className="reveal case__span">
            <Decisions project={project} />
          </div>
        </div>
      </div>
    </article>
  );
}
