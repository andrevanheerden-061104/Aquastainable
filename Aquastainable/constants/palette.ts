// Single source of truth for colours. Built from the logo (teal water + orange fish).
// Change a value here and it updates everywhere.
export const Palette = {
  // surfaces
  background: '#101217',
  surface: '#171A21',
  surfaceRaised: '#1E222B',
  surfaceSunken: '#0C0E12',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',

  // text
  text: '#F4F6F8',
  textMuted: '#A3ACBA',
  textFaint: '#6E7684',

  // brand
  primary: '#2E8CA6', // water teal (interaction colour)
  primaryBright: '#4FB3CC',
  primarySoft: 'rgba(46,140,166,0.18)',
  primaryBorder: 'rgba(79,179,204,0.35)',
  accent: '#E0782A', // logo orange (highlights only)
  accentSoft: 'rgba(224,120,42,0.16)',
  mist: '#A8C4CB',

  // states
  success: '#4ADE80',
  successSoft: 'rgba(74,222,128,0.14)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.14)',
  danger: '#F05D5E',
  dangerSoft: 'rgba(240,93,94,0.14)',
  dangerBorder: 'rgba(240,93,94,0.35)',
  dangerText: '#FFB4B4',

  // hold ripple
  rippleWater: 'rgba(79,179,204,0.55)',
  ripplePrimary: 'rgba(120,210,230,0.6)',
  rippleDanger: 'rgba(240,93,94,0.6)',
} as const;

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'attention' | 'unknown';

// Map free-text water quality ("Excellent", "Needs attention"...) to a colour set.
export function qualityTone(value?: string | null): { level: QualityLevel; color: string; soft: string; label: string } {
  const text = (value || '').toLowerCase();
  if (!text || text === '-' || text === '—') return { level: 'unknown', color: Palette.textFaint, soft: 'rgba(255,255,255,0.06)', label: 'No test yet' };
  if (text.includes('excellent')) return { level: 'excellent', color: Palette.success, soft: Palette.successSoft, label: 'Excellent' };
  if (text.includes('good')) return { level: 'good', color: Palette.primaryBright, soft: Palette.primarySoft, label: 'Good' };
  if (text.includes('fair') || text.includes('watch')) return { level: 'fair', color: Palette.warning, soft: Palette.warningSoft, label: 'Fair' };
  return { level: 'attention', color: Palette.danger, soft: Palette.dangerSoft, label: 'Needs attention' };
}

export default Palette;
