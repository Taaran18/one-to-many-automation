const TESTIMONIALS = [
  {
    name:   'Priya Sharma',
    role:   'Founder, StyleKart',
    avatar: 'PS',
    grad:   'grad-1',
    quote:  'OneToMany transformed how we reach customers. We went from 50 manual messages a day to automated campaigns hitting 5,000+ people weekly. Sales doubled in three months.',
    stars:  5,
  },
  {
    name:   'Rahul Mehta',
    role:   'Marketing Head, TechEdge',
    avatar: 'RM',
    grad:   'grad-2',
    quote:  "The campaign scheduler and template engine save us 20+ hours a week. The analytics dashboard gives exactly the insight we need. Best WhatsApp automation tool we've used.",
    stars:  5,
  },
  {
    name:   'Sneha Patel',
    role:   'CEO, GreenGrow Organics',
    avatar: 'SP',
    grad:   'grad-3',
    quote:  "We use OneToMany for our entire customer retention strategy. The two-way inbox means we never miss a reply. Setup was painless and the support team was outstanding.",
    stars:  5,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-28 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Testimonials
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
            Loved by businesses
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Real results from real customers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map(t => (
            <div
              key={t.name}
              className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col"
            >
              <Stars count={t.stars} />
              <p className="mt-5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 pt-6 border-t border-gray-50 dark:border-slate-700">
                <div className={`${t.grad} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{t.name}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
