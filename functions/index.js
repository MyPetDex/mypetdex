const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
const db = admin.firestore();

const sendgridKey = defineSecret("SENDGRID_API_KEY");
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const FROM_EMAIL = "help@mypetdex.app";
const FROM_NAME = "MyPetDex";
const ADMIN_EMAIL = "help@mypetdex.app";

// ─── Welcome Email Triggered on New User Document ────────────────────────────
exports.onNewUser = onDocumentCreated(
  { document: "users/{uid}", secrets: [sendgridKey] },
  async (event) => {
    const profile = event.data.data();
    const { role, email, name, businessName, shelterName } = profile;
    if (!email || !role) return;

    sgMail.setApiKey(sendgridKey.value());

    let welcomeMsg = null;
    if (role === "owner") {
      welcomeMsg = {
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "Welcome to MyPetDex! 🐾",
        html: ownerWelcomeHTML(name || email.split("@")[0]),
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
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `New ${role} signup: ${email}`,
      html: adminNotificationHTML(role, email, profile),
    };

    try {
      if (welcomeMsg) await sgMail.send(welcomeMsg);
      await sgMail.send(adminMsg);
      console.log(`Emails sent for ${email} (${role})`);
    } catch (err) {
      console.error("SendGrid error:", err.response?.body || err);
    }
  }
);

// ─── Scheduled Pet Reminders ──────────────────────────────────────────────────
exports.sendScheduledReminders = onSchedule(
  { schedule: "every 5 minutes", secrets: [sendgridKey] },
  async () => {
    sgMail.setApiKey(sendgridKey.value());
    const now = new Date();
    const petsSnap = await db.collection("pets").get();
    for (const petDoc of petsSnap.docs) {
      const pet = petDoc.data();
      const reminders = pet.reminders || [];
      for (const reminder of reminders) {
        if (reminder.sent) continue;
        const tz = reminder.timezone || "America/New_York";
        const localStr = `${reminder.date}T${reminder.time}:00`;
        const utcBase = new Date(localStr);
        const tzOffset =
          new Date(utcBase.toLocaleString("en-US", { timeZone: "UTC" })) -
          new Date(utcBase.toLocaleString("en-US", { timeZone: tz }));
        const reminderUTC = new Date(utcBase.getTime() + tzOffset);
        const diffMinutes = (now - reminderUTC) / 1000 / 60;
        if (diffMinutes >= 0 && diffMinutes <= 5) {
          try {
            await sgMail.send({
              to: pet.ownerEmail,
              from: { email: FROM_EMAIL, name: FROM_NAME },
              subject: `⏰ Reminder: ${reminder.title} for ${pet.name}`,
              html: reminderHTML(pet.name, reminder.title, reminder.date, reminder.time),
            });
            const updated = reminders.map((r) =>
              r.id === reminder.id ? { ...r, sent: true } : r
            );
            await db.collection("pets").doc(petDoc.id).update({ reminders: updated });
            console.log("Reminder sent:", reminder.title);
          } catch (err) {
            console.error("SendGrid reminder error:", err.response?.body || err);
          }
        }
      }
    }
  }
);

// ─── AI Proxy ─────────────────────────────────────────────────────────────────
exports.aiProxy = onRequest(
  { cors: true, secrets: [sendgridKey, anthropicKey] },
  async (req, res) => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("AI proxy error:", err);
      res.status(500).json({ error: "AI proxy failed" });
    }
  }
);

