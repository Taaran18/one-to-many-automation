import Link from 'next/link';

const STATS = [
  { value: '10M+',  label: 'Messages Sent'  },
  { value: '500+',  label: 'Businesses'      },
  { value: '99.9%', label: 'Uptime'          },
];

const CHANNELS = [
  {
    color: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300',
    dot: 'bg-emerald-400',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
      </svg>
    ),
    label: 'WhatsApp',
  },
  {
    color: 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300',
    dot: 'bg-indigo-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Email',
  },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">

      {/* ── Background decoration ── */}
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-48 bg-indigo-600/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-36 text-center">

        {/* ── Channel badges ── */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          {CHANNELS.map(c => (
            <div
              key={c.label}
              className={`inline-flex items-center gap-2 border text-sm font-medium px-4 py-2 rounded-full ${c.color}`}
            >
              <span className={`w-2 h-2 ${c.dot} rounded-full`} />
              {c.icon}
              {c.label}
            </div>
          ))}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-400 text-sm font-medium px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Trusted by 500+ businesses
          </div>
        </div>

        {/* ── Headline ── */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white mb-6">
          One Platform.{' '}
          <span className="landing-gradient-text">Every Channel.</span>
          <br />
          <span className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-300">
            WhatsApp &amp; Email — Automated.
          </span>
        </h1>

        {/* ── Sub-headline ── */}
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Send personalized WhatsApp messages and emails to thousands of leads,
          manage multi-channel campaigns, and track every response — all from
          one powerful dashboard.
        </p>

        {/* ── CTAs ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="group bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 w-full sm:w-auto"
          >
            Start for Free
            <span className="ml-2 group-hover:translate-x-0.5 inline-block transition-transform">→</span>
          </Link>
          <a
            href="#features"
            className="bg-white/8 hover:bg-white/12 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all border border-white/15 hover:border-white/25 w-full sm:w-auto"
          >
            See How It Works
          </a>
        </div>

        {/* ── Social proof numbers ── */}
        <div className="mt-20 inline-grid grid-cols-3 gap-12 sm:gap-20">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom fade ── */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-slate-950 to-transparent" />
    </section>
  );
}
