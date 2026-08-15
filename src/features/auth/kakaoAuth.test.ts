import { afterEach, describe, expect, it, vi } from "vitest";

function stubWindow(storage: Partial<Storage>) {
  const assign = vi.fn();
  vi.stubGlobal("window", {
    location: { assign },
    sessionStorage: storage,
  });
  return assign;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Kakao persistence", () => {
  it("continues authorization when sessionStorage.setItem fails", async () => {
    vi.stubEnv("VITE_KAKAO_AUTHORIZATION_URL", "https://kauth.test/authorize");
    const assign = stubWindow({
      setItem: vi.fn(() => {
        throw new Error("storage unavailable");
      }),
    });
    const { startKakaoAuthorization } = await import("./kakaoAuth");

    expect(startKakaoAuthorization(true)).toBe(true);
    expect(assign).toHaveBeenCalledWith("https://kauth.test/authorize");
  });

  it.each(["getItem", "removeItem"] as const)(
    "returns false when sessionStorage.%s fails",
    async (method) => {
      const storage = {
        getItem: vi.fn(() => "true"),
        removeItem: vi.fn(),
      };
      storage[method].mockImplementation(() => {
        throw new Error("storage unavailable");
      });
      stubWindow(storage);
      const { consumeKakaoPersistence } = await import("./kakaoAuth");

      expect(consumeKakaoPersistence()).toBe(false);
    },
  );
});
