// Short labels for long AI/catalogue text, so chips and badges never overflow.

// "Peaceful but territorial toward same sex; can be kept alone" -> "Peaceful"
export function shortTemperament(value?: string | null): string {
  const text = String(value || '').trim();
  if (!text) return '';
  const first = text.split(/[,;.(]| but | - | – /i)[0].trim();
  const label = first.length > 18 ? first.split(/\s+/)[0] : first;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type Tone = 'good' | 'warn' | 'bad' | 'default';

export function temperamentTone(value?: string | null): Tone {
  const text = String(value || '').toLowerCase();
  if (!text) return 'default';
  if (/aggressive|territorial|fin.?nip|predator/.test(text) && !/semi|peaceful/.test(text)) return 'bad';
  if (/semi|territorial|nip|can be/.test(text)) return 'warn';
  if (/peace|calm|gentle|community/.test(text)) return 'good';
  return 'default';
}

// Turns "2-3 years", "", null into a display value or null.
export const present = (value?: string | number | null) => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text && text !== '~' && text !== '-' && text !== '—' ? text : null;
};