// ─── Email Base Template ──────────────────────────────────────────────────────
function emailBase(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background-color:#0F1A14; font-family:'Helvetica Neue',Arial,sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; padding:40px 20px; }
    .header { text-align:center; margin-bottom:32px; }
    .logo { font-size:52px; }
    .app-name { color:#3DD68C; font-size:30px; font-weight:900; margin:8px 0 0; letter-spacing:-1px; }
    .card { background-color:#16251B; border:1.5px solid #1E3526; border-radius:18px; padding:32px; margin-bottom:20px; }
    h1 { color:#EFF6F1; font-size:22px; font-weight:900; margin:0 0 16px; }
    p { color:#7A9E89; font-size:15px; line-height:1.7; margin:0 0 12px; }
    .highlight { color:#EFF6F1; font-weight:700; }
    .green { color:#3DD68C; font-weight:700; }
    .gold { color:#F5C842; font-weight:700; }
    .feature { display:flex; gap:12px; margin-bottom:12px; align-items:flex-start; }
    .feature-icon { font-size:20px; min-width:28px; }
    .feature-text { color:#7A9E89; font-size:14px; line-height:1.6; padding-top:2px; }
    .btn { display:inline-block; background-color:#3DD68C; color:#0F1A14 !important; font-weight:900; font-size:15px; padding:14px 36px; border-radius:12px; text-decoration:none; margin:16px 0; }
    .footer { text-align:center; color:#7A9E89; font-size:12px; margin-top:32px; line-height:2; }
    .footer a { color:#3DD68C; text-decoration:none; }
    .divider { border:none; border-top:1px solid #1E3526; margin:22px 0; }
    .badge { display:inline-block; background-color:rgba(61,214,140,0.15); color:#3DD68C; border-radius:8px; padding:4px 12px; font-size:12px; font-weight:700; }
    .notice { background-color:rgba(245,200,66,0.1); border:1px solid rgba(245,200,66,0.3); border-radius:10px; padding:12px 16px; margin-top:16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">🐾</div>
      <div class="app-name">MyPetDex</div>
    </div>
    ${content}
    <div class="footer">
      <p>© 2026 MyPetDex &nbsp;·&nbsp; <a href="mailto:help@mypetdex.app">help@mypetdex.app</a></p>
      <p>You received this because you signed up at <a href="https://app.mypetdex.app">app.mypetdex.app</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Pet Owner Welcome ────────────────────────────────────────────────────────
function ownerWelcomeHTML(name) {
  return emailBase(`
    <div class="card">
      <h1>Welcome to MyPetDex, ${name}! 🐾</h1>
      <p>We're thrilled to have you and your furry family on board. Here's everything waiting for you:</p>
      <hr class="divider">
      <div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">Pet Profiles</span> — Add all your pets and keep their info in one place</div></div>
      <div class="feature"><span class="feature-icon">💉</span><div class="feature-text"><span class="highlight">Vaccine Tracker</span> — Log vaccinations and never miss a booster</div></div>
      <div class="feature"><span class="feature-icon">⏰</span><div class="feature-text"><span class="highlight">Smart Reminders</span> — Get notified before vet visits and appointments</div></div>
      <div class="feature"><span class="feature-icon">🛎️</span><div class="feature-text"><span class="highlight">Find Services</span> — Discover trusted groomers, walkers, and vets near you</div></div>
      <div class="feature"><span class="feature-icon">❤️</span><div class="feature-text"><span class="highlight">Adopt a Pet</span> — Browse adoptable pets from verified shelters</div></div>
      <hr class="divider">
      <center><a href="https://app.mypetdex.app" class="btn">Open MyPetDex →</a></center>
      <p style="text-align:center;font-size:13px;margin-top:12px;">Questions? Just reply to this email — we're always happy to help.</p>
    </div>
  `);
}

// ─── Service Provider Welcome ─────────────────────────────────────────────────
function providerWelcomeHTML(name) {
  return emailBase(`
    <div class="card">
      <h1>Welcome to MyPetDex, ${name}! 🛎️</h1>
      <p>Your service provider account is set up. Here's what to do next to go live:</p>
      <hr class="divider">
      <div class="feature"><span class="feature-icon">📋</span><div class="feature-text"><span class="highlight">Step 1 — Submit Your Documents</span><br>Reply to this email with the following to activate your listing:</div></div>
      <div style="background:#0F1A14;border-radius:10px;padding:14px 16px;margin:0 0 14px 40px;">
        <div style="color:#7A9E89;font-size:13px;line-height:2;">
          ✓ &nbsp;Business License<br>
          ✓ &nbsp;Google Business Page link<br>
          ✓ &nbsp;Google Reviews Page link
        </div>
      </div>
      <div class="feature"><span class="feature-icon">🐾</span><div class="feature-text"><span class="highlight">Step 2 — Get Listed</span><br>Once verified, pet owners in your area can discover and book your services</div></div>
      <div class="feature"><span class="feature-icon">💰</span><div class="feature-text"><span class="highlight">Pricing</span> — <span class="green">First 6 months completely FREE.</span> After that, just 5% per completed booking. No monthly fees, ever.</div></div>
      <hr class="divider">
      <center><a href="https://app.mypetdex.app" class="btn">View My Account →</a></center>
      <div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">⏳ Verification usually completes within 24 hours after we receive your documents.</p></div>
    </div>
  `);
}

// ─── Shelter Welcome ──────────────────────────────────────────────────────────
function shelterWelcomeHTML(name) {
  return emailBase(`
    <div class="card">
      <h1>Welcome to MyPetDex, ${name}! 🏠</h1>
      <p>Your shelter account has been created. Follow these steps to get verified and start connecting pets with families:</p>
      <hr class="divider">
      <div class="feature"><span class="feature-icon">📋</span><div class="feature-text"><span class="highlight">Step 1 — Submit Your Documents</span><br>Reply to this email with the following to complete verification:</div></div>
      <div style="background:#0F1A14;border-radius:10px;padding:14px 16px;margin:0 0 14px 40px;">
        <div style="color:#7A9E89;font-size:13px;line-height:2;">
          ✓ &nbsp;Shelter Name<br>
          ✓ &nbsp;Shelter Website<br>
          ✓ &nbsp;License Number<br>
          ✓ &nbsp;EIN Number
        </div>
      </div>
      <div class="feature"><span class="feature-icon">🐶</span><div class="feature-text"><span class="highlight">Step 2 — Add Adoptable Pets</span><br>Once approved, list pets for adoption — they'll be visible to all MyPetDex users immediately</div></div>
      <div class="feature"><span class="feature-icon">✅</span><div class="feature-text"><span class="highlight">Always FREE</span> — <span class="green">Shelter access on MyPetDex is 100% free, forever. No hidden fees.</span></div></div>
      <hr class="divider">
      <center><a href="https://app.mypetdex.app" class="btn">View My Account →</a></center>
      <div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">⏳ Shelter accounts are reviewed and approved within 24 hours after documents are received.</p></div>
    </div>
  `);
}

// ─── Admin Notification ───────────────────────────────────────────────────────
function adminNotificationHTML(role, email, profile) {
  const roleEmoji = { owner: "🐾", provider: "🛎️", shelter: "🏠" }[role] || "👤";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const skipKeys = ["uid", "password"];
  const rows = Object.entries(profile)
    .filter(([k, v]) => !skipKeys.includes(k) && v)
    .map(([k, v]) => `<tr>
      <td style="color:#7A9E89;padding:7px 10px;font-size:13px;border-bottom:1px solid #1E3526;">${k}</td>
      <td style="color:#EFF6F1;padding:7px 10px;font-size:13px;border-bottom:1px solid #1E3526;font-weight:600;">${v}</td>
    </tr>`).join("");

  const actionNote = role === "shelter"
    ? `<div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">⏳ This shelter is pending your approval. Open the admin dashboard to approve or reject.</p></div>`
    : role === "provider"
    ? `<div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">📋 This provider may be waiting for document verification. Check your email for their documents.</p></div>`
    : "";

  return emailBase(`
    <div class="card">
      <h1>${roleEmoji} New ${roleLabel} Signup</h1>
      <p><span class="highlight">${email}</span> just created a ${role} account on MyPetDex.</p>
      <hr class="divider">
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      <hr class="divider">
      ${actionNote}
      <center><a href="https://app.mypetdex.app" class="btn" style="margin-top:20px;">Open Admin Dashboard →</a></center>
    </div>
  `);
}

// ─── Reminder Email ───────────────────────────────────────────────────────────
function reminderHTML(petName, title, date, time) {
  return emailBase(`
    <div class="card">
      <h1>⏰ Reminder for ${petName}</h1>
      <p>This is your scheduled reminder from MyPetDex:</p>
      <hr class="divider">
      <div style="text-align:center;padding:24px 0;">
        <div style="font-size:48px;margin-bottom:14px;">🐾</div>
        <div style="color:#EFF6F1;font-size:22px;font-weight:900;margin-bottom:8px;">${title}</div>
        <div style="color:#7A9E89;font-size:15px;">📅 ${date} &nbsp;·&nbsp; 🕐 ${time}</div>
      </div>
      <hr class="divider">
      <center><a href="https://app.mypetdex.app" class="btn">Open MyPetDex →</a></center>
      <p style="text-align:center;font-size:13px;margin-top:12px;">Need to reschedule? Update your reminders anytime in the app.</p>
    </div>
  `);
}
