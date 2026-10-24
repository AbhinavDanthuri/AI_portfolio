/**
 * Every fact on the site lives in this file and comes from Abhinav's resume
 * (public/resume/Abhinav_Danthuri_Resume.pdf). Edit here, not in components.
 *
 * Fields marked OPTIONAL are empty on purpose: fill them in when the thing exists
 * (a public repo, a demo URL, a domain) and the UI picks them up automatically.
 */

export type LinkSet = {
  github: string;
  linkedin: string;
  email: string;
  resume: string;
};

export type ProjectId = 'bug-investigator' | 'silent' | 'rl-scaling';

export type Project = {
  id: ProjectId;
  index: string;
  title: string;
  shortTitle: string;
  period: string;
  stack: string[];
  /** One sentence a recruiter can read in five seconds. */
  summary: string;
  problem: string;
  approach: string[];
  decisions: { title: string; body: string }[];
  /** Only outcomes stated on the resume. Leave empty rather than invent. */
  outcomes: string[];
  /** OPTIONAL: public repository URL for this project. */
  repo?: string;
  /** OPTIONAL: live demo or write-up URL. */
  demo?: string;
};

export type SkillGroup = {
  name: string;
  note: string;
  skills: { name: string; usedIn: ProjectId[] }[];
};

export const site = {
  /** OPTIONAL: set to your deployed URL (e.g. https://abhinav.dev) for canonical + social tags. */
  url: '',
  name: 'Abhinav Danthuri',
  role: 'AI Engineer',
  location: 'Hyderabad, India',
  availability: 'Open to entry-level AI engineer roles and AI/ML internships',
  /** Shown in the contact section. Edit freely. */
  contactNote:
    'I’m looking for entry-level AI engineer roles and AI/ML internships. Hyderabad first, remote across India, and Bengaluru for the right team. Email is the fastest way to reach me.',
  links: {
    github: 'https://github.com/AbhinavDanthuri',
    linkedin: 'https://linkedin.com/in/abhinav-danthuri',
    email: 'abhinavdanthuri21@gmail.com',
    resume: './resume/Abhinav_Danthuri_Resume.pdf',
  } satisfies LinkSet,
};

export const hero = {
  eyebrow: 'AI Engineer · Hyderabad',
  headline: ['I build AI systems', 'that check their', 'own work.'],
  intro:
    'I design agent pipelines in Python and LangGraph where something in the loop decides when an answer isn’t good enough yet. A critic agent, a confidence gate, a reward signal. Then the system goes back and tries again.',
};

export const about = {
  lead:
    'I finished my B.Tech in Computer Science (AI/ML) at ACE Engineering College in 2026. Most of what I’ve built since is about one problem: models are confidently wrong a lot, so the system around them has to notice.',
  body: [
    'In my bug investigator, a critic agent sends weak root-cause answers back for another pass. In SILENT, a lip-reading CNN hands off to retrieval-backed agents only when it isn’t sure. In my cloud-scaling work, a Q-learning agent learns from SLA violations instead of following fixed thresholds.',
    'Underneath that I have solid Java, OOP and data-structures fundamentals, and I like shipping the boring parts properly: a FastAPI backend, a MySQL history of every run, a UI someone else can actually use.',
  ],
  facts: [
    { label: 'Degree', value: 'B.Tech, CSE (AI/ML)' },
    { label: 'Graduated', value: '2026' },
    { label: 'CGPA', value: '7.65 / 10' },
    { label: 'Main stack', value: 'Python · LangGraph · FastAPI' },
  ],
};

