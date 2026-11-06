/* Пароль редактора: ввод приводится к одному виду (строчные, «ё» → «е», дефисы и лишние пробелы — один пробел)
   и сверяется с отпечатком из venue/admin-pass.json (PBKDF2-SHA256). Работает и на сервере (Node), и в браузере (WebCrypto). */
export const normPass = s => String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е").replace(/[-–—_]+/g, " ").split(/\s+/).filter(Boolean).join(" ");
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export async function checkPass(pw, rec){
  if (!rec || !rec.hash) return false;
  const c = globalThis.crypto.subtle, key = await c.importKey("raw", new TextEncoder().encode(normPass(pw)), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await c.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64(rec.salt), iterations: rec.iter }, key, 256));
  const want = b64(rec.hash);
  let diff = bits.length ^ want.length;
  for (let i = 0; i < Math.min(bits.length, want.length); i++) diff |= bits[i] ^ want[i];
  return diff === 0;
}
