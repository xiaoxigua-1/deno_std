// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import {
  crypto as wasmCrypto,
  DigestAlgorithm as WasmDigestAlgorithm,
  digestAlgorithms as wasmDigestAlgorithms,
} from "../_wasm_crypto/mod.ts";

type WebCryptoAlgorithmIdentifier = string | { name: string };

// TODO(jeremyBanks): Remove this once the built-in `Crypto` interface is
// complete and stable. For now we use this incomplete-but-stable definition.
interface WebCrypto {
  getRandomValues<T extends BufferSource>(buffer: T): T;
  randomUUID?(): string;
  subtle?: {
    // see https://www.w3.org/TR/WebCryptoAPI/#subtlecrypto-interface

    /**
     * Returns a new `Promise` object that will encrypt `data` using the
     * specified `AlgorithmIdentifier` with the supplied `CryptoKey`.
     */
    encrypt?(
      algorithm: WebCryptoAlgorithmIdentifier,
      key: unknown,
      data: BufferSource,
    ): Promise<unknown>;
    /**
     * Returns a new `Promise` object that will decrypt `data` using the
     * specified `AlgorithmIdentifier` with the supplied `CryptoKey`.
     */
    decrypt?(
      algorithm: WebCryptoAlgorithmIdentifier,
      key: unknown,
      data: BufferSource,
    ): Promise<unknown>;

    /**
     * Returns a new `Promise` object that will sign `data` using the specified
     * `AlgorithmIdentifier` with the supplied `CryptoKey`.
     */
    sign?(
      algorithm: WebCryptoAlgorithmIdentifier,
      key: unknown,
      data: BufferSource,
    ): Promise<unknown>;
    /**
     * Returns a new `Promise` object that will verify `data` using the
     * specified `AlgorithmIdentifier` with the supplied `CryptoKey`.
     */
    verify?(
      algorithm: WebCryptoAlgorithmIdentifier,
      key: unknown,
      signature: BufferSource,
      data: BufferSource,
    ): Promise<unknown>;

    /**
     * Returns a new `Promise` object that will digest `data` using the
     * specified `AlgorithmIdentifier`.
     */
    digest?(
      algorithm: WebCryptoAlgorithmIdentifier,
      data: BufferSource,
    ): Promise<ArrayBuffer>;

    generateKey?(
      algorithm: WebCryptoAlgorithmIdentifier,
      extractable: boolean,
      keyUsages: string[],
    ): Promise<unknown>;
    deriveKey?(
      algorithm: WebCryptoAlgorithmIdentifier,
      baseKey: unknown,
      derivedKeyType: string,
      extractable: boolean,
      keyUsages: string[],
    ): Promise<unknown>;
    deriveBits?(
      algorithm: WebCryptoAlgorithmIdentifier,
      baseKey: unknown,
      length: number,
    ): Promise<unknown>;

    importKey?(
      format: string,
      keyData: BufferSource | unknown,
      algorithm: WebCryptoAlgorithmIdentifier,
      extractable: boolean,
      keyUsages: string[],
    ): Promise<unknown>;
    exportKey?(format: string, key: unknown): Promise<unknown>;

    wrapKey?(
      format: string,
      key: unknown,
      wrappingKey: unknown,
      wrappingAlgorithm: WebCryptoAlgorithmIdentifier,
    ): Promise<unknown>;
    unwrapKey?(
      format: string,
      wrappedKey: BufferSource,
      unwrappingKey: unknown,
      unwrapAlgorithm: WebCryptoAlgorithmIdentifier,
      unwrappedKeyAlgorithm: WebCryptoAlgorithmIdentifier,
      extractable: boolean,
      keyUsages: string[],
    ): Promise<unknown>;
  };
}

/**
 * A copy of the global WebCrypto interface, with methods bound so they're
 * safe to re-export.
 */
const webCrypto: WebCrypto = ((crypto) => ({
  getRandomValues: crypto.getRandomValues?.bind(crypto),
  randomUUID: crypto.randomUUID?.bind(crypto),
  subtle: {
    decrypt: crypto.subtle?.decrypt?.bind(crypto.subtle),
    deriveBits: crypto.subtle?.deriveBits?.bind(crypto.subtle),
    deriveKey: crypto.subtle?.deriveKey?.bind(crypto.subtle),
    digest: crypto.subtle?.digest?.bind(crypto.subtle),
    encrypt: crypto.subtle?.encrypt?.bind(crypto.subtle),
    exportKey: crypto.subtle?.exportKey?.bind(crypto.subtle),
    generateKey: crypto.subtle?.generateKey?.bind(crypto.subtle),
    importKey: crypto.subtle?.importKey?.bind(crypto.subtle),
    sign: crypto.subtle?.sign?.bind(crypto.subtle),
    unwrapKey: crypto.subtle?.unwrapKey?.bind(crypto.subtle),
    verify: crypto.subtle?.verify?.bind(crypto.subtle),
    wrapKey: crypto.subtle?.wrapKey?.bind(crypto.subtle),
  },
}))(globalThis.crypto as WebCrypto);

