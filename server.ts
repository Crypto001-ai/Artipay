import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_INSTRUCTION = `You are the payment intent parser for ArtiPay, a Solana Devnet payment app for local artisans in Nigeria.
Follow these strict rules:
1. Find a Solana wallet address anywhere in the text. It is 32 to 44 characters of Base58 letters and numbers. Copy it exactly and never invent one.
2. Find the amount.
   - If it has a currency, use it: SOL (words like sol, solana), or Naira (words like naira, NGN, N, ₦, k for thousand such as "10k naira" = 10000).
   - If no currency word is given: if the number is 100 or larger (for example "send 5,000 to <address>", "pay Emeka 5000", "I want to pay the tailor 4,000"), treat it as Naira (NGN). If the number is under 100 and no currency is given, do not guess—set error to "Please specify if the amount is in SOL or Naira."
3. Convert Naira to SOL with 1 SOL = 250,000 NGN (round SOL to up to 4 decimal places). Convert SOL to Naira the same way (1 SOL = 250,000 NGN, round Naira to the nearest whole number).
4. Available artisans in the list:
   - "Emeka" (job: Electrician, Lagos)
   - "Aisha" (job: Tailor, Abuja)
   - "Musa" (job: Mechanic, Kaduna)
   If the text names an artisan ("Emeka", "Aisha", "Musa") or their job ("the electrician", "the tailor", "the mechanic"), match it to that artisan's exact name ("Emeka", "Aisha", or "Musa") and set type to "artisan".
   If the text has a Solana wallet address, set type to "wallet".
   If the text has both an artisan and a wallet address, prefer the address (set type to "wallet" and address to the wallet address).
5. If anything is missing (such as no recipient or no amount) or if the text is unclear, set error to a short message that says what is missing (or if the text is completely unclear, set error to "I did not understand. Try: Pay Emeka 5,000 naira"). Do not guess.
6. Reply with JSON only matching the schema:
   {"type":"artisan" or "wallet" or null,"artisanName":string or null,"address":string or null,"amountSol":number or null,"amountNgn":number or null,"note":string or null,"error":string or null}`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/ask', async (req: Request, res: Response) => {
    try {
      const userText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      if (!userText) {
        res.status(400).json({
          type: null,
          artisanName: null,
          address: null,
          amountSol: null,
          amountNgn: null,
          note: null,
          error: 'Please type a payment request first.',
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          type: null,
          artisanName: null,
          address: null,
          amountSol: null,
          amountNgn: null,
          note: null,
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userText,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                nullable: true,
                description: '"artisan" or "wallet" or null',
              },
              artisanName: {
                type: Type.STRING,
                nullable: true,
                description: 'Matched artisan name ("Emeka", "Aisha", or "Musa") or null',
              },
              address: {
                type: Type.STRING,
                nullable: true,
                description: 'Exact Solana wallet address from user text or null',
              },
              amountSol: {
                type: Type.NUMBER,
                nullable: true,
                description: 'Amount in SOL (1 SOL = 250,000 NGN) or null',
              },
              amountNgn: {
                type: Type.NUMBER,
                nullable: true,
                description: 'Amount in NGN (1 SOL = 250,000 NGN) or null',
              },
              note: {
                type: Type.STRING,
                nullable: true,
                description: 'Optional short note if user mentioned a reason, else null',
              },
              error: {
                type: Type.STRING,
                nullable: true,
                description: 'Short friendly error message if anything is missing or unclear, else null',
              },
            },
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      try {
        const parsed = JSON.parse(rawText);
        res.json(parsed);
      } catch {
        res.json({
          type: null,
          artisanName: null,
          address: null,
          amountSol: null,
          amountNgn: null,
          note: null,
          error: 'I did not understand. Try: Pay Emeka 5,000 naira',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error in /api/ask:', msg);
      res.status(500).json({
        type: null,
        artisanName: null,
        address: null,
        amountSol: null,
        amountNgn: null,
        note: null,
        error: 'Could not reach Ask ArtiPay right now. Please try again.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ArtiPay server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
