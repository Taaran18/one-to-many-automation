'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'Is OneToMany compliant with WhatsApp policies?',
    a: 'Yes. OneToMany supports both QR-based connections for personal use and the Meta Business API for businesses — WhatsApp\'s officially approved method for bulk messaging. We recommend the Meta Business API for commercial use to stay fully compliant with WhatsApp\'s terms.',
  },
  {
    q: 'Do I need a WhatsApp Business account?',
    a: 'For QR connections, a regular WhatsApp account works. For the Meta Business API integration, you\'ll need a WhatsApp Business Account (WABA) registered through Meta. The setup is straightforward and we walk you through every step.',
  },
  {
    q: 'How does message personalisation work?',
    a: 'Templates support dynamic variables like {{name}}, {{company}}, {{phone}}, and any custom field from your lead database. Each recipient gets a uniquely personalised message — not a generic blast.',
  },
  {
    q: 'Can I import my existing contacts?',
    a: 'Yes. You can import leads via CSV with fields like name, phone, email, and custom status. You can also add leads manually or organise them into groups for targeted campaigns.',
  },
  {
    q: 'What happens if a message fails to deliver?',
    a: 'Failed messages are logged in the campaign dashboard with an error reason. You can rerun a campaign to retry only the failed recipients, without re-sending to contacts who already received the message.',
  },
  {
    q: 'Can I schedule campaigns in advance?',
    a: 'Absolutely. Set a specific date and time for any campaign to fire. You can also configure recurring campaigns — daily, weekly, or monthly — so you never have to manually kick off repeat sends.',
  },
  {
    q: 'Is my data secure?',
    a: 'All sensitive data (passwords, API tokens) is encrypted at rest using industry-standard encryption. We never store message content longer than necessary and never share your contact data with third parties.',
  },
];

// Split into two interleaved columns so lengths stay balanced
const leftCol  = FAQS.map((f, i) => ({ ...f, i })).filter((_, idx) => idx % 2 === 0);
const rightCol = FAQS.map((f, i) => ({ ...f, i })).filter((_, idx) => idx % 2 === 1);

function Item({
  faq,
  open,
  onToggle,
}: {
  faq: { q: string; a: string; i: number };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="font-medium text-slate-900 dark:text-white text-sm pr-4">
          {faq.q}
        </span>
        <svg
          className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 py-4 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm leading-relaxed border-t border-gray-100 dark:border-slate-800">
          {faq.a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (i: number) => setOpen(prev => (prev === i ? null : i));

  return (
    <section id="faq" className="py-28 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            FAQ
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
            Common questions
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Everything you need to know before getting started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left column */}
          <div className="space-y-4">
            {leftCol.map(faq => (
              <Item key={faq.i} faq={faq} open={open === faq.i} onToggle={() => toggle(faq.i)} />
            ))}
          </div>
          {/* Right column */}
          <div className="space-y-4">
            {rightCol.map(faq => (
              <Item key={faq.i} faq={faq} open={open === faq.i} onToggle={() => toggle(faq.i)} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
