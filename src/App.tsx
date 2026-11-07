/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  ExternalLink,
  Loader2,
  QrCode,
  X,
  AlertCircle,
  LogOut,
} from 'lucide-react';

// ============================================================================
// SOLANA CONFIGURATION & RECIPIENT CONSTANT
// ============================================================================

// 1. Recipient wallet on Solana Devnet
export const ARTISAN_WALLET = '8cMgAqX9hgkSV2mF63WE37uyhRXbggjxTi8AWFYXjaDc';

// 2. Solana Devnet RPC URL
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';

// 3. Constant conversion rate: 1 SOL = 250,000 NGN
const NGN_PER_SOL = 250_000;

// Key used to save payment receipts in localStorage
const RECEIPTS_STORAGE_KEY = 'artipay_devnet_receipts_v1';

// Connect to Solana Devnet
const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

// ============================================================================
// TYPES
// ============================================================================

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: PublicKey | { toString(): string; toBase58(): string };
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (
    transaction: Transaction,
    options?: { skipPreflight?: boolean }
  ) => Promise<{ signature: string }>;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: {
      solana?: PhantomProvider;
    };
  }
}

export interface Artisan {
  id: string;
  name: string;
  job: string;
  city: string;
  priceNgn: number;
}

export interface PaymentReceipt {
  id: string;
  artisanName: string;
  artisanRole: string;
  amountNgn: number;
  amountSol: number;
  signature: string;
  recipient: string;
  sender: string;
  timestamp: string;
}

type PaymentStatus =
  | 'idle'
  | 'waiting_for_approval'
  | 'confirming'
  | 'success'
  | 'failed';

// ============================================================================
// 3 ARTISANS
// ============================================================================

