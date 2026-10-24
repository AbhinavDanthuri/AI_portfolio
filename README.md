# Abhinav Danthuri · Portfolio

Personal site for Abhinav Danthuri, AI engineer. One page, built with React, TypeScript and Vite, with a Three.js hero scene and hand-built SVG architecture diagrams.

Everything on the site comes from the resume in `public/resume/`. Nothing is invented: no experience, metrics or links that aren't on it.

---

## Run it locally

Requires Node 18 or newer (20+ recommended).

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build and preview:

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serves dist/ at http://localhost:4173
```

---

## Edit the content

All text, links, projects, skills and timeline entries live in **one file**:

```
src/content/profile.ts
```

Change things there, not in components. A few fields are empty on purpose so you can fill them when they exist:

| Field | What it does |
| --- | --- |
| `site.url` | Your deployed URL. Not required by the UI, but useful to keep with the content. |
| `projects[n].repo` | Public repo URL for a project. When set, the project shows a **Source code** link instead of **More on GitHub**. |
| `projects[n].demo` | Live demo or write-up URL. Adds a **Live demo** link when set. |
| `projects[n].outcomes` | Only add results you have actually measured. The Bug Investigator and SILENT have none yet. |
| `site.contactNote` | The paragraph in the contact section (roles, locations). |

To replace the resume, overwrite `public/resume/Abhinav_Danthuri_Resume.pdf` (keep the filename, or update `site.links.resume`).

---

## Deploy

The build output is static files in `dist/`. Any static host works.

### Vercel (recommended)

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project**, import the repo. It detects Vite automatically (build `npm run build`, output `dist`).
3. Under **Environment Variables**, add `SITE_URL` = your final URL (for example `https://abhinav-danthuri.vercel.app`). This makes the social-share image and canonical link absolute, which LinkedIn and WhatsApp previews need.
4. Deploy. `404.html` is served automatically for unknown paths.

### Netlify

Same steps: build command `npm run build`, publish directory `dist`, add `SITE_URL` in **Site configuration → Environment variables**. `404.html` is picked up automatically.

### GitHub Pages

Works as-is for a user site (`AbhinavDanthuri.github.io`). For a project site under a sub-path (`/portfolio/`), build with `npx vite build --base=/portfolio/` and change the two `href="/"` links in `src/notFound.tsx` to that path.

After deploying, check the share preview with LinkedIn's Post Inspector (linkedin.com/post-inspector).

---

## How it's built

```
src/
  content/profile.ts        all site content (typed)
  components/
    Hero.tsx                headline, intro, CTAs
    vector/                 hero scene
      space.ts              point layout, k-nearest-neighbour search (shared)
      webglScene.ts         Three.js renderer (desktop)
      canvasScene.ts        Canvas 2D renderer (phones, no-WebGL)
      VectorField.tsx       picks a renderer, lazy-loads it after first paint
    asta/                   Asta, the living site guide
      Asta.tsx              brain: welcome, speech, moods, tour, quests
      engine.ts             body: spring physics, drag/throw, eye, pointing line
      lines.ts              everything Asta says
      bus.ts                events between Asta and the page
    Work.tsx                three case studies, each with its own layout
    case/
      AgentGraph.tsx        Bug Investigator LangGraph diagram + trace runner
      ConfidenceGate.tsx    SILENT routing diagram + confidence slider
      RLViz.tsx             benchmark chart + Q-learning loop
      diagram.tsx           shared SVG node/edge primitives
    About, Approach, Toolkit, Background, Contact, Nav, Footer
  hooks/                    theme, active section, reveal, media queries
  styles/tokens.css         colour + type tokens for both themes
```

**Design system.** Dark ink-blue is the primary look; light mode is a blueprint variant that follows the OS until the visitor picks one (the choice is saved). Colour carries meaning: blue is data moving through a system, amber is a system catching its own mistake (the critic loop, the low-confidence route, the reward signal). Type is Bricolage Grotesque for display, Hanken Grotesk for body and Martian Mono for labels, all self-hosted through Fontsource.

