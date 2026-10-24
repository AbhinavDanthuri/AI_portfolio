import { useCallback, useEffect, useRef, useState } from 'react';
import { site } from '../../content/profile';
import { useReducedMotion } from '../../hooks/useMediaQuery';
import { emit, on } from './bus';
import { astaSize, createEngine, type Engine, type Vec } from './engine';
import * as L from './lines';
import { store } from './storage';
import './asta.css';

/**
 * Asta: a small living guide that hatches out of the hero's retrieval space,
 * follows the visitor around, comments on what they're looking at, runs a
 * 30-second tour and tracks three quests. Fully scripted: no network calls.
 */

type Mood = 'calm' | 'excited' | 'checking' | 'sleepy' | 'dizzy' | 'annoyed' | 'happy' | 'squint';
type Mode = 'boot' | 'welcome' | 'idle' | 'tour' | 'hidden';
type Priority = 'ambient' | 'section' | 'direct' | 'tour';
type QuestId = 'trace' | 'gate' | 'results';
type Btn = { label: string; onClick?: () => void; href?: string; primary?: boolean };
type Speech = {
  id: number;
  text: string;
  draft?: string;
  think?: string[];
  buttons?: Btn[];
  list?: { label: string; done: boolean }[];
  point?: string;
  hold?: number;
  persist?: boolean;
  menu?: boolean;
};
type Phase = 'think' | 'draft' | 'strike' | 'type' | 'done';

const QUESTS: { id: QuestId; label: string }[] = [
  { id: 'trace', label: 'Run the bug investigator trace' },
  { id: 'gate', label: 'Flip SILENT’s confidence gate' },
  { id: 'results', label: 'See the RL results' },
];

const SECTIONS: { id: string; sel: string }[] = [
  { id: 'about', sel: '.about' },
  { id: 'bug-investigator', sel: '#bug-investigator' },
  { id: 'silent', sel: '#silent' },
  { id: 'rl-scaling', sel: '#rl-scaling' },
  { id: 'approach', sel: '#approach' },
  { id: 'toolkit', sel: '#toolkit' },
  { id: 'background', sel: '#background' },
  { id: 'contact', sel: '#contact' },
];

const ABORT = Symbol('abort');
const $ = (sel: string) => document.querySelector(sel);

