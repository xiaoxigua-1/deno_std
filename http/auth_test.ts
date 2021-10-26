import { getBasic, setBasic, JWT } from "./auth.ts";
import { assertEquals } from "../testing/asserts.ts";

Deno.test("Get basic authentication", () => {
  const headers = new Headers();
  headers.set("Authorization", "Basic eGlhb194aWd1YToxMjM0NTY3ODk=");
  const userInfo = getBasic(headers);

  assertEquals(userInfo, {
    username: "xiao_xigua",
    password: "123456789",
  });
});

Deno.test("Set basic authentication", () => {
  const headers = new Headers();
  setBasic(headers, "Young", "123456789");

  assertEquals(
    headers.get("Authorization"),
    "Basic WW91bmc6MTIzNDU2Nzg5",
  );
});

Deno.test("create JWS Token", async () => {
  console.log(await new JWT().createJWS());
})
