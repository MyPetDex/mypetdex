import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export type Plan = "free" | "plus" | "family";

export interface PlanLimits {
  plan: Plan;
  maxPets: number;
  aiAssistant: boolean;
  recipes: boolean;
  reminders: boolean;
  pdfExport: boolean;
  loading: boolean;
}

const LIMITS: Record<Plan, Omit<PlanLimits, "plan" | "loading">> = {
  free:   { maxPets: 1,   aiAssistant: false, recipes: false, reminders: true, pdfExport: false },
  plus:   { maxPets: 3,   aiAssistant: true,  recipes: true,  reminders: true, pdfExport: true  },
  family: { maxPets: 999, aiAssistant: true,  recipes: true,  reminders: true, pdfExport: true  },
};

function parsePlan(value: any): Plan {
  return value === "plus" || value === "family" ? value : "free";
}

export function usePlan(): PlanLimits {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setPlan(parsePlan(snap.data()?.plan));
        setLoading(false);
      },
      () => {
        setPlan("free");
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  return { plan, loading, ...LIMITS[plan] };
}
