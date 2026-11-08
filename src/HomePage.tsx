/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  Coins,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  ArrowRight,
  Smartphone,
  Droplets,
  Send,
} from 'lucide-react';

interface HomePageProps {
  onOpenApp: () => void;
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is ArtiPay?',
    answer:
      'ArtiPay is a simple app that lets you pay local artisans in Nigeria using Solana.',
  },
  {
    question: 'Is this real money?',
    answer: 'No, it is devnet test money.',
  },
  {
    question: 'Which wallets work?',
    answer: 'Phantom and Solflare wallets work on both desktop and mobile.',
  },
  {
    question: 'How do I get test SOL?',
    answer:
      'Go to faucet.solana.com, paste your wallet address, and get free devnet SOL in seconds.',
  },
  {
    question: 'Is it safe?',
    answer: 'Yes. We never ask for your seed phrase or private key.',
  },
  {
    question: 'Can I pay any wallet?',
    answer:
      'Yes. Tap "Any wallet" on the payment screen and paste any Solana devnet address.',
  },
  {
    question: 'What is next?',
    answer: 'Real Naira payments and artisan profiles.',
  },
];

const CARD_CLASS =
  'rounded-[20px] border border-[#E2EEE8] bg-white shadow-[0_4px_16px_rgba(5,46,34,0.08)] transition-all duration-200 hover:-translate-y-0.5 active:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(5,46,34,0.13)] active:shadow-[0_8px_24px_rgba(5,46,34,0.13)]';

