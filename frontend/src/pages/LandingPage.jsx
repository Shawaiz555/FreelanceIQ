import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

// ─── Custom Hooks ─────────────────────────────────────────────────────────────

function useNavScroll() {
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return isScrolled;
}

function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((child) => {
              child.classList.add('visible');
            });
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return ref;
}

function useCountUp(target, duration = 1800, isActive = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    let current = 0;
    const steps = 60;
    const increment = target / steps;
    const interval = setInterval(() => {
      current = Math.min(Math.ceil(current + increment), target);
      setCount(current);
      if (current >= target) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, duration, isActive]);
  return count;
}

// ─── Shared Atoms ─────────────────────────────────────────────────────────────

function SectionBadge({ children, dark = false }) {
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
      dark
        ? 'bg-indigo-500/20 border border-indigo-400/30 text-indigo-300'
        : 'bg-blue-50 border border-blue-200 text-blue-600'
    }`}>
      {children}
    </span>
  );
}

function SectionHeader({ badge, title, subtitle, dark = false, center = true }) {
  return (
    <div className={center ? 'text-center' : ''}>
      {badge && <SectionBadge dark={dark}>{badge}</SectionBadge>}
      <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-4 leading-tight ${
        dark ? 'text-white' : 'text-slate-900'
      }`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base sm:text-lg leading-relaxed max-w-2xl ${center ? 'mx-auto' : ''} ${
          dark ? 'text-slate-300' : 'text-slate-500'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function GradientText({ children }) {
  return <span className="shimmer-text">{children}</span>;
}

// Inline SVG gauge (used in Hero mockup and Demo section)
function ScoreGauge({ score = 81, size = 140 }) {
  const [animated, setAnimated] = useState(false);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444';

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text x="50" y="47" textAnchor="middle" dominantBaseline="middle"
          fontSize="20" fontWeight="800" fill="white" fontFamily="Inter,system-ui,sans-serif">{score}</text>
        <text x="50" y="62" textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fill="rgba(148,163,184,0.9)" fontFamily="Inter,system-ui,sans-serif">/ 100</text>
      </svg>
    </div>
  );
}