const bufferSourceBytes = (data: BufferSource | unknown) => {
  let bytes: Uint8Array | undefined;
  if (data instanceof Uint8Array) {
    bytes = data;
  } else if (ArrayBuffer.isView(data)) {
    bytes = new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  }
  return bytes;
};

/**
 * An wrapper for WebCrypto adding support for additional non-standard
 * algorithms, but delegating to the runtime WebCrypto implementation whenever
 * possible.
 */
const stdCrypto = (<T extends WebCrypto>(x: T) => x)({
  ...webCrypto,
  subtle: {
    ...webCrypto.subtle,

    /**
     * Returns a new `Promise` object that will digest `data` using the specified
     * `AlgorithmIdentifier`.
     */
    async digest(
      algorithm: DigestAlgorithm,
      data: BufferSource | AsyncIterable<BufferSource> | Iterable<BufferSource>,
    ): Promise<ArrayBuffer> {
      const { name, length } = normalizeAlgorithm(algorithm);
      const bytes = bufferSourceBytes(data);

      // We delegate to WebCrypto whenever possible,
      if (
        // if the SubtleCrypto interface is available,
        webCrypto.subtle?.digest &&
        // if the algorithm is supported by the WebCrypto standard,
        (webCryptoDigestAlgorithms as readonly string[]).includes(name) &&
        // and the data is a single buffer,
        bytes
      ) {
        return webCrypto.subtle.digest(algorithm, bytes);
      } else if (wasmDigestAlgorithms.includes(name)) {
        if (bytes) {
          // Otherwise, we use our bundled WASM implementation via digestSync
          // if it supports the algorithm.
          return stdCrypto.subtle.digestSync(algorithm, bytes);
        } else if ((data as Iterable<BufferSource>)[Symbol.iterator]) {
          return stdCrypto.subtle.digestSync(
            algorithm,
            data as Iterable<BufferSource>,
          );
        } else if (
          (data as AsyncIterable<BufferSource>)[Symbol.asyncIterator]
        ) {
          const context = new wasmCrypto.DigestContext(name);
          for await (const chunk of data as AsyncIterable<BufferSource>) {
            const chunkBytes = bufferSourceBytes(chunk);
            if (!chunkBytes) {
              throw new TypeError("data contained chunk of the wrong type");
            }
            context.update(chunkBytes);
          }
          return context.digestAndDrop(length);
        } else {
          throw new TypeError(
            "data must be a BufferSource or [Async]Iterable<BufferSource>",
          );
        }
      } else if (webCrypto.subtle?.digest) {
        // (TypeScript type definitions prohibit this case.) If they're trying
        // to call an algorithm we don't recognize, pass it along to WebCrypto
        // in case it's a non-standard algorithm supported by the the runtime
        // they're using.
        return webCrypto.subtle.digest(
          algorithm,
          (data as unknown) as Uint8Array,
        );
      } else {
        throw new TypeError(`unsupported digest algorithm: ${algorithm}`);
      }
    },

    /**
     * Returns a ArrayBuffer with the result of digesting `data` using the
     * specified `AlgorithmIdentifier`.
     */
    digestSync(
      algorithm: DigestAlgorithm,
      data: BufferSource | Iterable<BufferSource>,
    ): ArrayBuffer {
      algorithm = normalizeAlgorithm(algorithm);

      const bytes = bufferSourceBytes(data);

      if (bytes) {
        return wasmCrypto.digest(algorithm.name, bytes, algorithm.length);
      } else if ((data as Iterable<BufferSource>)[Symbol.iterator]) {
        const context = new wasmCrypto.DigestContext(algorithm.name);
        for (const chunk of data as Iterable<BufferSource>) {
          const chunkBytes = bufferSourceBytes(chunk);
          if (!chunkBytes) {
            throw new TypeError("data contained chunk of the wrong type");
          }
          context.update(chunkBytes);
        }
        return context.digestAndDrop(algorithm.length);
      } else {
        throw new TypeError(
          "data must be a BufferSource or Iterable<BufferSource>",
        );
      }
    },
  },
});

/** Digest algorithms supported by WebCrypto. */
const webCryptoDigestAlgorithms = [
  "SHA-384",
  "SHA-256",
  "SHA-512",
  // insecure (length-extendable and collidable):
  "SHA-1",
] as const;

type DigestAlgorithmName = WasmDigestAlgorithm;

type DigestAlgorithmObject = {
  name: DigestAlgorithmName;
  length?: number;
};

type DigestAlgorithm = DigestAlgorithmName | DigestAlgorithmObject;

const normalizeAlgorithm = (algorithm: DigestAlgorithm) =>
  ((typeof algorithm === "string") ? { name: algorithm.toUpperCase() } : {
    ...algorithm,
    name: algorithm.name.toUpperCase(),
  }) as DigestAlgorithmObject;

export { stdCrypto as crypto };