export const projects: Project[] = [
  {
    id: 'bug-investigator',
    index: '01',
    title: 'Autonomous Bug Investigator',
    shortTitle: 'Bug Investigator',
    period: 'Jun 2026 – Sep 2026',
    stack: ['Python', 'LangGraph', 'FastAPI', 'FAISS', 'MySQL', 'GitHub API', 'React.js'],
    summary:
      'Give it a GitHub issue and it searches the repo’s code, docs, past issues and commits to find the likely root cause.',
    problem:
      'Triaging a bug report means reading code you didn’t write, digging through old issues and guessing which commit broke things. That context is all in the repo, but it’s scattered across four different places.',
    approach: [
      'Uses the GitHub API to pull the repo’s code, docs, past issues and commits, with FAISS handling retrieval so the agents can search all four.',
      'Splits the work across four LangGraph agents: a planner, an investigator, a fix agent and a critic.',
      'The critic reviews the answer. If it’s weak, the graph loops back for another pass instead of returning it.',
      'Produces a debugging report, a suggested fix and test cases, and stores every run’s history in MySQL. A React front end sits on top of the FastAPI service.',
    ],
    decisions: [
      {
        title: 'A critic instead of a single long prompt',
        body: 'One agent that plans, searches and judges itself tends to agree with itself. Making review a separate node with the power to send work back keeps weak answers out of the report.',
      },
      {
        title: 'Search more than the code',
        body: 'Root causes rarely live only in source files. A past issue or a commit message is often the fastest clue, so the agents search docs, issues and commits alongside the code.',
      },
      {
        title: 'Every run is recorded',
        body: 'Run history in MySQL means a result can be traced back to what was retrieved and which pass produced it.',
      },
    ],
    outcomes: [],
  },
  {
    id: 'silent',
    index: '02',
    title: 'SILENT',
    shortTitle: 'SILENT',
    period: 'Oct 2025 – Dec 2025',
    stack: ['Python', 'OpenCV', 'PyTorch', 'CNN', 'LLM', 'RAG', 'LangGraph', 'FAISS', 'FastAPI'],
    summary:
      'An agentic silent speech recognition system that works out what someone said from video alone.',
    problem:
      'Lip-reading from video is ambiguous. Different words look the same on the lips, and a vision model alone will commit to the wrong one with no way to recover.',
    approach: [
      'OpenCV pulls the lip region out of each video frame and a PyTorch CNN predicts the speech from it.',
      'When the CNN is confident, its prediction goes straight through.',
      'When it isn’t, a LangGraph agent pipeline steps in, retrieves context through FAISS-based RAG and uses an LLM to correct the prediction.',
      'A FastAPI backend serves the pipeline, with a simple UI that shows the prediction, its confidence and the final sentence.',
    ],
    decisions: [
      {
        title: 'Confidence decides the route',
        body: 'Running an LLM on every frame would be slow and would rewrite answers that were already right. The agents only step in when the CNN is unsure.',
      },
      {
        title: 'Show the confidence, not just the answer',
        body: 'The UI surfaces the CNN’s prediction and its confidence next to the final sentence, so you can see when the agents changed something.',
      },
    ],
    outcomes: [],
  },
  {
    id: 'rl-scaling',
    index: '03',
    title: 'RL-Based Smart Scaling for SLA-Adherent Cloud Resource Management',
    shortTitle: 'RL Smart Scaling',
    period: 'Jan 2026 – Mar 2026',
    stack: ['Python', 'Reinforcement Learning', 'Q-Learning'],
    summary:
      'A Q-learning agent that makes cloud scaling decisions, benchmarked against static autoscaling.',
    problem:
      'Static autoscaling rules react the same way to every workload. Analysis of cloud workload patterns showed where fixed thresholds fall behind and SLAs get missed.',
    approach: [
      'Analysed cloud workload patterns to find the performance gaps and limits of static autoscaling.',
      'Modelled resource allocation as a reinforcement learning problem in Python.',
      'Trained a Q-learning agent to make the scaling decisions automatically.',
      'Benchmarked it against static autoscaling across varying cloud workloads.',
    ],
    decisions: [
      {
        title: 'Learn the policy, don’t hand-tune it',
        body: 'Framing scaling as an RL problem lets the agent learn when to act from the workload itself instead of from thresholds someone guessed.',
      },
      {
        title: 'Judge it against the baseline',
        body: 'The agent is only interesting if it beats what people already use, so every result is reported relative to static autoscaling.',
      },
    ],
    outcomes: ['28% fewer SLA violations than static autoscaling', '19% lower resource consumption'],
  },
];

/** Benchmark from the resume, indexed so static autoscaling = 100. */
export const rlBenchmark = [
  { metric: 'SLA violations', baseline: 100, agent: 72, change: '−28%' },
  { metric: 'Resource consumption', baseline: 100, agent: 81, change: '−19%' },
];

