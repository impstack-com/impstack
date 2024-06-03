import { describe, expect, test, beforeEach, it } from "vitest";
import { HeaderMine } from "../src/header-mine.js";
import { Header } from "../src/header.js";
import { SysBuf, FixedEbxBuf } from "../src/ebx-buf.js";
import { U8, U16, U32, U64 } from "../src/numbers.js";

describe("HeaderMine", () => {
  test("getLowestIdForNTimes", () => {
    const header = new Header(
      new U32(1),
      FixedEbxBuf.alloc(32),
      FixedEbxBuf.alloc(32),
      new U64(0n),
      new U64(0n),
      FixedEbxBuf.alloc(32),
      FixedEbxBuf.alloc(32),
      new U32(0),
      FixedEbxBuf.alloc(32),
      new U32(0),
      FixedEbxBuf.alloc(32),
    );
    const headerMine = new HeaderMine(header);
    const lowest = headerMine.getLowestIdForNTimes(10);
    expect(lowest).toBeDefined();
    expect(lowest.bn).toBeDefined();
  });

  test("getLowestNonceForNTimes", () => {
    const header = new Header(
      new U32(1),
      FixedEbxBuf.alloc(32),
      FixedEbxBuf.alloc(32),
      new U64(0n),
      new U64(0n),
      FixedEbxBuf.alloc(32),
      FixedEbxBuf.alloc(32),
      new U32(0),
      FixedEbxBuf.alloc(32),
      new U32(0),
      FixedEbxBuf.alloc(32),
    );
    const headerMine = new HeaderMine(header);
    const nonce = headerMine.getLowestNonceForNTimes(10);
    expect(nonce).toBeDefined();
  });
});
