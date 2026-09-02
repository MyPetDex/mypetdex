export function bookingStatusStyle(status: string) {
  return ({
    pending: { bg: "#FEF3C7", text: "#92400E" },
    confirmed: { bg: "#DBEAFE", text: "#1D4ED8" },
    completed: { bg: "#DBEAFE", text: "#1D4ED8" },
    cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  } as Record<string, { bg: string; text: string }>)[status] || { bg: "#F1F5F9", text: "#475569" };
}

export function formatMedications(meds: unknown): string {
  if (!meds) return "";
  if (typeof meds === "string") return meds;
  if (Array.isArray(meds)) {
    return meds
      .map((m: any) => {
        if (typeof m === "string") return m;
        return `${m.name || ""}${m.dosage ? ` ${m.dosage}` : ""}`.trim();
      })
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

export function buildPetProfileSnapshot(pet: any, petName: string) {
  return {
    name: pet?.name || petName,
    species: pet?.species || pet?.type || "",
    breed: pet?.breed || "",
    age: pet?.age || "",
    weight: pet?.weight || "",
    weightUnit: pet?.weightUnit || "lbs",
    neutered: pet?.neutered || false,
    allergies: pet?.allergies || "",
    medications: formatMedications(pet?.medications),
    healthNotes: pet?.healthNotes || pet?.notes || "",
  };
}
