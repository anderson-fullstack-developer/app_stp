/**
 * Curso de Kriolu (Cabo Verde) em BETA, montado a partir dos rascunhos importados do Wiktionary.
 *
 * Decisão do dono do produto (2026-10-07, ADR-14): o Kriolu fica disponível aos utilizadores
 * antes da revisão por falantes nativos, sempre identificado como "Beta — conteúdo em revisão".
 * Os temas agrupam palavras pelo significado em inglês (organização, não criação de conteúdo).
 */
import {
  buildPreviewQuiz,
  type MeaningLocale,
  type PreviewQuestion,
  type PtSuggestions,
  type SourceEntry,
  shortGloss,
  toCards,
} from "./preview-quiz";

export const KRIOLU_LANGUAGE_ID = "kabuverdianu";
const PLAYABLE = ["substantivo", "verbo", "adjetivo", "advérbio", "numeral"];
export const QUESTIONS_PER_LESSON = 8;

export interface ThemeDef {
  id: string;
  icon: string;
  /** Classes gramaticais aceites no tema. */
  pos?: string[];
  /** Significados (em inglês) que pertencem ao tema. Vazio = todos os da classe. */
  glosses?: string[];
}

export const THEMES: ThemeDef[] = [
  { id: "numbers", icon: "🔢", pos: ["numeral"] },
  {
    id: "time",
    icon: "📅",
    pos: ["substantivo", "advérbio"],
    glosses: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "day",
      "night",
      "week",
      "year",
      "century",
      "afternoon",
      "dawn",
      "today",
      "tomorrow",
      "yesterday",
      "time",
      "Easter",
    ],
  },
  {
    id: "family",
    icon: "👨‍👩‍👧",
    pos: ["substantivo"],
    glosses: [
      "mother",
      "father",
      "brother",
      "sister",
      "sibling",
      "son",
      "son-in-law",
      "daughter-in-law",
      "cousin",
      "uncle",
      "grandson",
      "husband",
      "wife",
      "child",
      "man",
      "woman",
      "friend",
      "neighbour",
      "king",
      "sir",
      "Mrs",
      "youth",
      "heir",
      "marriage",
      "name",
    ],
  },
  {
    id: "body",
    icon: "🖐️",
    pos: ["substantivo"],
    glosses: [
      "arm",
      "back",
      "belly",
      "blood",
      "body",
      "bone",
      "cheek",
      "chest",
      "ear",
      "elbow",
      "eye",
      "eyelash",
      "finger",
      "foot",
      "forehead",
      "hair",
      "hand",
      "head",
      "heart",
      "heel",
      "hip",
      "knee",
      "leg",
      "lip",
      "liver",
      "mouth",
      "nail",
      "nape",
      "neck",
      "nose",
      "shoulder",
      "skin",
      "thigh",
      "thumb",
      "tongue",
      "tooth",
      "waist",
      "wrist",
      "bladder",
      "guts",
      "gland",
      "breath",
    ],
  },
  {
    id: "food",
    icon: "🍲",
    pos: ["substantivo"],
    glosses: [
      "food",
      "rice",
      "salt",
      "sugar",
      "meat",
      "fish",
      "egg",
      "beer",
      "water",
      "lemon",
      "garlic",
      "onion",
      "carrot",
      "avocado",
      "guava",
      "papaya",
      "watermelon",
      "melon",
      "peach",
      "pomegranate",
      "tamarind",
      "almond",
      "cinnamon",
      "basil",
      "rosemary",
      "chocolate",
      "ice cream",
      "lemonade",
      "grog",
      "lunch",
      "stew",
      "sausage",
      "eggplant",
      "beet",
      "cornmeal",
      "seasoning",
      "fruit",
      "yolk",
      "watercress",
      "hunger",
      "thirst",
    ],
  },
  {
    id: "nature",
    icon: "🌴",
    pos: ["substantivo"],
    glosses: [
      "sea",
      "ocean",
      "river",
      "lake",
      "rain",
      "moon",
      "star",
      "sky",
      "cloud",
      "wind",
      "island",
      "mountain",
      "hill",
      "tree",
      "leaf",
      "flower",
      "sand",
      "stone",
      "fire",
      "earth",
      "forest",
      "grass",
      "root",
      "seed",
      "wave",
      "rainbow",
      "fog",
      "snow",
      "dog",
      "cow",
      "horse",
      "pig",
      "sheep",
      "hen",
      "bird",
      "monkey",
      "lion",
      "snake",
      "spider",
      "ant",
      "butterfly",
      "shark",
      "parrot",
      "mouse",
      "mare",
      "quail",
      "louse",
      "worm",
      "grasshopper",
      "ladybird",
      "animal",
    ],
  },
  {
    id: "home",
    icon: "🏠",
    pos: ["substantivo"],
    glosses: [
      "house",
      "bed",
      "chair",
      "table",
      "window",
      "wall",
      "key",
      "bottle",
      "bucket",
      "basket",
      "bag",
      "shoe",
      "shirt",
      "hat",
      "fork",
      "mattress",
      "living room",
      "veranda",
      "terrace",
      "garden",
      "jar",
      "rope",
      "button",
      "pocket",
      "boat",
      "ship",
      "road",
      "path",
      "hospital",
      "airport",
      "bus stop",
      "country",
      "place",
      "corner",
      "square",
    ],
  },
  { id: "describe", icon: "🎨", pos: ["adjetivo"] },
  { id: "verbs", icon: "🏃", pos: ["verbo"] },
];

