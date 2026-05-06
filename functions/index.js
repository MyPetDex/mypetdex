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



    try {
      console.log(`New user created: ${email} (${role}) — welcome email will send after verification`);
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
  { cors: true, secrets: [sendgridKey] },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { role, email, name, profile } = req.body;
    console.log("sendVerifiedEmail called with:", { email, role, plan: profile?.plan });
    if (!email || !role) { res.status(400).send("Missing email or role"); return; }

    sgMail.setApiKey(sendgridKey.value());

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
      if (welcomeMsg) await sgMail.send(welcomeMsg);
      await sgMail.send(adminMsg);
      console.log(`Welcome + admin emails sent for ${email} (${role})`);
      res.status(200).send("Emails sent");
    } catch (err) {
      console.error("SendGrid welcome email error:", err.response?.body || err);
      res.status(500).send("Failed to send welcome email");
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
    body { margin:0; padding:0; background-color:#F5F8FF; font-family:'Helvetica Neue',Arial,sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; padding:40px 20px; }
    .header { text-align:center; margin-bottom:32px; }
    .logo { font-size:52px; }
    .app-name { color:#3B82F6; font-size:30px; font-weight:900; margin:8px 0 0; letter-spacing:-1px; }
    .card { background-color:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:18px; padding:32px; margin-bottom:20px; }
    h1 { color:#1E293B; font-size:22px; font-weight:900; margin:0 0 16px; }
    p { color:#64748B; font-size:15px; line-height:1.7; margin:0 0 12px; }
    .highlight { color:#1E293B; font-weight:700; }
    .green { color:#3B82F6; font-weight:700; }
    .gold { color:#F5C842; font-weight:700; }
    .feature { display:flex; gap:12px; margin-bottom:12px; align-items:flex-start; }
    .feature-icon { font-size:20px; min-width:28px; }
    .feature-text { color:#64748B; font-size:14px; line-height:1.6; padding-top:2px; }
    .btn { display:inline-block; background-color:#3B82F6; color:#FFFFFF !important; font-weight:900; font-size:15px; padding:14px 36px; border-radius:12px; text-decoration:none; margin:16px 0; }
    .footer { text-align:center; color:#64748B; font-size:12px; margin-top:32px; line-height:2; }
    .footer a { color:#3B82F6; text-decoration:none; }
    .divider { border:none; border-top:1px solid #E2E8F0; margin:22px 0; }
    .badge { display:inline-block; background-color:rgba(61,214,140,0.15); color:#3B82F6; border-radius:8px; padding:4px 12px; font-size:12px; font-weight:700; }
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
function ownerWelcomeHTML(name, plan = "free") {
  const isFree = plan === "free";
  const isPlus = plan === "plus";
  const isFamily = plan === "family";

  const planBadge = isFree
    ? `<div style="text-align:center;margin-bottom:16px;"><span class="badge">🎉 Free Plan — 1 Month Trial of Plus included!</span></div>`
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
        <p style="color:#3B82F6;font-weight:800;font-size:14px;margin:0 0 8px;">🎁 Your 1-Month Free Trial is Active!</p>
        <p style="color:#64748B;font-size:13px;margin:0 0 12px;">Try all Plus features free for 30 days — no credit card required.</p>
        <a href="https://home.mypetdex.app/#pricing" style="display:inline-block;background:#3B82F6;color:#fff;padding:10px 24px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;">Explore Plans →</a>
      </div>`
    : "";

  return emailBase(`
    <div class="card">
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
      <center><a href="https://app.mypetdex.app" class="btn">View My Account →</a></center>
      <div class="notice"><p style="color:#F5C842;font-size:13px;margin:0;">⏳ Shelter accounts are reviewed and approved within 24 hours after documents are received.</p></div>
    </div>
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
        <div style="color:#1E293B;font-size:22px;font-weight:900;margin-bottom:8px;">${title}</div>
        <div style="color:#64748B;font-size:15px;">📅 ${date} &nbsp;·&nbsp; 🕐 ${time}</div>
      </div>
      <hr class="divider">
      <center><a href="https://app.mypetdex.app" class="btn">Open MyPetDex →</a></center>
      <p style="text-align:center;font-size:13px;margin-top:12px;">Need to reschedule? Update your reminders anytime in the app.</p>
    </div>
  `);
}

// ─── Stripe Checkout ──────────────────────────────────────────────────────────
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

exports.createCheckoutSession = onRequest({ secrets: [stripeSecretKey, sendgridKey], cors: true }, async (req, res) => {
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
      success_url: "https://app.mypetdex.app?payment=success&plan=" + plan + "&billing=" + (billing || "monthly"),
      cancel_url: "https://app.mypetdex.app?payment=cancelled",
    });
    // Return URL immediately, send email in background
    res.status(200).json({ url: session.url });
    // Send payment confirmation email
    const planName = plan === "plus" ? "Plus" : "Family";
    const price = billing === "yearly"
      ? (plan === "plus" ? "$28.80/year" : "$48.00/year")
      : (plan === "plus" ? "$3.00/month" : "$5.00/month");
    sgMail.setApiKey(sendgridKey.value());
    try {
      await sgMail.send({
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `🎉 Welcome to MyPetDex ${planName}!`,
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#F5F8FF;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">🐾</div>
            <h1 style="color:#3B82F6;">MyPetDex ${planName}</h1>
          </div>
          <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #E2E8F0;">
            <h2 style="color:#1E293B;margin:0 0 8px;">Your 30-day free trial has started!</h2>
            <p style="color:#64748B;margin:0;">After your trial, you'll be charged ${price}/month. Cancel anytime before the trial ends.</p>
          </div>
          <p style="color:#1E293B;">Your <strong>${planName} plan</strong> is now active. Enjoy all your premium features!</p>
          <a href="https://app.mypetdex.app" style="display:inline-block;background:#3B82F6;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:16px;">Open MyPetDex →</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Questions? Contact us at help@mypetdex.app</p>
        </div>`
      });
      await sgMail.send({
        to: ADMIN_EMAIL,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `💰 New ${planName} subscription: ${email}`,
        html: `<div style="font-family:sans-serif;padding:24px;">
          <h2>💰 New Subscription!</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Plan:</strong> ${planName} (${price}/month)</p>
          <p><strong>Trial ends:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
        </div>`
      });
      console.log("Payment emails sent for", email, planName);
    } catch(emailErr) { console.error("Payment email error:", emailErr.response?.body || emailErr); }
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});
