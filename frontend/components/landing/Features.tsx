const FEATURES = [
  {
    icon: '💬',
    grad: 'grad-1',
    title: 'Bulk WhatsApp Messaging',
    desc: 'Send personalized messages to thousands of leads at once. Variable substitution makes every message feel one-on-one, not a broadcast.',
  },
  {
    icon: '🗓️',
    grad: 'grad-2',
    title: 'Smart Campaign Scheduling',
    desc: 'Schedule campaigns in advance or configure recurring sends — daily, weekly, or monthly. Set it once and never miss a follow-up.',
  },
  {
    icon: '👥',
    grad: 'grad-3',
    title: 'Lead & Group Management',
    desc: 'Organize contacts into groups, import via CSV, filter by status. Your entire contact database in one clean interface.',
  },
  {
    icon: '📝',
    grad: 'grad-5',
    title: 'Rich Message Templates',
    desc: 'Build reusable templates with images, dynamic variables, and rich formatting. Sync directly with Meta Business API templates.',
  },
  {
    icon: '📥',
    grad: 'grad-6',
    title: 'Two-Way Chat Inbox',
    desc: 'Receive and reply to inbound messages from your leads in a unified inbox. Full conversation history, unread badges, and fast replies.',
  },
  {
    icon: '📊',
    grad: 'grad-7',
    title: 'Analytics & Insights',
    desc: 'Track delivery rates, campaign performance, and engagement trends. Interactive charts help you understand what works.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Features
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
            Everything you need to{' '}
            <span className="text-indigo-600 dark:text-indigo-400">automate outreach</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Built for sales teams, marketers, and entrepreneurs who want to reach more people without the manual effort.
          </p>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="feature-card group p-8 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
            >
              <div className={`${f.grad} w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 shadow-sm`}>
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
