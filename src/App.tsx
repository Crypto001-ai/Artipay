/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './polyfills.ts';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Wallet,
  Copy,
  Clock,
  ChevronDown,
} from 'lucide-react';
import HomePage from './HomePage.tsx';

// ============================================================================
// SOLANA CONFIGURATION & RECIPIENT CONSTANT
// ============================================================================

// 1. Default Artisan recipient wallet on Solana Devnet
export const ARTISAN_WALLET = '8cMgAqX9hgkSV2mF63WE37uyhRXbggjxTi8AWFYXjaDc';

// 2. Solana Devnet RPC URL
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';

// 3. Constant conversion rate: 1 SOL = 250,000 NGN
const NGN_PER_SOL = 250_000;

// Small reserve kept in the wallet for network fees (0.00001 SOL = 10,000 lamports)
const FEE_RESERVE_SOL = 0.00001;
const FEE_RESERVE_LAMPORTS = 10_000;

// Quick preset SOL buttons
const QUICK_SOL_AMOUNTS = [0.01, 0.02, 0.05];

// Key used to save payment receipts in localStorage
const RECEIPTS_STORAGE_KEY = 'artipay_devnet_receipts_v1';

// Connect to Solana Devnet
const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

// ============================================================================
// TYPES
// ============================================================================

export type PayToMode = 'artisan' | 'wallet';

export interface Artisan {
  id: string;
  name: string;
  job: string;
  city: string;
  priceNgn: number;
}

export interface PaymentReceipt {
  id: string;
  payToMode?: PayToMode;
  artisanName: string;
  artisanRole: string;
  amountNgn: number;
  amountSol: number;
  signature: string;
  recipient: string;
  sender: string;
  note?: string;
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

// Convert Naira to SOL (up to 4 decimals)
function ngnToSol(ngn: number): number {
  return Number((ngn / NGN_PER_SOL).toFixed(4));
}

// Format a numeric Naira value with commas (e.g. 10,000)
function formatNgnNumber(ngn: number): string {
  if (!Number.isFinite(ngn)) return '';
  return Math.round(ngn).toLocaleString('en-US');
}

// Format a raw Naira string while typing (commas on integer part, preserve optional decimal)
function formatNgnInputString(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const formattedInt = intPart
    ? Number(intPart).toLocaleString('en-US')
    : '0';
  return decPart !== undefined ? `${formattedInt}.${decPart.slice(0, 2)}` : formattedInt;
}

// Shorten a wallet address like 8cMg...jaDc
function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Format relative time (e.g. "Just now", "2 min ago", "3 hr ago")
function formatRelativeTime(isoTimestamp: string, nowMs: number): string {
  const thenMs = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(thenMs)) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - thenMs) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

// Build a Solana Pay URL (solana:<address>?amount=...) using the final recipient, SOL, NGN, and note
function buildSolanaPayUrl(
  recipientLabel: string,
  solAmount: number,
  ngnAmount: number,
  recipientAddress: string,
  note: string
): string {
  const safeSol = solAmount > 0 ? Number(solAmount.toFixed(4)) : 0;
  const cleanNote = note.trim();
  const baseMsg = `Pay ${recipientLabel} - ${formatNgnNumber(ngnAmount)} NGN`;
  const params = new URLSearchParams({
    amount: safeSol.toString(),
    label: `ArtiPay - ${recipientLabel}`,
    message: cleanNote ? `${baseMsg} (${cleanNote})` : baseMsg,
  });
  return `solana:${recipientAddress}?${params.toString()}`;
}

// Format who was paid for receipts and Recent payments list
function formatRecipientDisplay(receipt: PaymentReceipt): string {
  if (receipt.payToMode === 'wallet' || !receipt.artisanRole) {
    return shortenAddress(receipt.recipient || receipt.artisanName, 4);
  }
  return `${receipt.artisanName} - ${receipt.artisanRole}`;
}

