import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";

/** Нормализация номера: только цифры, российская «8» → «7» */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10 && d.startsWith("9")) d = "7" + d;
  return d.slice(0, 15);
}

export function isValidPhone(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 15;
}

/** Прогрессивное форматирование при вводе */
export function formatPhoneInput(digits: string): string {
  if (!digits) return "";
  if (digits.startsWith("7") || digits.startsWith("8")) {
    const d = digits.startsWith("8") ? "7" + digits.slice(1) : digits;
    let out = "+7";
    if (d.length > 1) out += " " + d.slice(1, 4);
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    return out;
  }
  return "+" + digits;
}

/** SHA-256(соль + номер + пароль) — хранится в Firestore вместо пароля */
export async function hashPassword(phone: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`efir-pulsik::${phone}::${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function registerUser(
  app: FirebaseApp,
  phone: string,
  name: string,
  hue: number,
  password: string
): Promise<void> {
  const db = getFirestore(app);
  const ref = doc(db, "users", phone);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    throw new Error("Этот номер уже в эфире — войдите по паролю");
  }
  const passHash = await hashPassword(phone, password);
  await setDoc(ref, { phone, name, hue, passHash, createdAt: Date.now() });
}

export async function loginUser(
  app: FirebaseApp,
  phone: string,
  password: string,
  nameOverride?: string,
  hueOverride?: number
): Promise<{ name: string; hue: number }> {
  const db = getFirestore(app);
  const ref = doc(db, "users", phone);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Номер не найден — зарегистрируйтесь");
  }
  const data = snap.data();
  const passHash = await hashPassword(phone, password);
  if (data.passHash !== passHash) {
    throw new Error("Неверный пароль");
  }
  // если позывной/цвет поменялись — обновляем профиль
  const patch: Record<string, unknown> = {};
  if (nameOverride && nameOverride !== data.name) patch.name = nameOverride;
  if (hueOverride != null && hueOverride !== data.hue) patch.hue = hueOverride;
  if (Object.keys(patch).length > 0) {
    await setDoc(ref, patch, { merge: true }).catch(() => {});
  }
  return {
    name: (patch.name as string) ?? String(data.name ?? "Абонент"),
    hue: (patch.hue as number) ?? Number(data.hue ?? 168),
  };
}
