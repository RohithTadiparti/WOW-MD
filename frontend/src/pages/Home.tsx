import { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AirplaneTilt, CalendarCheck, ChatCircle, HeartStraight, Images, Storefront } from '@phosphor-icons/react';
import { ProfileSilhouette } from '../components/ProfileSilhouette';

/**
 * The public home page, from the matrimony home design template.
 *
 * Shown at `/` to somebody who is not signed in; a signed-in person still
 * lands on their dashboard there. The template's profile cards and couple's
 * story are filled with plainly labelled samples: members' profiles are
 * private, and a testimonial has to be a real couple's own words, so neither
 * may be dressed up as one. Replace SAMPLE_PROFILES and the story when there
 * is consented content to show.
 */
const FEATURES = [
  {
    title: 'Matchmaking',
    body: 'Discover meaningful matches and connect families with care.',
    icon: HeartStraight,
  },
  {
    title: 'Family dashboard',
    body: 'Collaborate on profiles, conversations, and the decisions that matter.',
    icon: ChatCircle,
  },
  {
    title: 'Vendor marketplace',
    body: 'Discover trusted wedding vendors and keep every booking in view.',
    icon: Storefront,
  },
  {
    title: 'Wedding planner',
    body: 'Plan events, tasks, guests, and logistics without losing the thread.',
    icon: CalendarCheck,
  },
  {
    title: 'Honeymoon travel',
    body: 'Find and organize the next beautiful chapter together.',
    icon: AirplaneTilt,
  },
  {
    title: 'Memories',
    body: 'Preserve the photographs and moments your family will return to.',
    icon: Images,
  },
];

/** Stand-ins in the shape of a real card: a role, never a name. */
const SAMPLE_PROFILES = [
  { gender: 'female', title: 'Bride, 27', line1: 'Telugu · Hyderabad', line2: 'Software engineer · B.Tech' },
  { gender: 'male', title: 'Groom, 30', line1: 'Tamil · Chennai', line2: 'Chartered accountant · CA' },
  { gender: 'female', title: 'Bride, 29', line1: 'Marathi · Pune', line2: 'Architect · M.Arch' },
];

const NAV_LINK = 'plate text-[0.8125rem] uppercase tracking-[0.16em] text-gray-700 hover:text-brand';