export default function HomePage({ onOpenApp }: HomePageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="home-top" className="min-h-screen bg-white text-slate-900 flex flex-col pt-16">
      {/* Dim backdrop when mobile dropdown menu is open */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 top-16 z-40 bg-slate-950/30 backdrop-blur-[1px] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* 1. Fixed Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur transition-all duration-200 ${
          isScrolled
            ? 'border-b border-[#E2EEE8] shadow-[0_4px_16px_rgba(5,46,34,0.08)]'
            : 'border-b border-slate-100'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-3">
          {/* Logo on the left */}
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 shrink-0"
          >
            <img
              src="/assets/aistudio/1131413-removebg-preview_a46a01c6.png"
              alt="ArtiPay logo"
              className="w-9 h-9 object-contain shrink-0"
            />
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              ArtiPay
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Right controls: Always-visible Open App button + Mobile Menu Icon on the right */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenApp();
              }}
              className="min-h-[40px] sm:min-h-[44px] px-4 sm:px-5 py-2 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
            >
              Open App
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden w-10 h-10 rounded-xl border border-[#E2EEE8] bg-[#F3FBF7] hover:bg-[#E6F7EF] flex items-center justify-center text-slate-800 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel under header (not full screen, only How it works and FAQ) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="md:hidden absolute top-full left-4 right-4 mt-2 rounded-[20px] border border-[#E2EEE8] bg-white p-2 shadow-[0_8px_24px_rgba(5,46,34,0.14)]"
            >
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-slate-800 hover:bg-[#F3FBF7] active:bg-[#E6F7EF] transition-colors cursor-pointer"
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-slate-800 hover:bg-[#F3FBF7] active:bg-[#E6F7EF] transition-colors cursor-pointer"
              >
                FAQ
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        {/* 2. Hero Section (White background) */}
        <section className="bg-white py-12 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-5xl mx-auto px-5 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
          >
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 text-balance leading-tight">
                  Pay local artisans with Solana
                </h1>
                <p className="text-base sm:text-lg text-slate-600">
                  Fast. Cheap. Proof on the blockchain.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenApp}
                  className="min-h-[52px] px-7 py-3.5 rounded-[20px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-base font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_4px_16px_rgba(5,46,34,0.15)]"
                >
                  <span>Open App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('try-it')}
                  className="min-h-[52px] px-7 py-3.5 rounded-[20px] border border-[#E2EEE8] bg-[#F3FBF7] hover:bg-[#E6F7EF] active:scale-[0.98] text-slate-900 text-base font-bold inline-flex items-center justify-center transition-all cursor-pointer"
                >
                  How to test
                </button>
              </div>
            </div>

            {/* Image 1: Hero image on the right (stacked on mobile) */}
            <div className="lg:col-span-6">
              <div className="rounded-[20px] overflow-hidden border border-[#E2EEE8] bg-slate-100 shadow-[0_4px_16px_rgba(5,46,34,0.08)]">
                <img
                  src="/assets/aistudio/Woman_showing_phone_to_customer_cfc63fbc_d55274f1.jpg"
                  alt="Market trader showing phone payment to customer"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover aspect-16/10"
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* 3. "How it works" Section (Very light mint #F3FBF7 background) */}
        <section id="how-it-works" className="bg-[#F3FBF7] py-16 sm:py-24 scroll-mt-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4 }}
            className="max-w-5xl mx-auto px-5 space-y-10"
          >
            <div className="space-y-3 text-center max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                How it works
              </h2>
              <div className="w-[40px] h-1 rounded-full bg-emerald-600 mx-auto" />
              <p className="text-base text-slate-600 pt-1">
                Three simple steps to send a payment and get a public receipt.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className={`${CARD_CLASS} p-6 flex items-start gap-4`}>
                  <div className="w-12 h-12 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      1. Connect your wallet
                    </h3>
                    <p className="text-sm text-slate-600">
                      Connect Phantom or Solflare on Solana devnet in one tap.
                    </p>
                  </div>
                </div>

                <div className={`${CARD_CLASS} p-6 flex items-start gap-4`}>
                  <div className="w-12 h-12 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      2. Choose an amount
                    </h3>
                    <p className="text-sm text-slate-600">
                      Pick an artisan or enter any wallet address. Type the amount in SOL or Naira.
                    </p>
                  </div>
                </div>

                <div className={`${CARD_CLASS} p-6 flex items-start gap-4`}>
                  <div className="w-12 h-12 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      3. Get your proof
                    </h3>
                    <p className="text-sm text-slate-600">
                      Approve the transfer in your wallet and view your receipt on Solana Explorer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Image 4: Phone mockup */}
              <div className="lg:col-span-6">
                <div className="rounded-[20px] overflow-hidden border border-[#E2EEE8] bg-white shadow-[0_4px_16px_rgba(5,46,34,0.08)]">
                  <img
                    src="/assets/aistudio/Smartphone_mockup_with_attached___2ff8da66_621cce74.jpg"
                    alt="ArtiPay smartphone receipt screen"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 4. "Why Solana" Section (White background) */}
        <section className="bg-white py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4 }}
            className="max-w-5xl mx-auto px-5 space-y-10"
          >
            <div className="space-y-3 text-center max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Why Solana
              </h2>
              <div className="w-[40px] h-1 rounded-full bg-emerald-600 mx-auto" />
              <p className="text-base text-slate-600 pt-1">
                Built for everyday local payments in Nigeria.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className={`${CARD_CLASS} p-6 space-y-3`}>
                <div className="w-12 h-12 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Fast</h3>
                <p className="text-sm text-slate-600">
                  Payments confirm in about 1 second. No waiting for bank alerts.
                </p>
              </div>

              <div className={`${CARD_CLASS} p-6 space-y-3`}>
                <div className="w-12 h-12 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Cheap</h3>
                <p className="text-sm text-slate-600">
                  Each payment costs a fraction of a cent in network fees.
                </p>
              </div>

              <div className={`${CARD_CLASS} p-6 space-y-3`}>
                <div className="w-12 h-12 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Proof</h3>
                <p className="text-sm text-slate-600">
                  Every payment has a public receipt on the blockchain that anyone can check.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 5. "Try it in 3 steps" Section (Very light mint #F3FBF7 background) */}
        <section id="try-it" className="bg-[#F3FBF7] py-16 sm:py-24 scroll-mt-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4 }}
            className="max-w-5xl mx-auto px-5 space-y-10"
          >
            <div className="space-y-3 text-center max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Try it in 3 steps
              </h2>
              <div className="w-[40px] h-1 rounded-full bg-emerald-600 mx-auto" />
              <p className="text-base text-slate-600 pt-1">
                You can test ArtiPay in two minutes with free test SOL.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className={`${CARD_CLASS} p-6 space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-emerald-700">Step 1</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Install Phantom or Solflare
                </h3>
                <p className="text-sm text-slate-600">
                  Add the{' '}
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-semibold underline"
                  >
                    Phantom
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://solflare.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-semibold underline"
                  >
                    Solflare
                  </a>{' '}
                  wallet extension to your browser.
                </p>
              </div>

              <div className={`${CARD_CLASS} p-6 space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-emerald-700">Step 2</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Switch to devnet and get free test SOL
                </h3>
                <p className="text-sm text-slate-600">
                  Turn on Devnet mode in your wallet settings, then claim free test SOL on the{' '}
                  <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-semibold underline inline-flex items-center gap-1"
                  >
                    <span>Solana Faucet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  .
                </p>
              </div>

              <div className={`${CARD_CLASS} p-6 space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#E6F7EF] text-emerald-700 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-emerald-700">Step 3</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Pay any wallet
                </h3>
                <p className="text-sm text-slate-600">
                  Open the app, pick an artisan or paste a friend&apos;s devnet address, and send SOL.
                </p>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onOpenApp}
                className="min-h-[52px] px-8 py-3.5 rounded-[20px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-base font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_4px_16px_rgba(5,46,34,0.15)]"
              >
                <span>Open App Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* 6. Artisan Images Row Section (White background) */}
        <section className="bg-white py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4 }}
            className="max-w-5xl mx-auto px-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <figure className={`${CARD_CLASS} overflow-hidden`}>
                <img
                  src="/assets/aistudio/Tailor_looking_at_phone_282ba1c8_3dc25555.jpg"
                  alt="Tailor looking at payment confirmation on phone"
                  referrerPolicy="no-referrer"
                  className="w-full object-cover aspect-16/10"
                />
                <figcaption className="p-5 text-sm font-medium text-slate-600">
                  Tailor checking an instant payment receipt on his phone.
                </figcaption>
              </figure>

              <figure className={`${CARD_CLASS} overflow-hidden`}>
                <img
                  src="/assets/aistudio/Customer_paying_mechanic_with_phone_344ccfb4_327493d8.jpg"
                  alt="Customer paying mechanic with phone"
                  referrerPolicy="no-referrer"
                  className="w-full object-cover aspect-16/10"
                />
                <figcaption className="p-5 text-sm font-medium text-slate-600">
                  Customer paying a local mechanic with Solana on his phone.
                </figcaption>
              </figure>
            </div>
          </motion.div>
        </section>

        {/* 7. FAQ Section (Very light mint #F3FBF7 background) */}
        <section id="faq" className="bg-[#F3FBF7] py-16 sm:py-24 scroll-mt-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto px-5 space-y-10"
          >
            <div className="space-y-3 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                FAQ
              </h2>
              <div className="w-[40px] h-1 rounded-full bg-emerald-600 mx-auto" />
              <p className="text-base text-slate-600 pt-1">
                Common questions about ArtiPay.
              </p>
            </div>

            <div className="space-y-3.5">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={item.question} className={`${CARD_CLASS} overflow-hidden`}>
                    <div
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <span className="text-base font-bold text-slate-900">
                        {item.question}
                      </span>
                      <button
                        type="button"
                        aria-label={isOpen ? 'Close answer' : 'Open answer'}
                        aria-expanded={isOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFaqIndex(isOpen ? null : idx);
                        }}
                        className="w-9 h-9 rounded-full bg-[#E6F7EF] hover:bg-[#D5F2E4] text-emerald-800 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                      >
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>
      </main>

      {/* 8. Deep Emerald Green Footer (#052E22) */}
      <footer className="bg-[#052E22] text-white">
        <div className="max-w-5xl mx-auto px-5 py-12 sm:py-16 space-y-10">
          {/* Top row: Short call to action "Try ArtiPay on devnet" with mint button "Open App" */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 border-b border-emerald-900/80 text-center sm:text-left">
            <p className="text-lg sm:text-xl font-bold text-white">
              Try ArtiPay on devnet
            </p>
            <button
              type="button"
              onClick={onOpenApp}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-[20px] bg-[#A7F3D0] hover:bg-[#6EE7B7] active:scale-[0.98] text-[#052E22] text-sm sm:text-base font-extrabold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Open App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Middle row: Logo + one-line description in light mint-gray + links */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8 text-center sm:text-left">
            <div className="flex flex-col items-center sm:items-start space-y-2.5">
              <a
                href="#/"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2.5"
              >
                <div className="w-9 h-9 rounded-xl bg-white/95 p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/aistudio/1131413-removebg-preview_a46a01c6.png"
                    alt="ArtiPay logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-lg font-extrabold tracking-tight text-white">
                  ArtiPay
                </span>
              </a>
              <p className="text-sm text-[#B8D8CC]">
                Pay local artisans with Solana. Fast, cheap, and verifiable.
              </p>
            </div>

            <nav className="flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-6 w-full sm:w-auto text-sm font-semibold text-[#D6EDE4]">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="min-h-[44px] px-3 inline-flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="min-h-[44px] px-3 inline-flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="min-h-[44px] px-3 inline-flex items-center justify-center hover:text-white transition-colors cursor-pointer"
              >
                FAQ
              </button>
              <a
                href="https://github.com/Crypto001-ai/Artipay"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 inline-flex items-center justify-center hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://x.com/TechAbdullahi"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 inline-flex items-center justify-center text-[#A7F3D0] hover:text-white underline transition-colors"
              >
                Built by TechAbdullahi
              </a>
            </nav>
          </div>

          {/* Bottom line in small muted text */}
          <div className="pt-6 border-t border-emerald-900/80 text-center sm:text-left">
            <p className="text-xs text-[#8AB5A5]">
              Devnet demo built for the Solana Hackathon. No real money.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
