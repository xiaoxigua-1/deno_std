import { decode, encode } from "../encoding/base64.ts";
import { crypto } from "../crypto/mod.ts";
import { DigestAlgorithm } from "../_wasm_crypto/mod.ts";

export interface Basic {
  username: string;
  password: string;
}
// JWT alg types
type algType =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512";

export interface JOSEHeader {
  alg: algType;
  jku?: string;
  jwk?: string;
  kid?: string;
  typ: string;
  cty?: string;
  crit?: string;
}

export interface JWSConfig<T> {
  header: JOSEHeader;
  payload: T | {};
  secret: string;
}

/**
 * Retrieve Basic Authentication credentials from the header
 * @param {Headers} headers The headers instance to get Basic authentication from
 * @return {Object} The parsed username and password
 */
export function getBasic(header: Headers): Basic | null {
  const auth = header.get("Authorization");

  if (auth === null) {
    return null;
  } else {
    const authInfo = auth.split(" ");
    const authType = authInfo[0];
    const authToken = authInfo[1];

    if (authType === "Basic" && authToken !== undefined) {
      const tokenInfoUint8Array = decode(authToken);
      const tokenInfo = new TextDecoder().decode(tokenInfoUint8Array).split(
        ":",
      );
      const username = tokenInfo[0];
      const password = tokenInfo[1];

      return {
        username: username,
        password: password,
      };
    } else {
      return null;
    }
  }
}

/**
 * Retrieve Basic Authentication credentials from the header
 * @param {Headers} headers The headers instance to get Basic authentication from
 * @param {string} username The username for basic authentication
 * @param {string} password The password for basic authentication
 */
export function setBasic(
  header: Headers,
  username: string,
  password: string,
) {
  const token = encode(`${username}:${password}`);
  header.set("Authorization", `Basic ${token}`);
}

export class JWT {
  private stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  private async hmac(
    data: Uint8Array,
    key: Uint8Array,
    hash: (message: Uint8Array) => Promise<Uint8Array>,
    blockSize: number,
    outputSize: number,
  ): Promise<Uint8Array> {
    if (key.length > blockSize) {
      key = await hash(key);
    }
    const inner = new Uint8Array(blockSize + data.length).fill(
      0x36,
      0,
      blockSize,
    );
    const outer = new Uint8Array(blockSize + outputSize).fill(
      0x5c,
      0,
      blockSize,
    );
    key.forEach((value: number, index: number): void => {
      if (value !== 0) {
        inner[index] ^= value;
        outer[index] ^= value;
      }
    });
    inner.set(data, blockSize);
    const innerHash = await hash(inner);
    outer.set(innerHash, blockSize);
    return await hash(outer);
  }

  private toHexString(data: Uint8Array): string {
    return data.reduce(
      (str, byte) => str + byte.toString(16).padStart(2, "0"),
      "",
    );
  }

  private algorithm(algorithm: DigestAlgorithm) {
    return async (data: Uint8Array): Promise<Uint8Array> => {
      return new Uint8Array(await crypto.subtle.digest(
        algorithm,
        data,
      ));
    }
  }

  async createJWS<T>(
    config: JWSConfig<T> = {
      header: { alg: "HS256", typ: "JWT" },
      payload: {},
      secret: "hi",
    },
  ): Promise<string> {

  }
}