const ARTISANS: Artisan[] = [
  {
    id: 'emeka',
    name: 'Emeka',
    job: 'Electrician',
    city: 'Lagos',
    priceNgn: 5000,
  },
  {
    id: 'aisha',
    name: 'Aisha',
    job: 'Tailor',
    city: 'Abuja',
    priceNgn: 4000,
  },
  {
    id: 'musa',
    name: 'Musa',
    job: 'Mechanic',
    city: 'Kaduna',
    priceNgn: 7500,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

// Convert Naira to SOL using 1 SOL = 250,000 NGN
function ngnToSol(ngn: number): number {
  return Number((ngn / NGN_PER_SOL).toFixed(6));
}

// Shorten a wallet address like 8cMg...jaDc
function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Find Phantom wallet in the browser (never asks for private keys)
function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

// Build a Solana Pay URL (solana:<address>?amount=...)
function buildSolanaPayUrl(artisan: Artisan, recipientAddress: string): string {
  const solAmount = ngnToSol(artisan.priceNgn);
  const params = new URLSearchParams({
    amount: solAmount.toString(),
    label: `ArtiPay - ${artisan.name}`,
    message: `Pay ${artisan.name} (${artisan.job})`,
  });
  return `solana:${recipientAddress}?${params.toString()}`;
}

export default function App() {
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan>(ARTISANS[0]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<PaymentReceipt | null>(null);
  const [showQrPopup, setShowQrPopup] = useState<boolean>(false);

  // Load saved receipts from localStorage
  const [paymentHistory, setPaymentHistory] = useState<PaymentReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(RECEIPTS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as PaymentReceipt[]) : [];
    } catch {
      return [];
    }
  });

  // Fetch the user's SOL balance from Solana Devnet
  const fetchSolBalance = useCallback(async (address: string) => {
    try {
      const pubKey = new PublicKey(address);
      const lamports = await connection.getBalance(pubKey, 'confirmed');
      setSolBalance(Number(lamports) / Number(LAMPORTS_PER_SOL));
    } catch {
      // Keep previous balance if RPC request fails briefly
    }
  }, []);

  // Reconnect automatically if the user already trusted this app in Phantom
  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider) return;

    provider
      .connect({ onlyIfTrusted: true })
      .then(({ publicKey }) => {
        const address = publicKey.toString();
        setWalletAddress(address);
        fetchSolBalance(address);
      })
      .catch(() => {});
  }, [fetchSolBalance]);

  // Save receipts to localStorage whenever paymentHistory changes
  useEffect(() => {
    try {
      localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(paymentHistory));
    } catch {
      // Ignore storage errors
    }
  }, [paymentHistory]);

  // Connect to Phantom wallet
  const handleConnectPhantom = async () => {
    setErrorMessage(null);
    const provider = getPhantomProvider();

    if (!provider) {
      setErrorMessage('Phantom wallet is not installed.');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await provider.connect();
      const address = response.publicKey.toString();
      setWalletAddress(address);
      await fetchSolBalance(address);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const code = (err as { code?: number })?.code;
      if (code === 4001 || msg.includes('reject') || msg.includes('cancel')) {
        setErrorMessage('You cancelled the request.');
      } else {
        setErrorMessage('Could not connect to Phantom.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Phantom wallet
  const handleDisconnect = async () => {
    const provider = getPhantomProvider();
    if (provider) {
      try {
        await provider.disconnect();
      } catch {}
    }
    setWalletAddress(null);
    setSolBalance(null);
    setErrorMessage(null);
  };

  // Build, sign, send, and confirm a Solana Devnet transfer
  const handlePay = async () => {
    setErrorMessage(null);

    const provider = getPhantomProvider();
    if (!provider) {
      setPaymentStatus('failed');
      setErrorMessage('Phantom wallet is not installed.');
      return;
    }

    if (!walletAddress) {
      setPaymentStatus('failed');
      setErrorMessage('Connect your Phantom wallet first.');
      return;
    }

    const solAmount = ngnToSol(selectedArtisan.priceNgn);
    const lamportsToSend = Math.round(solAmount * Number(LAMPORTS_PER_SOL));
    const feeLamports = 5000;

    try {
      const recipientPubkey = new PublicKey(ARTISAN_WALLET.trim());
      const senderPubkey = new PublicKey(walletAddress);

      // Check Devnet SOL balance before sending
      const rawLamports = await connection.getBalance(senderPubkey, 'confirmed');
      const currentLamports = Number(rawLamports);
      setSolBalance(currentLamports / Number(LAMPORTS_PER_SOL));

      if (currentLamports < lamportsToSend + feeLamports) {
        setPaymentStatus('failed');
        setErrorMessage('You do not have enough SOL for this payment.');
        return;
      }

      // 1. Waiting for user approval in Phantom
      setPaymentStatus('waiting_for_approval');

      // 2. Get recent blockhash from Devnet
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      // 3. Create SystemProgram.transfer instruction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports: lamportsToSend,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      // 4. Ask Phantom to sign and send the transaction
      const { signature } = await provider.signAndSendTransaction(transaction);

      // 5. Wait for Devnet confirmation
      setPaymentStatus('confirming');

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      // 6. Save receipt
      const receipt: PaymentReceipt = {
        id: `${Date.now()}-${signature.slice(0, 6)}`,
        artisanName: selectedArtisan.name,
        artisanRole: selectedArtisan.job,
        amountNgn: selectedArtisan.priceNgn,
        amountSol: solAmount,
        signature,
        recipient: recipientPubkey.toBase58(),
        sender: senderPubkey.toBase58(),
        timestamp: new Date().toISOString(),
      };

      setLatestReceipt(receipt);
      setPaymentHistory((prev) => [receipt, ...prev]);
      setPaymentStatus('success');
      await fetchSolBalance(walletAddress);
    } catch (err: unknown) {
      setPaymentStatus('failed');
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const code = (err as { code?: number })?.code;

      if (
        code === 4001 ||
        msg.includes('reject') ||
        msg.includes('cancel') ||
        msg.includes('denied')
      ) {
        setErrorMessage('You cancelled the payment.');
      } else if (msg.includes('insufficient')) {
        setErrorMessage('You do not have enough SOL for this payment.');
      } else {
        setErrorMessage('Payment failed. Please try again.');
      }
    }
  };

  const selectedSol = ngnToSol(selectedArtisan.priceNgn);
  const solanaPayUrl = buildSolanaPayUrl(selectedArtisan, ARTISAN_WALLET);
  const isBusy =
    paymentStatus === 'waiting_for_approval' || paymentStatus === 'confirming';

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* 1. Top Bar: small ArtiPay logo, DEVNET badge, Connect Phantom button */}
      <header className="w-full max-w-md mx-auto px-5 pt-5 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
            AP
          </div>
          <span className="text-base font-bold tracking-tight">ArtiPay</span>
          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold">
            DEVNET
          </span>
        </div>

        {walletAddress ? (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
            <span className="text-sm font-semibold text-slate-900">
              {solBalance !== null ? `${solBalance.toFixed(3)} SOL` : '... SOL'}
            </span>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-600">
              {shortenAddress(walletAddress, 4)}
            </span>
            <button
              type="button"
              onClick={handleDisconnect}
              title="Disconnect"
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnectPhantom}
            disabled={isConnecting}
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Phantom'}
          </button>
        )}
      </header>

      {/* Main Single-Column Mobile-First Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-6 space-y-8">
        {/* 2. Title & Short Subtitle */}
        <section className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pay a local artisan with Solana
          </h1>
          <p className="text-sm text-slate-500">
            Fast. Cheap. Proof on the blockchain.
          </p>
        </section>

        {/* 5. Success Screen OR 3. Artisan Cards + 4. Big Green Pay Button */}
        {paymentStatus === 'success' && latestReceipt ? (
          <section className="rounded-3xl bg-emerald-50/70 border-2 border-emerald-500 p-7 text-center space-y-5 transition-all">
            <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm scale-100 transition-transform">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {latestReceipt.amountSol} SOL
              </div>
              <div className="text-sm text-slate-600">
                {latestReceipt.amountNgn.toLocaleString()} NGN sent to{' '}
                {latestReceipt.artisanName} ({latestReceipt.artisanRole})
              </div>
            </div>

            <a
              href={`https://explorer.solana.com/tx/${latestReceipt.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-base font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>View proof on Solana Explorer</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => {
                setPaymentStatus('idle');
                setErrorMessage(null);
              }}
              className="w-full min-h-[44px] text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Make another payment
            </button>
          </section>
        ) : (
          <section className="space-y-6">
            {/* 3. Three Artisan Cards */}
            <div className="space-y-3.5">
              {ARTISANS.map((artisan) => {
                const solPrice = ngnToSol(artisan.priceNgn);
                const isSelected = selectedArtisan.id === artisan.id;

                return (
                  <button
                    key={artisan.id}
                    type="button"
                    onClick={() => {
                      setSelectedArtisan(artisan);
                      setErrorMessage(null);
                      if (paymentStatus === 'failed') setPaymentStatus('idle');
                    }}
                    className={`w-full text-left rounded-3xl p-5 border-2 transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-emerald-50/50 border-emerald-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">
                          {artisan.name}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {artisan.job} · {artisan.city}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900">
                        {solPrice} SOL
                      </div>
                      <div className="text-sm text-slate-500">
                        {artisan.priceNgn.toLocaleString()} NGN
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Friendly Error in One Short Sentence */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="text-sm font-medium text-red-900">
                    {errorMessage}
                  </span>
                </div>
                {errorMessage === 'Phantom wallet is not installed.' && (
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-red-800 underline shrink-0"
                  >
                    Get app
                  </a>
                )}
              </div>
            )}

            {/* 4. Big Green Pay Button + 6. Small "Pay with QR instead" button */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={walletAddress ? handlePay : handleConnectPhantom}
                disabled={isBusy || isConnecting}
                className="w-full min-h-[60px] py-3.5 px-6 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white transition-all duration-150 cursor-pointer disabled:opacity-60 flex flex-col items-center justify-center"
              >
                {paymentStatus === 'waiting_for_approval' ? (
                  <span className="text-base font-bold flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Approve in Phantom</span>
                  </span>
                ) : paymentStatus === 'confirming' ? (
                  <span className="text-base font-bold flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </span>
                ) : !walletAddress ? (
                  <>
                    <span className="text-base font-bold">
                      Connect Phantom to pay
                    </span>
                    <span className="text-sm text-emerald-100">
                      {selectedSol} SOL ({selectedArtisan.priceNgn.toLocaleString()} NGN)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-base font-bold">
                      Pay {selectedSol} SOL
                    </span>
                    <span className="text-sm text-emerald-100">
                      {selectedArtisan.priceNgn.toLocaleString()} NGN to {selectedArtisan.name}
                    </span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowQrPopup(true)}
                  className="min-h-[44px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Pay with QR instead</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 7. Recent Payments List at the Bottom (Hidden when empty) */}
        {paymentHistory.length > 0 && (
          <section className="pt-4 border-t border-slate-100 space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Recent payments
            </h2>

            <div className="space-y-2.5">
              {paymentHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {item.artisanName} - {item.artisanRole}
                    </div>
                    <div className="text-sm text-slate-500">
                      {item.amountNgn.toLocaleString()} NGN · {item.amountSol} SOL
                    </div>
                  </div>

                  <a
                    href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>Proof</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 8. Small "Need test SOL?" link to the devnet faucet at the very bottom */}
      <footer className="w-full max-w-md mx-auto px-5 py-6 text-center">
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 underline"
        >
          <span>Need test SOL?</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </footer>

      {/* 6. Solana Pay QR Code Popup Modal (Hides the long solana: URL) */}
      {showQrPopup && (
        <div
          onClick={() => setShowQrPopup(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-5 text-center shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">
                Scan with Phantom
              </span>
              <button
                type="button"
                onClick={() => setShowQrPopup(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {selectedSol} SOL
              </div>
              <div className="text-sm text-slate-500">
                {selectedArtisan.priceNgn.toLocaleString()} NGN to{' '}
                {selectedArtisan.name} ({selectedArtisan.job})
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 inline-block mx-auto">
              <QRCodeSVG
                value={solanaPayUrl}
                size={200}
                level="M"
                includeMargin={false}
                fgColor="#064E3B"
                bgColor="#F8FAFC"
              />
            </div>

            <p className="text-sm text-slate-500">
              Open Phantom on your phone and scan this code on Devnet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
