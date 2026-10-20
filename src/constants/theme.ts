import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  paper: '#FFF9EF',
  paperAlt: '#FFFCF6',
  ink: '#252525',
  muted: '#746F68',
  line: '#D9D0C2',
  yellow: '#FFE79A',
  lavender: '#D9CCFF',
  sage: '#CDE6BF',
  blue: '#C8DDF7',
  coral: '#FFCDBF',
  white: '#FFFFFF',
  error: '#A9473B',
  success: '#44734A',
};

export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.paper,
    backgroundElement: Palette.paperAlt,
    backgroundSelected: Palette.yellow,
    textSecondary: Palette.muted,
  },
  dark: {
    text: '#F7F0E5',
    background: '#262521',
    backgroundElement: '#34322D',
    backgroundSelected: '#5A5037',
    textSecondary: '#C7BFB2',
  },
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace', handwritten: 'Caveat' },
  android: { sans: 'sans-serif', serif: 'serif', rounded: 'sans-serif-rounded', mono: 'monospace', handwritten: 'Caveat' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace', handwritten: 'Caveat' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)', handwritten: 'Caveat' },
});

export const Journal = {
  borderWidth: 1.5,
  borderRadius: 16,
  doodle: '#8A70C8',
  secondaryInk: '#55504A',
  link: '#6B59A6',
  correct: '#44734A',
  incorrect: '#A9473B',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
