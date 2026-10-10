import { Link } from 'react-router-dom';
import { ArrowRight, Heart, MagnifyingGlass, Notebook, ShieldCheck, UsersThree } from '@phosphor-icons/react';
import { ANDROID_APK } from '../components/AppDownload';

const NAV_LINK = 'text-[0.75rem] uppercase tracking-[0.16em] transition';

const PILLARS = [
  { icon: Heart, title: 'Meaningful Matches', body: 'People who align with your values, dreams and way of family life.' },
  { icon: ShieldCheck, title: 'Verified & Genuine', body: 'Real people, real intentions and a careful verification process.' },
  { icon: Notebook, title: 'A Kinder Community', body: 'A respectful space where families and individuals meet with care.' },
  { icon: UsersThree, title: 'Wedding Planning Together', body: 'From venues to vendors, your celebration stays in one place.' },
  { icon: Heart, title: 'Your Privacy, Our Priority', body: 'A safe and discreet experience with clear control at every step.' },
];

const JOURNEY = [
  { no: '01', title: 'Discover Matches', body: 'Thoughtful recommendations based on your values, lifestyle and life goals.', position: '0% center' },
  { no: '02', title: 'Meaningful Connections', body: 'Private introductions and conversations in a safe, respectful environment.', position: '33.333% center' },
  { no: '03', title: 'Plan Your Celebration', body: 'Access trusted venues, vendors and expert guidance after you find your match.', position: '66.666% center' },
  { no: '04', title: 'Begin a Beautiful Life', body: 'From the yes to forever, we are here for every meaningful milestone.', position: '100% center' },
];

const SERVICES = [
  { title: 'Venues', body: 'Udaipur palaces, Jaipur heritage, Goa beaches and Kerala backwaters.', position: '0% center' },
  { title: 'Photographers', body: 'Timeless stories through beautifully captured moments.', position: '25% center' },
  { title: 'Decorators', body: 'Bespoke designs that reflect your story and style.', position: '50% center' },
  { title: 'Caterers', body: 'Exceptional culinary experiences for your guests.', position: '75% center' },
  { title: 'Travel & Hospitality', body: 'Seamless stays, journeys and guest experiences.', position: '100% center' },
];

const STORIES = [
  { quote: 'WOW helped us begin with compatibility, family values and a conversation that felt natural.', label: 'Illustrative community story · shared with consent' },
  { quote: 'The same place helped us move from a thoughtful introduction to a celebration that felt like ours.', label: 'Illustrative community story · shared with consent' },
  { quote: 'Every step felt more considered: the match, the conversation, and the people who helped us plan.', label: 'Illustrative community story · shared with consent' },
];

