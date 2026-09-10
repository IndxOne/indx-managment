import { afterEach, describe, expect, it, vi } from "vitest";
import { disablePush, enablePush } from "./push-subscription";

function fakeClient(publicKey: string | null) {
  const upsert = vi.fn(async () => ({ error: null }));
  const eq = vi.fn(async () => ({ error: null }));
  const client = {
    rpc: vi.fn(async () => ({ data: publicKey, error: null })),
    from: vi.fn(() => ({ upsert, delete: () => ({ eq }) })),
  };
  return { client: client as never, upsert, eq };
}

function fakeRegistration(existing: object | null) {
  const subscription = {
    endpoint: "https://push.example/abc",
    toJSON: () => ({ endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } }),
    unsubscribe: vi.fn(async () => true),
  };
  const subscribe = vi.fn(async () => subscription);
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => ({ pushManager: { subscribe, getSubscription: async () => existing } }),
    },
  });
  vi.stubGlobal("Notification", { requestPermission: async () => "granted" });
  return { subscribe, subscription };
}

afterEach(() => vi.unstubAllGlobals());

describe("push-subscription", () => {
  it("s'abonne avec la clé publique du serveur et enregistre l'abonnement", async () => {
    const { client, upsert } = fakeClient("AQID");
    const { subscribe } = fakeRegistration(null);
    await enablePush(client, "hash-1");
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true, applicationServerKey: "AQID" })
    );
    expect(upsert).toHaveBeenCalledWith({
      endpoint: "https://push.example/abc",
      user_hash: "hash-1",
      subscription: { endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } },
    });
  });

  it("refuse tant que le serveur n'a pas de clé VAPID", async () => {
    const { client } = fakeClient(null);
    fakeRegistration(null);
    await expect(enablePush(client, "hash-1")).rejects.toThrow(/pas encore initialisé/);
  });

  it("supprime l'abonnement en base puis côté navigateur", async () => {
    const { client, eq } = fakeClient("AQID");
    const { subscription } = fakeRegistration(null);
    fakeRegistration(subscription);
    await disablePush(client);
    expect(eq).toHaveBeenCalledWith("endpoint", "https://push.example/abc");
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });
});
