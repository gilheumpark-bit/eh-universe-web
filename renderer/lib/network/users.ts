import type { User } from "firebase/auth";
// Firebase Firestore — static import for data-layer modules.
// Dynamic alternative: import('firebase/firestore') via lazyFirestore() in firebase.ts
import {
  doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";
import {
  type UserRecord,
} from "@/lib/network-types";
import { requireDb, normalizeText, COLLECTIONS, nowIso, buildDefaultUserRecord } from "./helpers";

// ============================================================
// PART 2 - USER HELPERS
// ============================================================

export async function ensureNetworkUserRecord(user: Pick<User, "uid" | "displayName">) {
  const database = requireDb();
  const ref = doc(database, COLLECTIONS.users, user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    const current = snapshot.data() as UserRecord;
    const nextNickname = normalizeText(user.displayName) || current.nickname;

    if (nextNickname !== current.nickname) {
      await updateDoc(ref, {
        nickname: nextNickname,
        updatedAt: nowIso(),
      });

      return {
        ...current,
        nickname: nextNickname,
        updatedAt: nowIso(),
      };
    }

    return current;
  }

  const record = buildDefaultUserRecord(user.uid, user.displayName);
  await setDoc(ref, record);
  return record;
}

export async function getNetworkUserRecord(userId: string) {
  const database = requireDb();
  const snapshot = await getDoc(doc(database, COLLECTIONS.users, userId));
  return snapshot.exists() ? (snapshot.data() as UserRecord) : null;
}

// IDENTITY_SEAL: PART-2 | role=user record sync | inputs=firebase auth user | outputs=network user record

