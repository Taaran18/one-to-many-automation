import Link from 'next/link';

const STATS = [
  { value: '10M+',  label: 'Messages Sent'  },
  { value: '500+',  label: 'Businesses'      },
  { value: '99.9%', label: 'Uptime'          },
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
        {/* subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-36 text-center">

        {/* ── Trust badge ── */}
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Trusted by 500+ businesses worldwide
        </div>

        {/* ── Headline ── */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white mb-6">
          Scale Your WhatsApp{' '}
          <span className="landing-gradient-text">Outreach</span>
          <span>. Automatically.</span>
        </h1>

        {/* ── Sub-headline ── */}
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Send personalized messages to thousands of leads, manage campaigns,
          track responses — all from one powerful dashboard.
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
