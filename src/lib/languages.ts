export type Language = {
  code: string;
  name: string;
};

// Bahasa yang bisa dipelajari
export const TARGET_LANGUAGES: Language[] = [
  { code: 'en', name: 'Inggris' },
  { code: 'ja', name: 'Jepang' },
  { code: 'ko', name: 'Korea' },
  { code: 'zh', name: 'Mandarin' },
  { code: 'es', name: 'Spanyol' },
  { code: 'fr', name: 'Prancis' },
  { code: 'de', name: 'Jerman' },
  { code: 'ar', name: 'Arab' },
];

// Bahasa yang dipakai untuk menjelaskan arti kata
export const EXPLANATION_LANGUAGES: Language[] = [
  { code: 'id', name: 'Indonesia' },
  { code: 'en', name: 'Inggris' },
];

export const LEVELS = [
  { code: 'beginner', name: 'Pemula' },
  { code: 'intermediate', name: 'Menengah' },
  { code: 'advanced', name: 'Mahir' },
];

export function getLanguageName(code: string): string {
  const all = [...TARGET_LANGUAGES, ...EXPLANATION_LANGUAGES];
  const found = all.find((item) => item.code === code);
  return found ? found.name : code;
}

export function getLevelName(code: string): string {
  const found = LEVELS.find((item) => item.code === code);
  return found ? found.name : code;
}
