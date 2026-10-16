# ZityTraining — Web

Management platform for a real gym — scheduling, client and trainer
management, workouts, attendance, plans and payments. This is the
frontend; the API lives in the companion [`zitytraining-api`](../zitytraining-api)
repository.


## What it does

- 🗓️ **Scheduling** — drag-and-drop calendar with per-trainer colors,
  day/week views, mobile gestures (swipe between days, drag a session to
  the screen's edge to jump to the next day mid-drag), DST-safe
  recurring weekly sessions, automatic national/regional holidays, and
  an offline mode that lets staff keep working (and admins keep
  editing) without a connection, syncing once it's back.
- 👥 **Client & trainer management** — profiles, a digitized health
  intake form, progress tracking with body-composition charts, and a
  per-client session history.
- 🏋️ **Training tools** — a categorized exercise library and a workout
  builder (sets, reps, weight per set, supersets, rest-pause), assigned
  directly to a calendar session.
- 🕐 **Staff attendance** — trainers clock in/out; admins get a weekly
  view across the whole team.
- 💳 **Plans & payments** — an admin-configurable plan catalog
  (personal/duo/trio training, weekly frequency, pricing) plus Stripe
  checkout for subscriptions or session bundles.
- 📊 **Accounting** — a monthly grid across every client: billed, paid,
  broken down day by day, handling plans that pause, change, or end
  mid-month.
- 📱 Fully responsive, with real attention to mobile detail — safe
  areas, iOS scroll quirks, native-feeling interactions.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- [FullCalendar](https://fullcalendar.io/) for the scheduling UI
- A hand-written service worker for offline support (no PWA build
  plugin — Next 16 defaults to Turbopack for both dev and build, and
  the usual offline plugins for Next still require webpack)

## Getting started

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) by
default (override with `-p <port>` if that's taken).

### Environment variables

Create a `.env.local` with:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_URL` should point at a running instance of
[`zitytraining-api`](../zitytraining-api).

### Other scripts

```bash
npm run build   # production build
npm run start   # run a production build (expects $PORT)
npm run lint    # eslint
```

## Project structure

```
app/dashboard/<feature>/   One folder per feature (calendario, clientes,
                            entrenadores, entrenamientos, fichar,
                            contabilidad, pagos, gestor-planes, festivos...)
components/                Shared, feature-agnostic UI
lib/                       One typed API client per backend resource
                            (bookingsApi.ts, usersApi.ts, ...), all
                            routed through lib/apiClient.ts
public/sw.js                Service worker for offline support
```
