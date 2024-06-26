import { describe, expect, test, beforeEach, it } from "vitest";
import { MerkleTxs } from "../src/merkle-txs.js";
import { Tx } from "../src/tx.js";
import { SysBuf } from "../src/buf.js";
import { U8, U16, U32, U64 } from "../src/numbers.js";

describe("MerkleTxs", () => {
  test("verify with 1 tx", () => {
    const tx1 = new Tx(new U8(0), [], [], new U64(0n));
    const merkleTxs = new MerkleTxs([tx1]);
    const verified = merkleTxs.verify();
    expect(verified).toBe(true);
  });

  test("verify with 2 txs", () => {
    const tx1 = new Tx(new U8(0), [], [], new U64(0n));
    const tx2 = new Tx(new U8(0), [], [], new U64(0n));
    const merkleTxs = new MerkleTxs([tx1, tx2]);
    const verified = merkleTxs.verify();
    expect(verified).toBe(true);
  });

  test("verify with 3 txs", () => {
    const tx1 = new Tx(new U8(0), [], [], new U64(0n));
    const tx2 = new Tx(new U8(0), [], [], new U64(0n));
    const tx3 = new Tx(new U8(0), [], [], new U64(0n));
    const merkleTxs = new MerkleTxs([tx1, tx2, tx3]);
    const verified = merkleTxs.verify();
    expect(verified).toBe(true);
  });
});
