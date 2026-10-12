import { MULTIPLAYER_CONFIG } from "@stp/config";
import type { ArenaConfigDto, ArenaRoomDto } from "@stp/types/arena";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Crown, LogOut, Plus, Share2, UserPlus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useFriends } from "@/api/queries";
import {
  AppButton,
  AppText,
  Avatar,
  Card,
  colors,
  GradientCard,
  haptics,
  LoadingState,
  radius,
  shadows,
  sound,
  space,
} from "@/design";
import { arena, arenaError, useArena } from "@/features/arena/arena";
import { InviteBanner } from "@/features/arena/ui";

type Mode = "survival" | "teams";

function Picker<T extends string | number>({
  label,
  value,
  options,
  onChange,
  format,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="overline" tone="muted">
        {label}
      </AppText>
      <View style={styles.pickerRow}>
        {options.map((o) => (
          <Pressable
            key={String(o)}
            accessibilityRole="button"
            accessibilityState={{ selected: o === value }}
            onPress={() => {
              haptics.select();
              onChange(o);
            }}
            style={[styles.pickerItem, o === value && styles.pickerActive]}
          >
            <AppText variant="bodyStrong" tone={o === value ? "primary" : "default"}>
              {format ? format(o) : String(o)}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Sala privada (igual à web): criar, entrar pelo convite, sala de espera e equipas. */
export default function ArenaRoom() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string; mode?: string }>();
  const s = useArena();
  const [step, setStep] = useState<"choose" | "setup">(
    params.mode === "teams" ? "setup" : "choose",
  );
  const [mode, setMode] = useState<Mode>(params.mode === "teams" ? "teams" : "survival");
  const [config, setConfig] = useState<ArenaConfigDto>({
    ...MULTIPLAYER_CONFIG.publicSurvival,
    players: 4,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedCode = useRef<string | null>(null);

  // Duelos têm ecrã próprio; nos outros modos, quando a partida começa, vai para o jogo.
  useEffect(() => {
    if (s.room?.mode === "duel") router.replace("/duel");
    else if (s.match && s.match.phase !== "finished") {
      router.replace(s.room?.mode === "teams" ? "/points-match" : "/arena-match");
    }
  }, [s.room?.mode, s.match]);

  // Veio de um convite (?code=…): entra sozinho, uma vez.
  useEffect(() => {
    const code = params.code;
    if (!code || s.status !== "ready" || s.room?.code === code || triedCode.current === code)
      return;
    triedCode.current = code;
    void arena.join(code).then((r) => {
      if (!r.ok) setError(arenaError(r));
    });
  }, [params.code, s.status, s.room?.code]);

  const create = async () => {
    setBusy(true);
    setError(null);
    const r = await arena.create(config, mode);
    if (!r.ok) setError(arenaError(r));
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText variant="h3">{t("arena.privateRoom")}</AppText>
        <View style={{ width: 24 }} />
      </View>
      {s.status !== "ready" && s.status !== "idle" && (
        <AppText variant="small" tone="muted" center style={{ marginBottom: space.sm }}>
          {s.status === "connecting" ? t("arena.connecting") : t("arena.offline")}
        </AppText>
      )}
      {s.invite && s.invite.code !== s.room?.code && (
        <View style={{ paddingHorizontal: space.lg, marginBottom: space.sm }}>
          <InviteBanner
            name={s.invite.from.name}
            duel={s.invite.mode === "duel"}
            onJoin={() => {
              const c = s.invite!.code;
              arena.dismissInvite();
              void arena.join(c).then((r) => {
                if (!r.ok) setError(arenaError(r));
              });
            }}
            onDismiss={arena.dismissInvite}
          />
        </View>
      )}
      {s.room ? (
        <Lobby room={s.room} me={s.me} />
      ) : step === "choose" ? (
        <ScrollView contentContainerStyle={styles.content}>
          {error && (
            <AppText variant="bodyStrong" tone="danger" center>
              {error}
            </AppText>
          )}
          <Pressable accessibilityRole="button" onPress={() => setStep("setup")}>
            <GradientCard gradient="ocean" style={styles.bigCard}>
              <Plus size={34} color="#ffffff" />
              <AppText variant="h2" tone="inverse">
                {t("arena.createRoom")}
              </AppText>
              <AppText variant="small" tone="inverse" style={{ opacity: 0.85 }}>
                {t("arena.createRoomText")}
              </AppText>
            </GradientCard>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push("/arena-join")}>
            <GradientCard gradient="cocoa" style={styles.bigCard}>
              <AppText variant="h2" tone="inverse">
                {t("arena.joinWithCode")}
              </AppText>
              <AppText variant="small" tone="inverse" style={{ opacity: 0.85 }}>
                {t("arena.joinWithCodeText")}
              </AppText>
            </GradientCard>
          </Pressable>
          {s.closed && (
            <AppText variant="small" tone="muted" center>
              {t("arena.roomClosed")}
            </AppText>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Picker
            label={t("arena.mode")}
            value={mode}
            options={["survival", "teams"] as const}
            onChange={setMode}
            format={(v) => (v === "survival" ? t("arena.survival") : t("arena.teams"))}
          />
          <Card>
            <AppText variant="small">
              {mode === "survival"
                ? t("arena.survivalRules")
                : t("arena.teamsRules", { count: MULTIPLAYER_CONFIG.teams.questions })}
            </AppText>
          </Card>
          {mode === "survival" && (
            <>
              <Picker
                label={t("arena.maxPlayers")}
                value={config.players}
                options={MULTIPLAYER_CONFIG.playerOptions}
                onChange={(players) => setConfig({ ...config, players })}
              />
              <Picker
                label={t("arena.lives")}
                value={config.lives}
                options={MULTIPLAYER_CONFIG.livesOptions}
                onChange={(lives) => setConfig({ ...config, lives })}
                format={(v) => `${v} ❤️`}
              />
              <Picker
                label={t("arena.secondsPerQuestion")}
                value={config.seconds}
                options={MULTIPLAYER_CONFIG.timeOptions}
                onChange={(seconds) => setConfig({ ...config, seconds })}
                format={(v) => `${v}s`}
              />
            </>
          )}
          {error && (
            <AppText variant="bodyStrong" tone="danger" center>
              {error}
            </AppText>
          )}
          <AppButton onPress={() => void create()} loading={busy} disabled={s.status !== "ready"}>
            {t("arena.createRoom")}
          </AppButton>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Lobby({ room, me }: { room: ArenaRoomDto; me: string | null }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const teams = room.mode === "teams";
  const isHost = room.hostId === me;
  const mine = room.members.find((m) => m.userId === me);
  const connected = room.members.filter((m) => m.connected);
  const ready = connected.filter((m) => m.ready).length;
  const inTeam = (t: "A" | "B") => room.members.filter((m) => m.team === t);
  const teamsReady = !teams || (inTeam("A").length === 2 && inTeam("B").length === 2);
  const canStart = isHost && connected.length >= 2 && ready === connected.length && teamsReady;
  const prevCount = useRef(room.members.length);
  useEffect(() => {
    if (room.members.length > prevCount.current) {
      sound.play("join");
      haptics.tap();
    }
    prevCount.current = room.members.length;
  }, [room.members.length]);

  const run = async (fn: () => Promise<{ ok: boolean; code?: string; message?: string }>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(arenaError(r as { code: string; message: string }));
    setBusy(false);
  };

  const share = () =>
    void Share.share({ message: t("arena.shareMessage", { code: room.code }) }).catch(() => {});

  const Member = ({ m }: { m: ArenaRoomDto["members"][number] }) => (
    <View style={styles.member}>
      <Avatar name={m.name} color={m.avatarColor} size={40} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {m.name}
          {m.userId === me ? ` (${t("arena.you")})` : ""}
          {m.connected ? "" : ` · ${t("arena.disconnected")}`}
        </AppText>
        {m.isHost && (
          <View style={styles.hostTag}>
            <Crown size={12} color={colors.accentDeep} />
            <AppText variant="caption" tone="accent">
              {t("arena.host")}
            </AppText>
          </View>
        )}
      </View>
      <View style={[styles.readyPill, m.ready && { backgroundColor: colors.successSoft }]}>
        <AppText variant="caption" tone={m.ready ? "success" : "muted"}>
          {m.ready ? t("arena.ready") : t("arena.preparing")}
        </AppText>
      </View>
    </View>
  );

  return (
    <>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 200 }]}>
        <Card style={styles.codeCard}>
          <AppText variant="overline" tone="muted">
            {t("arena.roomCode")}
          </AppText>
          <AppText variant="display" style={{ letterSpacing: 6 }}>
            {room.code}
          </AppText>
          <View style={styles.codeActions}>
            <AppButton
              size="md"
              variant="secondary"
              icon={<Share2 size={16} color={colors.foreground} />}
              onPress={share}
            >
              {t("arena.share")}
            </AppButton>
          </View>
        </Card>
        <AppText variant="small" tone="muted" center>
          {teams
            ? t("arena.summaryTeams", { seconds: room.config.seconds })
            : t("arena.summarySurvival", {
                players: room.config.players,
                lives: room.config.lives,
                seconds: room.config.seconds,
              })}
        </AppText>

        {teams ? (
          <View style={{ gap: space.md }}>
            {(["A", "B"] as const).map((team) => (
              <Card
                key={team}
                style={{
                  gap: space.sm,
                  borderColor: team === "A" ? colors.primary : colors.destructive,
                }}
              >
                <AppText variant="h3">{t("arena.team", { team })}</AppText>
                {inTeam(team).map((m) => (
                  <Member key={m.userId} m={m} />
                ))}
                {inTeam(team).length < 2 && (
                  <AppText variant="small" tone="muted">
                    {t("arena.freeSpot")}
                  </AppText>
                )}
                {mine?.team && mine.team !== team && inTeam(team).length < 2 && (
                  <AppButton
                    size="md"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void run(() => arena.setTeam(team))}
                  >
                    {t("arena.switchTeam", { team })}
                  </AppButton>
                )}
              </Card>
            ))}
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            <AppText variant="h3">
              {t("arena.playersReady", { ready, total: connected.length })}
            </AppText>
            {room.members.map((m) => (
              <Card key={m.userId}>
                <Member m={m} />
              </Card>
            ))}
          </View>
        )}
        {room.members.length < room.config.players && (
          <AppButton
            variant="secondary"
            size="md"
            icon={<UserPlus size={16} color={colors.foreground} />}
            onPress={() => setInviteOpen(true)}
          >
            {t("arena.inviteFriends")}
          </AppButton>
        )}
        <AppText variant="caption" tone="muted" center>
          {teams ? t("arena.needTwoPerTeam") : t("arena.rewardsNote")}
        </AppText>
      </ScrollView>
      <View style={[styles.footer, shadows.float]}>
        {error && (
          <AppText variant="small" tone="danger" center>
            {error}
          </AppText>
        )}
        {isHost ? (
          <AppButton onPress={() => void run(arena.start)} disabled={!canStart} loading={busy}>
            {canStart
              ? t("arena.startMatch")
              : connected.length < 2
                ? t("arena.waitingPlayers")
                : !teamsReady
                  ? t("arena.needTwoPerTeam")
                  : t("arena.waitingReady")}
          </AppButton>
        ) : (
          <AppButton
            variant={mine?.ready ? "secondary" : "primary"}
            loading={busy}
            onPress={() => void run(() => arena.ready(!mine?.ready))}
          >
            {mine?.ready ? t("arena.notReady") : t("arena.imReady")}
          </AppButton>
        )}
        <AppButton
          variant="ghost"
          size="md"
          icon={<LogOut size={16} color={colors.primary} />}
          onPress={() => void arena.leave()}
        >
          {t("arena.leaveRoom")}
        </AppButton>
      </View>
      <InviteFriends
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        exclude={room.members.map((m) => m.userId)}
      />
    </>
  );
}

/** Amigos para convidar (o servidor confirma que são mesmo amigos). */
function InviteFriends({
  open,
  onClose,
  exclude,
}: {
  open: boolean;
  onClose: () => void;
  exclude: string[];
}) {
  const { t } = useTranslation();
  const friends = useFriends();
  const [sent, setSent] = useState<Record<string, string>>({});
  const list = (friends.data?.friends ?? []).filter((f) => !exclude.includes(f.id));
  return (
    <Modal transparent animationType="slide" visible={open} onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, shadows.float]}>
        <AppText variant="h2">{t("arena.inviteFriends")}</AppText>
        {friends.isPending ? (
          <LoadingState rows={2} />
        ) : list.length === 0 ? (
          <AppText variant="small" tone="muted">
            {t("arena.noFriendsToInvite")}
          </AppText>
        ) : (
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: space.sm }}>
            {list.map((f) => {
              const state = sent[f.id];
              return (
                <View key={f.id} style={styles.member}>
                  <Avatar name={f.name} color={f.avatarColor} size={40} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {f.name}
                    </AppText>
                    {state && state !== "sent" && (
                      <AppText variant="caption" tone="danger">
                        {state}
                      </AppText>
                    )}
                  </View>
                  <AppButton
                    size="md"
                    variant={state === "sent" ? "secondary" : "primary"}
                    disabled={state === "sent"}
                    onPress={async () => {
                      const r = await arena.invite(f.id);
                      if (r.ok) haptics.success();
                      setSent((s) => ({ ...s, [f.id]: r.ok ? "sent" : arenaError(r) }));
                    }}
                  >
                    {state === "sent" ? t("arena.invited") : t("arena.invite")}
                  </AppButton>
                </View>
              );
            })}
          </ScrollView>
        )}
        <AppButton variant="secondary" onPress={onClose}>
          {t("arena.close")}
        </AppButton>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  content: { padding: space.lg, gap: space.md },
  bigCard: { borderRadius: radius.xl, gap: space.xs, minHeight: 130 },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pickerItem: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  codeCard: { alignItems: "center", gap: space.xs },
  codeActions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  member: { flexDirection: "row", alignItems: "center", gap: space.md },
  hostTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  readyPill: {
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    backgroundColor: colors.muted,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.sm,
    padding: space.lg,
    paddingBottom: space.xxl,
    backgroundColor: colors.background,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(16,31,19,0.45)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: space.xl,
    gap: space.md,
  },
});
