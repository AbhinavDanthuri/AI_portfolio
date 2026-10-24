/**
 * Everything Asta says. Short, plain, a little playful. Edit freely.
 * `draft` lines are written first, crossed out in amber, then corrected.
 */

export const BOOT = ['waking up', 'loading Abhinav’s projects', 'check ✓'];
export const THINK = ['plan', 'retrieve', 'check ✓'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function timeOfDay(hour: number) {
  if (hour < 5) return 'Up late? Me too.';
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  if (hour < 22) return 'Good evening.';
  return 'Up late? Me too.';
}

export const greeting = (hour: number) =>
  `${timeOfDay(hour)} I’m Asta, I live on Abhinav’s site. Want the 30-second tour, or explore on your own?`;

export function welcomeBack(visited: string[], questsDone: number) {
  if (questsDone >= 3) return 'Welcome back. You’ve seen everything. His resume is still up in the corner.';
  if (visited.includes('bug-investigator') && !visited.includes('silent'))
    return 'Welcome back. You saw the bug investigator last time. SILENT is next.';
  if (visited.includes('silent') && !visited.includes('rl-scaling'))
    return 'Welcome back. You got to SILENT last time. The RL results are right after it.';
  return 'Welcome back. Want the tour this time?';
}

export const explore = 'Cool. I’ll be in the corner. Click me any time for the tour.';
export const skipped = 'I’ll be in the corner.';

export type SectionLine = { text: string; draft?: string; point?: string; copy?: boolean };

export const sections: Record<string, SectionLine> = {
  about: { text: 'Short version: he builds things that notice their own mistakes.' },
  'bug-investigator': {
    text: 'Press “Run a trace”. Watch the critic reject the first answer.',
    point: '#bug-investigator .ag__run .btn',
  },
  silent: {
    draft: 'This one reads minds.',
    text: 'This one reads lips. Drag the slider and watch the route change.',
    point: '#silent input[type="range"]',
  },
  'rl-scaling': {
    text: 'Measured, not guessed: 28% fewer SLA violations than static autoscaling.',
    point: '#rl-scaling .rl__num',
  },
  approach: { text: 'Each of these rules came out of one of the projects above.' },
  toolkit: { text: 'Tap a project to see which tools it actually used.', point: '.toolkit__filter button:nth-of-type(2)' },
  background: { text: 'Started in 2022, graduated in 2026. The projects fill the gap.' },
  contact: { text: 'Want his email? I can copy it for you.', point: '.contact__address', copy: true },
};

export const wake = () => pick(['Oh! I’m up. I’m up.', 'Wasn’t sleeping. Just indexing.']);
export const fast = () => pick(['Whoa. Slow down, I get dizzy.', 'The good part is right here, by the way.']);
export const themeLight = 'Too bright… okay, blueprint mode.';
export const themeDark = 'Ahh. Much better.';
export const resume = 'Yes, that one.';
export const tabBack = 'You left. I kept the critic busy.';
export const thrown = () => pick(['Rude.', 'Wheee. I mean… rude.']);
export const dropped = 'Fine, I’ll sit here.';
export const annoyed = 'Okay, okay. I’m awake.';
export const menu = 'What can I do for you?';
export const questsIntro = 'Three things worth seeing:';
export const back = 'I’m back.';
export const copied = 'Got it. It’s on your clipboard.';
export const copyFailed = (email: string) => `Couldn’t reach your clipboard. It’s ${email}.`;
export const quest = (n: number, label: string) => `${n} of 3 done: ${label.toLowerCase()}.`;
export const allDone = 'All three. You’ve seen how he thinks. Here’s his resume.';

export const tour = {
  hero: 'This cloud is a retrieval space. Right now I’m the query, so those lines are my nearest neighbours.',
  heroCompact: 'That cloud up top is a retrieval space. Drag across it and you become the query.',
  bug: 'Abhinav’s Bug Investigator. Four agents. Watch what the critic does.',
  bugDone: 'The critic rejected the first answer and sent it back. The second pass got accepted.',
  silentLow: 'SILENT reads lips from video. When the CNN isn’t sure, agents step in to correct it…',
  silentHigh: '…and when it’s confident, the answer goes straight through. No LLM call.',
  rl: 'This one’s measured: 28% fewer SLA violations than static autoscaling.',
  end: 'That’s the tour. Want his resume or his email?',
  endAll: 'That’s the tour, and all three quests done. Resume or email?',
  interrupted: 'Okay, your turn to drive.',
};
