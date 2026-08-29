import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";
import type { UserDoc } from "../types";

export const USERNAME_RE = /^[a-z0-9_.]{3,16}$/i;

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

export function formatPhonePretty(digits: string): string {
  return formatPhoneInput(digits) || digits;
}

/** SHA-256(соль + номер + пароль) — хранится в Firestore вместо пароля */
export async function hashPassword(phone: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`efir-pulsik::${phone}::${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toUserDoc(id: string, d: Record<string, unknown>): UserDoc {
  return {
    phone: id,
    username: String(d.username ?? ""),
    name: String(d.name ?? "Абонент"),
    hue: Number(d.hue ?? 168),
    role: (d.role as UserDoc["role"]) ?? "user",
    verified: Boolean(d.verified),
    mutedUntil: d.mutedUntil ? Number(d.mutedUntil) : undefined,
    theme: d.theme as UserDoc["theme"],
    createdAt: Number(d.createdAt ?? Date.now()),
  };
}

/** Проверка уникальности юзернейма (кроме указанного телефона) */
export async function isUsernameTaken(
  app: FirebaseApp,
  username: string,
  exceptPhone?: string
): Promise<boolean> {
  const db = getFirestore(app);
  const snap = await getDocs(
    query(collection(db, "users"), where("username", "==", username.toLowerCase()), limit(5))
  );
  return snap.docs.some((d) => d.id !== exceptPhone);
}

export async function registerUser(
  app: FirebaseApp,
  phone: string,
  name: string,
  username: string,
  hue: number,
  password: string,
  creatorPhone: string
): Promise<UserDoc> {
  const db = getFirestore(app);
  const uname = username.toLowerCase();
  if (!USERNAME_RE.test(uname)) {
    throw new Error("Юзернейм: 3–16 символов, латиница, цифры, «_» и «.»");
  }
  const ref = doc(db, "users", phone);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    throw new Error("На этот номер уже есть аккаунт — войдите по паролю");
  }
  if (await isUsernameTaken(app, uname)) {
    throw new Error(`Юзернейм @${uname} уже занят`);
  }
  const passHash = await hashPassword(phone, password);
  const docData: UserDoc = {
    phone,
    username: uname,
    name,
    hue,
    role: phone === creatorPhone ? "creator" : "user",
    verified: false,
    createdAt: Date.now(),
  };
  await setDoc(ref, { ...docData, passHash });
  return docData;
}

export async function loginUser(
  app: FirebaseApp,
  phone: string,
  password: string,
  creatorPhone: string,
  nameOverride?: string,
  hueOverride?: number
): Promise<UserDoc> {
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
  // апгрейд роли, если это номер создателя
  const role: UserDoc["role"] = phone === creatorPhone ? "creator" : ((data.role as UserDoc["role"]) ?? "user");
  const patch: Record<string, unknown> = {};
  if (role !== data.role) patch.role = role;
  if (nameOverride && nameOverride !== data.name) patch.name = nameOverride;
  if (hueOverride != null && hueOverride !== data.hue) patch.hue = hueOverride;
  if (Object.keys(patch).length > 0) {
    await setDoc(ref, patch, { merge: true }).catch(() => {});
  }
  return toUserDoc(phone, { ...data, ...patch });
}
