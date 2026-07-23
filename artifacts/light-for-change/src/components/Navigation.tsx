import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { CandleLogo } from './CandleLogo';

export function Navigation() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/map', label: 'Explore Map', active: location === '/map' },
    { href: '/voices', label: 'Voices', active: location === '/voices' },
    { href: '/impact', label: 'Impact', active: location === '/impact' || location === '/stats' },
    { href: '/about', label: 'About', active: location === '/about' },
    { href: '/legal', label: 'Safety & Terms', active: location === '/legal' },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 py-3 glass-panel border-x-0 border-t-0 rounded-none bg-background/60"
        role="banner"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer hover:opacity-80 transition-opacity shrink-0" aria-label="Silent Solidarity - Home">
            <CandleLogo className="w-8 h-8 shrink-0 drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]" />
            <span className="font-serif text-lg sm:text-xl font-medium tracking-wide text-primary glow-text">Silent Solidarity</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  link.active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/light"
              className="ml-2 px-5 py-2 bg-primary/10 text-primary border border-primary/30 rounded-full text-sm font-medium hover:bg-primary/20 hover:border-primary/50 transition-all animate-glow-pulse cursor-pointer"
            >
              Add a Light
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-white hover:text-primary hover:bg-white/5 transition-all"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-background/95 glass-panel border-t border-white/10 rounded-t-2xl overflow-hidden"
            >
              {/* Drag handle indicator */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              <nav className="flex flex-col gap-1 p-4 pt-2" role="navigation" aria-label="Mobile navigation">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-3 rounded-xl text-base font-medium transition-all ${
                      link.active
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/light"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 px-4 py-3.5 bg-primary/10 text-primary border border-primary/30 rounded-full text-sm font-semibold hover:bg-primary/20 hover:border-primary/50 transition-all animate-glow-pulse text-center"
                >
                  🕯️ Add a Light
                </Link>
              </nav>
              {/* Safe area padding for notched devices */}
              <div className="h-[env(safe-area-inset-bottom,0px)]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
