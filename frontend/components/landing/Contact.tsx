'use client';

import { useState } from 'react';

type FormState = { name: string; email: string; message: string };
type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact() {
  const [form,   setForm]   = useState<FormState>({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    await new Promise(r => setTimeout(r, 900));
    setStatus('sent');
    setForm({ name: '', email: '', message: '' });
  }

  const inputCls =
    'w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition-all text-sm';

  return (
    <section id="contact" className="py-28 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Contact
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
            Get in touch
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Have a question or want to explore a custom plan? We&apos;d love to hear from you.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">✅</div>
            <div className="font-semibold text-xl text-slate-900 dark:text-white">Message sent!</div>
            <div className="text-sm mt-2 text-emerald-600 dark:text-emerald-400">
              We&apos;ll get back to you within 24 hours.
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 text-sm text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-2xl p-8 sm:p-10 space-y-6 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text" required value={form.name}
                  onChange={set('name')} placeholder="Your name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email" required value={form.email}
                  onChange={set('email')} placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Message / Query
              </label>
              <textarea
                required rows={5} value={form.message}
                onChange={set('message')} placeholder="Tell us how we can help..."
                className={`${inputCls} resize-none`}
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-sm shadow-indigo-600/20"
            >
              {status === 'sending' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending…
                </span>
              ) : 'Send Message →'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
