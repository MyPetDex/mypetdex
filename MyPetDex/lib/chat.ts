import {
  collection, query, where, getDocs,
  serverTimestamp, setDoc, doc, getDoc, deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Returns true if the owner has a pending or confirmed booking with this provider.
 * Throws nothing — returns false on any error so callers can treat it as "no booking".
 */
/**
 * Kept for call-site compatibility. Delegates to getChatEligibility so there is
 * exactly one definition of the messaging rule — do not reimplement the booking
 * query here.
 */
export async function hasActiveBooking(ownerUid: string, providerUid: string): Promise<boolean> {
  const e = await getChatEligibility(ownerUid, providerUid);
  return e.allowed;
}

export type ChatEligibility = {
  allowed: boolean;
  reason: "pending" | "confirmed" | "completed_grace" | "expired" | "none" | "unknown";
  until: Date | null;
};

/**
 * The single source of truth for whether two users may message each other.
 * Reads the chatEligibility document maintained by the onBookingWriteEligibility
 * Cloud Function — the same document Firestore rules check on message create,
 * so the client and the server can never disagree.
 *
 * Direction-independent: either party can ask.
 */
export async function getChatEligibility(
  ownerUid: string,
  providerUid: string
): Promise<ChatEligibility> {
  try {
    // Either party may ask, and a chat screen does not always know which uid is
    // the owner, so try both orderings of the deterministic document id.
    let snap = await getDoc(doc(db, "chatEligibility", `${ownerUid}_${providerUid}`));
    if (!snap.exists()) {
      snap = await getDoc(doc(db, "chatEligibility", `${providerUid}_${ownerUid}`));
    }
    if (!snap.exists()) return { allowed: false, reason: "none", until: null };
    const d = snap.data();
    const until = d.until?.toDate?.() ?? null;
    // The hourly sweep may not have run yet — treat a passed expiry as expired.
    if (d.allowed && until && until.getTime() <= Date.now()) {
      return { allowed: false, reason: "expired", until };
    }
    return {
      allowed: Boolean(d.allowed),
      reason: (d.reason || "unknown") as ChatEligibility["reason"],
      until,
    };
  } catch {
    return { allowed: false, reason: "unknown", until: null };
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
    let wasDeleted = false;
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      if (existing.ended === true && !activeBooking) {
        return { ok: false, reason: "no-booking" };
      }
      const msgsSnap = await getDocs(collection(db, "conversations", convId, "messages"));
      const hasMessages = !msgsSnap.empty || Boolean(existing.lastMessage);
      if (!hasMessages) {
        await deleteDoc(convRef);
        wasDeleted = true;
      }
    }

    // Treat a just-deleted empty conversation as new — it needs its counters back.
    const isNew = !existingSnap.exists() || wasDeleted;

    // Never reset lastMessage/unreadCount on an existing conversation — the send
    // handler owns those fields and merging blanks would wipe the preview text.
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
      // Reopening after a booking unhides for BOTH sides — the provider must be
      // able to see a conversation the owner has legitimately restarted.
      hiddenBy: { [ownerUid]: false, [providerUid]: false },
      ended: false,
    };

    if (isNew) {
      convData.lastMessage = "";
      convData.lastMessageTime = serverTimestamp();
      convData.lastMessageSenderId = "";
      convData.unreadCount = { [ownerUid]: 0, [providerUid]: 0 };
    }

    await setDoc(convRef, convData, { merge: true });

    return { ok: true, convId, otherName: providerName, otherUid: providerUid };
  } catch (e) {
    console.error("openChatWithProvider:", e);
    return { ok: false, reason: "error" };
  }
}
