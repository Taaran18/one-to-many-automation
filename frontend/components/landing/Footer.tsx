import Link from 'next/link';
import Image from 'next/image';

const COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing',  href: '#pricing'  },
      { label: 'FAQ',      href: '#faq'       },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   href: '#about'   },
      { label: 'Contact', href: '#contact' },
      { label: 'Blog',    href: '#'        },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy',   href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="OneToMany" width={32} height={32} className="rounded-xl" />
              <span className="font-bold text-slate-900 dark:text-white">OneToMany</span>
            </Link>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              WhatsApp automation for modern businesses that want to grow without the grind.
            </p>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.heading}>
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-5">
                {col.heading}
              </div>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400 dark:text-slate-500">
          <span>© {new Date().getFullYear()} OneToMany. All rights reserved.</span>
          <span>Made with ❤️ for businesses that want to grow</span>
        </div>
      </div>
    </footer>
  );
}
