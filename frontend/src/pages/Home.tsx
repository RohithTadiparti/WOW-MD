import { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeartField from '../components/HeartField';

/**
 * The public home page, from the matrimony home design template.
 *
 * Shown at `/` to somebody who is not signed in; a signed-in person still
 * lands on their dashboard there. The template's profile cards and couple's
 * story are left out until there is real content for them: members' profiles
 * are private, and a testimonial has to be a real couple's own words.
 */
const STEPS = [
  {
    title: 'Create the profile',
    body: 'The bride or groom can start it, or a parent, or an agency acting for the family. Add the biodata, what you are looking for and a photograph.',
  },
  {
    title: 'Send an interest',
    body: 'Matches are suggested for the profile, most compatible first. Send an interest to the ones worth a conversation.',
  },
  {
    title: 'Connect privately',
    body: 'A conversation opens only once both sides accept. When the match is fixed, the wedding’s vendors and planner are booked here too.',
  },
];

export default function Home() {
  const nav = useNavigate();

  // Matches are suggested for a profile, so the search starts with one.
  function findMatches(e: FormEvent) {
    e.preventDefault();
    nav('/register');
  }

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-canvas">
      <HeartField />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[70rem] flex-col px-5 sm:px-8">
        <header className="flex min-h-[6.25rem] flex-wrap items-center justify-between gap-x-10 gap-y-3 border-b border-gray-200 py-4">
          <Link
            to="/"
            className="plate font-serif text-[1.35rem] uppercase tracking-[0.2em] text-brand sm:text-[1.7rem]"
          >
            World of Weddingz
          </Link>
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <a href="#how" className="plate text-[0.8125rem] uppercase tracking-[0.16em] text-gray-700 hover:text-brand">
              How it works
            </a>
            <Link to="/login" className="plate text-[0.8125rem] uppercase tracking-[0.16em] text-gray-700 hover:text-brand">
              Sign in
            </Link>
            <Link to="/register" className="btn min-h-[2.875rem]">
              Register
            </Link>
          </nav>
        </header>

        <section className="flex flex-col items-center gap-5 pt-16 text-center sm:pt-20">
          <p className="plate eyebrow text-gray-700">Matrimony · weddings · families</p>
          <h1 className="plate font-serif text-[3rem] font-light leading-[1.05] text-brand sm:text-[5.25rem]">
            Where two families
            <br />
            find each other
          </h1>
          <p className="plate max-w-[39rem] text-[1.0625rem] leading-[1.75] text-gray-700">
            A profile made by the person, their family or a trusted agency. Conversations that open
            only when both sides agree. And once the match is fixed, the vendors and planner for the
            wedding, booked in the same place.
          </p>
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

        <section id="how" className="grid gap-10 py-24 md:grid-cols-3 md:py-28">
          {STEPS.map((step, i) => (
            <article key={step.title} className="flex flex-col gap-3">
              <span className="plate w-fit font-serif text-[2.75rem] leading-none text-gold">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="plate w-fit font-serif text-[1.75rem] font-normal text-brand">{step.title}</h2>
              <p className="plate text-[0.9375rem] leading-[1.75] text-gray-700">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="flex flex-col items-start justify-between gap-8 border border-gray-200 bg-surface p-8 sm:p-12 md:flex-row md:items-center">
          <div className="flex flex-col gap-2.5">
            <h2 className="font-serif text-[2.25rem] font-normal leading-[1.1] text-brand sm:text-[2.625rem]">
              Start the profile today
            </h2>
            <p className="text-[0.9375rem] leading-relaxed text-gray-700">
              It takes a few minutes, and the biodata can be finished later.
            </p>
          </div>
          <Link to="/register" className="btn min-h-14 shrink-0 px-12 text-[0.8125rem] tracking-[0.24em]">
            Create profile
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
