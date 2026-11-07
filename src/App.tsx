/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './polyfills.ts';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  WalletAdapterNetwork,
  WalletReadyState,
  type SignerWalletAdapter,
} from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
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

  // Instantiate Phantom and Solflare wallet adapters for Devnet
  const wallets = useMemo<SignerWalletAdapter[]>(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
    ],
    []
  );

  const [activeAdapter, setActiveAdapter] = useState<SignerWalletAdapter | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [realErrorText, setRealErrorText] = useState<string | null>(null);
  const [showInstallLink, setShowInstallLink] = useState<boolean>(false);
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
      setSolBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Balance fetch error:', err);
    }
  }, []);

  // Save receipts to localStorage whenever paymentHistory changes
  useEffect(() => {
    try {
      localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(paymentHistory));
    } catch {
      // Ignore storage errors
    }
  }, [paymentHistory]);

  // Check if a wallet adapter is installed in the browser
  const isWalletInstalled = (adapter: SignerWalletAdapter): boolean => {
    if (
      adapter.readyState === WalletReadyState.Installed ||
      adapter.readyState === WalletReadyState.Loadable
    ) {
      return true;
    }
    const win = window as unknown as {
      solana?: { isPhantom?: boolean };
      phantom?: { solana?: { isPhantom?: boolean } };
      solflare?: { isSolflare?: boolean };
    };
    if (adapter.name === 'Phantom') {
      return Boolean(win.phantom?.solana?.isPhantom || win.solana?.isPhantom);
    }
    if (adapter.name === 'Solflare') {
      return Boolean(win.solflare?.isSolflare);
    }
    return false;
  };

  // Connect to the chosen wallet adapter (Phantom or Solflare)
  const handleSelectWallet = async (adapter: SignerWalletAdapter) => {
    setErrorMessage(null);
    setRealErrorText(null);
    setShowInstallLink(false);

    if (!isWalletInstalled(adapter)) {
      setShowWalletPopup(false);
      setShowInstallLink(true);
      setErrorMessage('Install Phantom or Solflare');
      setRealErrorText(`${adapter.name} wallet extension was not detected in this browser.`);
      return;
    }

    setIsConnecting(true);
    try {
      await adapter.connect();
      const pubKey = adapter.publicKey;
      if (!pubKey) {
        throw new Error('No public key returned from wallet adapter.');
      }

      const address = pubKey.toBase58();
      setActiveAdapter(adapter);
      setWalletName(adapter.name);
      setWalletAddress(address);
      setShowWalletPopup(false);
      await fetchSolBalance(address);
    } catch (err: unknown) {
      console.error('Wallet connection error:', err);
      const rawMsg = err instanceof Error ? err.message : String(err);
      const lower = rawMsg.toLowerCase();

      setShowWalletPopup(false);
      setRealErrorText(rawMsg);

      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('4001')) {
        setErrorMessage('You cancelled the request.');
      } else if (lower.includes('not installed') || lower.includes('not found')) {
        setShowInstallLink(true);
        setErrorMessage('Install Phantom or Solflare');
      } else {
        setErrorMessage('Could not connect wallet.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect active wallet adapter
  const handleDisconnect = async () => {
    if (activeAdapter) {
      try {
        await activeAdapter.disconnect();
      } catch (err) {
        console.error('Wallet disconnect error:', err);
      }
    }
    setActiveAdapter(null);
    setWalletName(null);
    setWalletAddress(null);
    setSolBalance(null);
    setErrorMessage(null);
    setRealErrorText(null);
    setShowInstallLink(false);
  };

  // Build, sign, send, and confirm a Solana Devnet transfer
  const handlePay = async () => {
    setErrorMessage(null);
    setRealErrorText(null);
    setShowInstallLink(false);

    try {
      // 1. Ensure a wallet is connected
      if (!activeAdapter || !walletAddress || !activeAdapter.publicKey) {
        throw new Error('Wallet not connected. Please connect Phantom or Solflare first.');
      }

      // 2. Validate ARTISAN_WALLET with new PublicKey() inside try/catch
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(ARTISAN_WALLET.trim());
      } catch (pubKeyErr: unknown) {
        console.error('Invalid ARTISAN_WALLET address:', pubKeyErr);
        const detail =
          pubKeyErr instanceof Error ? pubKeyErr.message : String(pubKeyErr);
        setPaymentStatus('failed');
        setErrorMessage('Invalid artisan wallet address.');
        setRealErrorText(detail);
        return;
      }

      const senderPubkey = activeAdapter.publicKey;
      const sol = ngnToSol(selectedArtisan.priceNgn);
      const lamports = Math.round(sol * LAMPORTS_PER_SOL);
      const feeLamports = 5000;

      // 3. Check the balance first and show "Not enough SOL" if it is too low
      const currentLamports = await connection.getBalance(senderPubkey, 'confirmed');
      const currentSol = currentLamports / LAMPORTS_PER_SOL;
      setSolBalance(currentSol);

      if (currentLamports < lamports + feeLamports) {
        const lowBalanceErr = new Error(
          `Balance is ${currentSol.toFixed(4)} SOL (${currentLamports} lamports), need ${sol} SOL (${lamports} lamports) + ${feeLamports} fee lamports.`
        );
        console.error('Insufficient balance:', lowBalanceErr);
        setPaymentStatus('failed');
        setErrorMessage('Not enough SOL');
        setRealErrorText(lowBalanceErr.message);
        return;
      }

      // 4. Waiting for user approval in wallet
      setPaymentStatus('waiting_for_approval');

      // 5. Get the latest blockhash from Devnet
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      // 6. Build the transfer with SystemProgram.transfer and set feePayer
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      // 7. Use sendTransaction from the wallet adapter
      const signature = await activeAdapter.sendTransaction(transaction, connection);

      // 8. Confirm with blockhash and lastValidBlockHeight
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
        throw new Error(
          `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      // 9. Save receipt in localStorage
      const receipt: PaymentReceipt = {
        id: `${Date.now()}-${signature.slice(0, 6)}`,
        artisanName: selectedArtisan.name,
        artisanRole: selectedArtisan.job,
        amountNgn: selectedArtisan.priceNgn,
        amountSol: sol,
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
      console.error('Payment error:', err);
      setPaymentStatus('failed');

      const rawMsg = err instanceof Error ? err.message : String(err);
      const lower = rawMsg.toLowerCase();
      setRealErrorText(rawMsg);

      if (
        lower.includes('reject') ||
        lower.includes('cancel') ||
        lower.includes('denied') ||
        lower.includes('4001')
      ) {
        setErrorMessage('You cancelled the payment.');
      } else if (lower.includes('not connected')) {
        setErrorMessage('Connect your wallet first.');
      } else if (lower.includes('insufficient') || lower.includes('not enough')) {
        setErrorMessage('Not enough SOL');
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
      {/* 1. Top Bar: small ArtiPay logo, DEVNET badge, Connect Wallet button */}
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
            {walletName && (
              <span className="text-sm font-semibold text-emerald-700">
                {walletName}
              </span>
            )}
            <span className="text-sm text-slate-400">·</span>
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
            onClick={() => setShowWalletPopup(true)}
            disabled={isConnecting}
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
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
                setRealErrorText(null);
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
                      setRealErrorText(null);
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

            {/* Friendly Error + Real Error Text in small gray text under it */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span className="text-sm font-medium text-red-900">
                      {errorMessage}
                    </span>
                  </div>
                  {showInstallLink && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href="https://phantom.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-red-800 underline"
                      >
                        Phantom
                      </a>
                      <a
                        href="https://solflare.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-red-800 underline"
                      >
                        Solflare
                      </a>
                    </div>
                  )}
                </div>
                {realErrorText && (
                  <p className="text-sm text-slate-500 pl-7 break-words">
                    {realErrorText}
                  </p>
                )}
              </div>
            )}

            {/* 4. Big Green Pay Button + 6. Small "Pay with QR instead" button */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={walletAddress ? handlePay : () => setShowWalletPopup(true)}
                disabled={isBusy || isConnecting}
                className="w-full min-h-[60px] py-3.5 px-6 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white transition-all duration-150 cursor-pointer disabled:opacity-60 flex flex-col items-center justify-center"
              >
                {paymentStatus === 'waiting_for_approval' ? (
                  <span className="text-base font-bold flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Approve in {walletName || 'Phantom'}</span>
                  </span>
                ) : paymentStatus === 'confirming' ? (
                  <span className="text-base font-bold flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </span>
                ) : !walletAddress ? (
                  <>
                    <span className="text-base font-bold">
                      Connect Wallet to pay
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

      {/* Connect Wallet Popup (Phantom & Solflare) */}
      {showWalletPopup && (
        <div
          onClick={() => setShowWalletPopup(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">
                Select a wallet
              </span>
              <button
                type="button"
                onClick={() => setShowWalletPopup(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {wallets.map((adapter) => {
                const installed = isWalletInstalled(adapter);
                return (
                  <button
                    key={adapter.name}
                    type="button"
                    onClick={() => handleSelectWallet(adapter)}
                    disabled={isConnecting}
                    className="w-full min-h-[54px] px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 active:scale-[0.98] flex items-center justify-between transition-all cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      {adapter.icon && (
                        <img
                          src={adapter.icon}
                          alt={adapter.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg"
                        />
                      )}
                      <span className="text-base font-bold text-slate-900">
                        {adapter.name}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {installed ? 'Detected' : 'Not installed'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-1 text-center">
              <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 hover:text-emerald-700 underline"
              >
                Install Phantom or Solflare
              </a>
            </div>
          </div>
        </div>
      )}

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
                Scan with wallet
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
              Open Phantom or Solflare on your phone and scan this code on Devnet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
