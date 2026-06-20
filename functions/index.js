const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

const resendKey = defineSecret("RESEND_API_KEY");
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const FROM_EMAIL = "help@mypetdex.app";
const FROM_NAME = "MyPetDex";
const ADMIN_EMAIL = "help@mypetdex.app";

async function sendEmail(keyValue, { to, subject, html, from }) {
  const resend = new Resend(keyValue);
  return resend.emails.send({ from: from || `${FROM_NAME} <${FROM_EMAIL}>`, to, subject, html });
}

// ─── Welcome Email Triggered on New User Document ────────────────────────────
exports.onNewUser = onDocumentCreated(
  { document: "users/{uid}", secrets: [resendKey] },
  async (event) => {
    const profile = event.data.data();
    const { role, email, name, businessName, shelterName } = profile;
    if (!email || !role) return;


    let welcomeMsg = null;
    if (role === "owner") {
      welcomeMsg = {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "Welcome to MyPetDex! 🐾",
        html: ownerWelcomeHTML(name || email.split("@")[0], profile?.plan || "free"),
      };
    } else if (role === "provider") {
      welcomeMsg = {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "Welcome to MyPetDex – Provider Account 🐾",
        html: providerWelcomeHTML(businessName || name || email.split("@")[0]),
      };
    } else if (role === "shelter") {
      welcomeMsg = {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "Welcome to MyPetDex – Shelter Account 🐾",
        html: shelterWelcomeHTML(shelterName || name || email.split("@")[0]),
      };
    }



    const adminMsg = {
      to: ADMIN_EMAIL,
      subject: `✅ New ${role} signup: ${email}`,
      html: adminNotificationHTML(role, email, profile),
    };

    try {
      if (welcomeMsg) await sendEmail(resendKey.value(), { to: welcomeMsg.to, subject: welcomeMsg.subject, html: welcomeMsg.html });
      await sendEmail(resendKey.value(), { to: adminMsg.to, subject: adminMsg.subject, html: adminMsg.html });
      console.log(`Welcome + admin emails sent for ${email} (${role})`);
      await db.collection("stats").doc("public").update({
        userCount: admin.firestore.FieldValue.increment(1)
      });
    } catch (err) {
      console.error("Email error:", err.response?.body || err);
    }
  }
);

// ─── Scheduled Pet Reminders ──────────────────────────────────────────────────
exports.sendScheduledReminders = onSchedule(
  { schedule: "every 5 minutes", secrets: [resendKey] },
  async () => {
    const now = new Date();
    const usersSnap = await db.collection("users").get();
    console.log(`Checking reminders for ${usersSnap.docs.length} users`);

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const petsSnap = await db.collection("users").doc(uid).collection("pets").get();
      if (petsSnap.empty) continue;

      for (const petDoc of petsSnap.docs) {
        const pet = petDoc.data();
        const reminders = pet.reminders || [];

        for (const reminder of reminders) {
          if (reminder.sent || reminder.done) continue;
          const tz = reminder.timezone || "America/New_York";
          let reminderUTC;

          if (reminder.due) {
            // Format: "2026-06-17 02:00 PM"
            const parts = reminder.due.split(" ");
            const datePart = parts[0];
            const timePart = parts[1] || "08:00";
            const meridiem = parts[2];
            let [hours, minutes] = timePart.split(":").map(Number);
            if (meridiem === "AM" && hours === 12) hours = 0;
            if (meridiem === "PM" && hours !== 12) hours += 12;
            const timeStr = String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
            const utcBase = new Date(`${datePart}T${timeStr}:00`);
            const tzOffset =
              new Date(utcBase.toLocaleString("en-US", { timeZone: "UTC" })) -
              new Date(utcBase.toLocaleString("en-US", { timeZone: tz }));
            reminderUTC = new Date(utcBase.getTime() + tzOffset);
          } else if (reminder.date && reminder.time) {
            let timeStr = reminder.time;
            if (timeStr.includes("AM") || timeStr.includes("PM")) {
              const [timePart, meridiem] = timeStr.split(" ");
              let [hours, minutes] = timePart.split(":");
              hours = parseInt(hours);
              if (meridiem === "AM" && hours === 12) hours = 0;
              if (meridiem === "PM" && hours !== 12) hours += 12;
              timeStr = String(hours).padStart(2, "0") + ":" + minutes;
            }
            const utcBase = new Date(`${reminder.date}T${timeStr}:00`);
            const tzOffset =
              new Date(utcBase.toLocaleString("en-US", { timeZone: "UTC" })) -
              new Date(utcBase.toLocaleString("en-US", { timeZone: tz }));
            reminderUTC = new Date(utcBase.getTime() + tzOffset);
          } else {
            continue;
          }

          const diffMinutes = (now - reminderUTC) / 1000 / 60;
          if (diffMinutes >= 0 && diffMinutes <= 5) {
            try {
              const ownerData = userDoc.data();
              const ownerEmail = pet.ownerEmail || ownerData.email;
              const expoPushToken = ownerData.expoPushToken || null;

              if (ownerEmail) {
                try {
                  await sendEmail(resendKey.value(), {
                    to: ownerEmail,
                    subject: `⏰ Reminder: ${reminder.title} for ${pet.name}`,
                    html: reminderHTML(pet.name, reminder.title,
                      reminder.due ? reminder.due.split(" ")[0] : reminder.date,
                      reminder.due ? reminder.due.split(" ").slice(1).join(" ") : reminder.time),
                  });
                } catch (emailErr) { console.error("Email error:", emailErr); }
              }

              // Send via Expo Push API using expoPushToken saved by expo-notifications
              if (expoPushToken && expoPushToken.startsWith("ExponentPushToken")) {
                try {
                  const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Accept": "application/json",
                    },
                    body: JSON.stringify({
                      to: expoPushToken,
                      title: `⏰ Reminder for ${pet.name}`,
                      body: reminder.title,
                      sound: "default",
                      data: { petId: petDoc.id, reminderId: reminder.id },
                    }),
                  });
                  const pushResult = await pushRes.json();
                  if (pushResult.data?.status === "error") {
                    console.error("Expo push error:", pushResult.data.message);
                  } else {
                    console.log("Expo push sent for:", pet.name);
                  }
                } catch (pushErr) { console.error("Push notification error:", pushErr); }
              }

              const updated = reminders.map((r) =>
                r.id === reminder.id ? { ...r, sent: true, done: true } : r
              );
              await petDoc.ref.update({ reminders: updated });
              console.log("Reminder sent:", reminder.title, "for", pet.name);
            } catch (err) {
              console.error("Reminder error:", err);
            }
          }
        }
      }
    }
  }
);

