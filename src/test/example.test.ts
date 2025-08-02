import assert from "node:assert";
import { test } from "node:test";

test("example test", () => {
   assert.strictEqual(1 + 1, 2);
});

test("async test example", async () => {
   const promise = Promise.resolve("hello");
   const result = await promise;
   assert.strictEqual(result, "hello");
});
