import { describe, expect, it } from "vitest";
import { assertNoExposedSecrets, findExposedSecrets, isSupabaseSecretKey } from "@/lib/env-guard";

// Fake keys only: shaped like Supabase keys, valid for nothing.
const jwt = (payload: object) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.fake-signature`;

describe("isSupabaseSecretKey", () => {
  it("spots new-style secret keys, quoted or not", () => {
    expect(isSupabaseSecretKey("sb_secret_fakefakefake")).toBe(true);
    expect(isSupabaseSecretKey('"sb_secret_fakefakefake"')).toBe(true);
  });

  it("spots legacy service_role JWTs", () => {
    expect(isSupabaseSecretKey(jwt({ iss: "supabase", role: "service_role" }))).toBe(true);
  });

  it("allows publishable and anon keys, and anything else", () => {
    expect(isSupabaseSecretKey("sb_publishable_fakefakefake")).toBe(false);
    expect(isSupabaseSecretKey(jwt({ iss: "supabase", role: "anon" }))).toBe(false);
    expect(isSupabaseSecretKey("https://example.supabase.co")).toBe(false);
    expect(isSupabaseSecretKey("eyJ.not-json.x")).toBe(false);
  });
});

describe("findExposedSecrets and assertNoExposedSecrets", () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_fakefakefake",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    // Server-only variables may hold secrets.
    SUPABASE_SECRET_KEY: "sb_secret_fakefakefake",
  };

  it("only flags public variables", () => {
    expect(findExposedSecrets(env)).toEqual(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  });

  it("refuses to continue, naming the variable but never the value", () => {
    expect(() => assertNoExposedSecrets(env)).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a Supabase secret key/);
    expect(() => assertNoExposedSecrets(env)).not.toThrow(/fakefakefake/);
    expect(() => assertNoExposedSecrets({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ok" })).not.toThrow();
  });
});
