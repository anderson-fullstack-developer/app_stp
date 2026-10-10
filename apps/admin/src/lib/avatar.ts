import type { AvatarColor } from "@stp/types";

const AVATAR_COLORS: AvatarColor[] = ["forest", "sun", "ocean", "cocoa", "coral"];

/** Cor do avatar vinda do servidor (texto livre) → cor conhecida do design. */
export const avatarColor = (c: string | null): AvatarColor =>
  AVATAR_COLORS.includes(c as AvatarColor) ? (c as AvatarColor) : "ocean";
