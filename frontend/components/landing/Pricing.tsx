import Link from 'next/link';

const PLANS = [
  {
    name:        'Starter',
    price:       'Free',
    sub:         'Forever free',
    desc:        'Perfect for small teams testing the waters with WhatsApp automation.',
    highlight:   false,
    badge:       null,
    features: [
      '100 messages / month',
      '1 active campaign',
      'Up to 50 leads',
      'Basic message templates',
      'QR code connection',
      'Email support',
    ],
    cta:     'Get Started Free',
    ctaHref: '/login',
  },
  {
    name:        'Pro',
    price:       '₹999',
    sub:         'per month',
    desc:        'For growing businesses that need more reach and automation power.',
    highlight:   true,
    badge:       'Most Popular',
    features: [
      '10,000 messages / month',
      'Unlimited campaigns',
      '5,000 leads',
      'Advanced templates + variables',
      'QR + Meta Business API',
      'Campaign scheduling',
      'Analytics dashboard',
      'Priority support',
    ],
    cta:     'Start Pro Trial',
    ctaHref: '/login',
  },
  {
    name:        'Business',
    price:       '₹2,999',
    sub:         'per month',
    desc:        'Enterprise-grade automation for high-volume senders.',
    highlight:   false,
    badge:       null,
    features: [
      'Unlimited messages',
      'Unlimited campaigns',
      'Unlimited leads',
      'Custom templates',
      'Meta Business API',
      'Recurring campaigns',
      'Advanced analytics',
      'Dedicated support',
    ],
    cta:     'Contact Sales',
    ctaHref: '#contact',
  },
];

function CheckIcon({ highlight }: { highlight: boolean }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 ${highlight ? 'text-indigo-200' : 'text-indigo-500 dark:text-indigo-400'}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="py-28 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Pricing
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            No hidden fees. Cancel anytime. Scale as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col transition-all ${
                plan.highlight
                  ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30 md:-mt-4 md:mb-4'
                  : 'bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <div className={`text-xs font-bold uppercase tracking-widest ${plan.highlight ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {plan.name}
              </div>

              {/* Price */}
              <div className="mt-3 flex items-end gap-1">
                <span className={`text-4xl font-extrabold leading-none ${plan.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {plan.price}
                </span>
                <span className={`text-sm mb-1 ${plan.highlight ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  {plan.sub}
                </span>
              </div>

              <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {plan.desc}
              </p>

              {/* Features list */}
              <ul className="mt-7 space-y-3 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <CheckIcon highlight={plan.highlight} />
                    <span className={plan.highlight ? 'text-indigo-50' : 'text-slate-600 dark:text-slate-300'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                className={`mt-8 block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : 'bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
