import {Colors} from './mod.ts';
import {assert, assertEquals} from 'https://deno.land/std@0.111.0/testing/asserts.ts';

Deno.test("s", async () => {
    const rgbData = {r: 255, g: 0, b: 0};
    assertEquals(Colors.red.rgb, rgbData);
});