// ─── AI Proxy ─────────────────────────────────────────────────────────────────
exports.aiProxy = onRequest(
  { cors: true, secrets: [resendKey, anthropicKey] },
  async (req, res) => {
    try {
      const PET_RESTRICTION = `\n\nIMPORTANT: You ONLY answer questions related to pets and pet care. If asked about anything unrelated to pets (politics, coding, shopping, travel, finance, etc.), politely decline and redirect: "I'm PetDex AI and I can only help with pet-related questions! 🐾"`;

      const body = req.body;
      // Keep app system prompt but add restriction
      const modifiedBody = {
        ...body,
        system: (body.system || "") + PET_RESTRICTION,
        model: "claude-haiku-4-5-20251001",
        max_tokens: body.max_tokens || 1000,
      };

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(modifiedBody),
      });
      const data = await response.json();
      console.log("Anthropic response status:", response.status);
      console.log("Anthropic response:", JSON.stringify(data).substring(0, 200));
      res.json(data);
    } catch (err) {
      console.error("AI proxy error:", err);
      res.status(500).json({ error: "AI proxy failed" });
    }
  }
);


// ─── Send Welcome Email After Verification ────────────────────────────────────
exports.sendVerifiedEmail = onRequest(
  { cors: true, secrets: [resendKey] },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { role, email, name, profile } = req.body;
    console.log("sendVerifiedEmail called with:", { email, role, plan: profile?.plan });
    if (!email || !role) { res.status(400).send("Missing email or role"); return; }


    let welcomeMsg = null;
    if (role === "owner") {
      welcomeMsg = {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "Welcome to MyPetDex! 🐾",
        html: ownerWelcomeHTML(name || email.split("@")[0], profile?.plan || "free"),
      };
    } else if (role === "provider") {
      welcomeMsg = {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "Welcome to MyPetDex – Provider Account 🐾",
        html: providerWelcomeHTML(name || email.split("@")[0]),
      };
    } else if (role === "shelter") {
      welcomeMsg = {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "Welcome to MyPetDex – Shelter Account 🐾",
        html: shelterWelcomeHTML(name || email.split("@")[0]),
      };
    }

    try {
      const adminMsg = {
        to: ADMIN_EMAIL,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `✅ Verified ${role} signup: ${email}`,
        html: adminNotificationHTML(role, email, profile || {}),
      };
      if (welcomeMsg) await sendEmail(resendKey.value(), { to: welcomeMsg.to, subject: welcomeMsg.subject, html: welcomeMsg.html });
      await sendEmail(resendKey.value(), { to: adminMsg.to, subject: adminMsg.subject, html: adminMsg.html });
      console.log(`Welcome + admin emails sent for ${email} (${role})`);
      res.status(200).send("Emails sent");
    } catch (err) {
      console.error("SendGrid welcome email error:", err.response?.body || err);
      res.status(500).send("Failed to send welcome email");
    }
  }
);

// ─── Brand Constants ──────────────────────────────────────────────────────────
const BRAND_BLUE = "#4486F4";
const APP_STORE_URL = "https://apps.apple.com/app/mypetdex/id6772248051";
const LOGO_URL = "https://home.mypetdex.app/images/logo.png";
const WEBSITE_URL = "https://home.mypetdex.app";

