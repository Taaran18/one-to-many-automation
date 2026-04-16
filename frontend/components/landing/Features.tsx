const FEATURES = [
  {
    icon: '💬',
    grad: 'grad-1',
    tag: 'WhatsApp',
    tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    title: 'Bulk WhatsApp Messaging',
    desc: 'Send personalized messages to thousands of leads at once via QR or Meta Business API. Variable substitution makes every message feel one-on-one.',
  },
  {
    icon: '✉️',
    grad: 'grad-6',
    tag: 'Email',
    tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    title: 'Bulk Email Campaigns',
    desc: 'Send rich HTML or plain-text emails to your entire lead list. Connect any SMTP provider — Gmail, Outlook, or custom — in seconds.',
  },
  {
    icon: '🗓️',
    grad: 'grad-2',
    tag: 'Both',
    tagColor: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    title: 'Smart Campaign Scheduling',
    desc: 'Schedule WhatsApp and email campaigns in advance or set recurring sends — daily, weekly, or monthly. Set it once and never miss a follow-up.',
  },
  {
    icon: '👥',
    grad: 'grad-3',
    tag: 'Both',
    tagColor: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    title: 'Lead & Group Management',
    desc: 'Organize contacts into groups, import via CSV, filter by status. One contact database feeds both your WhatsApp and email campaigns.',
  },
  {
    icon: '📝',
    grad: 'grad-5',
    tag: 'Both',
    tagColor: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    title: 'Rich Message Templates',
    desc: 'Build reusable templates with dynamic variables for WhatsApp (QR & Meta API) and email (HTML + plain text). One template library, every channel.',
  },
  {
    icon: '📥',
    grad: 'grad-7',
    tag: 'WhatsApp',
    tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    title: 'Two-Way Chat Inbox',
    desc: 'Receive and reply to inbound WhatsApp messages in a unified inbox. Full conversation history, unread badges, and fast replies.',
  },
  {
    icon: '⚡',
    grad: 'grad-1',
    tag: 'WhatsApp',
    tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    title: 'Webhook & API Access',
    desc: 'Trigger WhatsApp messages from Zapier, Make, n8n, or any HTTP client. Generate a webhook URL or API key and integrate in minutes.',
  },
  {
    icon: '📊',
    grad: 'grad-4',
    tag: 'Both',
    tagColor: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    title: 'Analytics & Insights',
    desc: 'Track delivery rates, campaign performance, and engagement across WhatsApp and email. Interactive charts show you what works.',
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
            WhatsApp and Email — managed from one dashboard. Built for sales teams,
            marketers, and entrepreneurs who want to reach more people without the manual effort.
          </p>

          {/* ── Channel legend ── */}
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            {[
              { label: 'WhatsApp', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
              { label: 'Email',    color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
              { label: 'Both',     color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
            ].map(l => (
              <span key={l.label} className={`text-xs font-semibold px-3 py-1 rounded-full ${l.color}`}>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="feature-card group p-6 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${f.grad} w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0`}>
                  {f.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${f.tagColor}`}>
                  {f.tag}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                {f.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