export const skillGroups: SkillGroup[] = [
  {
    name: 'Agents & retrieval',
    note: 'Where most of my project work sits',
    skills: [
      { name: 'LangGraph', usedIn: ['bug-investigator', 'silent'] },
      { name: 'RAG', usedIn: ['bug-investigator', 'silent'] },
      { name: 'FAISS', usedIn: ['bug-investigator', 'silent'] },
      { name: 'LLMs', usedIn: ['bug-investigator', 'silent'] },
      { name: 'OpenAI API', usedIn: [] },
      { name: 'Prompt engineering', usedIn: [] },
    ],
  },
  {
    name: 'Machine learning',
    note: 'Models I’ve trained',
    skills: [
      { name: 'PyTorch', usedIn: ['silent'] },
      { name: 'CNNs', usedIn: ['silent'] },
      { name: 'OpenCV', usedIn: ['silent'] },
      { name: 'Reinforcement learning', usedIn: ['rl-scaling'] },
      { name: 'Q-learning', usedIn: ['rl-scaling'] },
    ],
  },
  {
    name: 'Backend & data',
    note: 'What turns a model into a service',
    skills: [
      { name: 'Python', usedIn: ['bug-investigator', 'silent', 'rl-scaling'] },
      { name: 'FastAPI', usedIn: ['bug-investigator', 'silent'] },
      { name: 'MySQL', usedIn: ['bug-investigator'] },
      { name: 'GitHub API', usedIn: ['bug-investigator'] },
      { name: 'React.js', usedIn: ['bug-investigator'] },
      { name: 'SQL', usedIn: [] },
    ],
  },
  {
    name: 'Foundations & tools',
    note: 'Fundamentals and daily tools',
    skills: [
      { name: 'Java', usedIn: [] },
      { name: 'JavaScript', usedIn: [] },
      { name: 'OOP', usedIn: [] },
      { name: 'Data structures & algorithms', usedIn: [] },
      { name: 'Git & GitHub', usedIn: [] },
      { name: 'Docker', usedIn: [] },
      { name: 'Jupyter', usedIn: [] },
    ],
  },
];

export const principles = [
  {
    title: 'Put a checker in the loop',
    body: 'If a model’s answer goes straight to the user, its mistakes do too. I add a step whose only job is to judge the output and send it back when it’s weak.',
    from: 'Critic agent in the Bug Investigator',
  },
  {
    title: 'Spend reasoning where it’s needed',
    body: 'LLM calls are slow and they can overwrite answers that were already right. Confidence scores decide when the expensive path runs.',
    from: 'Confidence gate in SILENT',
  },
  {
    title: 'Beat a baseline or it doesn’t count',
    body: 'A clever model is only useful if it does better than the simple thing people already run. I report results against that baseline.',
    from: 'RL scaling vs static autoscaling',
  },
  {
    title: 'Keep a record of every run',
    body: 'When an agent gives a strange answer, you need to see what it retrieved and which pass produced it. Run history makes that possible.',
    from: 'MySQL run history',
  },
];

export type TimelineEntry = {
  when: string;
  sortKey: number;
  title: string;
  detail: string;
  kind: 'education' | 'project';
};

export const timeline: TimelineEntry[] = [
  {
    when: '2022',
    sortKey: 2022.0,
    title: 'Started B.Tech, Computer Science Engineering',
    detail: 'ACE Engineering College, Hyderabad · AI/ML specialisation',
    kind: 'education',
  },
  {
    when: 'Oct – Dec 2025',
    sortKey: 2025.8,
    title: 'Built SILENT',
    detail: 'Lip-reading CNN with agentic RAG correction',
    kind: 'project',
  },
  {
    when: 'Jan – Mar 2026',
    sortKey: 2026.0,
    title: 'Built RL Smart Scaling',
    detail: 'Q-learning agent: 28% fewer SLA violations than static autoscaling',
    kind: 'project',
  },
  {
    when: '2026',
    sortKey: 2026.4,
    title: 'Graduated, B.Tech CSE',
    detail: 'CGPA 7.65 / 10',
    kind: 'education',
  },
  {
    when: 'Jun – Sep 2026',
    sortKey: 2026.5,
    title: 'Built the Autonomous Bug Investigator',
    detail: 'Planner, investigator, fix and critic agents over a repo',
    kind: 'project',
  },
];

export const certifications = [
  'Advanced Java Programming and Data Structures',
  'The Ultimate MySQL Bootcamp',
  'JavaScript Essential Training',
  'Pearson MePro English Proficiency, Level 10',
];