**Hero scene.** A 3D point cloud grouped into the four sources the Bug Investigator searches (code, docs, past issues, commits). The cursor (or a finger drag on phones) is the query vector; lines connect it to its six nearest neighbours, computed live, and the readout under the scene names which sources were retrieved. It's labelled as an illustration. Three.js is code-split and only downloaded on desktop after the page has painted. Phones and browsers without WebGL get the Canvas 2D renderer of the same scene. Rendering pauses when the scene is off-screen or the tab is hidden.

**Asta, the site guide.** A small living agent (`src/components/asta/`). It's fully scripted, with no API calls and no cost.

- **Welcome.** On a first visit it hatches out of the hero's point cloud, becomes the retrieval query, shows a boot trace and offers a 30-second tour. Returning visitors get a short "welcome back" based on what they saw last time. Any scroll, click or key skips the intro.
- **Body.** Spring physics with weight when you scroll. You can drag it, or throw it and it bounces off the edges. The eye follows your cursor, it blinks and breathes, and it leans in when you get close. Orbiting dots are its memory (one per section visited), and a progress ring tracks the quests.
- **Moods.** Calm, excited, checking (amber), sleepy (after 20s idle), dizzy (fast scrolling), annoyed (poked too often), happy, squint (light mode).
- **Remarks and pointing.** It comments the first time you reach each section and draws a line to the thing it's talking about. Before speaking it shows a `plan → retrieve → check ✓` trace, and sometimes writes a line, strikes it out in amber and corrects it.
- **Tour.** Scrolls the page itself, rides along the agent graph during a trace run, moves SILENT's slider both ways, points at the RL result and ends at contact. Scrolling stops the tour.
- **Quests.** Three of them: run the trace, flip the gate, see the results. Finishing all three triggers a celebration and offers the resume.
- **Controls.** Click it for the menu (tour, quests, hide). "Hide me" collapses it to a small tab and is remembered.
- **Lightweight.** Loads as its own ~10 KB chunk after the page has settled. Respects reduced motion. Keyboard accessible.

All of Asta's lines live in `src/components/asta/lines.ts`, so you can change its personality there. Components talk to Asta through a small event bus (`asta/bus.ts`), so the diagrams don't depend on it.

**Diagrams.** Hand-built SVG, with a wide layout and a stacked phone layout chosen by container width. Nodes are keyboard-focusable buttons. Every diagram shows only components the resume describes; the trace run, the slider threshold and the Q-learning loop are marked as illustrations.

**Accessibility.** Semantic landmarks and headings, skip link, visible focus states, keyboard support for every interaction, `prefers-reduced-motion` respected (the scene stops animating, reveals and traces run instantly), contrast checked in both themes, screen-reader tables behind the benchmark chart and the skills matrix.

---

## Verified

Checked in headless Chromium against the production build:

- Layouts at 1440, 1280, 820, 390 and 360 px wide, dark and light, with no horizontal scroll.
- Asta: first-visit hatch and greeting, full tour (all three quests completed), return-visit greeting, section remarks, draft-and-correct lines, menu, quests list, hide (persists across reload) and show, throw, sleep after 20s and wake, copy-email fallback, phone layout, reduced motion, keyboard menu.
- Agent trace (all 10 steps), node selection, confidence slider (keyboard), toolkit filter, theme toggle + persistence across reload, mobile menu (open, navigate, close), skip link, resume PDF, 404 page. No console errors.
- Lighthouse 12 on the production build (local server):
  - Desktop: Performance 97, Accessibility 100, Best Practices 100, SEO 100
  - Mobile (simulated slow 4G, 4× CPU): Performance 86, Accessibility 100, Best Practices 100, SEO 100

Scores on a real host will differ a little with CDN, compression and caching.
