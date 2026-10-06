/**
 * Media services — abstractions for images and audio. NOT integrated yet.
 *
 * Future providers (documented in ./integrations.ts):
 * - imageService → Cloudinary (avatars, shop items, illustrations)
 * - audioService → Cloudflare R2 (pronunciation audio on Exercise.audioUrl)
 *
 * Screens never build media URLs themselves; they call these services.
 * Today everything is a mock/placeholder: uploads resolve instantly and URLs
 * come from the mocks. Swap the bodies for real provider calls later and keep
 * the signatures — no screen changes needed.
 *
 * Uploads will go through the NestJS backend (signed upload URLs); the frontend
 * never holds Cloudinary/R2 secrets — only public cloud names / CDN base URLs
 * in VITE_* env vars (see .env.example).
 */

const delay = <T,>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(value), ms));

export interface MediaAsset {
  /** Public URL the UI can render/play directly. */
  url: string;
  /** Provider-side identifier (Cloudinary public_id / R2 object key) — mock value today. */
  key: string;
}

export interface UploadResult extends MediaAsset {
  bytes: number;
}

/** Placeholder audio URL used everywhere until real recordings exist. */
export const AUDIO_PLACEHOLDER_URL = "/audio/exemplo.mp3"; // "Áudio de exemplo"

export const imageService = {
  /**
   * Future: request a signed Cloudinary upload from POST /api/v1/admin/media/images,
   * upload the file, return { url, key }.
   */
  upload: (file: File): Promise<UploadResult> =>
    delay({ url: `/mock-images/${file.name}`, key: `mock/${file.name}`, bytes: file.size }),
  /** Future: Cloudinary delivery URL with transformations (size/format). */
  getUrl: (key: string, _opts?: { width?: number; height?: number }): string => `/mock-images/${key}`,
  /** Future: destroy the asset via the backend. */
  remove: (_key: string) => delay(true),
};

export const audioService = {
  /**
   * Future: request a signed R2 upload from POST /api/v1/admin/media/audio,
   * upload the recording, return { url, key }.
   */
  upload: (file: File): Promise<UploadResult> =>
    delay({ url: AUDIO_PLACEHOLDER_URL, key: `mock/${file.name}`, bytes: file.size }),
  /** Future: R2 CDN URL (VITE_AUDIO_CDN_URL + key). Today: the labelled placeholder. */
  getUrl: (_key: string): string => AUDIO_PLACEHOLDER_URL,
  /** Future: delete the object via the backend. */
  remove: (_key: string) => delay(true),
};