function CheckItem({ children, available = true }) {
  return (
    <li className={`flex items-start gap-3 text-sm ${available ? 'text-slate-600' : 'text-slate-300 line-through'}`}>
      <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
        available ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'
      }`}>
        {available ? (
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
            <path d="M8.5 2.5L4 7 1.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l4 4M7 3L3 7" />
          </svg>
        )}
      </span>
      {children}
    </li>
  );
}

// ─── Section 1: Navbar ────────────────────────────────────────────────────────

function Navbar() {
  const isScrolled = useNavScroll();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'Testimonials', id: 'testimonials' },
    { label: 'FAQ', id: 'faq' },
  ];

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [menuOpen]);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/85 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2 focus:outline-none">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              Freelance<span className="text-blue-400">IQ</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="relative px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-3 right-3 h-px bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link to="/register">
              <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all duration-200 shadow-lg shadow-blue-500/25">
                Start Free →
              </button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 relative z-[80]"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Side Drawer Container */}
      <div className={`md:hidden fixed top-0 right-0 bottom-0 w-[300px] bg-slate-900 z-[70] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col ${
        menuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
          {/* Drawer Brand Header */}
          <div className={`flex items-center gap-3 mb-10 px-4 transition-all duration-500 ${
            menuOpen ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
          }`}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">
              Freelance<span className="text-blue-400">IQ</span>
            </span>
          </div>

          <nav className="flex flex-col gap-2">
            {navLinks.map((link, idx) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                style={{ transitionDelay: `${idx * 50}ms` }}
                className={`w-full text-left px-4 py-4 text-lg font-bold text-slate-100 hover:text-blue-400 hover:bg-white/5 rounded-2xl transition-all duration-300 ${
                  menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
          
          <div className={`mt-auto pt-10 border-t border-white/10 flex flex-col gap-4 transition-all duration-500 delay-300 ${
            menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-4 text-center text-lg font-bold text-slate-300 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-5 text-center text-lg font-black text-white rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
              Start Free — No Card
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Section 2: Hero ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background layers */}
      <div className="hero-gradient-bg absolute inset-0" />
      <div className="dot-grid-overlay absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.25),transparent)]" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-50 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-32 pt-36 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left: Text */}
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="animate-fade-in-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
              <SectionBadge dark>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                AI-Powered Bid Intelligence
              </SectionBadge>
            </div>

            <div className="animate-fade-in-up mt-6" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none text-white">
                Score Every Bid.
                <br />
                <GradientText>Win More Work.</GradientText>
              </h1>
            </div>

            <div className="animate-fade-in-up mt-6" style={{ animationDelay: '220ms', animationFillMode: 'both' }}>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-xl">
                FreelanceIQ analyzes your proposals against real platform data —
                giving you an AI-powered score and a prioritized roadmap before you hit send.
              </p>
            </div>

            <div className="animate-fade-in-up mt-8 flex flex-col sm:flex-row gap-4 items-start" style={{ animationDelay: '320ms', animationFillMode: 'both' }}>
              <div className="animate-pulse-ring rounded-xl">
                <Link to="/register">
                  <button className="px-7 py-3.5 text-base font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all duration-200 shadow-2xl shadow-blue-500/30 flex items-center gap-2">
                    Start Free — 10 Scores/Month
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </Link>
              </div>
              <button
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-7 py-3.5 text-base font-semibold rounded-xl border border-white/25 text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                </svg>
                See Demo
              </button>
            </div>

            <div className="animate-fade-in-up mt-5 flex flex-wrap gap-x-5 gap-y-1" style={{ animationDelay: '420ms', animationFillMode: 'both' }}>
              {['No credit card', 'Free forever plan', 'Setup in 60 seconds'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-slate-400">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="animate-float-slow relative max-w-md mx-auto lg:mx-0 lg:ml-auto">
              {/* Floating mini cards */}
              <div className="glass-card rounded-xl px-3 py-2.5 absolute -top-8 -left-4 z-20 animate-float shadow-lg" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-white">Score: 87 ↑</span>
                </div>
              </div>
              <div className="glass-card rounded-xl px-3 py-2.5 absolute -bottom-6 -right-4 z-20 animate-float shadow-lg" style={{ animationDelay: '1.2s', animationDuration: '4.5s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-white">Win Rate: High</span>
                </div>
              </div>
              <div className="glass-card rounded-xl px-3 py-2.5 absolute top-1/2 -right-6 -translate-y-1/2 z-20 animate-float shadow-lg hidden sm:flex items-center gap-2" style={{ animationDelay: '0.8s', animationDuration: '5s' }}>
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                </svg>
                <span className="text-xs font-semibold text-white">AI Ready</span>
              </div>

              {/* Main mockup card */}
              <div className="glass-card rounded-2xl p-6 shadow-2xl shadow-blue-500/20 relative z-10">
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-white">Bid Analysis</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Score gauge */}
                <div className="flex flex-col items-center mb-5">
                  <ScoreGauge score={81} size={120} />
                  <p className="text-xs font-semibold text-emerald-400 mt-2">Strong Bid · High Confidence</p>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { label: 'Budget', value: '92%', color: 'text-emerald-400' },
                    { label: 'Skills', value: '96%', color: 'text-blue-400' },
                    { label: 'Competition', value: 'Low', color: 'text-amber-400' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-white/5 px-2 py-2.5 text-center">
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="space-y-2.5">
                  {[
                    { label: 'Proposal Quality', pct: 82 },
                    { label: 'Rate Calibration', pct: 79 },
                    { label: 'Skill Alignment', pct: 96 },
                  ].map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{b.label}</span>
                        <span className="font-medium text-white">{b.pct}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${b.pct}%`, transition: 'width 1.5s ease 0.5s' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom tag */}
                <div className="mt-4 rounded-lg bg-amber-500/15 border border-amber-500/20 px-3 py-2 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-xs text-amber-300 font-medium">↑ 14% above market avg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-xs text-slate-400">Scroll to explore</span>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

// ─── Section 3: Social Proof ──────────────────────────────────────────────────

function SocialProofBar() {
  const ref = useScrollReveal();
  const [isActive, setIsActive] = useState(false);
  const sectionRef = useRef(null);

  const c1 = useCountUp(12400, 1600, isActive);
  const c2 = useCountUp(73, 1400, isActive);
  const c3 = useCountUp(4200000, 1800, isActive);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsActive(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formatCount = (n, target) => {
    if (target >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
    if (target >= 10000) return `${n.toLocaleString()}+`;
    return `${n}%`;
  };

  const platforms = ['Upwork', 'Fiverr', 'Toptal', 'Freelancer', 'PeoplePerHour', '99designs'];

  return (
    <section ref={sectionRef} className="py-16 bg-slate-50 border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6" ref={ref}>
        <p className="reveal text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
          Trusted by 12,400+ freelancers across top platforms
        </p>

        {/* Platform pills */}
        <div className="reveal flex flex-wrap justify-center gap-3 mb-12">
          {platforms.map((p) => (
            <span key={p} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors duration-200 cursor-default">
              <span className="w-2 h-2 rounded-full bg-blue-500 opacity-70" />
              {p}
            </span>
          ))}
        </div>

        {/* Animated counters */}
        <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-slate-200 pt-10">
          {[
            { count: c1, target: 12400, label: 'Freelancers scoring bids daily' },
            { count: c2, target: 73, label: 'Average win rate improvement' },
            { count: c3, target: 4200000, label: 'Proposals analyzed to date' },
          ].map(({ count, target, label }) => (
            <div key={label} className="reveal text-center">
              <div className="text-4xl font-black text-slate-900 tabular-nums">{formatCount(count, target)}</div>
              <div className="text-sm text-slate-500 mt-1.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 4: How It Works ──────────────────────────────────────────────────

function HowItWorksSection() {
  const ref = useScrollReveal();

  const steps = [
    {
      num: '01',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      from: 'from-blue-500', to: 'to-blue-700',
      title: 'Paste Your Bid',
      desc: 'Paste your proposal draft or job description into FreelanceIQ\'s intelligent editor. Works with any freelance platform including Upwork, Fiverr, and Toptal.',
    },
    {
      num: '02',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
      ),
      from: 'from-indigo-500', to: 'to-purple-600',
      title: 'AI Analyzes Everything',
      desc: 'Our model cross-references your bid against 4.2M historical proposals, platform algorithms, live market rates, and competitor patterns — all in real time.',
    },
    {
      num: '03',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      ),
      from: 'from-emerald-500', to: 'to-teal-600',
      title: 'Get Your Score & Roadmap',
      desc: 'Receive a 0–100 bid score with a prioritized list of improvements. Know exactly what to change before you submit — and track your win rate over time.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6" ref={ref}>
        <div className="reveal text-center">
          <SectionHeader
            badge="⚡ Simple Process"
            title="How FreelanceIQ Works"
            subtitle="Three steps from bid to insight — in under 10 seconds."
          />
        </div>

        <div className="relative mt-16">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-12 left-[calc(33.33%+2rem)] right-[calc(33.33%+2rem)] h-px"
            style={{ background: 'repeating-linear-gradient(90deg,#6366f1 0,#6366f1 8px,transparent 8px,transparent 18px)', opacity: 0.35 }} />

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="reveal group bg-white rounded-2xl p-8 border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/8 hover:-translate-y-1 transition-all duration-300">
                <div className="text-6xl font-black leading-none mb-4 bg-gradient-to-br from-slate-100 to-slate-200 bg-clip-text text-transparent select-none">
                  {s.num}
                </div>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center mb-6 shadow-lg`}>
                  {s.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 5: Features ──────────────────────────────────────────────────────

function FeaturesSection() {
  const ref = useScrollReveal();

  const features = [
    {
      from: 'from-blue-500', to: 'to-blue-700',
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
      title: 'AI Bid Score',
      desc: 'Instant 0–100 score backed by 4.2M real proposal outcomes. Know your exact odds before spending an hour writing.',
      tag: 'Core Feature', tagColor: 'bg-blue-50 text-blue-600',
    },
    {
      from: 'from-indigo-500', to: 'to-purple-600',
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
      title: 'Win Rate Prediction',
      desc: 'ML model predicts your probability of winning based on your profile strength, bid price, and platform-specific history.',
      tag: 'ML Powered', tagColor: 'bg-indigo-50 text-indigo-600',
    },
    {
      from: 'from-emerald-500', to: 'to-teal-600',
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
      title: 'Rate Benchmarking',
      desc: 'Instantly see if you\'re priced too high, too low, or spot on. Calibrate against platform norms and client budget signals.',
      tag: 'Pricing Intel', tagColor: 'bg-emerald-50 text-emerald-600',
    },
    {
      from: 'from-amber-500', to: 'to-orange-500',
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>,
      title: 'Proposal Rewriter',
      desc: 'One-click AI rewrite based on your score breakdown. Keeps your authentic voice while boosting your conversion signals.',
      tag: 'AI Writing', tagColor: 'bg-amber-50 text-amber-600',
    },
    {
      from: 'from-rose-500', to: 'to-pink-600',
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>,
      title: 'Platform Integrations',
      desc: 'Chrome extension auto-detects job posts on Upwork, Fiverr, and Freelancer.com. Score bids without leaving your browser tab.',
      tag: 'Integrations', tagColor: 'bg-rose-50 text-rose-600',
    },
    {
      from: 'from-cyan-500', to: 'to-blue-500',
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
      title: 'Bid History & Analytics',
      desc: 'Track scoring trends over time. See which improvements translated to wins and continuously optimize your proposal strategy.',
      tag: 'Analytics', tagColor: 'bg-cyan-50 text-cyan-600',
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6" ref={ref}>
        <div className="reveal text-center">
          <SectionHeader
            badge="✦ Everything You Need"
            title="Engineered for Winning Freelancers"
            subtitle="Every feature built around one goal: more proposals converted into paid projects."
          />
        </div>

        <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {features.map((f) => (
            <div key={f.title} className="reveal group bg-white rounded-2xl p-7 border border-slate-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/8 hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.from} ${f.to} flex items-center justify-center mb-5 shadow-md`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              <span className={`inline-block mt-4 text-xs font-semibold px-2.5 py-1 rounded-full ${f.tagColor}`}>
                {f.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: Demo ──────────────────────────────────────────────────────────

function DemoSection() {
  const ref = useScrollReveal();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = ['overview', 'breakdown', 'actions'];
  const breakdownItems = [
    { label: 'Proposal Quality', val: 82 },
    { label: 'Rate Calibration', val: 79 },
    { label: 'Profile Strength', val: 95 },
    { label: 'Keyword Match', val: 71 },
    { label: 'Response Speed', val: 88 },
  ];
  const actionItems = [
    { impact: 'High Impact', text: 'Add portfolio links matching React ecosystem work', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
    { impact: 'Medium', text: 'Reduce hourly rate by $8 for this market segment', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    { impact: 'Quick Win', text: 'Include a timeline estimate in your opening paragraph', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    { impact: 'Quick Win', text: 'Personalize the first line with the client\'s company name', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  ];

  return (
    <section id="demo" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6" ref={ref}>
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* Left: explanation */}
          <div>
            <div className="reveal">
              <SectionHeader
                badge="🎯 See It In Action"
                title={<>Your Score.<br />Your Edge.</>}
                subtitle="This is exactly what you see the moment your bid is analyzed — every data point tuned to maximize your win rate."
                center={false}
              />
            </div>
            <ul className="reveal mt-8 space-y-3">
              {[
                'Color-coded score breakdown by category',
                'Ranked list of improvement actions',
                'Market rate position indicator',
                'One-click export to clipboard',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <div className="reveal mt-8">
              <Link to="/register">
                <button className="px-6 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center gap-2">
                  Score Your First Bid Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>

          {/* Right: interactive card */}
          <div className="reveal">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-1 shadow-2xl shadow-blue-500/20">
              <div className="bg-slate-900 rounded-[22px] p-6">
                {/* Job title */}
                <p className="text-slate-300 font-semibold text-sm mb-4">
                  Senior React Developer — Upwork
                </p>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1">
                  {tabs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize transition-all duration-200 ${
                        activeTab === t
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Overview tab */}
                {activeTab === 'overview' && (
                  <div className="flex flex-col items-center">
                    <ScoreGauge score={81} size={130} />
                    <p className="text-xs font-semibold text-emerald-400 mt-3 mb-5">Strong Bid · High Confidence</p>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {[
                        { label: 'Budget Match', val: '92%', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
                        { label: 'Skill Match', val: '96%', bg: 'bg-blue-500/10', text: 'text-blue-400' },
                        { label: 'Competition', val: 'Low', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                      ].map((s) => (
                        <div key={s.label} className={`${s.bg} rounded-xl px-2 py-3 text-center`}>
                          <p className={`text-sm font-bold ${s.text}`}>{s.val}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown tab */}
                {activeTab === 'breakdown' && (
                  <div className="space-y-3">
                    {breakdownItems.map((b) => (
                      <div key={b.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{b.label}</span>
                          <span className="text-white font-semibold">{b.val}/100</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400"
                            style={{ width: `${b.val}%`, transition: 'width 0.8s ease' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions tab */}
                {activeTab === 'actions' && (
                  <div className="space-y-3">
                    {actionItems.map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-md border ${a.color}`}>
                          {a.impact}
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed pt-0.5">{a.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 7: Pricing ───────────────────────────────────────────────────────

function PricingSection() {
  const ref = useScrollReveal();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: 0,
      annualPrice: 0,
      description: 'Perfect for trying FreelanceIQ risk-free.',
      features: [
        { text: '10 bid scores per month', ok: true },
        { text: 'Basic score breakdown', ok: true },
        { text: '1 platform integration', ok: true },
        { text: 'Email support', ok: true },
        { text: 'AI proposal rewriter', ok: false },
        { text: 'Priority scoring (<3s)', ok: false },
        { text: 'Analytics dashboard', ok: false },
      ],
      cta: 'Get Started Free',
      ctaStyle: 'border border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600',
    },
    {
      name: 'Pro',
      price: 9,
      annualPrice: 7,
      description: 'For freelancers serious about winning more.',
      popular: true,
      features: [
        { text: 'Unlimited bid scores', ok: true },
        { text: 'Full score breakdown', ok: true },
        { text: 'All 6 platform integrations', ok: true },
        { text: 'AI rewriter (5 rewrites/mo)', ok: true },
        { text: 'Priority scoring (<3s)', ok: true },
        { text: 'Analytics dashboard', ok: true },
        { text: 'White-label reports', ok: false },
      ],
      cta: 'Start Pro Free — 14 Days',
      annualNote: true,
    },
    {
      name: 'Agency',
      price: 29,
      annualPrice: 23,
      description: 'For teams and agencies scaling their proposals.',
      badge: 'Team Plan',
      features: [
        { text: 'Everything in Pro', ok: true },
        { text: '10 team seats included', ok: true },
        { text: 'White-label PDF reports', ok: true },
        { text: 'API access', ok: true },
        { text: 'Dedicated account manager', ok: true },
        { text: 'SLA support (4hr response)', ok: true },
        { text: 'Custom integrations', ok: true },
      ],
      cta: 'Start Agency Trial',
      ctaStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20',
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6" ref={ref}>
        <div className="reveal text-center">
          <SectionHeader
            badge="💳 Transparent Pricing"
            title="Start Free. Scale When Ready."
            subtitle="No contracts. No surprises. Cancel anytime."
          />

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
            <button
              type="button"
              onClick={() => setIsAnnual((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isAnnual ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isAnnual ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-slate-900' : 'text-slate-400'}`}>
              Annual <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full ml-1">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="reveal-stagger mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`reveal relative rounded-2xl p-8 border transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-blue-600 to-indigo-700 border-transparent shadow-2xl shadow-blue-500/40 md:scale-105 md:z-10'
                  : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 text-xs font-bold bg-amber-400 text-amber-900 rounded-full shadow-md whitespace-nowrap">
                    ★ Most Popular
                  </span>
                </div>
              )}
              {plan.badge && !plan.popular && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full mb-3 inline-block">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? 'text-blue-200' : 'text-slate-500'}`}>{plan.description}</p>
                <div className="flex items-end gap-1 mt-4">
                  {plan.price === 0 ? (
                    <span className={`text-4xl font-black ${plan.popular ? 'text-white' : 'text-slate-900'}`}>Free</span>
                  ) : (
                    <>
                      <span className={`text-4xl font-black ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                        ${isAnnual ? plan.annualPrice : plan.price}
                      </span>
                      <span className={`text-sm pb-1 ${plan.popular ? 'text-blue-200' : 'text-slate-400'}`}>/mo</span>
                    </>
                  )}
                </div>
                {plan.annualNote && isAnnual && plan.annualPrice > 0 && (
                  <p className={`text-xs mt-1 ${plan.popular ? 'text-blue-200' : 'text-slate-400'}`}>
                    Billed ${plan.annualPrice * 12}/year
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f.text} className={`flex items-start gap-2.5 text-sm ${
                    f.ok
                      ? plan.popular ? 'text-blue-100' : 'text-slate-600'
                      : plan.popular ? 'text-blue-300/50 line-through' : 'text-slate-300 line-through'
                  }`}>
                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                      f.ok
                        ? plan.popular ? 'bg-white/20' : 'bg-emerald-100'
                        : plan.popular ? 'bg-white/10' : 'bg-slate-100'
                    }`}>
                      {f.ok ? (
                        <svg className={`w-2.5 h-2.5 ${plan.popular ? 'text-white' : 'text-emerald-600'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-2.5 h-2.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="block">
                <button className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-md'
                    : plan.ctaStyle || 'border border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600'
                }`}>
                  {plan.cta}
                </button>
              </Link>
              {plan.popular && (
                <p className="text-center text-xs text-blue-200 mt-2">No credit card required</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 8: Testimonials ──────────────────────────────────────────────────

function TestimonialsSection() {
  const ref = useScrollReveal();

  const testimonials = [
    {
      stars: 5,
      quote: 'I went from a 23% win rate to 61% in 6 weeks. FreelanceIQ told me I was underpricing and burying my value prop. Two changes. Night and day difference.',
      name: 'Marcus Thompson',
      role: 'Full-Stack Developer · Austin, TX',
      initials: 'MT',
      avatarFrom: 'from-blue-500', avatarTo: 'to-indigo-600',
      platform: 'Upwork', platformColor: 'bg-emerald-50 text-emerald-700',
    },
    {
      stars: 5,
      quote: 'The proposal rewriter alone is worth the subscription. I was skeptical about AI rewriting my voice, but it just sharpens it. My first Pro month paid for itself in the first project I landed.',
      name: 'Priya Kapoor',
      role: 'UX Designer & Researcher · London',
      initials: 'PK',
      avatarFrom: 'from-emerald-500', avatarTo: 'to-teal-600',
      platform: 'Toptal', platformColor: 'bg-slate-100 text-slate-700',
    },
    {
      stars: 5,
      quote: 'Running a small dev agency, I use the Agency plan for my whole team. The analytics dashboard shows us which niches our bids convert best in. Pure gold for strategy.',
      name: 'Jordan Rivera',
      role: 'Agency Owner · 8 Freelancers · Miami',
      initials: 'JR',
      avatarFrom: 'from-amber-500', avatarTo: 'to-orange-500',
      platform: 'Freelancer', platformColor: 'bg-blue-50 text-blue-700',
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6" ref={ref}>
        <div className="reveal text-center">
          <SectionHeader
            badge="⭐ Real Results"
            title="Freelancers Are Winning More"
            subtitle="Join thousands who stopped guessing and started scoring."
          />
        </div>

        <div className="reveal-stagger grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {testimonials.map((t) => (
            <div key={t.name} className="reveal bg-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 flex flex-col">
              {/* Stars */}
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>

              <p className="text-slate-700 text-sm leading-relaxed italic flex-1">"{t.quote}"</p>

              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-200">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarFrom} ${t.avatarTo} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-sm">{t.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400 truncate">{t.role}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${t.platformColor}`}>
                  {t.platform}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 9: FAQ ───────────────────────────────────────────────────────────

function FAQSection() {
  const ref = useScrollReveal();
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'Is FreelanceIQ really free to start?',
      a: 'Yes — our Free plan gives you 10 bid scores per month, forever. No credit card required. You only upgrade when you\'re seeing results and want unlimited scoring.',
    },
    {
      q: 'Which freelance platforms do you support?',
      a: 'We currently support Upwork, Fiverr, Toptal, Freelancer.com, PeoplePerHour, and 99designs. Our Chrome extension works natively on all six, with more platforms added quarterly.',
    },
    {
      q: 'How does the AI scoring actually work?',
      a: 'Our model was trained on 4.2 million historical proposals and their outcomes. It evaluates your bid across 12 dimensions including rate calibration, proposal quality signals, profile strength, keyword alignment, and competition density — outputting a weighted 0–100 composite score.',
    },
    {
      q: 'Will AI rewriting change my voice?',
      a: 'No. The rewriter is instructed to preserve your tone and personal style. It tightens structure, improves keyword placement, and strengthens your value proposition — without making you sound like a bot.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Absolutely. There are no contracts or cancellation fees. Cancel from your dashboard in under 30 seconds. You keep access until the end of your current billing period.',
    },
    {
      q: 'Do you offer refunds?',
      a: 'Yes — if you\'re not satisfied within 14 days of your first paid subscription, email us for a full refund. No questions asked.',
    },
  ];

  return (
    <section id="faq" className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6" ref={ref}>
        <div className="reveal text-center">
          <SectionHeader
            badge="❓ FAQ"
            title="Questions? We've Got Answers."
            subtitle={<>Still not sure? Reach us at <span className="text-blue-600">hello@freelanceiq.ai</span></>}
          />
        </div>

        <div className="reveal-stagger mt-12 space-y-0 border border-slate-200 rounded-2xl overflow-hidden bg-white">
          {faqs.map((faq, i) => (
            <div key={i} className="reveal">
              <div className={`border-b border-slate-200 last:border-0 transition-colors duration-200 ${openFaq === i ? 'bg-blue-50/50' : ''}`}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900 pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-blue-500' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  style={{ maxHeight: openFaq === i ? '300px' : '0px' }}
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                >
                  <p className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 10: Final CTA ────────────────────────────────────────────────────

function FinalCTASection() {
  const ref = useScrollReveal();

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="hero-gradient-bg absolute inset-0" />
      <div className="dot-grid-overlay absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(99,102,241,0.2),transparent)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center" ref={ref}>
        <div className="reveal">
          <SectionBadge dark>🚀 Get Started Today</SectionBadge>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight mt-6 text-white">
            Stop Guessing.
            <br />
            <GradientText>Start Winning.</GradientText>
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Join 12,400+ freelancers who score every bid with AI.
            The best proposal you'll ever send starts here.
          </p>
        </div>

        <div className="reveal mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <button className="px-8 py-4 text-base font-bold rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition-all duration-200 shadow-2xl flex items-center gap-2">
              Start Free — No Card Needed
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </Link>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 text-base font-semibold rounded-xl border border-white/30 text-white hover:bg-white/10 transition-all duration-200"
          >
            See Pricing ↓
          </button>
        </div>

        <div className="reveal mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {['10 free scores every month', 'No credit card required', 'Setup in 60 seconds'].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-sm text-slate-400">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 11: Footer ───────────────────────────────────────────────────────

function Footer() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const columns = [
    {
      heading: 'Product',
      links: [
        { label: 'Features', action: () => scrollTo('features') },
        { label: 'Pricing', action: () => scrollTo('pricing') },
        { label: 'How It Works', action: () => scrollTo('how-it-works') },
        { label: 'Changelog', action: null },
        { label: 'Roadmap', action: null },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', action: null },
        { label: 'Blog', action: null },
        { label: 'Careers', action: null },
        { label: 'Press Kit', action: null },
        { label: 'Contact', action: null },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', action: null },
        { label: 'Terms of Service', action: null },
        { label: 'Cookie Policy', action: null },
        { label: 'GDPR', action: null },
      ],
    },
  ];

  return (
    <footer className="bg-slate-950 py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Freelance<span className="text-blue-400">IQ</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              AI-powered bid scoring for ambitious freelancers.
              Score smarter. Win more.
            </p>
            {/* Social icons */}
            <div className="flex gap-2 mt-6">
              {[
                { label: 'Twitter/X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.734-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'LinkedIn', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z' },
                { label: 'GitHub', path: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
              ].map((s) => (
                <a key={s.label} href="#" aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center transition-all duration-200">
                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.action ? (
                      <button onClick={link.action} className="text-sm text-slate-500 hover:text-slate-300 transition-colors duration-200">
                        {link.label}
                      </button>
                    ) : (
                      <span className="text-sm text-slate-500 cursor-default">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-14 pt-8 border-t border-white/10">
          <p className="text-xs text-slate-500">© 2025 FreelanceIQ, Inc. All rights reserved.</p>
          <p className="text-xs text-slate-500">Built with ♥ for freelancers worldwide.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="font-sans">
      <Navbar />
      <HeroSection />
      <SocialProofBar />
      <HowItWorksSection />
      <FeaturesSection />
      <DemoSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}
