import React, { useState, useEffect, useRef } from 'react';
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

const REVEAL_CLASSES = ['.reveal', '.reveal-left', '.reveal-right', '.reveal-scale'];

function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            REVEAL_CLASSES.forEach((cls) => {
              entry.target.querySelectorAll(cls).forEach((child) => {
                child.classList.add('visible');
              });
            });
            if (
              entry.target.classList.contains('reveal') ||
              entry.target.classList.contains('reveal-left') ||
              entry.target.classList.contains('reveal-right') ||
              entry.target.classList.contains('reveal-scale')
            ) {
              entry.target.classList.add('visible');
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -50px 0px' },
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
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
        dark
          ? 'bg-indigo-500/20 border border-indigo-400/30 text-indigo-300'
          : 'bg-blue-50 border border-blue-200 text-blue-600'
      }`}
    >
      {children}
    </span>
  );
}

function SectionHeader({ badge, title, subtitle, dark = false, center = true }) {
  return (
    <div className={center ? 'text-center' : ''}>
      {badge && <SectionBadge dark={dark}>{badge}</SectionBadge>}
      <h2
        className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-4 leading-tight ${
          dark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-base sm:text-lg leading-relaxed max-w-2xl ${center ? 'mx-auto' : ''} ${
            dark ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function GradientText({ children }) {
  return <span className="shimmer-text">{children}</span>;
}

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
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text
          x="50"
          y="47"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="800"
          fill="white"
          fontFamily="Inter,system-ui,sans-serif"
        >
          {score}
        </text>
        <text
          x="50"
          y="62"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill="rgba(148,163,184,0.9)"
          fontFamily="Inter,system-ui,sans-serif"
        >
          / 100
        </text>
      </svg>
    </div>
  );
}

function CheckItem({ children, available = true }) {
  return (
    <li
      className={`flex items-start gap-3 text-sm ${available ? 'text-slate-600' : 'text-slate-300 line-through'}`}
    >
      <span
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
          available ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'
        }`}
      >
        {available ? (
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
            <path
              d="M8.5 2.5L4 7 1.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            className="w-2.5 h-2.5"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
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
  const [drawerVisible, setDrawerVisible] = useState(false);

  const openMenu = () => {
    setMenuOpen(true);
    requestAnimationFrame(() => setDrawerVisible(true));
  };

  const closeMenu = () => {
    setDrawerVisible(false);
    setTimeout(() => setMenuOpen(false), 300);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    closeMenu();
  };

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ];

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0f172a]/90 backdrop-blur-xl border-b border-indigo-500/15 shadow-lg shadow-indigo-950/40'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => scrollTo('hero')}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-black text-white text-lg tracking-tight">
              Freelance<span className="text-blue-400">IQ</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-all"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link to="/register">
              <Button size="sm" className="shadow-lg shadow-blue-500/25">
                Start Free
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            onClick={openMenu}
            aria-label="Open menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className={`absolute inset-0 backdrop-blur-sm transition-all duration-300 ${drawerVisible ? 'bg-black/60' : 'bg-black/0'}`}
            onClick={closeMenu}
          />
          <div
            className={`absolute right-0 top-0 bottom-0 w-72 bg-[#0f172a] border-l border-indigo-500/15 shadow-2xl flex flex-col p-6 transition-transform duration-300 ease-out ${drawerVisible ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-black text-white text-lg">
                Freelance<span className="text-blue-400">IQ</span>
              </span>
              <button
                onClick={closeMenu}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="px-4 py-3 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-all text-left"
                >
                  {link.label}
                </button>
              ))}
            </nav>
            <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
              <Link
                to="/login"
                className="text-center text-sm font-semibold text-slate-300 hover:text-white transition-colors py-2"
                onClick={closeMenu}
              >
                Sign in
              </Link>
              <Link to="/register" onClick={closeMenu}>
                <Button fullWidth>Start Free</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Section 2: Hero ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      id="hero"
      className="relative hero-gradient-bg min-h-screen flex items-center overflow-hidden pt-16"
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24 w-full">
        {/* Top badge — centered */}
        <div className="flex justify-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/15 backdrop-blur-sm text-slate-300 text-xs font-semibold tracking-wide shadow-lg">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Browser Extension
            </span>
            <span className="w-px h-3 bg-white/20" />
            Auto-captures job details from Upwork &amp; LinkedIn
          </div>
        </div>

        {/* Headline — centered */}
        <div
          className="text-center max-w-4xl mx-auto animate-fade-in-up mb-6"
          style={{ animationDelay: '80ms' }}
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.04] mb-6">
            Score Every Bid.
            <br />
            <GradientText>Win More Clients.</GradientText>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Install the FreelanceIQ extension, open any job on Upwork or LinkedIn, and click{' '}
            <span className="text-white font-semibold">Analyze</span>. Get an instant AI score and
            know exactly what to bid before you apply.
          </p>
        </div>

        {/* CTAs — centered */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 animate-fade-in-up"
          style={{ animationDelay: '160ms' }}
        >
          <Link to="/register">
            <button className="group relative inline-flex items-center gap-2.5 px-7 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black rounded-2xl shadow-2xl shadow-blue-600/40 transition-all hover:shadow-blue-500/50 hover:-translate-y-0.5 active:scale-[0.98]">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Install Free Extension
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </Link>
          <button
            onClick={() =>
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/10 hover:border-white/25 transition-all"
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
            See How It Works
          </button>
        </div>

        {/* Trust pills */}
        <div
          className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-fade-in-up"
          style={{ animationDelay: '240ms' }}
        >
          {[
            { icon: '✓', text: 'No credit card' },
            { icon: '✓', text: 'Free forever plan' },
            { icon: '✓', text: 'Works on Upwork & LinkedIn' },
          ].map((item) => (
            <span
              key={item.text}
              className="flex items-center gap-1.5 text-xs text-slate-400 font-medium"
            >
              <span className="text-emerald-400 font-bold">{item.icon}</span>
              {item.text}
            </span>
          ))}
        </div>

        {/* Hero mockup — full width browser-style card */}
        <div className="animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <div className="relative max-w-4xl mx-auto">
            {/* Browser chrome */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-t-2xl border border-indigo-500/15 border-b-0 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 bg-slate-700/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <svg
                  className="w-3 h-3 text-slate-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-xs text-slate-400 font-mono">
                  upwork.com/jobs/react-developer-dashboard
                </span>
              </div>
              {/* Extension button */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/25 border border-blue-500/30 cursor-pointer hover:bg-blue-600/35 transition-colors">
                <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-xs text-blue-300 font-bold">FreelanceIQ</span>
              </div>
            </div>

            {/* Main panel */}
            <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-b-2xl border border-indigo-500/15 border-t-0 p-0 overflow-hidden shadow-2xl shadow-indigo-950/60">
              <div className="grid lg:grid-cols-5">
                {/* Left: job snippet (simulated page content) */}
                <div className="lg:col-span-3 p-6 border-r border-white/5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          Upwork
                        </span>
                        <span className="text-[10px] text-slate-500">Posted 3 hours ago</span>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1">
                        Build a React Admin Dashboard with Charts
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                        Looking for an experienced React developer to build a responsive admin
                        dashboard. Must include chart components (Recharts or Chart.js), data tables
                        with sorting, and a clean modern UI...
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {['React', 'TypeScript', 'Recharts', 'Tailwind CSS'].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {/* Proposal text area */}
                  <div className="bg-slate-800/60 rounded-xl border border-white/5 p-3 mb-4">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                      Your Cover Letter
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed opacity-70">
                      Hi, I have 5 years of React experience and have built several admin
                      dashboards. I can deliver exactly what you need including all chart components
                      and responsive layout...
                    </p>
                  </div>
                  {/* Analyze button */}
                  <button className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Analyze with FreelanceIQ
                  </button>
                </div>

                {/* Right: analysis result panel */}
                <div className="lg:col-span-2 p-6 bg-indigo-950/30">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Analysis Result
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-center mb-4">
                    <ScoreGauge score={84} size={100} />
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Relevance', score: 92, color: 'bg-emerald-500' },
                      { label: 'Clarity', score: 78, color: 'bg-blue-500' },
                      { label: 'Rate fit', score: 71, color: 'bg-blue-500' },
                      { label: 'CTA strength', score: 55, color: 'bg-amber-500' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-500">{item.label}</span>
                          <span className="text-slate-300 font-bold">{item.score}</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15">
                    <p className="text-[10px] text-amber-300 leading-relaxed">
                      💡 Your CTA is weak — end with a direct question to boost replies by ~23%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating pill — win notification */}
            <div className="absolute -top-5 -right-5 hidden lg:flex items-center gap-2.5 bg-white rounded-2xl shadow-2xl px-4 py-2.5 animate-float border border-slate-100">
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-tight">Interview Sent!</p>
                <p className="text-[10px] text-slate-500">1 hr after submitting</p>
              </div>
            </div>

            {/* Floating pill — LinkedIn */}
            <div className="absolute -bottom-5 -left-5 hidden lg:block bg-white rounded-2xl shadow-2xl px-4 py-2.5 animate-float-slow border border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">Also works on</p>
              <p className="text-xs font-black text-slate-900">LinkedIn Jobs</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: Stats Bar ─────────────────────────────────────────────────────

function StatsBar() {
  const ref = useScrollReveal();
  const [active, setActive] = useState(false);
  const freelancers = useCountUp(8400, 1800, active);
  const winRate = useCountUp(68, 1800, active);
  const proposals = useCountUp(1200000, 1800, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <section ref={ref} className="relative bg-slate-900 border-y border-indigo-500/10 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Platform badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12 reveal">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest w-full text-center mb-2">
            Optimised for
          </p>
          {[
            { name: 'Upwork', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
            { name: 'LinkedIn', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
          ].map((p) => (
            <div
              key={p.name}
              className={`px-5 py-2.5 rounded-xl border ${p.color} text-sm font-bold`}
            >
              {p.name}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center reveal-stagger">
          {[
            {
              value: `${(freelancers / 1000).toFixed(1)}k+`,
              label: 'Freelancers using FreelanceIQ',
              suffix: '',
            },
            { value: `${winRate}%`, label: 'Average win rate improvement', suffix: '' },
            {
              value: `${(proposals / 1000000).toFixed(1)}M+`,
              label: 'Proposals analyzed to date',
              suffix: '',
            },
          ].map((stat) => (
            <div key={stat.label} className="reveal">
              <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
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
      title: 'Open a Job & Click Analyze',
      desc: 'Browse Upwork or LinkedIn as normal. When you find a job you want to bid on or apply for, click the FreelanceIQ browser extension icon. It automatically reads the job description — no copying or pasting needed.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.25 6H12a2.25 2.25 0 00-2.25 2.25v12a2.25 2.25 0 002.25 2.25h8.25A2.25 2.25 0 0022.5 20.25v-7.5a2.25 2.25 0 00-2.25-2.25H18M14.25 6V4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V6M14.25 6h3.75M6.75 15.75L9 18l3.75-3.75"
          />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      num: '02',
      title: 'AI Scores Your Bid',
      desc: 'Our AI reads your proposal or CV, compares it to the job requirements, checks your rate against Upwork market data, and generates a 0–100 score in seconds.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.183.075a24.3 24.3 0 003.254.875m-7.25-8.709A24.298 24.298 0 0112 3m9.75.104v5.714a2.25 2.25 0 01-.659 1.591L14.25 14.5"
          />
        </svg>
      ),
      gradient: 'from-indigo-500 to-purple-600',
    },
    {
      num: '03',
      title: 'Fix It & Win',
      desc: "Get a clear breakdown of what's weak — relevance, rate, clarity, CTA — with specific rewrites you can apply to your proposal instantly before sending.",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
          />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <section id="how-it-works" ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="reveal mb-16">
          <SectionHeader
            badge="How It Works"
            title="From job page to score in seconds"
            subtitle="The FreelanceIQ browser extension captures everything automatically. No copy-paste, no switching tabs — just open a job and hit Analyze."
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8 reveal-stagger">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="reveal-scale group relative bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {/* Step number */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center text-white shadow-lg`}
                >
                  {step.icon}
                </div>
                <span className="text-5xl font-black text-slate-100 select-none">{step.num}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
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
      title: 'AI Bid Score (0–100)',
      tag: 'Core Feature',
      desc: 'Every proposal gets an objective score based on relevance, clarity, pricing, and persuasiveness. Know your odds before you submit.',
      gradient: 'from-blue-500 to-indigo-600',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
    },
    {
      title: 'Upwork Rate Intel',
      tag: 'Pricing',
      desc: 'See how your proposed rate compares to real market data for your skill on Upwork. Stop leaving money on the table or pricing yourself out.',
      gradient: 'from-emerald-500 to-teal-600',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75"
          />
        </svg>
      ),
    },
    {
      title: 'Proposal Rewriter',
      tag: 'AI Writing',
      desc: 'Not happy with your score? Get an AI-rewritten version of your proposal that keeps your voice and fixes the weak spots identified in the analysis.',
      gradient: 'from-violet-500 to-purple-600',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
          />
        </svg>
      ),
    },
    {
      title: 'Score Breakdown',
      tag: 'Analytics',
      desc: 'See exactly which parts of your proposal are strong or weak: job relevance, opening hook, rate justification, CTA, and more — all scored individually.',
      gradient: 'from-amber-500 to-orange-600',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
          />
        </svg>
      ),
    },
    {
      title: 'Bid History & Trends',
      tag: 'History',
      desc: 'Track all your past proposals in one place. See how your average score improves over time and which job types you win most.',
      gradient: 'from-sky-500 to-blue-600',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
          />
        </svg>
      ),
    },
    {
      title: 'Win Rate Prediction',
      tag: 'ML Powered',
      desc: 'Based on your score and market conditions, FreelanceIQ estimates the likelihood a client will respond to your proposal — so you can decide when to bid.',
      gradient: 'from-pink-500 to-rose-600',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" ref={ref} className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="reveal mb-16">
          <SectionHeader
            badge="Features"
            title="Everything you need to win more bids"
            subtitle="FreelanceIQ gives you the tools that top Upwork and LinkedIn job seekers use to consistently land clients."
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 reveal-stagger">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="reveal group bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${f.gradient} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}
                >
                  {f.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {f.tag}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{f.title}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: Live Demo ─────────────────────────────────────────────────────

function DemoSection() {
  const ref = useScrollReveal();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <section ref={ref} className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left explanation */}
          <div className="reveal-left">
            <SectionBadge>Live Example</SectionBadge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mt-4 mb-6 leading-tight">
              See exactly what your score means — and how to improve it
            </h2>
            <p className="text-slate-500 text-base leading-relaxed mb-8">
              After you paste a proposal, FreelanceIQ breaks it down across multiple quality
              dimensions. Each dimension gets an individual score, and you get specific, actionable
              feedback — not vague advice.
            </p>
            <ul className="space-y-4">
              {[
                {
                  title: 'Relevance score',
                  desc: 'How well does your proposal address the specific job post?',
                },
                {
                  title: 'Rate positioning',
                  desc: 'Is your bid competitive for this skill on Upwork?',
                },
                {
                  title: 'Proposal clarity',
                  desc: 'Is your writing clear, concise, and easy to read?',
                },
                {
                  title: 'CTA effectiveness',
                  desc: 'Does your proposal end with a strong invite to reply?',
                },
              ].map((item, idx) => (
                <li
                  key={item.title}
                  className="reveal flex items-start gap-3"
                  style={{ transitionDelay: `${idx * 90 + 100}ms` }}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" viewBox="0 0 10 10" fill="currentColor">
                      <path
                        d="M8.5 2.5L4 7 1.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right demo card */}
          <div className="reveal-right">
            <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl border border-indigo-500/15">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                {['overview', 'breakdown', 'actions'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeTab === tab
                        ? 'text-white border-b-2 border-blue-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <ScoreGauge score={76} size={90} />
                      <div>
                        <p className="text-white font-bold text-lg">Score: 76 / 100</p>
                        <p className="text-slate-400 text-sm">
                          Good — a few improvements could push this above 85
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                          Upwork Job
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                        Quick summary
                      </p>
                      {[
                        { label: 'Strong opening hook', positive: true },
                        { label: 'Relevant to buyer request', positive: true },
                        { label: 'Rate slightly above Upwork median', positive: false },
                        { label: 'Weak closing — no clear CTA', positive: false },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${item.positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}
                        >
                          <span>{item.positive ? '✓' : '✗'}</span>
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'breakdown' && (
                  <div className="space-y-4">
                    {[
                      { label: 'Relevance to job post', score: 88, color: 'bg-emerald-500' },
                      { label: 'Proposal clarity', score: 74, color: 'bg-blue-500' },
                      { label: 'Rate positioning', score: 61, color: 'bg-amber-500' },
                      { label: 'Opening hook', score: 82, color: 'bg-emerald-500' },
                      { label: 'Call to action', score: 48, color: 'bg-red-500' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="text-white font-semibold">{item.score}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="space-y-3">
                    {[
                      {
                        action: 'Rewrite your closing paragraph with a direct question',
                        impact: 'High',
                        color: 'text-red-400 bg-red-500/10',
                      },
                      {
                        action: 'Lower your rate by $5 to match Upwork median for this category',
                        impact: 'Medium',
                        color: 'text-amber-400 bg-amber-500/10',
                      },
                      {
                        action: 'Add one specific deliverable to your proposal',
                        impact: 'Medium',
                        color: 'text-amber-400 bg-amber-500/10',
                      },
                      {
                        action: 'Your opening is strong — keep it',
                        impact: 'Positive',
                        color: 'text-emerald-400 bg-emerald-500/10',
                      },
                    ].map((item) => (
                      <div
                        key={item.action}
                        className={`flex items-start gap-3 p-3 rounded-xl ${item.color}`}
                      >
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 shrink-0 mt-0.5">
                          {item.impact}
                        </span>
                        <p className="text-xs leading-relaxed">{item.action}</p>
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
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, annual: 0 },
      desc: 'Great for getting started on Upwork or LinkedIn.',
      cta: 'Start for Free',
      ctaVariant: 'secondary',
      popular: false,
      features: [
        { text: '5 proposal scores per month', available: true },
        { text: 'Score breakdown (all dimensions)', available: true },
        { text: 'Upwork rate benchmarking', available: true },
        { text: 'Bid history (last 5)', available: true },
        { text: 'Proposal rewriter', available: false },
        { text: 'Win rate prediction', available: false },
        { text: 'Priority support', available: false },
      ],
    },
    {
      name: 'Pro',
      price: { monthly: 9, annual: 7 },
      desc: 'For active freelancers bidding every day.',
      cta: 'Start Pro — Free 7-day trial',
      ctaVariant: 'primary',
      popular: true,
      features: [
        { text: 'Unlimited proposal scores', available: true },
        { text: 'Score breakdown (all dimensions)', available: true },
        { text: 'Upwork rate benchmarking', available: true },
        { text: 'Full bid history', available: true },
        { text: 'AI proposal rewriter', available: true },
        { text: 'Win rate prediction', available: true },
        { text: 'Priority support', available: false },
      ],
    },
    {
      name: 'Agency',
      price: { monthly: 29, annual: 23 },
      desc: 'For freelance teams and agencies managing multiple profiles.',
      cta: 'Contact Sales',
      ctaVariant: 'secondary',
      popular: false,
      features: [
        { text: 'Everything in Pro', available: true },
        { text: 'Up to 5 team seats', available: true },
        { text: 'Team-level analytics dashboard', available: true },
        { text: 'API access', available: true },
        { text: 'Custom integrations', available: true },
        { text: 'Win rate prediction', available: true },
        { text: 'Dedicated account support', available: true },
      ],
    },
  ];

  return (
    <section id="pricing" ref={ref} className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="reveal mb-12">
          <SectionHeader
            badge="Pricing"
            title="Simple, transparent pricing"
            subtitle="Start free. Upgrade when you're ready to bid without limits."
          />
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12 reveal">
          <span
            className={`text-sm font-semibold ${!annual ? 'text-slate-900' : 'text-slate-400'}`}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-6.5' : 'translate-x-0.5'}`}
            />
          </button>
          <span className={`text-sm font-semibold ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
            Annual
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              Save 20%
            </span>
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start reveal-stagger">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`reveal-scale relative rounded-2xl flex flex-col transition-all ${
                plan.popular
                  ? 'bg-[#0f172a] border-2 border-blue-500 shadow-2xl shadow-blue-500/25 p-8 md:-mt-4 md:pb-12 md:pt-12'
                  : 'bg-white border border-slate-200 shadow-sm p-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p
                  className={`text-sm font-bold uppercase tracking-widest mb-1 ${plan.popular ? 'text-blue-400' : 'text-slate-500'}`}
                >
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-2">
                  <span
                    className={`text-5xl font-black ${plan.popular ? 'text-white' : 'text-slate-900'}`}
                  >
                    ${annual ? plan.price.annual : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span
                      className={`text-sm pb-2 ${plan.popular ? 'text-slate-400' : 'text-slate-400'}`}
                    >
                      /mo
                    </span>
                  )}
                </div>
                <p className={`text-sm ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                  {plan.desc}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <CheckItem key={f.text} available={f.available}>
                    <span className={plan.popular && !f.available ? 'text-slate-600' : ''}>
                      {f.text}
                    </span>
                  </CheckItem>
                ))}
              </ul>

              <Link to="/register">
                <Button
                  fullWidth
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className={plan.popular ? 'shadow-lg shadow-blue-500/25' : ''}
                >
                  {plan.cta}
                </Button>
              </Link>
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
      quote:
        'I was getting maybe 1 response in 10 bids on Upwork. After using FreelanceIQ to check my proposals, I rewrote my closing section and my response rate jumped in the first week.',
      name: 'Sarah K.',
      role: 'React Developer',
      platform: 'Upwork',
      initials: 'SK',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      quote:
        'The LinkedIn job match feature is a game-changer. I can instantly see how well my skills line up with a role before spending time on an application.',
      name: 'Marcus T.',
      role: 'UI/UX Designer',
      platform: 'LinkedIn',
      initials: 'MT',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      quote:
        "FreelanceIQ pointed out my proposals were too generic — I wasn't referencing the client's actual problem. Fixed that one thing and my Upwork win rate noticeably improved.",
      name: 'Priya M.',
      role: 'Content Writer',
      platform: 'Upwork',
      initials: 'PM',
      gradient: 'from-violet-500 to-purple-600',
    },
  ];

  return (
    <section id="testimonials" ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="reveal mb-16">
          <SectionHeader
            badge="What freelancers say"
            title="Real results on Upwork & LinkedIn"
            subtitle="Freelancers using FreelanceIQ send fewer proposals and win more clients."
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6 reveal-stagger">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="reveal bg-slate-50 rounded-2xl p-8 border border-slate-200/60 hover:shadow-md transition-all"
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg
                    key={j}
                    className="w-4 h-4 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-slate-700 text-sm leading-relaxed mb-6">"{t.quote}"</p>

              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${t.gradient} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
                <span
                  className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    t.platform === 'Upwork'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
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
  const [openIdx, setOpenIdx] = useState(null);

  const faqs = [
    {
      q: 'Which platforms does FreelanceIQ support?',
      a: 'Right now FreelanceIQ works with Upwork and LinkedIn. On Upwork you get instant bid scoring and rate benchmarking. On LinkedIn you get CV-matched job analysis — see your match score, skill gaps, and a tailored application summary. Support for additional platforms is on our roadmap.',
    },
    {
      q: 'How does the AI score my proposal?',
      a: "FreelanceIQ's AI reads your proposal alongside the job description and evaluates it across several dimensions: relevance to the job, clarity, rate positioning against Upwork market data, opening strength, and call-to-action quality. For LinkedIn jobs, it matches your uploaded CV against the role's requirements and produces a match score, skill gaps, and a ready-to-use application summary.",
    },
    {
      q: 'Will the rewriter change my writing style?',
      a: 'No. The proposal rewriter is instructed to keep your voice and tone while fixing the specific weaknesses identified in the analysis. It will not make your proposal sound generic or AI-written.',
    },
    {
      q: 'Is there a free plan?',
      a: 'Yes. The free plan lets you score 5 proposals per month with full score breakdowns and rate benchmarking — no credit card required. You can upgrade to Pro any time to get unlimited scores and the proposal rewriter.',
    },
    {
      q: 'How is FreelanceIQ different from just asking ChatGPT?',
      a: "ChatGPT doesn't have access to live Upwork market rate data, and it won't give you a structured, comparable score you can track over time. FreelanceIQ is purpose-built for freelance proposal analysis and LinkedIn job matching, with platform-specific benchmarks and a consistent scoring system.",
    },
    {
      q: 'Can I cancel my subscription anytime?',
      a: 'Yes — you can cancel from the billing page with one click. There are no contracts or cancellation fees. If you cancel, your Pro access continues until the end of the billing period.',
    },
  ];

  return (
    <section id="faq" ref={ref} className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="reveal mb-12">
          <SectionHeader badge="FAQ" title="Questions? We have answers." />
        </div>

        <div className="space-y-3 reveal-stagger">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="reveal bg-white rounded-xl border border-slate-200 overflow-hidden"
              style={{ transitionDelay: `${i * 65}ms` }}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                <span className="text-sm font-semibold text-slate-900 pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${openIdx === i ? 'rotate-45' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: openIdx === i ? '300px' : '0px',
                  opacity: openIdx === i ? 1 : 0,
                }}
              >
                <div className="px-6 pb-5">
                  <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
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

function CtaSection() {
  const ref = useScrollReveal();
  return (
    <section ref={ref} className="hero-gradient-bg py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl animate-float-slow" />
      </div>
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="reveal">
          <SectionBadge dark>Free to start</SectionBadge>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight mt-6 mb-4">
            Stop guessing.
            <br />
            Start winning bids.
          </h2>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed">
            Join freelancers who use FreelanceIQ to score every proposal on Upwork and match jobs on
            LinkedIn before applying.
          </p>
        </div>
        <div className="reveal reveal-delay-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="xl" className="shadow-2xl shadow-blue-500/30 w-full sm:w-auto">
              Get Your Free Score
            </Button>
          </Link>
          <button
            onClick={() =>
              document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="px-6 py-3 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-all"
          >
            View Pricing
          </button>
        </div>
        <p className="reveal reveal-delay-3 text-xs text-slate-400 mt-6 font-medium">
          No credit card required · Free forever plan available
        </p>
      </div>
    </section>
  );
}

// ─── Section 11: Footer ───────────────────────────────────────────────────────

function Footer() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer className="bg-slate-900 border-t border-indigo-500/10 py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="font-black text-white text-lg">
                Freelance<span className="text-blue-400">IQ</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
              AI-powered proposal scoring for Upwork and LinkedIn job matching. Score your bid or
              match your CV before you apply.
            </p>
            <div className="flex gap-3">
              {['twitter', 'linkedin'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    {social === 'twitter' && (
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    )}
                    {social === 'linkedin' && (
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    )}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Product
            </p>
            <ul className="space-y-3">
              {[
                { label: 'Features', action: () => scrollTo('features') },
                { label: 'How It Works', action: () => scrollTo('how-it-works') },
                { label: 'Pricing', action: () => scrollTo('pricing') },
                { label: 'FAQ', action: () => scrollTo('faq') },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={item.action}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Account
            </p>
            <ul className="space-y-3">
              {[
                { label: 'Sign In', to: '/login' },
                { label: 'Create Account', to: '/register' },
                { label: 'Privacy Policy', to: '#' },
                { label: 'Terms of Service', to: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} FreelanceIQ. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs">Built for Upwork &amp; LinkedIn job seekers</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="antialiased">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <HowItWorksSection />
      <FeaturesSection />
      <DemoSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
