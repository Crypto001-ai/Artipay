import { Buffer } from 'buffer';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill Buffer in the browser environment for @solana/web3.js
if (typeof window !== 'undefined' && !window.Buffer) {
  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(<App />);