export interface KrioluLesson {
  id: string;
  themeId: string;
  index: number;
  words: string[];
}

export interface KrioluUnit {
  theme: ThemeDef;
  lessons: KrioluLesson[];
}

/** Monta as unidades e lições (determinístico) para o idioma de quem joga. */
export function buildKrioluCourse(
  entries: SourceEntry[],
  locale: MeaningLocale,
  ptSuggestions: PtSuggestions,
): KrioluUnit[] {
  const cards = toCards(entries, locale, ptSuggestions);
  const englishOf = new Map<string, string>();
  for (const e of entries) {
    const s = e.senses.find((x) => PLAYABLE.includes(x.partOfSpeech));
    if (s) englishOf.set(e.word, shortGloss(s.glossEn));
  }
  const used = new Set<string>();
  const units: KrioluUnit[] = [];
  for (const theme of THEMES) {
    const glossSet = theme.glosses ? new Set(theme.glosses.map((g) => g.toLowerCase())) : null;
    const words = cards
      .filter((c) => !used.has(c.word))
      .filter((c) => !theme.pos || theme.pos.includes(c.pos))
      .filter((c) => !glossSet || glossSet.has((englishOf.get(c.word) ?? "").toLowerCase()))
      .map((c) => c.word);
    if (words.length < 4) continue;
    words.forEach((w) => used.add(w));
    const lessons: KrioluLesson[] = [];
    for (let i = 0; i * QUESTIONS_PER_LESSON < words.length; i++) {
      const slice = words.slice(i * QUESTIONS_PER_LESSON, (i + 1) * QUESTIONS_PER_LESSON);
      if (slice.length < 4 && lessons.length) {
        lessons[lessons.length - 1]!.words.push(...slice); // junta o resto à lição anterior
        break;
      }
      lessons.push({ id: `${theme.id}-${i + 1}`, themeId: theme.id, index: i + 1, words: slice });
    }
    units.push({ theme, lessons });
  }
  return units;
}

/** Perguntas de uma lição: só as palavras da lição; respostas erradas vêm do mesmo tema/classe. */
export function buildKrioluLessonQuiz(
  entries: SourceEntry[],
  lesson: KrioluLesson,
  unitWords: string[],
  locale: MeaningLocale,
  ptSuggestions: PtSuggestions,
  seed: number,
): PreviewQuestion[] {
  const inUnit = new Set(unitWords);
  const pool = entries.filter((e) => inUnit.has(e.word));
  const lessonSet = new Set(lesson.words);
  // Gera um quiz grande sobre o tema e fica só com as perguntas das palavras desta lição.
  return buildPreviewQuiz(pool, pool.length, seed, { locale, ptSuggestions })
    .filter((q) => lessonSet.has(q.mode === "meaning" ? q.target : q.options[q.correctIndex]!))
    .slice(0, QUESTIONS_PER_LESSON);
}
