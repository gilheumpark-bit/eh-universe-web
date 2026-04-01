describe("server-ai", () => {
  const origGemini = process.env.GEMINI_API_KEY;
  const origVertex = process.env.USE_VERTEX_AI;

  afterEach(() => {
    if (origGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = origGemini;
    if (origVertex === undefined) delete process.env.USE_VERTEX_AI;
    else process.env.USE_VERTEX_AI = origVertex;
    jest.resetModules();
  });

  it("isServerProviderId accepts only known ids", async () => {
    const { isServerProviderId } = await import("../server-ai");
    expect(isServerProviderId("gemini")).toBe(true);
    expect(isServerProviderId("openai")).toBe(true);
    expect(isServerProviderId("not-a-provider")).toBe(false);
    expect(isServerProviderId("")).toBe(false);
  });

  it("hasServerProviderCredentials('gemini') is true when GEMINI_API_KEY is set", async () => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = "unit-test-key";
    const { hasServerProviderCredentials } = await import("../server-ai");
    expect(hasServerProviderCredentials("gemini")).toBe(true);
  });

  it("getHostedProviderAvailability returns all provider keys", async () => {
    const { getHostedProviderAvailability } = await import("../server-ai");
    const avail = getHostedProviderAvailability();
    expect(avail.gemini).toBeDefined();
    expect(avail.openai).toBeDefined();
    expect(Object.keys(avail).length).toBeGreaterThanOrEqual(7);
  });
});
