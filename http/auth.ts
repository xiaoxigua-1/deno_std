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
  private stringToArrayBytes(data: string): Uint8Array {
    const bytes = new Uint8Array(data.length);
    for (let index = 0; index < data.length; index++) {
      bytes[index] = data[index].charCodeAt(0);
    }

    return bytes;
  }

  private padFun(data: Uint8Array, size: number): Uint8Array {
    const bytes = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
      const byte = data[i];

      if (i === undefined) {
        bytes[i] = 0x00;
      } else {
        bytes[i] = byte;
      }
    }
    console.log(bytes);
    return bytes;
  }

  private xor(data: Uint8Array, value: number) {
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.byteLength; i++) {
      bytes[i] = data[i] ^ value;
    }

    return bytes;
  }

  private concatenation(data1: Uint8Array, data2: Uint8Array): Uint8Array {
    const dataLength = data1.byteLength + data2.byteLength;
    const bytes = new Uint8Array(dataLength);
    for (let i = 0; i < dataLength; i++) {
      if (i < data1.length) {
        bytes[i] = data1[i];
      } else {
        bytes[i] = data2[i - data1.length];
      }
    }
    return bytes;
  }

  private convertArrayBufferToNumber(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const dv = new DataView(bytes.buffer);
    return dv.getUint16(0, true);
  }

  private async HMAC(
    alg: SHA,
    secret: string,
    message: string,
  ): Promise<string> {
    const blockSize = 512;
    const messageUint8 = this.stringToArrayBytes(message);
    let key: Uint8Array;

    if (secret.length > blockSize) {
      key = new Uint8Array(
        await crypto.subtle.digest(alg, new TextEncoder().encode(secret)),
      );
    } else {
      key = this.padFun(this.stringToArrayBytes(secret), blockSize);
    }

    const oKeyPad = this.xor(key, 0x5c5c5c5c);
    const iKeyPad = this.xor(key, 0x36363636);

    const hash1 = new Uint8Array(
      await crypto.subtle.digest(
        alg,
        this.concatenation(iKeyPad, messageUint8),
      ),
    );

    const hash2 = new Uint8Array(
      await crypto.subtle.digest(
        alg,
        this.concatenation(oKeyPad, hash1),
      ),
    );

    return this.toHexString(hash2);
  }

  private toHexString(data: Uint8Array): string {
    return data.reduce(
      (str, byte) => str + byte.toString(16).padStart(2, "0"),
      "",
    );
  }

  async createJWS<T>(
    config: JWSConfig<T> = {
      header: { alg: "HS256", typ: "JWT" },
      payload: {},
      secret: "hi",
    },
  ): Promise<string> {
    return await this.HMAC(
      "SHA-256",
      config.secret,
      "a",
    );
  }
}
