export type ModerationReason = 'profanity' | 'threat_or_violence' | 'personal_data' | 'spam';

const PROFANITY = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'bastard', 'motherfucker'];
const VIOLENCE = /\b(kill|murder|shoot|stab|bomb|lynch|burn\s+(?:them|him|her|it|down)|attack|beat\s+up)\b/i;
const URL = /(?:https?:\/\/|www\.)\S+/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const INDIAN_PHONE = /(?:\+91[\s-]?)?[6-9]\d{9}\b/;
const AADHAAR = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;

function normalized(input: string): string {
  return input.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/[3]/g, 'e').replace(/[4]/g, 'a').replace(/[5$]/g, 's').replace(/[7]/g, 't');
}

function hasObfuscatedProfanity(input: string): boolean {
  const value = normalized(input);
  return PROFANITY.some((word) => value.includes(word));
}

export function getModerationReason(input: string | null | undefined): ModerationReason | null {
  if (!input) return null;
  if (hasObfuscatedProfanity(input)) return 'profanity';
  if (VIOLENCE.test(input)) return 'threat_or_violence';
  if (EMAIL.test(input) || INDIAN_PHONE.test(input) || AADHAAR.test(input)) return 'personal_data';
  if (URL.test(input) || /(.)\1{7,}/.test(input)) return 'spam';
  return null;
}

export function containsProfanity(input: string | null | undefined): boolean {
  return getModerationReason(input) === 'profanity';
}
