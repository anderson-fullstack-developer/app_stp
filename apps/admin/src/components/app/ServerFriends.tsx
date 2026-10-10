import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { PublicUserDto, RelationshipDto } from "@stp/types/api";
import { Check, Flame, Search, UserMinus, UserPlus, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
  Tabs,
} from "@/components/app/Primitives";
import { AppHeader, TabLayout } from "@/layouts/AppShell";
import { avatarColor } from "@/lib/avatar";
import { socialApi, socialKeys } from "@/services/social-api.service";

type Tab = "friends" | "requests" | "search";

/** Pequeno atraso para não pesquisar a cada tecla. */
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Amigos com dados do servidor: lista, pedidos e pesquisa de pessoas. */
export function ServerFriends() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("friends");
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const searching = query.replace(/^@/, "").length >= 2;

  const friends = useQuery({ queryKey: socialKeys.friends, queryFn: socialApi.friends });
  const results = useQuery({
    queryKey: socialKeys.search(query),
    queryFn: () => socialApi.search(query),
    enabled: tab === "search" && searching,
  });

  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["social"] }),
  });
  const run = (fn: () => Promise<unknown>) => act.mutate(fn);

  const data = friends.data;
  const relationshipButton = (u: PublicUserDto, rel: RelationshipDto) => {
    const incoming = data?.incoming.find((r) => r.user.id === u.id);
    if (rel === "friends")
      return <Pill icon={<Check className="size-4" />}>{t("social.friends")}</Pill>;
    if (rel === "pending_out") return <Pill>{t("social.pending")}</Pill>;
    if (rel === "pending_in" && incoming) {
      return (
        <AppButton size="sm" onClick={() => run(() => socialApi.accept(incoming.requestId))}>
          {t("social.accept")}
        </AppButton>
      );
    }
    return (
      <AppButton size="sm" onClick={() => run(() => socialApi.request(u.id))}>
        <UserPlus className="size-4" />
        {t("social.add")}
      </AppButton>
    );
  };

  return (
    <TabLayout header={<AppHeader title={t("nav.friends")} />}>
      <label className="flex h-12 items-center gap-2 rounded-2xl card px-4 focus-within:border-primary">
        <Search className="size-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim()) setTab("search");
          }}
          placeholder={t("social.searchPlaceholder")}
          className="flex-1 bg-transparent font-semibold outline-none"
          aria-label={t("social.searchPlaceholder")}
        />
      </label>
      <div className="mt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            {
              value: "friends",
              label: t("social.tabFriends", { count: data?.friends.length ?? 0 }),
            },
            {
              value: "requests",
              label: t("social.tabRequests", { count: data?.incoming.length ?? 0 }),
            },
            { value: "search", label: t("social.tabSearch") },
          ]}
        />
      </div>
      {act.isError && (
        <p role="alert" className="mt-3 text-center text-sm font-semibold text-destructive">
          {t("social.error")}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {friends.isPending ? (
          <LoadingState />
        ) : !data ? (
          <ErrorState onRetry={() => void friends.refetch()} />
        ) : tab === "friends" ? (
          data.friends.length === 0 ? (
            <EmptyState title={t("neto.noFriendsTitle")} text={t("neto.noFriendsText")} />
          ) : (
            data.friends.map((f) => (
              <PersonCard
                key={f.id}
                user={f}
                detail={t("social.weeklyXp", { level: f.level, xp: f.weeklyXp })}
              >
                <AppButton
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm(t("social.removeConfirm", { name: f.name }))) {
                      run(() => socialApi.remove(f.id));
                    }
                  }}
                >
                  <UserMinus className="size-4" />
                  {t("social.remove")}
                </AppButton>
                <AppButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(t("social.blockConfirm", { name: f.name }))) {
                      run(() => socialApi.block(f.id));
                    }
                  }}
                >
                  {t("social.block")}
                </AppButton>
              </PersonCard>
            ))
          )
        ) : tab === "requests" ? (
          <>
            {data.incoming.length === 0 ? (
              <EmptyState title={t("social.noRequests")} />
            ) : (
              data.incoming.map((r) => (
                <PersonCard
                  key={r.requestId}
                  user={r.user}
                  detail={t("social.levelOnly", { level: r.user.level })}
                >
                  <AppButton size="sm" onClick={() => run(() => socialApi.accept(r.requestId))}>
                    <Check className="size-4" />
                    {t("social.accept")}
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="secondary"
                    onClick={() => run(() => socialApi.decline(r.requestId))}
                  >
                    <X className="size-4" />
                    {t("social.decline")}
                  </AppButton>
                </PersonCard>
              ))
            )}
            {data.outgoing.length > 0 && (
              <>
                <SectionTitle>{t("social.sentTitle")}</SectionTitle>
                {data.outgoing.map((r) => (
                  <PersonCard
                    key={r.requestId}
                    user={r.user}
                    detail={t("social.levelOnly", { level: r.user.level })}
                  >
                    <AppButton
                      size="sm"
                      variant="secondary"
                      onClick={() => run(() => socialApi.decline(r.requestId))}
                    >
                      {t("social.cancel")}
                    </AppButton>
                  </PersonCard>
                ))}
              </>
            )}
          </>
        ) : !searching ? (
          <EmptyState title={t("social.searchHint")} />
        ) : results.isPending ? (
          <LoadingState />
        ) : !results.data ? (
          <ErrorState onRetry={() => void results.refetch()} />
        ) : results.data.length === 0 ? (
          <EmptyState title={t("social.noResults")} />
        ) : (
          results.data.map((u) => (
            <PersonCard
              key={u.id}
              user={u}
              detail={t("social.levelOnly", { level: u.level })}
              inline={relationshipButton(u, u.relationship)}
            />
          ))
        )}
      </div>
    </TabLayout>
  );
}

function Pill({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex h-9 items-center gap-1 rounded-xl bg-muted px-3 text-[13px] font-semibold text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function PersonCard({
  user,
  detail,
  inline,
  children,
}: {
  user: PublicUserDto;
  detail: string;
  inline?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="card animate-rise rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <Link
          to="/user/$userId"
          params={{ userId: user.id }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <Avatar name={user.name} color={avatarColor(user.avatarColor)} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-bold">{user.name}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">@{user.username}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
        </Link>
        {inline ?? (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-destructive">
            <Flame className="size-4 fill-current" />
            {user.streak}
          </span>
        )}
      </div>
      {children && <div className="mt-3 grid grid-cols-2 gap-2">{children}</div>}
    </div>
  );
}
