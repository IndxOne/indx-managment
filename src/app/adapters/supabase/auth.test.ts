import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Caractérisation/spécification du wrapper Auth OTP (Lot 1A). Mock complet
 * du client Supabase (getSupabaseClient) — aucun appel réseau réel, aucun
 * compte créé, aucune session réelle. Vérifie le contrat de chaque
 * fonction exportée, en particulier shouldCreateUser:false (obligatoire)
 * et la séparation authUserId/userHash (ce module ne touche jamais
 * user_hash).
 */

const signInWithOtpMock = vi.fn();
const verifyOtpMock = vi.fn();
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const signOutMock = vi.fn();
const unsubscribeMock = vi.fn();

const mockAuthClient = {
  auth: {
    signInWithOtp: signInWithOtpMock,
    verifyOtp: verifyOtpMock,
    getSession: getSessionMock,
    onAuthStateChange: onAuthStateChangeMock,
    signOut: signOutMock,
  },
};

vi.mock("./client", () => ({
  getSupabaseClient: () => mockAuthClient,
}));

beforeEach(() => {
  signInWithOtpMock.mockReset();
  verifyOtpMock.mockReset();
  getSessionMock.mockReset();
  onAuthStateChangeMock.mockReset();
  signOutMock.mockReset();
  unsubscribeMock.mockReset();
  onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: unsubscribeMock } } });
});

afterEach(() => {
  vi.resetModules();
});

describe("sendOtp", () => {
  it("appelle signInWithOtp avec shouldCreateUser:false (aucune inscription libre)", async () => {
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });
    const { sendOtp } = await import("./auth");

    const result = await sendOtp("agent@exemple.com");

    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "agent@exemple.com",
      options: { shouldCreateUser: false },
    });
    expect(result.error).toBeNull();
  });

  it("retourne le message d'erreur si l'envoi échoue", async () => {
    signInWithOtpMock.mockResolvedValue({ data: {}, error: { message: "rate limit" } });
    const { sendOtp } = await import("./auth");

    const result = await sendOtp("agent@exemple.com");

    expect(result.error).toEqual({ message: "rate limit" });
  });
});

describe("resendOtp", () => {
  it("est strictement le même appel que sendOtp (même garde-fou shouldCreateUser:false)", async () => {
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });
    const { resendOtp, sendOtp } = await import("./auth");

    expect(resendOtp).toBe(sendOtp);
    await resendOtp("agent@exemple.com");
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "agent@exemple.com",
      options: { shouldCreateUser: false },
    });
  });
});

describe("verifyOtp", () => {
  it("appelle verifyOtp avec type:'email' et retourne authUserId (jamais userHash)", async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: { id: "auth-uid-123" }, session: {} },
      error: null,
    });
    const { verifyOtp } = await import("./auth");

    const result = await verifyOtp("agent@exemple.com", "123456");

    expect(verifyOtpMock).toHaveBeenCalledWith({ email: "agent@exemple.com", token: "123456", type: "email" });
    expect(result).toEqual({ authUserId: "auth-uid-123", error: null });
  });

  it("retourne authUserId:null et le message d'erreur si le code est invalide/expiré", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: null, session: null }, error: { message: "otp_expired" } });
    const { verifyOtp } = await import("./auth");

    const result = await verifyOtp("agent@exemple.com", "000000");

    expect(result).toEqual({ authUserId: null, error: { message: "otp_expired" } });
  });
});

describe("getCurrentAuthUserId", () => {
  it("retourne l'id de la session active", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "auth-uid-456" } } }, error: null });
    const { getCurrentAuthUserId } = await import("./auth");

    expect(await getCurrentAuthUserId()).toBe("auth-uid-456");
  });

  it("retourne null si aucune session n'est active", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { getCurrentAuthUserId } = await import("./auth");

    expect(await getCurrentAuthUserId()).toBeNull();
  });
});

describe("onAuthStateChange", () => {
  it("transmet authUserId (pas la session brute) au callback et retourne un désabonnement", async () => {
    const { onAuthStateChange } = await import("./auth");
    const callback = vi.fn();

    onAuthStateChange(callback);

    expect(onAuthStateChangeMock).toHaveBeenCalledTimes(1);
    const handler = onAuthStateChangeMock.mock.calls[0]![0] as (event: string, session: unknown) => void;
    handler("SIGNED_IN", { user: { id: "auth-uid-789" } });
    expect(callback).toHaveBeenCalledWith("auth-uid-789");

    handler("SIGNED_OUT", null);
    expect(callback).toHaveBeenCalledWith(null);
  });

  it("la fonction retournée appelle bien unsubscribe()", async () => {
    const { onAuthStateChange } = await import("./auth");

    const unsubscribe = onAuthStateChange(() => {});
    unsubscribe();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});

describe("signOut", () => {
  it("appelle signOut avec scope:'local' (déconnexion de cet appareil uniquement)", async () => {
    signOutMock.mockResolvedValue({ error: null });
    const { signOut } = await import("./auth");

    const result = await signOut();

    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(result.error).toBeNull();
  });

  it("retourne le message d'erreur si la déconnexion échoue", async () => {
    signOutMock.mockResolvedValue({ error: { message: "network error" } });
    const { signOut } = await import("./auth");

    expect((await signOut()).error).toEqual({ message: "network error" });
  });
});
