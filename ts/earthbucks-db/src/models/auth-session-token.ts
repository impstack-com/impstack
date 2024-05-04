import type { AuthSessionToken, NewAuthSessionToken } from "../schema-auth";
import { TableAuthSessionToken } from "../schema-auth";
import { db } from "../index";
import { Buffer } from "buffer";
import {
  eq,
  lt,
  gt,
  gte,
  ne,
  and,
  or,
  asc,
  desc,
  sql,
  max,
  Table,
} from "drizzle-orm";
import PubKey from "earthbucks-lib/src/pub-key";

export async function createNewAuthSessionToken(
  pubKey: PubKey,
): Promise<Buffer> {
  let id: Buffer = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
  let now = Date.now(); // milliseconds
  let createdAt = new Date(now);
  let expiresAt = new Date(now + 15 * 60 * 1000); // now plus 15 minutes
  const newAuthSigninToken: NewAuthSessionToken = {
    id,
    pubKey: pubKey.toBuffer(),
    createdAt,
    expiresAt,
  };
  await db.insert(TableAuthSessionToken).values(newAuthSigninToken);
  return id;
}

export async function getAuthSessionToken(
  id: Buffer,
): Promise<AuthSessionToken | null> {
  const [authSigninToken] = await db
    .select()
    .from(TableAuthSessionToken)
    .where(eq(TableAuthSessionToken.id, id))
    .limit(1);
  return authSigninToken;
}