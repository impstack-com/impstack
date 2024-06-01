import * as Hash from "./hash.js";
import { SysBuf, FixedIsoBuf } from "./iso-buf.js";
import bs58 from "bs58";
import { StrictHex } from "./strict-hex.js";
import { PubKey } from "./pub-key.js";
import { Result, Ok, Err } from "earthbucks-opt-res/src/lib.js";

// public key hash
export class Pkh {
  buf: FixedIsoBuf<32>;

  constructor(pkhBuf: FixedIsoBuf<32>) {
    this.buf = pkhBuf;
  }

  static fromPubKeyBuf(pubKeyBuf: FixedIsoBuf<33>): Pkh {
    const pkhBuf = Hash.doubleBlake3Hash(pubKeyBuf);
    return new Pkh(pkhBuf);
  }

  static fromPubKey(pubKey: PubKey): Pkh {
    return Pkh.fromPubKeyBuf(pubKey.toIsoBuf());
  }

  static fromIsoBuf(buf: FixedIsoBuf<32>): Result<Pkh, string> {
    if (buf.length !== 32) {
      return Err("Invalid public key hash length");
    }
    return Ok(new Pkh(buf));
  }

  toIsoStr(): string {
    const checkHash = Hash.blake3Hash(this.buf).subarray(0, 4);
    const checkHex = checkHash.toString("hex");
    return "ebxpkh" + checkHex + bs58.encode(this.buf);
  }

  static fromIsoStr(pkhStr: string): Result<Pkh, string> {
    if (!pkhStr.startsWith("ebxpkh")) {
      return Err("Invalid pkh format");
    }
    const checkHex = pkhStr.slice(6, 14);
    const checkBuf = StrictHex.decode(checkHex).unwrap();
    const bufRes = (FixedIsoBuf<32>).fromIsoBuf(
      32,
      SysBuf.from(bs58.decode(pkhStr.slice(14))),
    );
    if (bufRes.err) {
      return Err("Invalid pkh length");
    }
    const buf = bufRes.unwrap();
    const hashBuf = Hash.blake3Hash(buf);
    const checkHash = hashBuf.subarray(0, 4);
    if (!checkHash.equals(checkBuf)) {
      return Err("Invalid pkh checksum");
    }
    return Pkh.fromIsoBuf(buf);
  }

  static isValidStringFmt(pkhStr: string): boolean {
    const pkh = Pkh.fromIsoStr(pkhStr);
    return pkh.ok;
  }
}
