/**
 * UUID v5 (RFC 4122) synchrone et pur — aucune dépendance, pas d'API
 * asynchrone (Web Crypto `subtle.digest` est async, inutilisable depuis un
 * reducer pur). Sert à dériver un identifiant d'occurrence de récurrence
 * (uuid valide, colonne `projets_actions.id`) de façon déterministe à
 * partir de `recurrenceRuleId` + date d'occurrence : même entrée, même
 * UUID, toujours — condition nécessaire à l'idempotence de
 * `generateRecurringOccurrences` (cf. recurrence-engine.ts).
 */

function toUtf8Bytes(input: string): number[] {
  return Array.from(new TextEncoder().encode(input));
}

function parseUuidToBytes(uuid: string): number[] {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) {
    throw new Error(`UUID de namespace invalide : ${uuid}`);
  }
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

function leftRotate(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

/** SHA-1 pur (RFC 3174) — retourne les 20 octets du condensat. */
function sha1(bytes: number[]): number[] {
  const message = [...bytes];
  const bitLength = message.length * 8;

  message.push(0x80);
  while (message.length % 64 !== 56) {
    message.push(0);
  }
  for (let shift = 56; shift >= 0; shift -= 8) {
    message.push((bitLength / Math.pow(2, shift)) & 0xff);
  }

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let chunkStart = 0; chunkStart < message.length; chunkStart += 64) {
    const w = new Array<number>(80).fill(0);
    for (let i = 0; i < 16; i += 1) {
      const offset = chunkStart + i * 4;
      w[i] = (message[offset]! << 24) | (message[offset + 1]! << 16) | (message[offset + 2]! << 8) | message[offset + 3]!;
    }
    for (let i = 16; i < 80; i += 1) {
      w[i] = leftRotate(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i += 1) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (leftRotate(a, 5) + f + e + k + w[i]!) >>> 0;
      e = d;
      d = c;
      c = leftRotate(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest: number[] = [];
  for (const word of [h0, h1, h2, h3, h4]) {
    digest.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  }
  return digest;
}

function bytesToUuid(bytes: number[]): string {
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * UUID v5 déterministe : `namespace` doit être un UUID valide, `name` la
 * chaîne à hasher. Mêmes `namespace`/`name` → même UUID, toujours (pas de
 * dépendance au temps ni à `Math.random`/`crypto.randomUUID`).
 */
export function uuidV5(namespace: string, name: string): string {
  const digest = sha1([...parseUuidToBytes(namespace), ...toUtf8Bytes(name)]);
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant RFC 4122
  return bytesToUuid(bytes);
}
