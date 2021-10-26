import { decode, encode } from "../encoding/base64.ts";
import { crypto } from "../crypto/mod.ts";

export interface Basic {
  username: string;
  password: string;
}

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

type SHA =
  | "SHA-256"
  | "SHA-512";

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
  private stringToArrayBytes(data: string): Uint32Array {
    const bytes = new Uint32Array();
    for (let index = 0; index < data.length; index++) {
      bytes[index] = data[index].charCodeAt(0);
    }

    return bytes;
  }

  private padFun(data: Uint32Array, size: number): Uint32Array {
    for (let i = 0; i < size; i++) {
      data[i] = 0x00;
    }

    return data;
  }

  private async HMAC(alg: SHA, secret: string, message: string): string {
    const blockSize = 512;
    const outputSize = 256;
    let key: Uint32Array;

    if (secret.length > blockSize) {
      key = new Uint32Array(
        await crypto.subtle.digest(alg, new TextEncoder().encode(secret)),
      );
    } else {
      key = padFun(this.stringToArrayBytes(secret));
    }
  }

  createJWS<T>(
    config: JWSConfig<T> = {
      header: { alg: "HS256", typ: "JWT" },
      payload: {},
      secret: "hi",
    },
  ): Array<string> {
    return this.stringToArrayBytes(config.secret);
  }
}
