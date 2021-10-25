import { decode, encode } from "../encoding/base64.ts";

export interface Basic {
  username: string;
  password: string;
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
