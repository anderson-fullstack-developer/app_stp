/**
 * Tipos usados pela app web/admin: domínio partilhado (@stp/types) + tipos do painel admin.
 * Os tipos de domínio vivem em packages/types — não os redefinir aqui.
 */
export * from "@stp/types";
export type {
  AdminUser,
  AdminRole,
  AdminSession,
  ContentStatus,
  VocabItem as VocabularyItem,
  PhraseItem as Phrase,
  AudioFile as AudioAsset,
  ReviewEntry as ContentReview,
} from "@/admin/types";
