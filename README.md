# ArtiPay

Pay local artisans with Solana. Fast. Cheap. Proof on the blockchain.

Built for the MLH Solana Hackathon (November 2026).

**Live app:** [your Vercel link]
**Demo video:** [your video link]

---

## What is ArtiPay?

In Nigeria, many people pay tailors, mechanics, electricians and market traders with cash or bank transfer. Transfers can be slow, fail, or leave no clear proof.

ArtiPay lets anyone pay an artisan, or any wallet, with Solana in about a second. Every payment gets a public receipt on the blockchain that both sides can check.

This is a devnet demo. It uses free test money, not real money.

## Features

- Pay an artisan or any wallet address
- Type the amount in SOL or Naira and see the other one instantly
- Connect with Phantom or Solflare
- Pay by wallet button or by Solana Pay QR code
- A receipt with a link to view proof on Solana Explorer
- Recent payments list
- Ask ArtiPay: type a plain request like "Pay Emeka 5,000 naira" and the form fills for you
- Home page with How it works, a quick test guide and FAQ

## Why Solana?

- Fast: payments confirm in about a second
- Cheap: a fee is a fraction of a cent
- Proof: every payment has a public receipt anyone can check
- No backend is needed for payments. Solana is the record keeper.

## How to test it (3 steps)

1. Install Phantom or Solflare. Open the wallet settings and switch to **Devnet**.
2. Get free test SOL from the Solana faucet: https://faucet.solana.com
3. Open the live app, connect your wallet, pick an artisan or paste any devnet wallet address, and pay.

On a phone, open the live link inside the Phantom or Solflare in-app browser.

Tip: to see the money arrive, create a second account in your wallet and pay that address.

## Ask ArtiPay (AI)

Type a request in plain words:

- "Pay Aisha 4,000 naira"
- "Send 0.05 SOL to [wallet address]"

The AI reads your text and fills the payment form. It never signs or sends anything. You always review the details and approve the payment in your own wallet.

AI output is checked in the app before use: the address must be valid, the amount must be above zero and within the limit, and the artisan must exist.

## How it works

1. You connect your wallet.
2. You choose who to pay and the amount.
3. The app builds a Solana transfer.
4. Your wallet asks you to approve it.
5. The transaction confirms on Solana devnet.
6. You get a receipt and a Solana Explorer link.

## Tech

- React and TypeScript
- Solana Web3.js
- Solana wallet adapter (Phantom and Solflare)
- Solana Pay QR
- Gemini API for Ask ArtiPay, called through a serverless function
- Hosted on Vercel

## Run it yourself

1. Clone the repo:
   git clone https://github.com/Crypto001-ai/Artipay.git then cd Artipay
2. Install packages:
   npm install
3. For Ask ArtiPay, create a file named .env.local and add your key:
   GEMINI_API_KEY=your_key_here
4. Start the app:
   npm run dev

Never commit your .env file or share your seed phrase.

## Safety

- Devnet only. No real money.
- The app never asks for your private key or seed phrase.
- Every payment needs your approval in your own wallet.
- The AI can only fill the form. It cannot spend.

## What is next

- Real Naira payments with stablecoins like USDC
- Artisan profiles and ratings
- Receipts artisans can share with customers
- Pay by phone number or username

## Built by

TechAbdullahi
X: https://x.com/TechAbdullahi
GitHub: https://github.com/Crypto001-ai/Artipay