export default function Home() {
  const nav = useNavigate();

  // Matches are suggested for a profile, so the search starts with one.
  function findMatches(e: FormEvent) {
    e.preventDefault();
    nav('/register');
  }

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[70rem] flex-col px-5 sm:px-8">
        <header className="flex min-h-[6.25rem] flex-wrap items-center justify-between gap-x-10 gap-y-3 border-b border-gray-200 py-4">
          <Link
            to="/"
            className="plate font-serif text-[1.35rem] uppercase tracking-[0.2em] text-brand sm:text-[1.7rem]"
          >
            World of Weddingz
          </Link>
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <a href="#profiles" className={NAV_LINK}>
              People
            </a>
            <a href="#how" className={NAV_LINK}>
              How it works
            </a>
            <a href="#stories" className={NAV_LINK}>
              Stories
            </a>
            <Link to="/login" className={NAV_LINK}>
              Sign in
            </Link>
            <Link to="/register" className="btn min-h-[2.875rem]">
              Register
            </Link>
          </nav>
        </header>

        <section className="relative mt-10 overflow-hidden rounded-[--radius-lg] bg-gradient-to-br from-[#8F2946] to-[#B83A5A] px-6 py-16 text-center text-white shadow-lifted sm:px-12 sm:py-24">
          <div className="relative z-10 mx-auto flex max-w-[48rem] flex-col items-center gap-6">
            <p className="eyebrow text-white/75">Matrimony · weddings · families</p>
            <h1 className="font-serif text-[3.25rem] font-medium leading-[1.02] text-white sm:text-[5.75rem]">
              World of Weddings
            </h1>
            <p className="max-w-[41rem] text-base leading-[1.8] text-white/85 sm:text-lg">
              An all-in-one platform for matchmaking, family collaboration, vendor discovery,
              planning, events, honeymoon travel, and memories.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-[--radius-md] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8F2946] shadow-lifted transition hover:bg-[#F8E8ED]">
                Start your journey
              </Link>
              <a href="#how" className="inline-flex min-h-12 items-center justify-center rounded-[--radius-md] border border-white/45 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/10">
                Explore features
              </a>
            </div>
          </div>
        </section>

        <form
          onSubmit={findMatches}
          className="mt-12 grid gap-5 border border-gray-200 bg-surface p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-5 lg:items-end"
        >
          <Field id="looking" label="Looking for">
            <select id="looking" className="input">
              <option>A bride</option>
              <option>A groom</option>
            </select>
          </Field>
          <Field id="agefrom" label="Age from">
            <select id="agefrom" className="input" defaultValue="21">
              {['21', '25', '30'].map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field id="ageto" label="Age to">
            <select id="ageto" className="input" defaultValue="34">
              {['28', '34', '40'].map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field id="city" label="City">
            <input id="city" className="input" placeholder="Hyderabad" />
          </Field>
          <button type="submit" className="btn min-h-12">
            Find matches
          </button>
        </form>

        <section id="how" className="pt-24 md:pt-28">
          <div className="mb-8 max-w-[38rem]">
            <p className="eyebrow mb-3 text-brand">Everything for your wedding journey</p>
            <h2 className="font-serif text-[2.5rem] font-medium leading-tight text-gray-900 sm:text-[3.25rem]">One thoughtful place for what comes next.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, body, icon: Icon }) => (
              <article key={title} className="group rounded-[--radius-lg] border border-gray-200 bg-surface p-6 transition duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lifted">
                <Icon size={28} weight="duotone" className="mb-8 text-brand" aria-hidden />
                <h3 className="mb-2 font-serif text-[1.55rem] font-medium text-gray-900">{title}</h3>
                <p className="text-sm leading-7 text-gray-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="profiles" className="flex flex-col gap-7 pt-24 md:pt-28">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex flex-col gap-2">
              <h2 className="plate w-fit font-serif text-[2.25rem] font-normal text-brand sm:text-[2.625rem]">
                Recently joined
              </h2>
              <p className="plate eyebrow w-fit tracking-[0.2em]">Sample profiles · members are private until you sign in</p>
            </div>
            <Link to="/register" className="plate eyebrow tracking-[0.2em] text-gray-700 hover:text-brand">
              See all profiles
            </Link>
          </div>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_PROFILES.map((p) => (
              <article key={p.title + p.line1} className="flex flex-col border border-gray-200 bg-surface">
                <ProfileSilhouette gender={p.gender} className="h-[14.375rem] border-b border-gray-200" />
                <div className="flex flex-col gap-2 p-6">
                  <h3 className="font-serif text-[1.625rem] font-normal text-brand">{p.title}</h3>
                  <p className="text-sm leading-[1.7] text-gray-700">
                    {p.line1}
                    <br />
                    {p.line2}
                  </p>
                  <Link
                    to="/register"
                    className="mt-2 inline-flex min-h-11 w-fit items-center text-xs uppercase tracking-[0.2em] text-brand hover:text-brand-strong"
                  >
                    View profile
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="stories" className="flex flex-col items-center gap-[1.125rem] px-0 py-24 text-center sm:px-20 md:py-28">
          <span aria-hidden className="block h-px w-16 bg-gold" />
          <p className="plate font-serif text-[1.75rem] italic leading-[1.5] text-brand sm:text-[2.125rem]">
            The first story told here will be a real couple’s, in their own words.
          </p>
          <p className="plate eyebrow tracking-[0.26em]">Sample · stories are shared with the couple’s consent</p>
        </section>

        <section className="flex flex-col items-start justify-between gap-8 border border-gray-200 bg-surface p-8 sm:p-12 md:flex-row md:items-center">
          <div className="flex flex-col gap-2.5">
            <h2 className="font-serif text-[2.25rem] font-normal leading-[1.1] text-brand sm:text-[2.625rem]">
              Ready to begin your forever?
            </h2>
            <p className="text-[0.9375rem] leading-relaxed text-gray-700">
              Create your account and bring your people, plans, and memories together.
            </p>
          </div>
          <Link to="/register" className="btn min-h-14 shrink-0 px-12 text-[0.8125rem] tracking-[0.24em]">
            Create free account
          </Link>
        </section>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-6 border-t border-gray-200 py-10 mt-24">
          <p className="plate eyebrow tracking-[0.18em]">World of Weddingz · © {new Date().getFullYear()}</p>
          <nav className="flex items-center gap-8">
            <Link to="/login" className="plate eyebrow tracking-[0.18em] hover:text-brand">
              Sign in
            </Link>
            <Link to="/register" className="plate eyebrow tracking-[0.18em] hover:text-brand">
              Register
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow tracking-[0.22em]">
        {label}
      </label>
      {children}
    </div>
  );
}
