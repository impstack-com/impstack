// Note that this "buffer" package is NOT the same thing as node's standard
// library. It is an API-compatible tool that does in fact "polyfill" or
// "browserify" the correct way. The reason why I'm renaming it here is
// specifically to make sure we always use this version of "Buffer" and never
// the standard node version so that it polyfills in the browser correctly.
import { Buffer } from "buffer";
import { Result, Ok, Err } from "earthbucks-opt-res/src/lib.js";
import { Option, Some, None } from "earthbucks-opt-res/src/lib.js";
import { EbxError, InvalidSizeError } from "./ebx-error.js";

const SysBuf = Buffer;
type SysBuf = Buffer;

class IsoBuf extends SysBuf {
  static fromHex<N extends number>(
    size: N,
    hex: string,
  ): Result<FixedIsoBuf<N>, EbxError> {
    const buf = SysBuf.from(hex, "hex");
    return FixedIsoBuf.fromIsoBuf(size, buf);
  }

  toHex(): string {
    return this.toString("hex");
  }
}

const sizeSymbol = Symbol("size");

class FixedIsoBuf<N extends number> extends IsoBuf {
  [sizeSymbol]: N;

  constructor(size: N, ...args: ConstructorParameters<typeof SysBuf>) {
    super(...args);
    if (this.length !== size) {
      throw new InvalidSizeError(None);
    }
    this[sizeSymbol] = size;
  }

  static fromIsoBuf<N extends number>(
    size: N,
    buf: SysBuf,
  ): Result<FixedIsoBuf<N>, EbxError> {
    if (buf.length !== size) {
      return Err(new InvalidSizeError(None));
    }
    // weird roundabout prototype code to avoid calling "new" because on Buffer
    // that is actually deprecated
    const newBuf = Buffer.alloc(size);
    newBuf.set(buf);
    Object.setPrototypeOf(newBuf, FixedIsoBuf.prototype);
    const fixedIsoBufN = newBuf as FixedIsoBuf<N>;
    fixedIsoBufN[sizeSymbol] = size;
    return Ok(fixedIsoBufN);
  }

  static alloc<N extends number>(size: N, fill?: number): FixedIsoBuf<N> {
    return (FixedIsoBuf<N>).fromIsoBuf(size, SysBuf.alloc(size, fill)).unwrap();
  }
}

export { SysBuf, FixedIsoBuf, IsoBuf };
