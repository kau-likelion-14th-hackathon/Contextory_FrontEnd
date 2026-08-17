import { afterEach, describe, expect, it, vi } from "vitest";

async function loadClient() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  return import("./client");
}

async function loadClientWithoutBaseUrl() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "");
  return import("./client");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("requestJson", () => {
  it("fails fast when the API base URL is missing", async () => {
    const { requestJson } = await loadClientWithoutBaseUrl();

    await expect(requestJson("/missing-config")).rejects.toMatchObject({
      kind: "configuration",
    });
  });

  it("returns undefined for 204 responses", async () => {
    const { requestJson } = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestJson("/empty")).resolves.toBeUndefined();
  });

  it("includes credentials by default and preserves an explicit override", async () => {
    const { requestJson } = await loadClient();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(Response.json({ ok: true })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestJson("/default-credentials");
    await requestJson("/explicit-credentials", { credentials: "omit" });

    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ credentials: "omit" }),
    );
  });

  it("preserves non-json error body text", async () => {
    const { ApiError, requestJson } = await loadClient();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response("upstream unavailable", {
            status: 502,
            headers: { "Content-Type": "text/plain" },
          }),
        ),
      ),
    );

    await expect(requestJson("/fail")).rejects.toMatchObject({
      kind: "server",
      status: 502,
      bodyText: "upstream unavailable",
    });

    await expect(requestJson("/fail")).rejects.toBeInstanceOf(ApiError);
  });

  it("preserves json error body", async () => {
    const { requestJson } = await loadClient();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ message: "login required" }, { status: 401 }),
      ),
    );

    await expect(requestJson("/me")).rejects.toMatchObject({
      kind: "unauthorized",
      bodyJson: { message: "login required" },
    });
  });

  it("passes abort signals to fetch", async () => {
    const { requestJson } = await loadClient();
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await requestJson<{ ok: boolean }>("/ok", { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/ok",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("maps aborted fetches to aborted API errors", async () => {
    const { requestJson } = await loadClient();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
    );

    await expect(requestJson("/abort")).rejects.toMatchObject({
      kind: "aborted",
    });
  });

  it("uses the configured auth header provider", async () => {
    const { requestJson, setAuthHeaderProvider } = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    setAuthHeaderProvider(() => "Bearer test-token");

    await requestJson("/secure");

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Headers },
    ];
    expect(init.headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("reissues once after a 401 and retries with the new access token", async () => {
    const { requestJson, setUnauthorizedHandler } = await loadClient();
    const unauthorizedHandler = vi.fn().mockResolvedValue("fresh-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ message: "expired" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    setUnauthorizedHandler(unauthorizedHandler);

    await expect(requestJson<{ ok: boolean }>("/secure")).resolves.toEqual({ ok: true });

    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit & { headers: Headers };
    expect(secondRequest.headers.get("Authorization")).toBe("Bearer fresh-token");
  });
});
