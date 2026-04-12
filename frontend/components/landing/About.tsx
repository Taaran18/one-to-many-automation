const NUMBERS = [
  { value: '2022',  label: 'Year founded'    },
  { value: '12',    label: 'Team members'    },
  { value: '10M+',  label: 'Messages sent'   },
  { value: '99.9%', label: 'Uptime SLA'      },
];

const VALUES = [
  { icon: '🛡️', title: 'Privacy first',   desc: 'Your data and contacts are encrypted and never shared with third parties.'      },
  { icon: '⚡', title: 'Always fast',     desc: 'Optimised delivery pipeline built to handle millions of messages reliably.'       },
  { icon: '🌍', title: 'Global reach',    desc: 'Multi-region infrastructure for low-latency delivery worldwide.'                   },
  { icon: '🤝', title: 'Real support',    desc: 'Actual humans available via chat and email when you need help.'                   },
];

export default function About() {
  return (
    <section id="about" className="py-28 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: copy ── */}
          <div>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              About Us
            </span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
              Built by marketers,<br />for marketers
            </h2>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              OneToMany was born out of frustration. Our founders spent hours manually copying
              and pasting WhatsApp messages to leads, missing follow-ups, and losing track of conversations.
            </p>
            <p className="mt-4 text-slate-500 dark:text-slate-400 leading-relaxed">
              We built the tool we wished existed — one that handles the repetitive work while
              keeping your messaging personal. Today, hundreds of businesses use OneToMany to send
              millions of messages every month, without sacrificing the human touch.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-6">
              {NUMBERS.map(s => (
                <div key={s.label} className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-4">
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: value cards ── */}
          <div className="grid grid-cols-2 gap-4">
            {VALUES.map(v => (
              <div
                key={v.title}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{v.icon}</div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{v.title}</div>
                <div className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">{v.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
