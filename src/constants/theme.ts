import '@/global.css';
import { Platform } from 'react-native';

export const Palette = {
  background: '#FFF9F0',
  surface: '#FFFFFF',
  primary: '#7657D6',
  primarySoft: '#EEE8FF',
  primaryBorder: '#DDD2FA',
  yellow: '#FFE69A',
  green: '#DDF0D4',
  peach: '#FFDCD2',
  albumLavender: '#E7DEFF',
  albumBlue: '#DCEBFF',
  albumMint: '#DDF2E5',
  albumPeach: '#FFE3D7',
  albumYellow: '#FFF0C2',
  ink: '#24232B',
  secondary: '#77747D',
  muted: '#A19CA5',
  border: '#EAE5DF',
  progressTrack: '#EEEAF1',
  success: '#43815B',
  error: '#C64D4D',
  white: '#FFFFFF',
  mainGreen: '#7657D6',
  lightGreen: '#EEE8FF',
  // Legacy semantic aliases retained for screens that share older styling.
  charcoalBlack: '#24232B', royalBlue: '#7657D6', limeGreen: '#FFE69A',
  bubblegumPink: '#FFDCD2', periwinkle: '#EEE8FF', paper: '#FFF9F0',
  paperAlt: '#FFFFFF', mutedText: '#A19CA5', line: '#EAE5DF',
  lavender: '#EEE8FF', sage: '#DDF0D4', blue: '#7657D6', coral: '#FFDCD2',
  berryPink: '#7657D6', aquaTeal: '#77747D', softWhite: '#FFFFFF',
} as const;

export const FlashcardPastels = [
  Palette.primarySoft,
  Palette.yellow,
  Palette.green,
  Palette.peach,
  Palette.albumBlue,
] as const;

export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.primarySoft,
    textSecondary: Palette.secondary,
  },
  dark: {
    text: '#FFFFFF',
    background: '#24232B',
    backgroundElement: '#302D38',
    backgroundSelected: '#51427C',
    textSecondary: '#D4CEDC',
  },
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace', handwritten: 'system-ui' },
  android: { sans: 'sans-serif', serif: 'serif', rounded: 'sans-serif-rounded', mono: 'monospace', handwritten: 'sans-serif' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace', handwritten: 'normal' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)', handwritten: 'var(--font-display)' },
});

export const Journal = {
  borderWidth: 1,
  borderRadius: 20,
  doodle: Palette.primary,
  secondaryInk: Palette.secondary,
  link: Palette.primary,
  correct: Palette.green,
  incorrect: Palette.peach,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
