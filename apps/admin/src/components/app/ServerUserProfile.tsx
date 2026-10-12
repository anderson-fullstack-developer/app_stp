import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Check,
  Flame,
  Medal,
  Star,
  Swords,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/app/Badges";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { ErrorState, LoadingState, StatCard } from "@/components/app/Primitives";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { avatarColor } from "@/lib/avatar";
import { socialApi, socialKeys } from "@/services/social-api.service";

/** Perfil público de outra pessoa, com dados do servidor e o botão de amizade certo. */
export function ServerUserProfile({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: socialKeys.profile(userId),
    queryFn: () => socialApi.profile(userId),
    retry: false,
  });
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["social"] }),
  });
  const u = profile.data;
  const countries = t("countries", { returnObjects: true }) as Record<string, string>;

  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title={u ? `@${u.username}` : t("social.profileTitle")} />
      <main className="flex-1 px-4 pb-8">
        {profile.isPending ? (
          <LoadingState />
        ) : !u ? (
          <ErrorState text={t("social.notFound")} />
        ) : (
          <>
            <div className="animate-rise flex flex-col items-center text-center">
              <Avatar name={u.name} color={avatarColor(u.avatarColor)} size={104} />
              <h1 className="mt-3 font-display text-2xl font-bold">{u.name}</h1>
              <p className="text-sm text-muted-foreground">
                {u.countryCode ? `${countries[u.countryCode] ?? u.countryCode} · ` : ""}
                {t("social.memberSince", {
                  date: new Date(u.memberSince).toLocaleDateString(i18n.language, {
                    month: "long",
                    year: "numeric",
                  }),
                })}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <StatCard
                icon={<Star className="size-4" />}
                label={t("social.statLevel")}
                value={u.level}
              />
              <StatCard
                icon={<Zap className="size-4" />}
                label={t("social.statWeekly")}
                value={u.weeklyXp}
              />
              <StatCard
                icon={<Award className="size-4" />}
                label={t("social.statTotal")}
                value={u.xpTotal}
              />
              <StatCard
                icon={<Flame className="size-4" />}
                label={t("social.statStreak")}
                value={u.streak}
              />
              <StatCard
                icon={<Medal className="size-4" />}
                label={t("social.statBestStreak")}
                value={u.longestStreak}
              />
              <StatCard
                icon={<BookOpen className="size-4" />}
                label={t("social.statLessons")}
                value={u.lessonsCompleted}
              />
              <StatCard
                icon={<Trophy className="size-4" />}
                label={t("social.statAchievements")}
                value={u.achievements}
                className="col-span-2"
              />
            </div>
            <div className="mt-6">
              {u.isMe ? (
                <p className="text-center text-sm text-muted-foreground">{t("social.thisIsYou")}</p>
              ) : u.relationship === "friends" ? (
                <Link to="/play/duel" search={{ friend: u.id }} className="block">
                  <AppButton>
                    <Swords className="size-5" />
                    {t("social.challenge")}
                  </AppButton>
                </Link>
              ) : u.relationship === "pending_out" && u.requestId ? (
                <AppButton
                  variant="secondary"
                  loading={act.isPending}
                  onClick={() => act.mutate(() => socialApi.decline(u.requestId!))}
                >
                  {t("social.cancel")}
                </AppButton>
              ) : u.relationship === "pending_in" && u.requestId ? (
                <AppButton
                  loading={act.isPending}
                  onClick={() => act.mutate(() => socialApi.accept(u.requestId!))}
                >
                  <Check className="size-5" />
                  {t("social.accept")}
                </AppButton>
              ) : (
                <AppButton
                  loading={act.isPending}
                  onClick={() => act.mutate(() => socialApi.request(u.id))}
                >
                  <UserPlus className="size-5" />
                  {t("social.add")}
                </AppButton>
              )}
              {act.isError && (
                <p role="alert" className="mt-2 text-center text-sm font-semibold text-destructive">
                  {t("social.error")}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </PhoneFrame>
  );
}
