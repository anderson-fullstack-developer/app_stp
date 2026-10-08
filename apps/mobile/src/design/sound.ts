/**
 * Efeitos sonoros da interface (os mesmos da web, gerados por scripts/render-sounds.ts a
 * partir de @stp/config/sounds). Cada som é carregado uma vez e reutilizado.
 * Não é o áudio linguístico (pronúncias), que vem do conteúdo.
 */
import { type AudioPlayer, createAudioPlayer } from "expo-audio";

const SOURCES = {
  tap: require("../../assets/sounds/tap.wav"),
  select: require("../../assets/sounds/select.wav"),
  correct: require("../../assets/sounds/correct.wav"),
  wrong: require("../../assets/sounds/wrong.wav"),
  complete: require("../../assets/sounds/complete.wav"),
  levelUp: require("../../assets/sounds/levelUp.wav"),
  streak: require("../../assets/sounds/streak.wav"),
  coins: require("../../assets/sounds/coins.wav"),
} as const;
export type UiSound = keyof typeof SOURCES;

const players = new Map<UiSound, AudioPlayer>();
let enabled = true;

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
};
export const isSoundEnabled = () => enabled;

export const sound = {
  play(name: UiSound) {
    if (!enabled) return;
    try {
      let player = players.get(name);
      if (!player) {
        player = createAudioPlayer(SOURCES[name]);
        player.volume = 0.7;
        players.set(name, player);
      }
      void player.seekTo(0);
      player.play();
    } catch {
      // Sem áudio disponível (ex.: pré-visualização): segue em silêncio.
    }
  },
};
