// ─────────────────────────────────────────────────────────────────────────────
// PASTE THIS INTO ~/mypetdex/functions/index.js
//
// 1. Add to the top-level requires/imports (if not already there):
//
//    const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
//    const { defineSecret } = require("firebase-functions/params");
//    const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
//
//    NOTE: if you already have onDocumentCreated imported, just add onDocumentUpdated.
//
// 2. Paste BOTH functions below alongside your existing exports.
//
// 3. Deploy both at once:
//    cd ~/mypetdex/functions
//    firebase deploy --only functions:notifyAdminNewProvider,functions:notifyProviderStatusChange
// ─────────────────────────────────────────────────────────────────────────────

// ── FUNCTION 1: Push notification to admin when a new provider applies ────────
exports.notifyAdminNewProvider = onDocumentCreated("users/{uid}", async (event) => {
  const data = event.data?.data();
  if (!data || data.role !== "pending_provider") return;
  try {
    const adminSnap = await db.collection("users")
      .where("email", "==", "mypetdexapp@gmail.com").limit(1).get();
    if (adminSnap.empty) return;
    const token = adminSnap.docs[0].data().expoPushToken;
    if (!token || !token.startsWith("ExponentPushToken[")) return;
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title: "New Provider Application",
        body: `${data.businessName || data.displayName || "Unknown"} applied as a ${data.service || "provider"}. Tap to review.`,
        data: { screen: "admin-providers" },
      }),
    });
  } catch (e) { console.error("notifyAdminNewProvider error:", e); }
});

// ── FUNCTION 2: Email to provider on approval or rejection ───────────────────

exports.notifyProviderStatusChange = onDocumentUpdated(
  { document: "users/{uid}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    if (!before || !after) return;

    const roleBefore = before.role;
    const roleAfter  = after.role;

    // Only act when role actually changed
    if (roleBefore === roleAfter) return;

    const isApproval = roleAfter === "provider";
    const isRejection = roleAfter === "rejected_provider";

    if (!isApproval && !isRejection) return;

    const email = after.email;
    const name  = after.displayName || after.businessName || "there";
    const service = after.service || "services";

    if (!email) {
      console.warn("notifyProviderStatusChange: no email on user doc", event.params.uid);
      return;
    }

    const subject = isApproval
      ? "🎉 Your MyPetDex provider application is approved!"
      : "Update on your MyPetDex provider application";

    const html = isApproval
      ? `
<div style="font-family:-apple-system,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0F172A;">
  <div style="background:#4486F4;padding:28px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">MyPetDex</h1>
  </div>
  <div style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #E2E8F0;border-top:none;">
    <h2 style="font-size:20px;font-weight:800;margin:0 0 12px;">You're approved, ${name}! 🎉</h2>
    <p style="font-size:15px;color:#475569;line-height:24px;margin:0 0 20px;">
      Great news — your application to list your <strong>${service}</strong> on MyPetDex has been reviewed and approved.
      Your profile is now live and pet owners in your area can discover and contact you.
    </p>
    <div style="background:#EEF2FF;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#3730A3;font-weight:600;">✅ What happens next:</p>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:14px;color:#475569;line-height:22px;">
        <li>Open MyPetDex and sign in — you'll land on your provider dashboard.</li>
        <li>Your profile is immediately searchable by pet owners nearby.</li>
        <li>Keep your profile up to date from the Profile tab in the app.</li>
      </ul>
    </div>
    <p style="font-size:13px;color:#94A3B8;margin:0;">
      Questions? Email us at <a href="mailto:help@mypetdex.app" style="color:#4486F4;">help@mypetdex.app</a>
    </p>
  </div>
</div>`
      : `
<div style="font-family:-apple-system,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0F172A;">
  <div style="background:#4486F4;padding:28px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">MyPetDex</h1>
  </div>
  <div style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #E2E8F0;border-top:none;">
    <h2 style="font-size:20px;font-weight:800;margin:0 0 12px;">Application update, ${name}</h2>
    <p style="font-size:15px;color:#475569;line-height:24px;margin:0 0 20px;">
      Thank you for applying to list your <strong>${service}</strong> on MyPetDex.
      After review, we're unable to approve your application at this time.
    </p>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#991B1B;">
        Common reasons include incomplete business information, service area coverage, or profile details.
        You're welcome to reach out for clarification or to reapply after updating your information.
      </p>
    </div>
    <a href="mailto:help@mypetdex.app?subject=Provider%20Application%20Inquiry"
       style="display:inline-block;background:#4486F4;color:white;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:20px;">
      Contact Support
    </a>
    <p style="font-size:13px;color:#94A3B8;margin:0;">
      Or email us directly at <a href="mailto:help@mypetdex.app" style="color:#4486F4;">help@mypetdex.app</a>
    </p>
  </div>
</div>`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MyPetDex <noreply@mypetdex.app>",
          to: [email],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("notifyProviderStatusChange email failed:", err);
      } else {
        console.log(`notifyProviderStatusChange: sent ${isApproval ? "approval" : "rejection"} email to ${email}`);
      }
    } catch (e) {
      console.error("notifyProviderStatusChange fetch error:", e);
    }
  }
);