export function Asta() {
  const reduced = useReducedMotion();
  const [mode, setModeState] = useState<Mode>('boot');
  const [visible, setVisible] = useState(false);
  const [mood, setMoodState] = useState<Mood>('calm');
  const [speech, setSpeech] = useState<Speech | null>(null);
  const [phase, setPhase] = useState<Phase>('done');
  const [thinkStep, setThinkStep] = useState(0);
  const [quests, setQuests] = useState<QuestId[]>(() => store.get<QuestId[]>('quests', []));
  const [orbit, setOrbit] = useState(0);
  const [hatch, setHatch] = useState<Vec | null>(null);
  const [burst, setBurst] = useState(0);
  const [blink, setBlink] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<SVGGElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const engine = useRef<Engine | null>(null);

  const modeRef = useRef<Mode>('boot');
  const speechRef = useRef<Speech | null>(null);
  const moodRef = useRef<Mood>('calm');
  const questsRef = useRef<QuestId[]>(quests);
  const reducedRef = useRef(reduced);
  const idRef = useRef(0);
  const resolvers = useRef(new Map<number, () => void>());
  const lastAmbient = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);
  const moodTimer = useRef<number | undefined>(undefined);
  const tourToken = useRef<{ aborted: boolean } | null>(null);
  const visitedNow = useRef(new Set<string>());
  const pokes = useRef<number[]>([]);
  const lastActivity = useRef(performance.now());
  const sleeping = useRef(false);

  reducedRef.current = reduced;

  const setMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const setMood = useCallback((m: Mood) => {
    window.clearTimeout(moodTimer.current);
    moodRef.current = m;
    setMoodState(m);
  }, []);

  const flashMood = useCallback(
    (m: Mood, ms: number) => {
      setMood(m);
      moodTimer.current = window.setTimeout(() => {
        moodRef.current = 'calm';
        setMoodState('calm');
      }, ms);
    },
    [setMood],
  );

  // ------------------------------------------------------------------ speech
  const dismiss = useCallback((id?: number) => {
    const cur = speechRef.current;
    if (!cur || (id !== undefined && cur.id !== id)) return;
    window.clearTimeout(hideTimer.current);
    speechRef.current = null;
    setSpeech(null);
    engine.current?.pointAt(null);
    resolvers.current.get(cur.id)?.();
    resolvers.current.delete(cur.id);
  }, []);

  const say = useCallback((s: Omit<Speech, 'id'>, priority: Priority = 'direct'): Promise<void> => {
    const m = modeRef.current;
    if (m === 'hidden' || m === 'boot') return Promise.resolve();
    const cur = speechRef.current;
    const now = performance.now();
    if (priority === 'ambient') {
      if (cur || m !== 'idle' || now - lastAmbient.current < 7000) return Promise.resolve();
    }
    if (priority === 'section') {
      if ((cur && (cur.buttons || cur.list)) || m !== 'idle') return Promise.resolve();
    }
    if (priority === 'ambient' || priority === 'section') lastAmbient.current = now;
    if (cur) {
      resolvers.current.get(cur.id)?.();
      resolvers.current.delete(cur.id);
    }
    const sp: Speech = { ...s, id: ++idRef.current };
    speechRef.current = sp;
    // Reset the reveal state in the same render so the old line never flashes.
    setPhase(reducedRef.current ? 'done' : s.think ? 'think' : s.draft ? 'draft' : 'type');
    setThinkStep(0);
    setSpeech(sp);
    engine.current?.pointAt(s.point ? $(s.point) : null);
    return new Promise((res) => resolvers.current.set(sp.id, res));
  }, []);

  // Called when a line has been fully revealed: resolve waiters, schedule the auto-hide.
  const finish = useCallback(
    (id: number) => {
      const sp = speechRef.current;
      if (!sp || sp.id !== id) return;
      setPhase('done');
      resolvers.current.get(id)?.();
      resolvers.current.delete(id);
      window.clearTimeout(hideTimer.current);
      if (sp.persist) return;
      const hold = sp.buttons || sp.list ? 14000 : sp.hold ?? 2600 + sp.text.length * 42;
      hideTimer.current = window.setTimeout(() => dismiss(id), hold);
    },
    [dismiss],
  );

  // Runs think → draft → strike, then hands over to <Typewriter> for the line itself.
  useEffect(() => {
    if (!speech) return;
    const timers: number[] = [];
    const T = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    window.clearTimeout(hideTimer.current);
    if (reducedRef.current) {
      finish(speech.id);
    } else {
      let t = 0;
      if (speech.think) {
        speech.think.forEach((_, i) => T(() => setThinkStep(i + 1), 200 + i * 230));
        t = 200 + speech.think.length * 230 + 120;
      }
      if (speech.draft) {
        T(() => setPhase('draft'), t);
        T(() => {
          setPhase('strike');
          flashMood('checking', 1400);
        }, t + 900);
        t += 1500;
      }
      if (t > 0) T(() => setPhase('type'), t);
    }
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [speech, finish, flashMood]);

  // Re-place the bubble whenever its content changes size.
  useEffect(() => {
    engine.current?.kick();
  }, [speech, phase, visible]);

  // ------------------------------------------------------------------ quests
  const celebrate = useCallback(() => {
    if (store.get('celebrated', false)) return false;
    store.set('celebrated', true);
    setBurst((b) => b + 1);
    flashMood('happy', 2600);
    return true;
  }, [flashMood]);

  const completeQuest = useCallback(
    (id: QuestId) => {
      if (questsRef.current.includes(id)) return;
      const next = [...questsRef.current, id];
      questsRef.current = next;
      setQuests(next);
      store.set('quests', next);
      if (modeRef.current !== 'idle') return; // the tour reports at the end
      const label = QUESTS.find((q) => q.id === id)!.label;
      if (next.length === 3 && celebrate()) {
        void say({ text: L.allDone, buttons: [{ label: 'Open resume', href: site.links.resume, primary: true }] });
      } else {
        flashMood('excited', 1200);
        void say({ text: L.quest(next.length, label) });
      }
    },
    [celebrate, flashMood, say],
  );

  // ------------------------------------------------------------------ actions
  const copyEmail = useCallback(() => {
    navigator.clipboard
      .writeText(site.links.email)
      .then(() => {
        flashMood('happy', 1400);
        void say({ text: L.copied });
      })
      .catch(() => void say({ text: L.copyFailed(site.links.email) }));
  }, [flashMood, say]);

  const scrollToEl = useCallback(async (el: Element | null, block: 'center' | 'start', token: { aborted: boolean }) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top =
      block === 'center'
        ? window.scrollY + r.top - Math.max(80, (window.innerHeight - r.height) / 2)
        : window.scrollY + r.top - 80;
    const goal = Math.max(0, Math.min(top, document.documentElement.scrollHeight - window.innerHeight));
    window.scrollTo({ top: goal, behavior: reducedRef.current ? 'auto' : 'smooth' });
    const start = performance.now();
    let lastY = -1;
    let stableSince = performance.now();
    await new Promise<void>((res) => {
      const check = () => {
        if (token.aborted) return res();
        const y = window.scrollY;
        if (y !== lastY) {
          lastY = y;
          stableSince = performance.now();
        }
        if (Math.abs(y - goal) < 2 || performance.now() - stableSince > 220 || performance.now() - start > 1800) res();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    if (token.aborted) throw ABORT;
  }, []);

  const anchorBeside = useCallback((sel: string) => (): Vec | null => {
    const el = $(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = astaSize();
    const x = r.left - s * 0.9 > 40 ? r.left - s * 0.9 : r.right + s * 0.9;
    return { x, y: r.top + r.height / 2 };
  }, []);

  const finishTour = useCallback(() => {
    tourToken.current = null;
    engine.current?.setScrollReactive(true);
    engine.current?.setTarget(null);
    setMode('idle');
  }, [setMode]);

  const startTour = useCallback(async () => {
    const eng = engine.current;
    if (!eng) return;
    tourToken.current && (tourToken.current.aborted = true);
    const token = { aborted: false };
    tourToken.current = token;
    setMode('tour');
    setMood('excited');
    eng.setScrollReactive(false);
    eng.resetHome();
    const wait = (ms: number) =>
      new Promise<void>((res, rej) =>
        window.setTimeout(() => (token.aborted ? rej(ABORT) : res()), reducedRef.current ? Math.min(ms, 700) : ms),
      );
    const compact = window.innerWidth < 720;
    try {
      // 1. Hero: become the query
      await scrollToEl($('#top'), 'start', token);
      const stage = $('.vf-stage');
      if (stage && !compact) {
        const t0 = performance.now();
        eng.setTarget(() => {
          const r = stage.getBoundingClientRect();
          const k = (performance.now() - t0) / 1000;
          return { x: r.left + r.width * (0.5 + 0.22 * Math.sin(k * 0.9)), y: r.top + r.height * (0.45 + 0.18 * Math.sin(k * 1.3 + 1)) };
        });
        await say({ text: L.tour.hero, think: L.THINK }, 'tour');
        await wait(3200);
      } else {
        await say({ text: L.tour.heroCompact, point: '.vf-stage' }, 'tour');
        await wait(2200);
      }

      // 2. Bug Investigator: run the trace and ride along it
      await scrollToEl($('#bug-investigator .case__figure'), 'center', token);
      eng.setTarget(anchorBeside('#bug-investigator [data-node="issue"]'));
      await say({ text: L.tour.bug }, 'tour');
      await wait(700);
      const traceDone = new Promise<void>((res) => {
        const off = on('asta:trace-done', () => {
          off();
          res();
        });
        window.setTimeout(() => {
          off();
          res();
        }, 12000);
      });
      dismiss(); // keep the graph clear while the trace runs
      emit('asta:run-trace');
      await traceDone;
      if (token.aborted) throw ABORT;
      eng.setTarget(anchorBeside('#bug-investigator [data-node="report"]'));
      await say({ text: L.tour.bugDone }, 'tour');
      await wait(2600);

      // 3. SILENT: drive the slider both ways
      await scrollToEl($('#silent .cg'), 'center', token);
      eng.setTarget(anchorBeside('#silent .cg__track'));
      emit('asta:gate', { value: 28 });
      await say({ text: L.tour.silentLow }, 'tour');
      await wait(2200);
      emit('asta:gate', { value: 84 });
      await say({ text: L.tour.silentHigh }, 'tour');
      await wait(2400);

      // 4. RL results
      await scrollToEl($('#rl-scaling .rl__results'), 'center', token);
      eng.setTarget(anchorBeside('#rl-scaling .rl__num'));
      await say({ text: L.tour.rl, point: '#rl-scaling .rl__num' }, 'tour');
      await wait(3000);

      // 5. Contact
      await scrollToEl($('#contact'), 'start', token);
      eng.setTarget(null);
      const all = questsRef.current.length === 3 && celebrate();
      finishTour();
      setMood(all ? 'happy' : 'calm');
      void say({
        text: all ? L.tour.endAll : L.tour.end,
        buttons: [
          { label: 'Open resume', href: site.links.resume, primary: true },
          { label: 'Copy email', onClick: copyEmail },
        ],
      });
    } catch (e) {
      if (e !== ABORT) throw e;
    }
  }, [anchorBeside, celebrate, copyEmail, dismiss, finishTour, say, scrollToEl, setMode, setMood]);

  const abortTour = useCallback(() => {
    const token = tourToken.current;
    if (!token || modeRef.current !== 'tour') return;
    token.aborted = true;
    finishTour();
    setMood('calm');
    void say({ text: L.tour.interrupted });
  }, [finishTour, say, setMood]);

  const hide = useCallback(() => {
    tourToken.current && (tourToken.current.aborted = true);
    tourToken.current = null;
    dismiss();
    engine.current?.setTarget(null);
    engine.current?.setActive(false);
    setVisible(false);
    setMode('hidden');
    store.set('hidden', true);
  }, [dismiss, setMode]);

  const show = useCallback(() => {
    store.set('hidden', false);
    const eng = engine.current;
    if (!eng) return;
    eng.setActive(true);
    const h = eng.home();
    eng.placeAt({ x: h.x, y: window.innerHeight + 80 });
    eng.setTarget(null);
    setMode('idle');
    setVisible(true);
    flashMood('excited', 1200);
    void say({ text: L.back });
  }, [flashMood, say, setMode]);

  const openQuests = useCallback(() => {
    void say({
      text: L.questsIntro,
      list: QUESTS.map((q) => ({ label: q.label, done: questsRef.current.includes(q.id) })),
      persist: true,
      menu: true,
    });
  }, [say]);

  const openMenu = useCallback(() => {
    void say({
      text: L.menu,
      persist: true,
      menu: true,
      buttons: [
        { label: '30-second tour', primary: true, onClick: () => void startTour() },
        { label: `Quests ${questsRef.current.length}/3`, onClick: openQuests },
        { label: 'Hide me', onClick: hide },
      ],
    });
  }, [hide, openQuests, say, startTour]);

  // ------------------------------------------------------------------ welcome
  const endWelcome = useCallback(
    (choice: 'tour' | 'explore' | 'skip') => {
      if (modeRef.current !== 'welcome') return;
      setMode('idle');
      engine.current?.setTarget(null);
      if (choice === 'tour') void startTour();
      else if (choice === 'explore') void say({ text: L.explore });
      else {
        dismiss();
        void say({ text: L.skipped, hold: 1800 });
      }
    },
    [dismiss, say, setMode, startTour],
  );

  const startWelcome = useCallback(async () => {
    const eng = engine.current;
    if (!eng) return;
    const seen = store.get<string | null>('seen', null);
    store.set('seen', new Date().toISOString());
    const compact = window.innerWidth < 720;
    const stage = $('.vf-stage');
    const sr = stage?.getBoundingClientRect();
    const inHero = !compact && !reducedRef.current && !!sr && sr.top < window.innerHeight * 0.75 && sr.bottom > 120;

    setMode('welcome');
    if (!seen) {
      // Hatch out of the data.
      const spot = inHero && sr ? { x: sr.left + sr.width * 0.58, y: sr.top + sr.height * 0.44 } : eng.home();
      eng.placeAt(spot);
      if (inHero && stage) {
        // Hold still inside the cloud (the cloud itself rotates, so its neighbours keep changing)
        // and keep the welcome buttons steady enough to click.
        eng.setTarget(() => {
          const r = stage.getBoundingClientRect();
          return { x: r.left + r.width * 0.58, y: r.top + r.height * 0.44 };
        });
      }
      if (!reducedRef.current) {
        setHatch(spot);
        await new Promise((r) => window.setTimeout(r, 950));
        setHatch(null);
      }
      setVisible(true);
      flashMood('excited', 1600);
      if (modeRef.current !== 'welcome') return;
      void say(
        {
          think: L.BOOT,
          text: L.greeting(new Date().getHours()),
          persist: true,
          buttons: [
            { label: 'Take the tour', primary: true, onClick: () => endWelcome('tour') },
            { label: 'I’ll explore', onClick: () => endWelcome('explore') },
          ],
        },
        'direct',
      );
    } else {
      // Returning visitor: slide in from below with a short hello.
      const h = eng.home();
      eng.placeAt({ x: h.x, y: window.innerHeight + 80 });
      eng.setTarget(null);
      setVisible(true);
      flashMood('excited', 1400);
      const visited = store.get<string[]>('visited', []);
      void say({
        text: L.welcomeBack(visited, questsRef.current.length),
        buttons:
          questsRef.current.length >= 3
            ? undefined
            : [
                { label: 'Take the tour', primary: true, onClick: () => endWelcome('tour') },
                { label: 'Not now', onClick: () => endWelcome('skip') },
              ],
      });
      window.setTimeout(() => {
        if (modeRef.current === 'welcome') setMode('idle');
      }, 9000);
    }
  }, [endWelcome, flashMood, say, setMode]);

  // ------------------------------------------------------------------ engine + boot
  useEffect(() => {
    const r = rootRef.current;
    const b = bodyRef.current;
    const i = innerRef.current;
    const p = pupilRef.current;
    const bb = bubbleRef.current;
    const ln = lineRef.current;
    const dt = dotRef.current;
    if (!r || !b || !i || !p || !bb || !ln || !dt) return;
    const eng = createEngine({
      root: r,
      body: b,
      inner: i,
      pupil: p,
      bubble: bb,
      line: ln,
      lineDot: dt,
      onFastScroll: () => {
        if (modeRef.current !== 'idle') return;
        flashMood('dizzy', 1600);
        void say({ text: L.fast() }, 'ambient');
      },
      onThrowLanded: () => {
        flashMood('annoyed', 1400);
        void say({ text: L.thrown() });
      },
      onDrop: () => void say({ text: L.dropped }, 'ambient'),
      onClick: () => {
        const now = performance.now();
        pokes.current = [...pokes.current.filter((t) => now - t < 2500), now];
        if (pokes.current.length >= 4) {
          pokes.current = [];
          flashMood('annoyed', 1500);
          void say({ text: L.annoyed });
          return;
        }
        if (modeRef.current === 'welcome') return;
        if (speechRef.current?.menu) dismiss();
        else openMenu();
      },
    });
    eng.setReduced(reducedRef.current);
    engine.current = eng;

    let bootTimer: number | undefined;
    if (store.get('hidden', false)) {
      eng.setActive(false);
      setMode('hidden');
    } else {
      bootTimer = window.setTimeout(() => void startWelcome(), 500);
    }
    return () => {
      window.clearTimeout(bootTimer);
      eng.destroy();
      engine.current = null;
    };
    // The engine is created once; handlers read live state through refs.
  }, []);

  useEffect(() => {
    engine.current?.setReduced(reduced);
  }, [reduced]);

  // Skip the welcome on any real interaction with the page.
  useEffect(() => {
    if (mode !== 'welcome') return;
    const skip = (e: Event) => {
      const t = e.target as Element | null;
      if (t && t.closest?.('.asta-layer')) return;
      endWelcome('skip');
    };
    const onKey = (e: KeyboardEvent) => {
      if (['Tab', 'Shift', 'Alt', 'Control', 'Meta'].includes(e.key)) return;
      skip(e);
    };
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchmove', skip, { passive: true });
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchmove', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', onKey);
    };
  }, [mode, endWelcome]);

  // Stop the tour when the visitor takes the wheel.
  useEffect(() => {
    if (mode !== 'tour') return;
    const stop = (e: Event) => {
      const t = e.target as Element | null;
      if (t && t.closest?.('.asta-layer')) return;
      abortTour();
    };
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(e.key)) abortTour();
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', onKey);
    };
  }, [mode, abortTour]);

  // Escape closes the menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && speechRef.current?.menu) dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  // ------------------------------------------------------------------ page awareness
  // Sections: pick up a memory dot and say something the first time each one is reached.
  useEffect(() => {
    const els = SECTIONS.map((s) => ({ ...s, el: $(s.sel) })).filter((s) => s.el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const s = els.find((x) => x.el === e.target);
          if (!s || visitedNow.current.has(s.id)) continue;
          visitedNow.current.add(s.id);
          setOrbit(visitedNow.current.size);
          const all = new Set(store.get<string[]>('visited', []));
          all.add(s.id);
          store.set('visited', [...all]);
          const line = L.sections[s.id];
          if (!line || modeRef.current !== 'idle') continue;
          void say(
            {
              text: line.text,
              draft: line.draft,
              point: line.point,
              think: line.draft ? undefined : L.THINK,
              buttons: line.copy ? [{ label: 'Copy email', primary: true, onClick: copyEmail }] : undefined,
            },
            'section',
          );
        }
      },
      { rootMargin: '-42% 0px -42% 0px' },
    );
    els.forEach((s) => io.observe(s.el!));
    return () => io.disconnect();
  }, [say, copyEmail]);

  // Quests coming from the page.
  useEffect(() => {
    const offs = [on('asta:trace-done', () => completeQuest('trace')), on('asta:gate-flipped', () => completeQuest('gate'))];
    const results = $('.rl__results');
    let io: IntersectionObserver | undefined;
    if (results) {
      io = new IntersectionObserver(
        ([e]) => {
          if (e?.isIntersecting) completeQuest('results');
        },
        { threshold: 0.55 },
      );
      io.observe(results);
    }
    return () => {
      offs.forEach((f) => f());
      io?.disconnect();
    };
  }, [completeQuest]);

  // Ride along the agent graph during the tour.
  useEffect(
    () =>
      on('asta:trace-step', ({ node, tone }) => {
        if (modeRef.current !== 'tour') return;
        engine.current?.setTarget(() => {
          const el = $(`#bug-investigator [data-node="${node}"]`);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const s = astaSize();
          // Phones stack the graph vertically, so ride beside each node instead of above it.
          if (window.innerWidth < 720) return { x: r.right + s * 0.75, y: r.top + r.height / 2 };
          return { x: r.left + r.width / 2, y: r.top - s * 0.55 };
        });
        if (tone === 'warn') flashMood('checking', 900);
        if (tone === 'ok') flashMood('happy', 900);
      }),
    [flashMood],
  );

  // Idle → sleep, activity → wake.
  useEffect(() => {
    const activity = () => {
      lastActivity.current = performance.now();
      if (sleeping.current) {
        sleeping.current = false;
        flashMood('excited', 1300);
        void say({ text: L.wake() }, 'ambient');
      }
    };
    const evs = ['pointermove', 'scroll', 'keydown', 'touchstart'] as const;
    evs.forEach((ev) => window.addEventListener(ev, activity, { passive: true }));
    const iv = window.setInterval(() => {
      if (modeRef.current !== 'idle' || speechRef.current || sleeping.current) return;
      if (performance.now() - lastActivity.current > 20000) {
        sleeping.current = true;
        setMood('sleepy');
      }
    }, 1500);
    return () => {
      evs.forEach((ev) => window.removeEventListener(ev, activity));
      window.clearInterval(iv);
    };
  }, [flashMood, say, setMood]);

  // Theme changes, resume hover, coming back to the tab.
  useEffect(() => {
    let lastResume = 0;
    let hiddenAt = 0;
    const mo = new MutationObserver(() => {
      if (modeRef.current !== 'idle') return;
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      flashMood(light ? 'squint' : 'happy', 1500);
      void say({ text: light ? L.themeLight : L.themeDark }, 'ambient');
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest?.('a[href$=".pdf"]') || t.closest('.asta-layer')) return;
      const now = performance.now();
      if (now - lastResume < 30000) return;
      lastResume = now;
      flashMood('excited', 1000);
      void say({ text: L.resume, hold: 1600 }, 'ambient');
    };
    const onVis = () => {
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt && performance.now() - hiddenAt > 6000) void say({ text: L.tabBack }, 'ambient');
    };
    document.addEventListener('pointerover', onOver);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      mo.disconnect();
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [flashMood, say]);

  // Blinking, with the occasional lazy double-blink.
  useEffect(() => {
    if (reduced) return;
    let t: number;
    const loop = () => {
      t = window.setTimeout(
        () => {
          if (moodRef.current !== 'sleepy') {
            setBlink(true);
            window.setTimeout(() => setBlink(false), 130);
            if (Math.random() < 0.22) {
              window.setTimeout(() => setBlink(true), 300);
              window.setTimeout(() => setBlink(false), 430);
            }
          }
          loop();
        },
        2400 + Math.random() * 3800,
      );
    };
    loop();
    return () => window.clearTimeout(t);
  }, [reduced]);

  // ------------------------------------------------------------------ render
  const C = 2 * Math.PI * 23;
  const progress = (quests.length / 3) * C;
  const showThink = speech?.think && phase === 'think';
  const showDraft = speech?.draft && (phase === 'draft' || phase === 'strike');

  return (
    <div className="asta-layer">
      <svg className="asta-point" aria-hidden="true">
        <path ref={lineRef} className="asta-point__line" style={{ display: 'none' }} />
        <circle ref={dotRef} className="asta-point__dot" r="3.5" style={{ display: 'none' }} />
      </svg>

      {hatch && (
        <div className="asta-hatch" style={{ transform: `translate(${hatch.x}px, ${hatch.y}px)` }} aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2 + i;
            const d = 60 + ((i * 37) % 70);
            return <span key={i} style={{ ['--dx' as string]: `${Math.cos(a) * d}px`, ['--dy' as string]: `${Math.sin(a) * d}px`, animationDelay: `${(i % 5) * 40}ms` }} />;
          })}
        </div>
      )}

      <div ref={rootRef} className={`asta${visible ? ' is-visible' : ''}`} data-mood={mood} data-mode={mode}>
        <button
          ref={bodyRef}
          type="button"
          className="asta__body"
          aria-label="Asta, the site guide. Open menu"
          aria-haspopup="true"
          aria-expanded={!!speech?.menu}
          tabIndex={visible ? 0 : -1}
        >
          <div ref={innerRef} className="asta__inner">
            <div className="asta__float">
              <svg className="asta__svg" viewBox="-40 -40 80 80" aria-hidden="true">
                <circle className="asta__track" r="23" />
                <circle className="asta__progress" r="23" strokeDasharray={`${progress} ${C}`} transform="rotate(-90)" />
                <g className="asta__orbit">
                  {Array.from({ length: Math.min(orbit, 8) }, (_, i) => {
                    const a = (i / 8) * Math.PI * 2;
                    return <circle key={i} className="asta__memory" cx={Math.cos(a) * 29} cy={Math.sin(a) * 29} r="1.9" />;
                  })}
                </g>
                <circle className="asta__shell" r="17" />
                <g className={`asta__eye${blink ? ' is-blink' : ''}`}>
                  <g ref={pupilRef}>
                    <circle className="asta__pupil" r="4.8" />
                    <circle className="asta__glint" r="1.4" cx="1.7" cy="-1.7" />
                  </g>
                </g>
                <path className="asta__smile" d="M-6.5 1.5 Q0 -5.5 6.5 1.5" />
              </svg>
              {mood === 'sleepy' && (
                <span className="asta__zzz" aria-hidden="true">
                  <span>z</span>
                  <span>z</span>
                  <span>z</span>
                </span>
              )}
              {burst > 0 && (
                <span className="asta__burst" key={burst} aria-hidden="true">
                  {Array.from({ length: 16 }, (_, i) => {
                    const a = (i / 16) * Math.PI * 2;
                    return <span key={i} style={{ ['--dx' as string]: `${Math.cos(a) * 54}px`, ['--dy' as string]: `${Math.sin(a) * 54}px` }} />;
                  })}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      <div ref={bubbleRef} className="asta-bubble" hidden={!speech || !visible} role="group" aria-label="Asta says">
        <div className="asta-bubble__head">
          <span className="mono asta-bubble__name">Asta</span>
          <button type="button" className="asta-bubble__close" aria-label="Dismiss" onClick={() => dismiss()}>
            ×
          </button>
        </div>
        {showThink && (
          <p className="asta-bubble__think mono" aria-hidden="true">
            {speech!.think!.map((s, i) => (
              <span key={s} className={i < thinkStep ? 'is-on' : undefined}>
                {s}
              </span>
            ))}
          </p>
        )}
        {showDraft && (
          <p className={`asta-bubble__draft${phase === 'strike' ? ' is-struck' : ''}`} aria-hidden="true">
            {speech!.draft}
          </p>
        )}
        {phase === 'type' && speech && (
          <Typewriter key={speech.id} text={speech.text} onDone={() => finish(speech.id)} onTick={() => engine.current?.kick()} />
        )}
        {phase === 'done' && speech && (
          <p className="asta-bubble__text" aria-hidden="true">
            {speech.text}
          </p>
        )}
        {speech?.list && phase === 'done' && (
          <ul className="asta-bubble__list">
            {speech.list.map((q) => (
              <li key={q.label} className={q.done ? 'is-done' : undefined}>
                <span aria-hidden="true">{q.done ? '✓' : '○'}</span> {q.label}
                <span className="visually-hidden">{q.done ? ', done' : ', not done yet'}</span>
              </li>
            ))}
          </ul>
        )}
        {speech?.buttons && phase === 'done' && (
          <div className="asta-bubble__actions">
            {speech.buttons.map((b) =>
              b.href ? (
                <a key={b.label} className={`asta-btn${b.primary ? ' is-primary' : ''}`} href={b.href} target="_blank" rel="noopener">
                  {b.label}
                </a>
              ) : (
                <button key={b.label} type="button" className={`asta-btn${b.primary ? ' is-primary' : ''}`} onClick={b.onClick}>
                  {b.label}
                </button>
              ),
            )}
          </div>
        )}
        {speech?.list && phase === 'done' && (
          <div className="asta-bubble__actions">
            <button type="button" className="asta-btn" onClick={openMenu}>
              Back
            </button>
          </div>
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {speech && visible ? speech.text : ''}
      </p>

      {mode === 'hidden' && (
        <button type="button" className="asta-tab" onClick={show} aria-label="Show Asta, the site guide">
          <span className="asta-tab__eye" aria-hidden="true" />
          Asta
        </button>
      )}
    </div>
  );
}

/** Types a line out two characters at a time. Lives in its own component so only it re-renders. */
function Typewriter({ text, onDone, onTick }: { text: string; onDone: () => void; onTick: () => void }) {
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  const tick = useRef(onTick);
  tick.current = onTick;
  useEffect(() => {
    let i = 0;
    const iv = window.setInterval(() => {
      i = Math.min(text.length, i + 2);
      setN(i);
      tick.current();
      if (i >= text.length) {
        window.clearInterval(iv);
        done.current();
      }
    }, 26);
    return () => window.clearInterval(iv);
  }, [text]);
  return (
    <p className="asta-bubble__text" aria-hidden="true">
      {text.slice(0, n)}
      <span className="asta-bubble__caret" />
    </p>
  );
}
