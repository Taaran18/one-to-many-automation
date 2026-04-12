'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/layout/ThemeToggle';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing',  href: '#pricing'  },
  { label: 'About',    href: '#about'    },
  { label: 'FAQ',      href: '#faq'      },
  { label: 'Contact',  href: '#contact'  },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const textClass = scrolled
    ? 'text-slate-600 dark:text-slate-300'
    : 'text-white/80';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-slate-800'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <Image src="/logo.png" alt="OneToMany" width={34} height={34} className="rounded-xl" />
            <span className={`font-bold text-base transition-colors ${scrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`}>
              OneToMany
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a
                key={l.label}
                href={l.href}
                className={`text-sm font-medium transition-colors hover:text-indigo-500 dark:hover:text-indigo-400 ${textClass}`}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* ── CTA + toggle + mobile hamburger ── */}
          <div className="flex items-center gap-2">
            <div className={scrolled ? '' : '[&_button]:text-white/70 [&_button]:hover:text-white [&_button]:hover:bg-white/10'}>
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Get Started
            </Link>

            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled ? 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800' : 'text-white hover:bg-white/10'
              }`}
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 px-6 py-4">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-slate-700 dark:text-slate-300 text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="flex items-center justify-between pt-1">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl text-center transition-colors flex-1 mr-3"
              >
                Get Started
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
