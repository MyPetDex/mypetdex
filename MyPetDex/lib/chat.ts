import {
  collection, query, where, getDocs,
  serverTimestamp, setDoc, doc, getDoc, deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Returns true if the owner has a pending or confirmed booking with this provider.
 * Throws nothing — returns false on any error so callers can treat it as "no booking".
 */
export async function hasActiveBooking(ownerUid: string, providerUid: string): Promise<boolean> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "bookings"),
        where("ownerId", "==", ownerUid),
        where("providerId", "==", providerUid),
      )
    );
    return snap.docs.some((d) => {
      const s = d.data().status;
      return s === "pending" || s === "confirmed";
    });
  } catch {
    return false;
  }
}

export type OpenChatArgs = {
  ownerUid: string;
  ownerName: string;
  providerUid: string;
  providerName: string;
  /** Caller must have already verified an active booking exists. */
  activeBooking: boolean;
};

export type OpenChatResult =
  | { ok: true; convId: string; otherName: string; otherUid: string }
  | { ok: false; reason: "no-booking" | "error" };

/**
 * Finds or creates the conversation between an owner and a provider.
 * Conversation id is the two uids sorted and joined, so both sides resolve
 * to the same document. Does not navigate — the caller does that.
 */
export async function openChatWithProvider(args: OpenChatArgs): Promise<OpenChatResult> {
  const { ownerUid, ownerName, providerUid, providerName, activeBooking } = args;

  if (!activeBooking) return { ok: false, reason: "no-booking" };

  try {
    const participants = [ownerUid, providerUid].sort();
    const convId = participants.join("_");
    const convRef = doc(db, "conversations", convId);

    const existingSnap = await getDoc(convRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      if (existing.ended === true && !activeBooking) {
        return { ok: false, reason: "no-booking" };
      }
      const msgsSnap = await getDocs(collection(db, "conversations", convId, "messages"));
      const hasMessages = !msgsSnap.empty || Boolean(existing.lastMessage);
      if (!hasMessages) {
        await deleteDoc(convRef);
      }
    }

    const convData: Record<string, any> = {
      participants,
      participantNames: {
        [ownerUid]: ownerName,
        [providerUid]: providerName,
      },
      participantRoles: {
        [ownerUid]: "owner",
        [providerUid]: "provider",
      },
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: "",
      unreadCount: { [ownerUid]: 0, [providerUid]: 0 },
      ended: false,
    };
    // Nested map — must match how the conversations list reads it
    // (c.hiddenBy?.[uid]). A dotted key here would create a literal
    // field named "hiddenBy.<uid>" instead, which nothing reads.
    convData.hiddenBy = { [ownerUid]: false };

    await setDoc(convRef, convData, { merge: true });

    return { ok: true, convId, otherName: providerName, otherUid: providerUid };
  } catch (e) {
    console.error("openChatWithProvider:", e);
    return { ok: false, reason: "error" };
  }
}
