import React from 'react';

export function CandleLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return <svg viewBox="0 0 48 48" role="img" aria-label="Candle" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 4C19.5 10.2 16 14.3 16 20.2C16 25.1 19.6 29 24 29C28.4 29 32 25.1 32 20.2C32 14.3 28.5 10.2 24 4Z" fill="#F59E0B" />
    <path d="M24 11C21.9 14.6 20.5 17.4 20.5 20.6C20.5 22.6 22 24.2 24 24.2C26 24.2 27.5 22.6 27.5 20.6C27.5 17.4 26.1 14.6 24 11Z" fill="#FFF7D6" />
    <rect x="16" y="27" width="16" height="15" rx="2.5" fill="#E8D5A3" />
    <path d="M16 32H32" stroke="#C9A879" strokeWidth="2" />
    <path d="M13 43H35" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}
