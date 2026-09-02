import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

function sortConversations(convs: any[]) {
  return convs.sort((a, b) => {
    const ta = a.lastMessageTime?.toMillis?.() || a.lastMessageTime?.seconds * 1000 || 0;
    const tb = b.lastMessageTime?.toMillis?.() || b.lastMessageTime?.seconds * 1000 || 0;
    return tb - ta;
  });
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const convs = sortConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setConversations(convs);
        setLoading(false);
      },
      (err) => {
        console.error("useConversations error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  return { conversations, loading };
}
