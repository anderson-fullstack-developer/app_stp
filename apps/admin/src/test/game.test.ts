import { describe, expect, it } from "vitest";
import { APP_CONFIG } from "@stp/config";
import { game, levelInfo } from "@/hooks/use-game";

describe("game rules", () => {
  it("premium prices are €4,99/mês and €39,99/ano", () => {
    expect(APP_CONFIG.pricing.monthly).toBe("4,99");
    expect(APP_CONFIG.pricing.yearly).toBe("39,99");
  });
  it("daily challenge gives +50 XP and +10 coins", () => {
    expect(APP_CONFIG.rewards.dailyXp).toBe(50);
    expect(APP_CONFIG.rewards.dailyCoins).toBe(10);
  });
  it("rewarded ad gives +20 coins", () => {
    expect(APP_CONFIG.rewards.rewardedAdCoins).toBe(20);
  });
  it("2940 XP is level 4", () => {
    expect(levelInfo(2940).level).toBe(4);
  });
  it("cannot buy an item without enough coins", () => {
    game.reset();
    expect(game.buy("expensive", 999999)).toBe(false);
  });
});
