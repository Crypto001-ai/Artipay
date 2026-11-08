/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
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

export default function HomePage({ onOpenApp }: HomePageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="home-top" className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* 1. Header: logo, links (How it works, FAQ), and green "Open App" button */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 shrink-0"
          >
            <img
              src="/assets/aistudio/1131413-removebg-preview_a46a01c6.png"
              alt="ArtiPay logo"
              className="w-9 h-9 object-contain shrink-0"
            />
            <span className="text-base font-bold tracking-tight text-slate-900">
              ArtiPay
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Desktop Open App CTA */}
          <div className="hidden md:block shrink-0">
            <button
              type="button"
              onClick={onOpenApp}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold transition-all cursor-pointer"
            >
              Open App
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            className="md:hidden w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Simple Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-5 py-4 space-y-3">
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2.5 text-base font-semibold text-slate-700"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="block w-full text-left py-2.5 text-base font-semibold text-slate-700"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenApp();
              }}
              className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold flex items-center justify-center cursor-pointer"
            >
              Open App
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-10 sm:py-16 space-y-20 sm:space-y-28">
        {/* 2. Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
        >
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
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
                className="min-h-[52px] px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-base font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Open App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('try-it')}
                className="min-h-[52px] px-7 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-900 text-base font-bold inline-flex items-center justify-center transition-all cursor-pointer"
              >
                How to test
              </button>
            </div>
          </div>

          {/* Image 1: Hero image on the right (stacked on mobile) */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src="/assets/aistudio/Woman_showing_phone_to_customer_cfc63fbc_d55274f1.jpg"
                alt="Market trader showing phone payment to customer"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover aspect-16/10"
              />
            </div>
          </div>
        </motion.section>

        {/* 3. "How it works": 3 steps + Image 4 (phone mockup) */}
        <motion.section
          id="how-it-works"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="space-y-8 scroll-mt-20"
        >
          <div className="space-y-2 text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              How it works
            </h2>
            <p className="text-base text-slate-600">
              Three simple steps to send a payment and get a public receipt.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
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

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
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

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
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
              <div className="rounded-3xl overflow-hidden border border-slate-200 bg-emerald-50/40">
                <img
                  src="/assets/aistudio/Smartphone_mockup_with_attached___2ff8da66_621cce74.jpg"
                  alt="ArtiPay smartphone receipt screen"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* 4. "Why Solana": 3 small cards */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          <div className="space-y-2 text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Why Solana
            </h2>
            <p className="text-base text-slate-600">
              Built for everyday local payments in Nigeria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Fast</h3>
              <p className="text-sm text-slate-600">
                Payments confirm in about 1 second. No waiting for bank alerts.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Cheap</h3>
              <p className="text-sm text-slate-600">
                Each payment costs a fraction of a cent in network fees.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Proof</h3>
              <p className="text-sm text-slate-600">
                Every payment has a public receipt on the blockchain that anyone can check.
              </p>
            </div>
          </div>
        </motion.section>

        {/* 5. "Try it in 3 steps" */}
        <motion.section
          id="try-it"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-10 space-y-8 scroll-mt-20"
        >
          <div className="space-y-2 text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Try it in 3 steps
            </h2>
            <p className="text-base text-slate-600">
              You can test ArtiPay in two minutes with free test SOL.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-2">
              <span className="text-sm font-bold text-emerald-700">Step 1</span>
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

            <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-2">
              <span className="text-sm font-bold text-emerald-700">Step 2</span>
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

            <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-2">
              <span className="text-sm font-bold text-emerald-700">Step 3</span>
              <h3 className="text-base font-bold text-slate-900">
                Pay any wallet
              </h3>
              <p className="text-sm text-slate-600">
                Open the app, pick an artisan or paste a friend&apos;s devnet address, and send SOL.
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onOpenApp}
              className="min-h-[52px] px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-base font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Open App Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.section>

        {/* 6. Image row showing artisan images (Image 2 & Image 3) with short captions */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <figure className="rounded-3xl overflow-hidden border border-slate-200 bg-white">
              <img
                src="/assets/aistudio/Tailor_looking_at_phone_282ba1c8_3dc25555.jpg"
                alt="Tailor looking at payment confirmation on phone"
                referrerPolicy="no-referrer"
                className="w-full object-cover aspect-16/10"
              />
              <figcaption className="p-4 text-sm text-slate-600">
                Tailor checking an instant payment receipt on his phone.
              </figcaption>
            </figure>

            <figure className="rounded-3xl overflow-hidden border border-slate-200 bg-white">
              <img
                src="/assets/aistudio/Customer_paying_mechanic_with_phone_344ccfb4_327493d8.jpg"
                alt="Customer paying mechanic with phone"
                referrerPolicy="no-referrer"
                className="w-full object-cover aspect-16/10"
              />
              <figcaption className="p-4 text-sm text-slate-600">
                Customer paying a local mechanic with Solana on his phone.
              </figcaption>
            </figure>
          </div>
        </motion.section>

        {/* 7. FAQ Accordion */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto space-y-6 scroll-mt-20"
        >
          <div className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              FAQ
            </h2>
            <p className="text-base text-slate-600">
              Common questions about ArtiPay.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.question}
                  className="rounded-3xl border border-slate-200 bg-white overflow-hidden"
                >
                  <div className="w-full px-6 py-4 text-left flex items-center justify-between gap-4">
                    <span className="text-base font-bold text-slate-900">
                      {item.question}
                    </span>
                    <button
                      type="button"
                      aria-label={isOpen ? 'Close answer' : 'Open answer'}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 transition-transform duration-150 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>
      </main>

      {/* 8. Footer */}
      <footer className="border-t border-slate-200 bg-slate-50/60 mt-16">
        <div className="max-w-5xl mx-auto px-5 py-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/aistudio/1131413-removebg-preview_a46a01c6.png"
                  alt="ArtiPay logo"
                  className="w-8 h-8 object-contain shrink-0"
                />
                <span className="text-base font-bold text-slate-900">ArtiPay</span>
              </div>
              <p className="text-sm text-slate-500">
                Pay local artisans with Solana.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hover:text-slate-900 cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-slate-900 cursor-pointer"
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="hover:text-slate-900 cursor-pointer"
              >
                FAQ
              </button>
              <a
                href="https://github.com/TechAbdullahi"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900"
              >
                GitHub
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-500">
            <div>Devnet demo built for the Solana Hackathon</div>
            <div>
              <a
                href="https://x.com/TechAbdullahi"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-700 hover:text-emerald-800 underline"
              >
                Built by TechAbdullahi
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