// Extract a readable error string from any thrown value
function getErrorText(err: unknown): string {
  if (err instanceof Error) {
    const inner = (err as { error?: { message?: string } }).error?.message;
    if (inner) return `${err.name}: ${inner}`;
    if (err.message) return `${err.name}: ${err.message}`;
    return err.name;
  }
  return String(err);
}

export default function App() {
  // Simple hash routing: '#/' for Home page, '#/app' for Dashboard
  const [route, setRoute] = useState<'home' | 'app'>(() =>
    typeof window !== 'undefined' && window.location.hash.startsWith('#/app')
      ? 'app'
      : 'home'
  );

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#/app')) {
        setRoute('app');
      } else {
        setRoute('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToApp = useCallback(() => {
    window.location.hash = '#/app';
    setRoute('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToHome = useCallback(() => {
    window.location.hash = '#/';
    setRoute('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Live clock tick for relative timestamps ("2 min ago")
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // "Pay to" mode: 'artisan' or 'wallet'
  const [payToMode, setPayToMode] = useState<PayToMode>('artisan');
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan>(ARTISANS[0]);
  const [customWalletInput, setCustomWalletInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');

  // Two-way amount box state (initialized to first artisan's price: 0.02 SOL / 5,000 NGN)
  const [solInput, setSolInput] = useState<string>(() =>
    ngnToSol(ARTISANS[0].priceNgn).toString()
  );
  const [ngnInput, setNgnInput] = useState<string>(() =>
    formatNgnNumber(ARTISANS[0].priceNgn)
  );

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
  const [showWalletMenu, setShowWalletMenu] = useState<boolean>(false);
  const [notOnDevnetWarning, setNotOnDevnetWarning] = useState<boolean>(false);

  const walletMenuRef = useRef<HTMLDivElement | null>(null);

  // Close the compact header wallet dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        walletMenuRef.current &&
        !walletMenuRef.current.contains(e.target as Node)
      ) {
        setShowWalletMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [realErrorText, setRealErrorText] = useState<string | null>(null);
  const [showInstallLink, setShowInstallLink] = useState<boolean>(false);
  const [latestReceipt, setLatestReceipt] = useState<PaymentReceipt | null>(null);
  const [copiedReceiptLink, setCopiedReceiptLink] = useState<boolean>(false);
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

  // Summary metrics: total paid SOL and number of payments
  const totalPaidSol = useMemo(() => {
    const sum = paymentHistory.reduce(
      (acc, item) => acc + (Number(item.amountSol) || 0),
      0
    );
    return Number(sum.toFixed(4));
  }, [paymentHistory]);

  // Fetch the user's SOL balance from Solana Devnet and check if wallet might be on Mainnet
  const fetchSolBalance = useCallback(async (address: string) => {
    try {
      const pubKey = new PublicKey(address);
      const lamports = await connection.getBalance(pubKey, 'confirmed');
      const devnetSol = lamports / LAMPORTS_PER_SOL;
      setSolBalance(devnetSol);

      // Check if wallet provider reports a non-devnet network or has 0 SOL on devnet
      const win = window as unknown as {
        solana?: { networkVersion?: string; cluster?: string };
        solflare?: { network?: string; cluster?: string };
      };
      const reportedCluster =
        win.solana?.cluster ||
        win.solana?.networkVersion ||
        win.solflare?.cluster ||
        win.solflare?.network ||
        '';
      if (
        reportedCluster &&
        reportedCluster.toLowerCase().includes('mainnet')
      ) {
        setNotOnDevnetWarning(true);
      } else {
        setNotOnDevnetWarning(false);
      }
    } catch {
      // Keep previous balance if RPC request fails briefly
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

  // Validate custom wallet address with new PublicKey() inside try/catch
  const customWalletStatus = useMemo(() => {
    const trimmed = customWalletInput.trim();
    if (!trimmed) {
      return { isValid: false, isSelf: false, error: null as string | null, address: '' };
    }
    try {
      const pubKey = new PublicKey(trimmed);
      const base58 = pubKey.toBase58();
      if (walletAddress && base58 === walletAddress) {
        return {
          isValid: false,
          isSelf: true,
          error: 'You cannot pay yourself',
          address: base58,
        };
      }
      return { isValid: true, isSelf: false, error: null, address: base58 };
    } catch {
      return {
        isValid: false,
        isSelf: false,
        error: 'Invalid wallet address',
        address: '',
      };
    }
  }, [customWalletInput, walletAddress]);

  // Parsed numeric values for SOL and NGN
  const parsedSol = parseFloat(solInput);
  const numericSol =
    Number.isFinite(parsedSol) && parsedSol > 0 ? Number(parsedSol.toFixed(4)) : 0;

  const rawNgnFromInput = parseFloat(ngnInput.replace(/,/g, ''));
  const numericNgn =
    Number.isFinite(rawNgnFromInput) && rawNgnFromInput > 0
      ? Math.round(rawNgnFromInput)
      : Math.round(numericSol * NGN_PER_SOL);

  const isValidAmount = numericSol > 0;
  const isRecipientReady =
    payToMode === 'artisan' ? true : customWalletStatus.isValid;

  const isOverBalance =
    walletAddress !== null &&
    solBalance !== null &&
    numericSol > 0 &&
    numericSol + FEE_RESERVE_SOL > solBalance;

  // Handle pasting from clipboard into the custom wallet input
  const handlePasteWallet = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCustomWalletInput(text.trim());
        setErrorMessage(null);
        setRealErrorText(null);
      }
    } catch {
      setErrorMessage('Could not paste from clipboard.');
    }
  };

  // Handle copying receipt link on the success screen
  const handleCopyReceiptLink = (signature: string) => {
    const url = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    navigator.clipboard.writeText(url);
    setCopiedReceiptLink(true);
    setTimeout(() => setCopiedReceiptLink(false), 2000);
  };

  // Handle typing in the SOL field -> update NGN field instantly
  const handleSolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Allow only digits and at most one decimal point (up to 4 decimals)
    if (!/^\d*\.?\d{0,4}$/.test(val)) return;

    setSolInput(val);
    setErrorMessage(null);
    setRealErrorText(null);

    if (val === '' || val === '.') {
      setNgnInput('');
      return;
    }

    const num = parseFloat(val);
    if (Number.isFinite(num)) {
      setNgnInput(formatNgnNumber(num * NGN_PER_SOL));
    } else {
      setNgnInput('');
    }
  };

  // Handle typing in the Naira field -> update SOL field instantly
  const handleNgnInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');

    // Allow only digits and at most one decimal point
    if (!/^\d*\.?\d*$/.test(raw)) return;

    setErrorMessage(null);
    setRealErrorText(null);

    if (raw === '' || raw === '.') {
      setNgnInput(raw);
      setSolInput('');
      return;
    }

    setNgnInput(formatNgnInputString(raw));

    const num = parseFloat(raw);
    if (Number.isFinite(num)) {
      const calculatedSol = Number((num / NGN_PER_SOL).toFixed(4));
      setSolInput(calculatedSol.toString());
    } else {
      setSolInput('');
    }
  };

  // Handle clicking one of the quick SOL buttons (0.01, 0.02, 0.05 SOL)
  const handleQuickSolSelect = (solVal: number) => {
    const cleanSol = Number(solVal.toFixed(4));
    setSolInput(cleanSol.toString());
    setNgnInput(formatNgnNumber(cleanSol * NGN_PER_SOL));
    setErrorMessage(null);
    setRealErrorText(null);
    if (paymentStatus === 'failed') setPaymentStatus('idle');
  };

  // Handle selecting an artisan card -> fill fields with their price
  const handleSelectArtisan = (artisan: Artisan) => {
    setSelectedArtisan(artisan);
    const solVal = ngnToSol(artisan.priceNgn);
    setSolInput(solVal.toString());
    setNgnInput(formatNgnNumber(artisan.priceNgn));
    setErrorMessage(null);
    setRealErrorText(null);
    if (paymentStatus === 'failed') setPaymentStatus('idle');
  };

  // Check if a browser wallet extension (Phantom or Solflare) is installed
  const isWalletInstalled = useCallback((adapter: SignerWalletAdapter): boolean => {
    if (adapter.readyState === WalletReadyState.Installed) {
      return true;
    }
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      solana?: { isPhantom?: boolean };
      phantom?: { solana?: { isPhantom?: boolean } };
      solflare?: { isSolflare?: boolean };
      SolflareApp?: unknown;
    };
    if (adapter.name === 'Phantom') {
      return Boolean(win.phantom?.solana?.isPhantom || win.solana?.isPhantom);
    }
    if (adapter.name === 'Solflare') {
      return Boolean(win.solflare?.isSolflare || win.SolflareApp);
    }
    return false;
  }, []);

  // Connect to the chosen wallet adapter (Phantom or Solflare)
  const handleSelectWallet = async (adapter: SignerWalletAdapter) => {
    setErrorMessage(null);
    setRealErrorText(null);
    setShowInstallLink(false);

    if (!isWalletInstalled(adapter)) {
      setShowWalletPopup(false);
      setShowInstallLink(true);
      setErrorMessage('Install Phantom or Solflare');
      const inIframe =
        typeof window !== 'undefined' && window.self !== window.top;
      setRealErrorText(
        inIframe
          ? `${adapter.name} extension not detected. Open this app in a new browser tab to connect your wallet.`
          : `${adapter.name} browser extension is not installed.`
      );
      return;
    }

    setIsConnecting(true);
    try {
      await adapter.connect();
      const pubKey = adapter.publicKey;
      if (!pubKey) {
        throw new Error('Wallet did not return a public key.');
      }

      const address = pubKey.toBase58();
      setActiveAdapter(adapter);
      setWalletName(adapter.name);
      setWalletAddress(address);
      setShowWalletPopup(false);
      await fetchSolBalance(address);
    } catch (err: unknown) {
      const rawMsg = getErrorText(err);
      const lower = rawMsg.toLowerCase();

      setShowWalletPopup(false);
      setRealErrorText(rawMsg);

      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('4001')) {
        setErrorMessage('You cancelled the request.');
      } else {
        setShowInstallLink(true);
        setErrorMessage('Install Phantom or Solflare');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect active wallet adapter
  const handleDisconnect = async () => {
    setShowWalletMenu(false);
    if (activeAdapter) {
      try {
        await activeAdapter.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    setActiveAdapter(null);
    setWalletName(null);
    setWalletAddress(null);
    setSolBalance(null);
    setNotOnDevnetWarning(false);
    setErrorMessage(null);
    setRealErrorText(null);
    setShowInstallLink(false);
  };

  // Build, sign, send, and confirm a Solana Devnet transfer
  const handlePay = async () => {
    setErrorMessage(null);
    setRealErrorText(null);
    setShowInstallLink(false);

    if (!isValidAmount) return;

    if (!activeAdapter || !walletAddress || !activeAdapter.publicKey) {
      setShowWalletPopup(true);
      setErrorMessage('Connect your wallet first.');
      return;
    }

    const targetAddressString =
      payToMode === 'artisan' ? ARTISAN_WALLET.trim() : customWalletInput.trim();

    try {
      // 1. Validate target recipient address with new PublicKey() inside try/catch
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(targetAddressString);
      } catch (pubKeyErr: unknown) {
        const detail = getErrorText(pubKeyErr);
        setPaymentStatus('failed');
        setErrorMessage('Invalid wallet address');
        setRealErrorText(detail);
        return;
      }

      const senderPubkey = activeAdapter.publicKey;

      // Block payment to the connected wallet's own address
      if (recipientPubkey.toBase58() === senderPubkey.toBase58()) {
        setPaymentStatus('failed');
        setErrorMessage('You cannot pay yourself');
        return;
      }

      const sol = numericSol;
      const lamports = Math.round(sol * LAMPORTS_PER_SOL);

      // 2. Check the balance first and show "Not enough SOL" if it is too low (keeping reserve for fees)
      const currentLamports = await connection.getBalance(senderPubkey, 'confirmed');
      const currentSol = currentLamports / LAMPORTS_PER_SOL;
      setSolBalance(currentSol);

      if (currentLamports < lamports + FEE_RESERVE_LAMPORTS) {
        const detail = `Balance is ${currentSol.toFixed(4)} SOL (${currentLamports} lamports), need ${sol} SOL (${lamports} lamports) + ${FEE_RESERVE_LAMPORTS} fee lamports.`;
        setPaymentStatus('failed');
        setErrorMessage('Not enough SOL');
        setRealErrorText(detail);
        return;
      }

      // 3. Waiting for user approval in wallet
      setPaymentStatus('waiting_for_approval');

      // 4. Get the latest blockhash from Devnet
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      // 5. Build the transfer with SystemProgram.transfer and set feePayer
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      // 6. Use sendTransaction from the wallet adapter
      const signature = await activeAdapter.sendTransaction(transaction, connection);

      // 7. Confirm with blockhash and lastValidBlockHeight
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

      // 8. Save receipt in localStorage with who was paid and optional note
      const cleanNote = noteInput.trim().slice(0, 40);
      const recipientBase58 = recipientPubkey.toBase58();
      const receipt: PaymentReceipt = {
        id: `${Date.now()}-${signature.slice(0, 6)}`,
        payToMode,
        artisanName:
          payToMode === 'artisan'
            ? selectedArtisan.name
            : shortenAddress(recipientBase58, 4),
        artisanRole: payToMode === 'artisan' ? selectedArtisan.job : '',
        amountNgn: numericNgn,
        amountSol: sol,
        signature,
        recipient: recipientBase58,
        sender: senderPubkey.toBase58(),
        note: cleanNote || undefined,
        timestamp: new Date().toISOString(),
      };

      setLatestReceipt(receipt);
      setPaymentHistory((prev) => [receipt, ...prev]);
      setNowMs(Date.now());
      setPaymentStatus('success');
      setNoteInput('');
      await fetchSolBalance(walletAddress);
    } catch (err: unknown) {
      const rawMsg = getErrorText(err);
      setPaymentStatus('failed');
      setRealErrorText(rawMsg);

      const lower = rawMsg.toLowerCase();
      if (
        lower.includes('reject') ||
        lower.includes('cancel') ||
        lower.includes('denied') ||
        lower.includes('4001')
      ) {
        setErrorMessage('You cancelled the payment.');
      } else if (
        lower.includes('blockhash not found') ||
        lower.includes('mainnet') ||
        lower.includes('wrong network') ||
        lower.includes('cluster')
      ) {
        setNotOnDevnetWarning(true);
        setErrorMessage('Your wallet is not on Devnet. Switch to Solana Devnet in settings.');
      } else if (lower.includes('not connected')) {
        setErrorMessage('Connect your wallet first.');
      } else if (lower.includes('insufficient') || lower.includes('not enough')) {
        setErrorMessage('Not enough SOL');
      } else {
        setErrorMessage('Payment failed. Check that your wallet is on Solana Devnet.');
      }
    }
  };

  // Render Home Page when route is '#/'
  if (route === 'home') {
    return <HomePage onOpenApp={navigateToApp} />;
  }

  const activeRecipientAddress =
    payToMode === 'artisan'
      ? ARTISAN_WALLET
      : customWalletStatus.isValid
        ? customWalletStatus.address
        : customWalletInput.trim() || ARTISAN_WALLET;

  const activeRecipientLabel =
    payToMode === 'artisan'
      ? selectedArtisan.name
      : customWalletStatus.isValid
        ? shortenAddress(customWalletStatus.address, 4)
        : 'wallet';

  const solanaPayUrl = buildSolanaPayUrl(
    activeRecipientLabel,
    numericSol,
    numericNgn,
    activeRecipientAddress,
    noteInput
  );

  const isBusy =
    paymentStatus === 'waiting_for_approval' || paymentStatus === 'confirming';

  const displayErrorMessage =
    errorMessage || (isOverBalance ? 'Not enough SOL' : null);

  // Render Dashboard when route is '#/app'
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-slate-900 flex flex-col">
      {/* 1. Compact Mobile-Friendly Top Bar (fits comfortably at 375px wide with zero overflow) */}
      <header className="w-full max-w-md mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              navigateToHome();
            }}
            title="Back to Home"
            className="flex items-center gap-1.5"
          >
            <img
              src="/assets/aistudio/1131413-removebg-preview_a46a01c6.png"
              alt="ArtiPay logo"
              className="w-8 h-8 object-contain shrink-0"
            />
            <span className="text-base font-bold tracking-tight">ArtiPay</span>
          </a>
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-sm font-semibold">
            DEVNET
          </span>
        </div>

        {/* Compact Wallet Pill with Dropdown Menu */}
        {walletAddress ? (
          <div ref={walletMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowWalletMenu((prev) => !prev)}
              className="min-h-[40px] px-2.5 py-1.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 text-sm font-semibold text-slate-900 cursor-pointer transition-colors"
            >
              {activeAdapter?.icon ? (
                <img
                  src={activeAdapter.icon}
                  alt={walletName || 'Wallet'}
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 rounded-sm shrink-0"
                />
              ) : (
                <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="text-slate-600">
                {shortenAddress(walletAddress, 3)}
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-bold text-slate-900">
                {solBalance !== null ? `${solBalance.toFixed(2)} SOL` : '...'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showWalletMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-slate-200 shadow-lg p-2 z-40 space-y-1">
                <div className="px-3 py-1.5 text-sm text-slate-500 border-b border-slate-100">
                  <div className="font-semibold text-slate-900">
                    {walletName || 'Connected Wallet'}
                  </div>
                  <div className="truncate">{shortenAddress(walletAddress, 6)}</div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowWalletPopup(true)}
            disabled={isConnecting}
            className="min-h-[40px] px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </header>

      {/* Main Single-Column Mobile-First Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-6">
        {/* 2. Title, Short Subtitle & Summary Row */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pay a local artisan with Solana
            </h1>
            <p className="text-sm text-slate-500">
              Fast. Cheap. Proof on the blockchain.
            </p>
          </div>

          {/* Small Summary Row: Wallet balance, Total paid, Number of payments */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-center">
            <div>
              <div className="text-sm text-slate-500">Balance</div>
              <div className="text-base font-bold text-slate-900">
                {solBalance !== null ? `${solBalance.toFixed(2)} SOL` : '0.00 SOL'}
              </div>
            </div>
            <div className="border-x border-slate-200/80 px-1">
              <div className="text-sm text-slate-500">Total paid</div>
              <div className="text-base font-bold text-slate-900">
                {totalPaidSol} SOL
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Payments</div>
              <div className="text-base font-bold text-slate-900">
                {paymentHistory.length}
              </div>
            </div>
          </div>

          {/* Clear warning if wallet is not on Devnet or has 0 Devnet SOL */}
          {(notOnDevnetWarning || (walletAddress && solBalance === 0)) && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                {notOnDevnetWarning ? (
                  <span>
                    Your wallet is not on Solana Devnet. Switch to Devnet in your wallet settings.
                  </span>
                ) : (
                  <span>
                    Your Devnet balance is 0 SOL. Make sure your wallet is set to Solana Devnet or get free test SOL below.
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 5. Success Screen OR Payment Card */}
        {paymentStatus === 'success' && latestReceipt ? (
          <section className="rounded-3xl bg-emerald-50/70 border-2 border-emerald-500 p-6 text-center space-y-5 transition-all">
            <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm scale-100 transition-transform">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {latestReceipt.amountSol} SOL
              </div>
              <div className="text-sm text-slate-600">
                {latestReceipt.amountNgn.toLocaleString('en-US')} NGN sent to{' '}
                {formatRecipientDisplay(latestReceipt)}
              </div>
              {latestReceipt.note && (
                <div className="text-sm text-slate-500 pt-1">
                  Note: {latestReceipt.note}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
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
                onClick={() => handleCopyReceiptLink(latestReceipt.signature)}
                className="w-full min-h-[48px] rounded-2xl bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 text-base font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedReceiptLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Receipt link copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy receipt link</span>
                  </>
                )}
              </button>
            </div>

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
            {/* "Pay to" Switch at the top of the payment card: Artisan vs Any wallet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Pay to</span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setPayToMode('artisan');
                    setErrorMessage(null);
                    setRealErrorText(null);
                  }}
                  className={`min-h-[44px] rounded-xl text-base font-bold transition-all cursor-pointer ${
                    payToMode === 'artisan'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Artisan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayToMode('wallet');
                    setErrorMessage(null);
                    setRealErrorText(null);
                  }}
                  className={`min-h-[44px] rounded-xl text-base font-bold transition-all cursor-pointer ${
                    payToMode === 'wallet'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Any wallet
                </button>
              </div>
            </div>

            {/* Option A: 3 Artisan Cards OR Option B: Any Wallet Address Input */}
            {payToMode === 'artisan' ? (
              <div className="space-y-3.5">
                {ARTISANS.map((artisan) => {
                  const solPrice = ngnToSol(artisan.priceNgn);
                  const isSelected = selectedArtisan.id === artisan.id;

                  return (
                    <button
                      key={artisan.id}
                      type="button"
                      onClick={() => handleSelectArtisan(artisan)}
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
                          {artisan.priceNgn.toLocaleString('en-US')} NGN
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div
                  className={`rounded-3xl border-2 p-4 space-y-2 transition-colors ${
                    customWalletStatus.error
                      ? 'border-red-400 bg-red-50/30'
                      : customWalletStatus.isValid
                        ? 'border-emerald-600 bg-emerald-50/30'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="custom-wallet-input"
                      className="text-sm text-slate-500"
                    >
                      Wallet address
                    </label>
                    <div className="flex items-center gap-2">
                      {customWalletStatus.isValid && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handlePasteWallet}
                        className="min-h-[34px] px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                      >
                        Paste
                      </button>
                    </div>
                  </div>

                  <input
                    id="custom-wallet-input"
                    type="text"
                    value={customWalletInput}
                    onChange={(e) => {
                      setCustomWalletInput(e.target.value);
                      setErrorMessage(null);
                      setRealErrorText(null);
                    }}
                    placeholder="Enter Solana Devnet address"
                    className="w-full bg-transparent text-base font-bold text-slate-900 focus:outline-none truncate"
                  />

                  {customWalletStatus.error && (
                    <p className="text-sm text-red-600 font-medium">
                      {customWalletStatus.error}
                    </p>
                  )}
                </div>

                <p className="text-sm text-slate-500 text-center">
                  Test with a friend&apos;s devnet wallet or your second wallet.
                </p>
              </div>
            )}

            {/* Amount Box Card: Two fields side by side + Quick SOL buttons + Note + Rate line */}
            <div className="space-y-2.5">
              <div className="rounded-3xl border-2 border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  {/* Field 1: You pay (SOL) */}
                  <label className="block bg-white rounded-2xl border border-slate-200 p-3 focus-within:border-emerald-600 transition-colors">
                    <span className="block text-sm text-slate-500">
                      You pay (SOL)
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={solInput}
                      onChange={handleSolInputChange}
                      placeholder="0.00"
                      className="mt-1 w-full bg-transparent text-base font-bold text-slate-900 focus:outline-none"
                    />
                  </label>

                  {/* Field 2: They get (NGN) */}
                  <label className="block bg-white rounded-2xl border border-slate-200 p-3 focus-within:border-emerald-600 transition-colors">
                    <span className="block text-sm text-slate-500">
                      They get (NGN)
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ngnInput}
                      onChange={handleNgnInputChange}
                      placeholder="0"
                      className="mt-1 w-full bg-transparent text-base font-bold text-slate-900 focus:outline-none"
                    />
                  </label>
                </div>

                {/* Quick SOL buttons: 0.01, 0.02, 0.05 SOL */}
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_SOL_AMOUNTS.map((amt) => {
                    const isActive = numericSol === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickSolSelect(amt)}
                        className={`min-h-[40px] rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {amt} SOL
                      </button>
                    );
                  })}
                </div>

                {/* Optional Note box (max 40 characters) */}
                <label className="block bg-white rounded-2xl border border-slate-200 p-3 focus-within:border-emerald-600 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Note (optional)</span>
                    <span className="text-sm text-slate-400">
                      {noteInput.length}/40
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={40}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value.slice(0, 40))}
                    placeholder="What is this payment for?"
                    className="mt-1 w-full bg-transparent text-base text-slate-900 focus:outline-none"
                  />
                </label>
              </div>

              <p className="text-sm text-slate-500 text-center">
                Rate: 1 SOL = {NGN_PER_SOL.toLocaleString('en-US')} NGN (demo rate)
              </p>
            </div>

            {/* Clear Loading State Card while waiting for approval or confirming on Solana Devnet */}
            {isBusy && (
              <div
                role="status"
                className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3.5 flex items-center gap-3"
              >
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                <div className="text-sm text-emerald-950">
                  {paymentStatus === 'waiting_for_approval' ? (
                    <span className="font-semibold">
                      Waiting for approval in {walletName || 'your wallet'}...
                    </span>
                  ) : (
                    <span className="font-semibold">
                      Confirming payment on Solana Devnet...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Friendly Error + Real Error Text in small gray text under it */}
            {displayErrorMessage && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span className="text-sm font-medium text-red-900">
                      {displayErrorMessage}
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
                disabled={
                  isBusy ||
                  isConnecting ||
                  !isValidAmount ||
                  isOverBalance ||
                  (walletAddress !== null && !isRecipientReady)
                }
                className="w-full min-h-[60px] py-3.5 px-6 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
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
                      {numericSol} SOL ({numericNgn.toLocaleString('en-US')} NGN)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-base font-bold">
                      Pay {numericSol} SOL
                    </span>
                    <span className="text-sm text-emerald-100">
                      {numericNgn.toLocaleString('en-US')} NGN to {activeRecipientLabel}
                    </span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowQrPopup(true)}
                  disabled={!isValidAmount || !isRecipientReady}
                  className="min-h-[44px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-40"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Pay with QR instead</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 7. Recent Payments List at the Bottom (with Empty State & Relative Time) */}
        <section className="pt-4 border-t border-slate-100 space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Recent payments
          </h2>

          {paymentHistory.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 border border-slate-200/80 p-6 text-center space-y-1.5">
              <Clock className="w-6 h-6 text-slate-400 mx-auto" />
              <div className="text-base font-semibold text-slate-700">
                No payments yet
              </div>
              <p className="text-sm text-slate-500">
                Your completed payment receipts will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paymentHistory.map((item) => {
                const relTime = formatRelativeTime(item.timestamp, nowMs);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-slate-50 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-slate-900 truncate">
                          {formatRecipientDisplay(item)}
                        </span>
                        {relTime && (
                          <span className="text-sm text-slate-400 shrink-0">
                            · {relTime}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {item.amountNgn.toLocaleString('en-US')} NGN · {item.amountSol} SOL
                      </div>
                      {item.note && (
                        <div className="text-sm text-slate-500 truncate">
                          Note: {item.note}
                        </div>
                      )}
                    </div>

                    <a
                      href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 shrink-0"
                    >
                      <span>Proof</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 8. Small "Need test SOL?" link to the devnet faucet at the very bottom */}
      <footer className="w-full max-w-md mx-auto px-4 py-6 text-center flex items-center justify-center gap-4">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigateToHome();
          }}
          className="text-sm text-slate-500 hover:text-emerald-700 underline"
        >
          Back to Home
        </a>
        <span className="text-sm text-slate-300">·</span>
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

      {/* 6. Solana Pay QR Code Popup Modal (Uses the final recipient, SOL, NGN, and note) */}
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
                {numericSol} SOL
              </div>
              <div className="text-sm text-slate-600">
                {numericNgn.toLocaleString('en-US')} NGN to {activeRecipientLabel}
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
