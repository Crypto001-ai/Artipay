const SYSTEM_INSTRUCTION = `You are the payment intent parser for ArtiPay, a Solana Devnet payment app for local artisans in Nigeria.
Follow these strict rules:
1. Find a Solana wallet address anywhere in the text. It is 32 to 44 characters of Base58 letters and numbers. Copy it exactly and never invent one.
2. Find the amount and currency:
   - SOL (words like sol, solana)
   - Naira (words like naira, NGN, N, ₦, and "k" meaning thousand such as "10k" = 10000).
   - If no currency is written, treat numbers of 1,000 or more as Naira (NGN), and smaller numbers as SOL.
3. Convert Naira to SOL with 1 SOL = 250,000 NGN (round SOL to up to 4 decimal places). Convert SOL to Naira with 1 SOL = 250,000 NGN (round Naira to the nearest whole number).
4. Available artisans:
   - "Emeka" (job: Electrician, Lagos)
   - "Aisha" (job: Tailor, Abuja)
   - "Musa" (job: Mechanic, Kaduna)
   If the text names an artisan ("Emeka", "Aisha", "Musa") or their job ("electrician", "tailor", "mechanic"), match it to that artisan's exact name ("Emeka", "Aisha", or "Musa") and set type to "artisan".
   If the text has a Solana wallet address, set type to "wallet".
   If the text has both an artisan and a wallet address, prefer the address (set type to "wallet" and address to the wallet address).
5. If anything is missing (such as no recipient or no amount) or unclear, set error to a short message explaining what is missing (or "I did not understand. Try: Pay Emeka 5,000 naira").
6. Reply with JSON only matching this exact shape:
   {"type":"artisan"|"wallet"|null,"artisanName":string|null,"address":string|null,"amountSol":number|null,"amountNgn":number|null,"note":string|null,"error":string|null}`;

const GEMINI_MODEL = 'gemini-2.5-flash';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request body.' });
      }
    }

    const userText = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!userText) {
      return res.status(400).json({
        type: null,
        artisanName: null,
        address: null,
        amountSol: null,
        amountNgn: null,
        note: null,
        error: 'Please type a payment request first.',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);

    let apiResponse;
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      apiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userText }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const rawJson = await apiResponse.json().catch(() => null);

    if (!apiResponse.ok) {
      const upstreamMessage =
        rawJson?.error?.message || `Gemini API returned HTTP ${apiResponse.status}`;
      return res.status(apiResponse.status).json({
        type: null,
        artisanName: null,
        address: null,
        amountSol: null,
        amountNgn: null,
        note: null,
        error: upstreamMessage,
      });
    }

    const modelText =
      rawJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!modelText) {
      return res.status(200).json({
        type: null,
        artisanName: null,
        address: null,
        amountSol: null,
        amountNgn: null,
        note: null,
        error: 'I did not understand. Try: Pay Emeka 5,000 naira',
      });
    }

    try {
      const cleaned = modelText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({
        type: null,
        artisanName: null,
        address: null,
        amountSol: null,
        amountNgn: null,
        note: null,
        error: 'I did not understand. Try: Pay Emeka 5,000 naira',
      });
    }
  } catch (err) {
    const isTimeout = err && (err.name === 'AbortError' || String(err).includes('AbortError'));
    const message = isTimeout
      ? 'AI request timed out after 14 seconds.'
      : err instanceof Error
        ? err.message
        : String(err);

    return res.status(500).json({
      type: null,
      artisanName: null,
      address: null,
      amountSol: null,
      amountNgn: null,
      note: null,
      error: message || 'Unexpected server error in /api/ask',
    });
  }
}
