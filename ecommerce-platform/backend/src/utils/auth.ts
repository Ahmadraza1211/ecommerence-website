import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import { env } from '../config/env';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function uniqueSlug(base: string, existing: string[] = []): string {
  let s = slugify(base, { lower: true, strict: true }) || 'item';
  let candidate = s;
  let i = 1;
  while (existing.includes(candidate)) {
    candidate = `${s}-${i++}`;
  }
  return candidate;
}