export default function Home() {
  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-canvas" data-testid="home-page">
      <div className="flex min-h-[100dvh] w-full flex-col">
        {/* ─── Glassmorphic Header ─── */}
        <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex min-h-[6.25rem] w-full flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-white/15 bg-[rgb(5_10_26_/_0.25)] px-5 py-4 text-white backdrop-blur-xl sm:px-10 lg:px-16" data-testid="home-header">
          <Link to="/" className="flex flex-col items-center font-serif leading-none text-white drop-shadow-sm" data-testid="home-logo">
            <span className="text-[2rem] tracking-[0.14em]">W<span className="text-gold-lit">O</span>W</span>
            <span className="mt-1 text-[0.5rem] uppercase tracking-[0.28em] text-gold-lit/80">World of Weddingz</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-white" data-testid="home-nav">
            <a href="#profiles" className={`${NAV_LINK} text-white/85 hover:text-gold-lit`}>Profiles</a>
            <a href="#how" className={`${NAV_LINK} text-white/85 hover:text-gold-lit`}>How it works</a>
            <a href="#services" className={`${NAV_LINK} text-white/85 hover:text-gold-lit`}>Wedding services</a>
            <a href="#stories" className={`${NAV_LINK} text-white/85 hover:text-gold-lit`}>Stories</a>
            <a href="#families" className={`${NAV_LINK} text-white/85 hover:text-gold-lit`}>For families</a>
            <Link to="/login" className={`${NAV_LINK} text-white/85 hover:text-gold-lit`} data-testid="home-sign-in-link">Sign in</Link>
            <Link to="/register" className="inline-flex min-h-11 items-center border border-gold-lit/60 bg-gold-deep/90 px-5 text-[0.7rem] uppercase tracking-[0.16em] text-white transition hover:bg-gold hover:text-[rgb(5_10_26)]" data-testid="home-register-btn">Register <ArrowRight className="ml-2" size={14} /></Link>
          </nav>
        </header>

        {/* ─── Hero Section ─── */}
        <section aria-label="A beautiful future begins here" className="relative min-h-[42rem] overflow-hidden text-white sm:min-h-[46rem]" data-testid="hero-section">
          <img src="/images/wow-home-hero.webp" alt="A couple seated beside a palace lake at sunset" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgb(5_10_26_/_0.88)] via-[rgb(10_17_40_/_0.55)] to-transparent" />
          {/* Animated gold dot pattern overlay */}
          <div className="absolute inset-0 hero-dots-drift opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(rgba(197, 160, 89, 0.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative mx-auto flex min-h-[42rem] w-full items-end px-6 pb-16 pt-36 sm:min-h-[46rem] sm:px-12 sm:pb-20 lg:px-24">
            <div className="max-w-[39rem]">
              <p className="eyebrow text-xs tracking-[0.36em] text-gold-lit">More than a match</p>
              <h1 className="mt-5 font-serif text-[3.6rem] font-light leading-[0.94] text-white sm:text-[5.9rem]">A life partner<br />for a more <em className="font-normal text-gold-lit">beautiful tomorrow.</em></h1>
              <p className="mt-6 max-w-[34rem] text-[1.05rem] leading-[1.65] text-white/90">Thoughtful matrimonial matching, private introductions, and everything your wedding needs after the yes.</p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link to="/register" className="inline-flex min-h-12 items-center border border-gold-lit/50 bg-gold-deep px-6 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-gold hover:text-[rgb(5_10_26)]" data-testid="hero-register-btn">Begin your journey <ArrowRight className="ml-3" size={16} /></Link>
                <a href="#how" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/90 hover:text-gold-lit"><span className="grid h-9 w-9 place-items-center border border-gold-lit/50 rounded-full text-gold-lit">▶</span> Watch our story</a>
              </div>
            </div>
          </div>
          <p className="absolute bottom-16 right-8 hidden max-w-[11rem] rotate-[-8deg] font-serif text-2xl italic leading-tight text-gold-lit lg:block">Same hearts.<br />New journeys.<br />Together.</p>
        </section>

        {/* ─── Pillars ─── */}
        <section aria-label="Why families choose WOW" className="relative border-b border-t px-6 py-8 sm:px-10 lg:px-16" style={{ borderColor: 'rgb(197 160 89 / 0.15)', background: 'linear-gradient(to bottom, rgb(var(--surface)), rgb(var(--surface-sunken)))' }} data-testid="pillars-section">
          <div className="relative mx-auto grid w-full max-w-[100rem] gap-6 md:grid-cols-5">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-r px-3 text-center last:border-0" style={{ borderColor: 'rgb(197 160 89 / 0.15)' }}>
                <Icon className="mx-auto text-gold-deep" size={34} weight="thin" />
                <h2 className="mt-3 font-serif text-xl text-brand">{title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Journey Section ─── */}
        <section id="profiles" className="relative overflow-hidden px-6 py-20 sm:px-10 lg:px-20" data-testid="journey-section">
          <div className="relative mx-auto grid w-full max-w-[100rem] gap-10 lg:grid-cols-[0.8fr_1.5fr] lg:items-center">
            <div>
              <p className="eyebrow tracking-[0.24em]">Your journey with WOW</p>
              <h2 className="mt-3 max-w-[25rem] font-serif text-4xl leading-tight text-brand sm:text-5xl">From a meaningful match to a beautiful beginning.</h2>
              <p className="mt-5 max-w-[31rem] text-sm leading-relaxed text-gray-700">More than matching people, we walk with you through every step—from meeting the right person to planning the wedding of your dreams.</p>
              <Link to="/register" className="btn mt-6 inline-flex" data-testid="journey-register-btn">Explore the journey <ArrowRight className="ml-2" size={15} /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {JOURNEY.map((item) => (
                <article key={item.no} className="group overflow-hidden bg-surface shadow-card" style={{ border: '1px solid rgb(197 160 89 / 0.18)' }}>
                  <div className="h-48 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: 'url(/images/wow-journey-v2.webp)', backgroundPosition: item.position }} />
                  <div className="p-4">
                    <p className="font-serif text-2xl text-gold-deep">{item.no}</p>
                    <h3 className="mt-1 font-serif text-xl text-brand">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-gray-600">{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Services Section ─── */}
        <section id="services" className="relative overflow-hidden border-y bg-surface-sunken px-6 py-20 sm:px-10 lg:px-20" style={{ borderColor: 'rgb(197 160 89 / 0.15)' }} data-testid="services-section">
          <div className="relative mx-auto w-full max-w-[100rem]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow tracking-[0.24em]">Make your day extraordinary</p>
                <h2 className="mt-3 font-serif text-4xl text-brand sm:text-5xl">Trusted wedding experts, all in one place.</h2>
              </div>
              <div className="max-w-[25rem] text-sm leading-relaxed text-gray-700">
                <p>Curated venues and vendors to bring your celebration to life. Work with experienced professionals who understand your style, traditions and what truly matters to you.</p>
                <a href="#services" className="mt-4 inline-flex items-center text-xs uppercase tracking-[0.18em] text-gold-deep hover:text-gold">Browse wedding services <ArrowRight className="ml-2" size={15} /></a>
              </div>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {SERVICES.map((service) => (
                <article key={service.title} className="overflow-hidden bg-surface shadow-card" style={{ border: '1px solid rgb(197 160 89 / 0.18)' }}>
                  <div className="h-40 bg-cover" style={{ backgroundImage: 'url(/images/wow-services-v2.webp)', backgroundPosition: service.position }} />
                  <div className="p-4">
                    <h3 className="font-serif text-2xl text-brand">{service.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-gray-600">{service.body}</p>
                    <span className="mt-4 grid h-7 w-7 place-items-center rounded-full text-gold-deep" style={{ border: '1px solid rgb(197 160 89 / 0.4)' }}>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section id="how" className="relative overflow-hidden px-6 py-20 text-center sm:px-10 lg:px-20" data-testid="how-section">
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(rgb(197 160 89) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative mx-auto w-full max-w-[100rem]">
            <h2 className="font-serif text-5xl text-brand">How it works</h2>
            <p className="mt-2 text-sm text-gray-600">A simple, thoughtful journey designed for what truly matters.</p>
            <div className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                { icon: Notebook, no: '01', title: 'Create your profile', body: 'Share your story, values, preferences and what truly matters to you.' },
                { icon: MagnifyingGlass, no: '02', title: 'Discover matches', body: 'We bring you compatible people who align with your goals and way of life.' },
                { icon: Heart, no: '03', title: 'Meaningful conversations', body: 'Connect in a safe, respectful environment with genuine intent.' },
                { icon: UsersThree, no: '04', title: 'Plan your next step', body: 'When it feels right, involve your families and plan the celebration.' },
              ].map(({ icon: Icon, no, title, body }) => (
                <article key={no} className="relative">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full text-brand" style={{ background: 'rgb(var(--brand-soft))', border: '1px solid rgb(197 160 89 / 0.2)' }}>
                    <Icon size={28} weight="thin" />
                  </span>
                  <p className="mt-4 font-serif text-2xl text-gold-deep">{no}</p>
                  <h3 className="mt-1 font-serif text-2xl text-brand">{title}</h3>
                  <p className="mx-auto mt-2 max-w-[14rem] text-sm leading-relaxed text-gray-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Stories ─── */}
        <section id="stories" className="relative overflow-hidden border-y bg-surface-sunken px-6 py-20 sm:px-10 lg:px-20" style={{ borderColor: 'rgb(197 160 89 / 0.15)' }} data-testid="stories-section">
          <div className="relative mx-auto w-full max-w-[100rem]">
            <div className="text-center">
              <h2 className="font-serif text-5xl text-brand">Real stories. Real happiness.</h2>
              <p className="mt-2 text-sm text-gray-600">Community stories, shared with consent.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STORIES.map((story) => (
                <article key={story.quote} className="bg-surface p-7 shadow-card" style={{ border: '1px solid rgb(197 160 89 / 0.18)' }}>
                  <span className="font-serif text-5xl text-gold">&ldquo;</span>
                  <p className="mt-[-0.7rem] font-serif text-2xl leading-tight text-brand">{story.quote}</p>
                  <p className="mt-6 text-[0.65rem] uppercase tracking-[0.16em] text-gray-500">{story.label}</p>
                  <Heart className="mt-4 text-gold-deep" size={19} />
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Section ─── */}
        <section id="families" className="relative min-h-[22rem] overflow-hidden text-center text-white" data-testid="cta-section">
          <img src="/images/wow-home-hero.webp" alt="Wedding lights beside a lake at sunset" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-[rgb(5_10_26_/_0.78)]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(rgba(197, 160, 89, 0.8) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative mx-auto flex min-h-[22rem] max-w-[50rem] flex-col items-center justify-center px-6">
            <p className="eyebrow text-gold-lit">Your next chapter is waiting</p>
            <h2 className="mt-3 font-serif text-5xl leading-tight text-white sm:text-6xl">Begin a chapter worth remembering.</h2>
            <p className="mt-3 max-w-[32rem] text-sm leading-relaxed text-white/90">Because somewhere, a beautiful life is waiting to be written—with you.</p>
            <Link to="/register" className="mt-6 inline-flex min-h-12 items-center border border-gold-lit/50 bg-gold-deep px-7 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-gold hover:text-[rgb(5_10_26)]" data-testid="cta-register-btn">Begin your journey <ArrowRight className="ml-3" size={16} /></Link>
          </div>
        </section>

        {/* ─── App Download ─── */}
        <section id="app" className="flex flex-col items-start justify-between gap-8 border-b bg-surface p-8 sm:p-12 md:flex-row md:items-center" style={{ borderColor: 'rgb(197 160 89 / 0.15)' }} data-testid="app-download-section">
          <div className="max-w-[40rem]">
            <h2 className="font-serif text-4xl text-brand">Take WOW with you.</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">The same profile, matches and private conversations on your phone, with calls and notifications.</p>
          </div>
          <a href={ANDROID_APK} download="wow.apk" className="btn-outline min-h-12 w-full justify-center sm:w-auto" data-testid="download-apk-btn">Download for Android</a>
        </section>

        {/* ─── Footer ─── */}
        <footer className="relative flex flex-wrap items-center justify-between gap-6 px-6 py-10 sm:px-10 lg:px-20" data-testid="home-footer">
          <div className="relative flex flex-col items-center font-serif leading-none text-brand">
            <span className="text-[2rem] tracking-[0.14em]">W<span className="text-gold-deep">O</span>W</span>
            <span className="mt-1 text-[0.5rem] uppercase tracking-[0.28em] text-gold-deep/70">World of Weddingz</span>
          </div>
          <nav className="relative flex flex-wrap items-center gap-6 text-xs text-gray-600">
            <Link to="/login" data-testid="footer-sign-in">Sign in</Link>
            <Link to="/register" data-testid="footer-register">Register</Link>
            <Link to="/support" data-testid="footer-support">Support</Link>
            <span>Privacy · Terms</span>
          </nav>
          <p className="relative w-full text-center text-[0.65rem] uppercase tracking-[0.28em] text-gray-500">People · Stories · A brighter tomorrow</p>
        </footer>
      </div>
    </div>
  );
}
