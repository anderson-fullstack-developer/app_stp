// Identidade visual provisória inspirada em São Tomé e Príncipe:
// verde da floresta, amarelo do sol, vermelho/coral, azul do oceano e castanho do cacau.
export const colors = {
  bg: '#FFF8EE',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF1E1',
  border: '#EADFCC',
  ink: '#1B2B24',
  muted: '#6B7A72',

  primary: '#0E7C5A',
  primaryDark: '#095C43',
  primarySoft: '#D7F0E5',

  sun: '#FFC23C',
  sunDark: '#D99A0B',
  sunSoft: '#FFF1CC',

  coral: '#EF4B3F',
  coralDark: '#C1352B',
  coralSoft: '#FDE1DE',

  ocean: '#1C8FB0',
  oceanSoft: '#D6EEF5',

  cocoa: '#7A4A2B',
  locked: '#C9C2B6',

  // Arena (modo competitivo, tema escuro)
  arenaBg: '#0F1A16',
  arenaSurface: '#18261F',
  arenaBorder: '#26382F',
  arenaInk: '#F4EFE6',
  arenaMuted: '#8FA39A',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 14,
  tiny: 12,
} as const;