// ─── Email Base Template ──────────────────────────────────────────────────────
function emailBase(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background-color:#F0F4FF; font-family:'Helvetica Neue',Arial,sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; padding:40px 20px; }
    .header { text-align:center; margin-bottom:28px; }
    .header-inner { background:linear-gradient(135deg,#4486F4 0%,#2563EB 100%); border-radius:18px 18px 0 0; padding:28px 20px 20px; margin-bottom:0; }
    .logo-wrap { display:inline-flex; align-items:center; gap:12px; }
    .app-name { color:#FFFFFF; font-size:28px; font-weight:900; margin:0; letter-spacing:-0.5px; }
    .tagline { color:rgba(255,255,255,0.8); font-size:13px; margin:4px 0 0; }
    .card { background-color:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:0 0 18px 18px; padding:32px; margin-bottom:20px; }
    .card-standalone { background-color:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:18px; padding:32px; margin-bottom:20px; }
    h1 { color:#1E293B; font-size:22px; font-weight:900; margin:0 0 16px; }
    p { color:#64748B; font-size:15px; line-height:1.7; margin:0 0 12px; }
    .highlight { color:#1E293B; font-weight:700; }
    .blue { color:#4486F4; font-weight:700; }
    .green { color:#22C55E; font-weight:700; }
    .gold { color:#F5C842; font-weight:700; }
    .feature { display:flex; gap:12px; margin-bottom:12px; align-items:flex-start; }
    .feature-icon { font-size:20px; min-width:28px; }
    .feature-text { color:#64748B; font-size:14px; line-height:1.6; padding-top:2px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#4486F4 0%,#2563EB 100%); color:#FFFFFF !important; font-weight:900; font-size:15px; padding:14px 36px; border-radius:12px; text-decoration:none; margin:16px 0; box-shadow:0 4px 14px rgba(68,134,244,0.4); }
    .btn-outline { display:inline-block; border:2px solid #4486F4; color:#4486F4 !important; font-weight:700; font-size:14px; padding:10px 24px; border-radius:10px; text-decoration:none; margin:8px 0; }
    .footer { text-align:center; color:#94A3B8; font-size:12px; margin-top:24px; line-height:2; }
    .footer a { color:#4486F4; text-decoration:none; }
    .divider { border:none; border-top:1px solid #E2E8F0; margin:22px 0; }
    .badge { display:inline-block; background-color:rgba(68,134,244,0.1); color:#4486F4; border-radius:8px; padding:4px 12px; font-size:12px; font-weight:700; border:1px solid rgba(68,134,244,0.2); }
    .notice { background-color:rgba(245,200,66,0.1); border:1px solid rgba(245,200,66,0.3); border-radius:10px; padding:12px 16px; margin-top:16px; }
    .notice-blue { background-color:rgba(68,134,244,0.06); border:1px solid rgba(68,134,244,0.2); border-radius:12px; padding:16px; margin:16px 0; text-align:center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-inner">
        <div class="logo-wrap">
          <img src="${LOGO_URL}" alt="MyPetDex" style="width:52px;height:52px;object-fit:contain;border-radius:12px;" />
          <div>
            <div class="app-name">MyPetDex</div>
            <div class="tagline">Your pet's complete digital home</div>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
    ${content}
    </div>
    <div class="footer">
      <p>© 2026 MyPetDex &nbsp;·&nbsp; <a href="mailto:help@mypetdex.app">help@mypetdex.app</a> &nbsp;·&nbsp; <a href="${WEBSITE_URL}">mypetdex.app</a></p>
      <p>You received this email because you have a MyPetDex account.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Pet Owner Welcome ────────────────────────────────────────────────────────
function ownerWelcomeHTML(name, plan = "free") {
  const isFree = plan === "free";
  const isPlus = plan === "plus";
  const isFamily = plan === "family";

  const planBadge = isFree
    ? `<div style="text-align:center;margin-bottom:16px;"><span class="badge">🎉 Welcome to MyPetDex — Free Plan</span></div>`
    : isPlus
    ? `<div style="text-align:center;margin-bottom:16px;"><span class="badge">⭐ Plus Plan Active</span></div>`
    : `<div style="text-align:center;margin-bottom:16px;"><span class="badge">👑 Family Plan Active</span></div>`;

  const aiFeature = (isFree)
    ? `<div class="feature"><span class="feature-icon" style="opacity:0.4">🤖</span><div class="feature-text" style="color:#94a3b8;"><span style="text-decoration:line-through">AI Pet Assistant</span> — <a href="https://home.mypetdex.app/#pricing" style="color:#3B82F6;">Upgrade to Plus</a></div></div>`
    : `<div class="feature"><span class="feature-icon">🤖</span><div class="feature-text"><span class="highlight">AI Pet Assistant</span> — Get personalized pet care advice instantly</div></div>`;

  const recipesFeature = isFree
    ? `<div class="feature"><span class="feature-icon" style="opacity:0.4">🍽️</span><div class="feature-text" style="color:#94a3b8;"><span style="text-decoration:line-through">Pet Recipes</span> — <a href="https://home.mypetdex.app/#pricing" style="color:#3B82F6;">Upgrade to Plus</a></div></div>`
    : `<div class="feature"><span class="feature-icon">🍽️</span><div class="feature-text"><span class="highlight">Pet Recipes</span> — AI-powered balanced meal generator</div></div>`;

  const petsFeature = isFree
    ? `<div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">1 Pet Profile</span> — Add your pet and keep their info in one place. <a href="https://home.mypetdex.app/#pricing" style="color:#3B82F6;">Upgrade for more pets</a></div></div>`
    : isPlus
    ? `<div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">Up to 3 Pet Profiles</span> — Add all your pets and keep their info in one place</div></div>`
    : `<div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">Unlimited Pet Profiles</span> — Add all your pets and keep their info in one place</div></div>`;

  const upgradeSection = isFree
    ? `<hr class="divider">
      <div class="notice" style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#3B82F6;font-weight:800;font-size:14px;margin:0 0 8px;">🎁 Try all Plus features free for 30 days — no credit card required</p>
        <p style="color:#64748B;font-size:13px;margin:0 0 12px;">Try all Plus features free for 30 days — no credit card required.</p>
        <a href="https://home.mypetdex.app/#pricing" style="display:inline-block;background:#3B82F6;color:#fff;padding:10px 24px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;">Explore Plans →</a>
      </div>`
    : "";

  return emailBase(`
      <h1>Welcome to MyPetDex, ${name}! 🐾</h1>
      ${planBadge}
      <p>We're thrilled to have you and your furry family on board. Here's everything waiting for you:</p>
      <hr class="divider">
      ${petsFeature}
      <div class="feature"><span class="feature-icon">💉</span><div class="feature-text"><span class="highlight">Vaccine Tracker</span> — Log vaccinations and never miss a booster</div></div>
      <div class="feature"><span class="feature-icon">⏰</span><div class="feature-text"><span class="highlight">Smart Reminders</span> — Get notified before vet visits and appointments</div></div>
      <div class="feature"><span class="feature-icon">🛎️</span><div class="feature-text"><span class="highlight">Find Services</span> — Discover trusted groomers, walkers, and vets near you</div></div>
      <div class="feature"><span class="feature-icon">❤️</span><div class="feature-text"><span class="highlight">Adopt a Pet</span> — Browse adoptable pets from verified shelters</div></div>
      ${aiFeature}
      ${recipesFeature}
      ${upgradeSection}
      <hr class="divider">
      <center><a href="${APP_STORE_URL}" class="btn">📱 Download MyPetDex →</a></center>
      <p style="text-align:center;font-size:13px;margin-top:12px;">Questions? Just reply to this email — we're always happy to help.</p>
  `);
}

// ─── Service Provider Welcome ─────────────────────────────────────────────────
function providerWelcomeHTML(name) {
  return emailBase(`
      <h1>Welcome to MyPetDex, ${name}! 🛎️</h1>
      <p>Your service provider account is set up. Here's what to do next to go live:</p>
      <hr class="divider">
      <div class="feature"><span class="feature-icon">📋</span><div class="feature-text"><span class="highlight">Step 1 — Submit Your Documents</span><br>Reply to this email with the following to activate your listing:</div></div>
      <div style="background:#F0F4FF;border-radius:10px;padding:14px 16px;margin:0 0 14px 40px;">
        <div style="color:#64748B;font-size:13px;line-height:2;">
          ✓ &nbsp;Business License<br>
          ✓ &nbsp;Google Business Page link<br>
          ✓ &nbsp;Google Reviews Page link
        </div>
      </div>
      <div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">Step 2 — Get Listed</span><br>Once verified, pet owners in your area can discover and book your services</div></div>
      <div class="feature"><span class="feature-icon">💰</span><div class="feature-text"><span class="highlight">Pricing</span> — <span class="green">First 6 months completely FREE.</span> After that, just 5% per completed booking. No monthly fees, ever.</div></div>
      <hr class="divider">
      <center><a href="${APP_STORE_URL}" class="btn">📱 Download MyPetDex →</a></center>
      <div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">⏳ Verification usually completes within 24 hours after we receive your documents.</p></div>
  `);
}

// ─── Shelter Welcome ──────────────────────────────────────────────────────────
function shelterWelcomeHTML(name) {
  return emailBase(`
      <h1>Welcome to MyPetDex, ${name}! 🏠</h1>
      <p>Your shelter account has been created. Follow these steps to get verified and start connecting pets with families:</p>
      <hr class="divider">
      <div class="feature"><span class="feature-icon">📋</span><div class="feature-text"><span class="highlight">Step 1 — Submit Your Documents</span><br>Reply to this email with the following to complete verification:</div></div>
      <div style="background:#F0F4FF;border-radius:10px;padding:14px 16px;margin:0 0 14px 40px;">
        <div style="color:#64748B;font-size:13px;line-height:2;">
          ✓ &nbsp;Shelter Name<br>
          ✓ &nbsp;Shelter Website<br>
          ✓ &nbsp;License Number<br>
          ✓ &nbsp;EIN Number
        </div>
      </div>
      <div class="feature"><span class="feature-icon">🐶</span><div class="feature-text"><span class="highlight">Step 2 — Add Adoptable Pets</span><br>Once approved, list pets for adoption — they'll be visible to all MyPetDex users immediately</div></div>
      <div class="feature"><span class="feature-icon">✅</span><div class="feature-text"><span class="highlight">Always FREE</span> — <span class="green">Shelter access on MyPetDex is 100% free, forever. No hidden fees.</span></div></div>
      <hr class="divider">
      <center><a href="${APP_STORE_URL}" class="btn">📱 Download MyPetDex →</a></center>
      <div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">⏳ Shelter accounts are reviewed and approved within 24 hours after documents are received.</p></div>
  `);
}

// ─── Admin Notification ───────────────────────────────────────────────────────
function adminNotificationHTML(role, email, profile) {
  const roleEmoji = { owner: "🐾", provider: "🛎️", shelter: "🏠" }[role] || "👤";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const skipKeys = ["uid", "password", "confirmPassword", "confirm_password", "rePassword"];
  const rows = Object.entries(profile)
    .filter(([k, v]) => !skipKeys.includes(k) && v)
    .map(([k, v]) => `<tr>
      <td style="color:#64748B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;">${k}</td>
      <td style="color:#1E293B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;font-weight:600;">${v}</td>
    </tr>`).join("");

  const actionNote = role === "shelter"
    ? `<div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">⏳ This shelter is pending your approval. Open the admin dashboard to approve or reject.</p></div>`
    : role === "provider"
    ? `<div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">📋 This provider may be waiting for document verification. Check your email for their documents.</p></div>`
    : "";

  return emailBase(`
      <h1>${roleEmoji} New ${roleLabel} Signup</h1>
      <p><span class="highlight">${email}</span> just created a ${role} account on MyPetDex.</p>
      <hr class="divider">
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      <hr class="divider">
      ${actionNote}
      <center><a href="https://app.mypetdex.app/mypetdex-admin" class="btn" style="margin-top:20px;">Open Admin Dashboard →</a></center>
  `);
}

// ─── Reminder Email ───────────────────────────────────────────────────────────
function reminderHTML(petName, title, date, time) {
  return emailBase(`
      <h1>⏰ Reminder for ${petName}</h1>
      <p>This is your scheduled reminder from MyPetDex:</p>
      <hr class="divider">
      <div style="text-align:center;padding:24px 0;background:#F8FAFF;border-radius:12px;margin-bottom:16px;">
        <div style="font-size:48px;margin-bottom:14px;">🐾</div>
        <div style="color:#1E293B;font-size:22px;font-weight:900;margin-bottom:8px;">${title}</div>
        <div style="color:#4486F4;font-size:15px;font-weight:600;">📅 ${date} &nbsp;·&nbsp; 🕐 ${time}</div>
      </div>
      <hr class="divider">
      <center><a href="${APP_STORE_URL}" class="btn">📱 Open MyPetDex →</a></center>
      <p style="text-align:center;font-size:13px;margin-top:12px;">Need to reschedule? Update your reminders anytime in the app.</p>
  `);
}

// ─── Stripe Checkout ──────────────────────────────────────────────────────────
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

exports.createCheckoutSession = onRequest({ secrets: [stripeSecretKey, resendKey], cors: true }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }
  const { priceId, userId, email, plan, billing } = req.body;
  if (!priceId || !userId || !email) { res.status(400).send("Missing required fields"); return; }
  try {
    const stripe = require("stripe")(stripeSecretKey.value());
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 30, metadata: { userId, plan, billing } },
      metadata: { userId, plan, billing },
      payment_method_options: { card: { request_three_d_secure: "automatic" } },
      success_url: "https://app.mypetdex.app?payment=success&plan=" + plan + "&billing=" + (billing || "monthly"),
      cancel_url: "https://app.mypetdex.app?payment=cancelled",
    });
    // Return URL immediately — emails sent after payment confirmed via webhook
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ─── Stripe Webhook ───────────────────────────────────────────────────────────
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

exports.stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret, resendKey], cors: false }, async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    const stripe = require("stripe")(stripeSecretKey.value());
    event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    res.status(400).send("Webhook Error: " + err.message);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, plan, billing } = session.metadata || {};
    // Get email from Firestore to ensure we use the correct account email
    let email = session.customer_email;
    if (userId) {
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) email = userDoc.data().email || email;
      } catch(e) { console.error("Error fetching user email:", e); }
    }
    const planName = plan === "plus" ? "Plus" : "Family";
    const price = billing === "yearly"
      ? (plan === "plus" ? "$28.80/year" : "$48.00/year")
      : (plan === "plus" ? "$3.00/month" : "$5.00/month");

    if (userId) {
      try {
        const customerId = session.customer;
        await db.collection("users").doc(userId).update({ plan, billing: billing || "monthly", stripeCustomerId: customerId });
      } catch (e) { console.error("Firestore update error:", e); }
    }

    try {
      const trialEnd = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString();
      await sendEmail(resendKey.value(), { to: email, subject: `🎉 Welcome to MyPetDex ${planName}!`, html: subscriptionWelcomeHTML(email, planName, price, trialEnd) });
      await sendEmail(resendKey.value(), { to: ADMIN_EMAIL, subject: `💰 New ${planName} subscription: ${email}`, html: subscriptionAdminHTML(email, planName, price, billing, trialEnd) });
      console.log("Payment emails sent for", email, planName);
    } catch(emailErr) { console.error("Payment email error:", emailErr.response?.body || emailErr); }
  }
  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    try {
      // Find user by stripeCustomerId and downgrade to free
      const usersSnap = await db.collection("users").where("stripeCustomerId", "==", customerId).get();
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const email = userDoc.data().email;
        const name = userDoc.data().name || email.split("@")[0];
        await userDoc.ref.update({ plan: "free", billing: null });
        console.log("Downgraded to free:", email);

        // Send cancellation email to user
        try {
          await sendEmail(resendKey.value(), { to: email, subject: "Your MyPetDex subscription has been cancelled", html: cancellationHTML(name) });
          await sendEmail(resendKey.value(), { to: ADMIN_EMAIL, subject: `❌ Subscription cancelled: ${email}`, html: emailBase(`<h1>❌ Subscription Cancelled</h1><table style="width:100%;border-collapse:collapse;"><tr><td style="color:#64748B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;">Email</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;font-weight:600;">${email}</td></tr><tr><td style="color:#64748B;padding:7px 10px;font-size:13px;">Status</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;font-weight:600;">Downgraded to Free</td></tr></table>`) });
        } catch(emailErr) { console.error("Cancellation email error:", emailErr.response?.body || emailErr); }
      }
    } catch(e) { console.error("Cancellation handler error:", e); }
  }

  // Handle subscription updated (cancel_at_period_end)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    try {
      const usersSnap = await db.collection("users").where("stripeCustomerId", "==", customerId).get();
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        await userDoc.ref.update({
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: subscription.cancel_at,
        });
        console.log("Subscription updated:", userDoc.data().email, "cancelAtPeriodEnd:", subscription.cancel_at_period_end);
      }
    } catch(e) { console.error("Subscription updated handler error:", e); }
  }

  res.status(200).json({ received: true });
});

// ─── Stripe Customer Portal ───────────────────────────────────────────────────
exports.createPortalSession = onRequest({ secrets: [stripeSecretKey], cors: true }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }
  const { userId } = req.body;
  if (!userId) { res.status(400).send("Missing userId"); return; }
  try {
    const stripe = require("stripe")(stripeSecretKey.value());
    const userDoc = await db.collection("users").doc(userId).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) { res.status(400).json({ error: "No subscription found" }); return; }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://app.mypetdex.app",
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ─── Welcome Email — fired once when a user's email becomes verified ────────
exports.sendWelcomeEmail = onCall({ cors: true, secrets: [resendKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("Unauthorized");

  const { email } = request.data || {};

  try {
    const userRecord = await admin.auth().getUser(uid);
    const targetEmail = email || userRecord.email;
    if (!targetEmail) throw new Error("No email address on account");

    const userDoc = await db.collection("users").doc(uid).get();
    const d = userDoc.exists ? userDoc.data() : {};
    const role = d.role || "owner";
    const name = d.displayName || targetEmail.split("@")[0];

    let subject, html;
    if (role === "provider") {
      subject = "Welcome to MyPetDex – Provider Account 🐾";
      html = providerWelcomeHTML(d.businessName || name);
    } else if (role === "shelter") {
      subject = "Welcome to MyPetDex – Shelter Account 🐾";
      html = shelterWelcomeHTML(d.shelterName || name);
    } else {
      subject = "Welcome to MyPetDex! 🐾";
      html = ownerWelcomeHTML(name, d.plan || "free");
    }

    await sendEmail(resendKey.value(), { to: targetEmail, subject, html });
    console.log(`Welcome email sent to ${targetEmail} (${role})`);
    return { success: true };
  } catch (err) {
    console.error("sendWelcomeEmail error:", err);
    throw new Error("Failed to send welcome email.");
  }
});

// ─── Admin Notification: New Free Plan Signup ────────────────────────────────
exports.notifyAdminFreeSignup = onCall({ cors: true, secrets: [resendKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("Unauthorized");

  const { email, role } = request.data || {};
  if (!email) throw new Error("Missing email");

  try {
    await sendEmail(resendKey.value(), {
      to: "mypetdexapp@gmail.com",
      subject: "New Free Plan Signup",
      html: emailBase(`
        <h1>🆕 New Free Plan Signup</h1>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;">Email</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;font-weight:600;">${email}</td></tr>
          <tr><td style="color:#64748B;padding:7px 10px;font-size:13px;">Role</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;font-weight:600;">${role || "owner"}</td></tr>
        </table>
      `),
    });
    return { success: true };
  } catch (err) {
    console.error("notifyAdminFreeSignup error:", err);
    throw new Error("Failed to send admin notification.");
  }
});

// ─── Send Branded Verification Email ─────────────────────────────────────────
exports.sendBrandedVerificationEmail = onCall({ cors: true, secrets: [resendKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("Unauthorized");

  const { role, name, businessName, shelterName, plan, continueUrl } = request.data;

  try {
    const userRecord = await admin.auth().getUser(uid);
    const email = userRecord.email;
    if (!email) throw new Error("No email address on account");

    let finalRole = role, finalName = name, finalBusinessName = businessName;
    let finalShelterName = shelterName, finalPlan = plan;
    if (!finalRole) {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const d = userDoc.data();
        finalRole = d.role || "owner";
        finalName = finalName || d.name || "";
        finalBusinessName = finalBusinessName || d.businessName || "";
        finalShelterName = finalShelterName || d.shelterName || "";
        finalPlan = finalPlan || d.pendingPlan || d.plan || "free";
      }
    }

    const verificationLink = await admin.auth().generateEmailVerificationLink(email, {
      url: continueUrl || "https://app.mypetdex.app",
    });

    let displayName = finalName || email.split("@")[0];
    if (finalRole === "provider") displayName = finalBusinessName || displayName;
    if (finalRole === "shelter") displayName = finalShelterName || displayName;

    await sendEmail(resendKey.value(), {
      to: email,
      subject: "Verify your MyPetDex email 🐾",
      html: verificationEmailHTML(displayName, finalRole, finalPlan || "free", verificationLink),
    });

    console.log(`Branded verification email sent to ${email} (${finalRole}, ${finalPlan || "free"})`);
    return { success: true };
  } catch (err) {
    console.error("sendBrandedVerificationEmail error:", err);
    throw new Error("Failed to send verification email. Please try again.");
  }
});

// ─── Send Verification Email (Resend-only — Firebase's default delivery is unreliable) ──
exports.sendVerificationEmail = onCall({ cors: true, secrets: [resendKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new Error("Unauthorized");

  const { email } = request.data || {};

  try {
    const userRecord = await admin.auth().getUser(uid);
    const targetEmail = email || userRecord.email;
    if (!targetEmail) throw new Error("No email address on account");

    const userDoc = await db.collection("users").doc(uid).get();
    const d = userDoc.exists ? userDoc.data() : {};
    const role = d.role || "owner";
    const plan = d.plan || "free";
    let displayName = d.displayName || targetEmail.split("@")[0];
    if (role === "provider") displayName = d.businessName || displayName;
    if (role === "shelter") displayName = d.shelterName || displayName;

    // url + handleCodeInApp lets the verification link deep link back into the
    // app via the "mypetdex" scheme instead of opening a plain web confirmation page
    const actionCodeSettings = { url: "https://mypetdex.app", handleCodeInApp: true };
    const verificationLink = await admin.auth().generateEmailVerificationLink(targetEmail, actionCodeSettings);

    await sendEmail(resendKey.value(), {
      to: targetEmail,
      from: "MyPetDex <noreply@mypetdex.app>",
      subject: "Verify your MyPetDex email",
      html: verificationEmailHTML(displayName, role, plan, verificationLink),
    });

    console.log(`Verification email sent to ${targetEmail} (${role})`);
    return { success: true };
  } catch (err) {
    console.error("sendVerificationEmail error:", err);
    throw new Error("Failed to send verification email. Please try again.");
  }
});

function verificationEmailHTML(name, role, plan, verifyLink) {
  const roleEmoji = { owner: "🐾", provider: "🛎️", shelter: "🏠" }[role] || "🐾";
  const roleLabel = { owner: "Pet Owner", provider: "Service Provider", shelter: "Animal Shelter" }[role] || "Member";
  const planNote = (role === "owner" && (plan === "plus" || plan === "family"))
    ? `<div class="notice-blue">
        <p style="color:#4486F4;font-weight:800;font-size:13px;margin:0 0 4px;">🎁 Your 30-day free ${plan === "plus" ? "Plus" : "Family"} trial is waiting!</p>
        <p style="color:#64748B;font-size:12px;margin:0;">Verify your email to activate it — no credit card needed during the trial.</p>
      </div>` : "";
  const roleNote = role === "provider"
    ? `<p style="color:#64748B;font-size:13px;">Once verified, you can complete your provider profile and start getting discovered by pet owners in your area.</p>`
    : role === "shelter"
    ? `<p style="color:#64748B;font-size:13px;">Once verified, you can submit your shelter documents and start listing adoptable pets for loving families to find.</p>`
    : `<p style="color:#64748B;font-size:13px;">Once verified, you'll have full access to pet profiles, health records, reminders, AI tips, and more.</p>`;
  return emailBase(`
      <h1>${roleEmoji} One quick step, ${name}!</h1>
      <p>Thanks for joining MyPetDex as a <strong>${roleLabel}</strong>. Just verify your email address to activate your account.</p>
      ${planNote}
      ${roleNote}
      <hr class="divider">
      <center><a href="${verifyLink}" class="btn">✅ Verify My Email →</a></center>
      <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px;">This link expires in 24 hours. If you didn't sign up for MyPetDex, you can safely ignore this email.</p>
      <hr class="divider">
      <p style="text-align:center;font-size:13px;">Questions? <a href="mailto:help@mypetdex.app" style="color:#4486F4;">help@mypetdex.app</a></p>
  `);
}

// ─── Public Pet Profile ───────────────────────────────────────────────────────
exports.getPetProfile = onRequest({ cors: true }, async (req, res) => {
  const petId = req.query.petId;
  if (!petId) { res.status(400).json({ error: "Missing petId" }); return; }
  try {
    const petDoc = await db.collection("pets").doc(petId).get();
    if (!petDoc.exists) { res.status(404).json({ error: "Pet not found" }); return; }
    const p = petDoc.data();
    res.status(200).json({
      name: p.name || "",
      type: p.type || "Pet",
      breed: p.breed || "",
      age: p.age || "",
      weight: p.weight || "",
      nextVet: p.nextVet || "",
      feeding: p.feeding || "",
      notes: p.notes || "",
      photoURL: p.photoURL || "",
      vaccines: p.vaccines || [],
    });
  } catch (err) {
    console.error("getPetProfile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Subscription Welcome Email Template ─────────────────────────────────────
function subscriptionWelcomeHTML(email, planName, price, trialEnd) {
  const icon = planName === "Plus" ? "⭐" : "👑";
  return emailBase(`
      <h1>${icon} Welcome to MyPetDex ${planName}!</h1>
      <div class="notice-blue">
        <p style="color:#4486F4;font-weight:800;font-size:15px;margin:0 0 6px;">Your 30-day free trial has started!</p>
        <p style="color:#64748B;font-size:13px;margin:0;">After your trial ends on <strong>${trialEnd}</strong>, you'll be charged <strong>${price}</strong>. Cancel anytime before then.</p>
      </div>
      <hr class="divider">
      <div class="feature"><span class="feature-icon">🤖</span><div class="feature-text"><span class="highlight">AI Pet Assistant</span> — Get personalized pet care advice instantly</div></div>
      <div class="feature"><span class="feature-icon">🍽️</span><div class="feature-text"><span class="highlight">Pet Recipes</span> — AI-powered balanced meal generator</div></div>
      <div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">${planName === "Plus" ? "Up to 3 Pet Profiles" : "Unlimited Pet Profiles"}</span> — All your pets in one place</div></div>
      <div class="feature"><span class="feature-icon">⏰</span><div class="feature-text"><span class="highlight">Smart Reminders</span> — Never miss a vet visit or appointment</div></div>
      <hr class="divider">
      <center><a href="${APP_STORE_URL}" class="btn">📱 Open MyPetDex →</a></center>
      <p style="text-align:center;font-size:13px;margin-top:12px;">Questions? Reply to this email — we're happy to help.</p>
  `);
}

// ─── Subscription Admin Notification Template ─────────────────────────────────
function subscriptionAdminHTML(email, planName, price, billing, trialEnd) {
  return emailBase(`
      <h1>💰 New ${planName} Subscription</h1>
      <p><span class="highlight">${email}</span> just subscribed to MyPetDex ${planName}.</p>
      <hr class="divider">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#64748B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;">Email</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;font-weight:600;">${email}</td></tr>
        <tr><td style="color:#64748B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;">Plan</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;font-weight:600;">${planName} (${price})</td></tr>
        <tr><td style="color:#64748B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;">Billing</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;border-bottom:1px solid #E2E8F0;font-weight:600;">${billing || "monthly"}</td></tr>
        <tr><td style="color:#64748B;padding:7px 10px;font-size:13px;">Trial ends</td><td style="color:#1E293B;padding:7px 10px;font-size:13px;font-weight:600;">${trialEnd}</td></tr>
      </table>
      <hr class="divider">
      <center><a href="https://app.mypetdex.app/mypetdex-admin" class="btn">Open Admin Dashboard →</a></center>
  `);
}

// ─── Cancellation Email Template ──────────────────────────────────────────────
function cancellationHTML(name) {
  return emailBase(`
      <h1>😢 Subscription Cancelled</h1>
      <p>Hi <span class="highlight">${name}</span>, your MyPetDex subscription has been cancelled and your account has been moved to the free plan.</p>
      <hr class="divider">
      <div class="feature"><span class="feature-icon">✅</span><div class="feature-text"><span class="highlight">Your data is safe</span> — Pet profiles, records, and reminders are all still there</div></div>
      <div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">Free plan features</span> — You still have access to 1 pet profile, vaccine tracker, and reminders</div></div>
      <hr class="divider">
      <p style="text-align:center;color:#64748B;font-size:14px;">We'd love to have you back anytime. Resubscribe in the app whenever you're ready.</p>
      <center><a href="${APP_STORE_URL}" class="btn">📱 Open MyPetDex →</a></center>
      <p style="text-align:center;font-size:13px;margin-top:12px;">Questions? <a href="mailto:help@mypetdex.app" style="color:#4486F4;">help@mypetdex.app</a></p>
  `);
}

// ─── Password Reset Email ─────────────────────────────────────────────────────
exports.sendPasswordResetEmail = onCall({ cors: true, secrets: [resendKey] }, async (request) => {
  const { email } = request.data;
  if (!email) throw new Error("Missing email address");

  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: "https://home.mypetdex.app",
    });

    await sendEmail(resendKey.value(), {
      to: email,
      subject: "Reset your MyPetDex password 🔐",
      html: passwordResetEmailHTML(email, resetLink),
    });

    console.log(`Password reset email sent to ${email}`);
    return { success: true };
  } catch (err) {
    console.error("sendPasswordResetEmail error:", err);
    // Don't reveal if email exists or not for security
    return { success: true };
  }
});

function passwordResetEmailHTML(email, resetLink) {
  return emailBase(`
      <h1>🔐 Reset Your Password</h1>
      <p>We received a request to reset the password for your MyPetDex account associated with <span class="highlight">${email}</span>.</p>
      <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <hr class="divider">
      <center><a href="${resetLink}" class="btn">🔐 Reset My Password →</a></center>
      <hr class="divider">
      <div class="notice">
        <p style="color:#92400E;font-size:13px;margin:0;">⚠️ If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      </div>
      <p style="text-align:center;font-size:13px;margin-top:16px;">Need help? <a href="mailto:help@mypetdex.app" style="color:#4486F4;">help@mypetdex.app</a></p>
  `);
}
