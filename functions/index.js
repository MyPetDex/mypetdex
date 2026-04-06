const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const emailjs = require("@emailjs/nodejs");

admin.initializeApp();
const db = admin.firestore();

const emailjsKey = defineSecret("EMAILJS_PRIVATE_KEY");
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

exports.sendScheduledReminders = onSchedule(
  { schedule: "every 5 minutes", secrets: [emailjsKey] },
  async () => {
    const now = new Date();
    const petsSnap = await db.collection("pets").get();
    for (const petDoc of petsSnap.docs) {
      const pet = petDoc.data();
      const reminders = pet.reminders || [];
      for (const reminder of reminders) {
        console.log("Checking:", JSON.stringify(reminder));
        if (reminder.sent) continue;
        const tz = reminder.timezone || "America/New_York";
        const localStr = `${reminder.date}T${reminder.time}:00`;
        const utcBase = new Date(localStr);
        const tzOffset =
          new Date(utcBase.toLocaleString("en-US", { timeZone: "UTC" })) -
          new Date(utcBase.toLocaleString("en-US", { timeZone: tz }));
        const reminderUTC = new Date(utcBase.getTime() + tzOffset);
        const diffMinutes = (now - reminderUTC) / 1000 / 60;
        console.log(`diffMinutes (${tz}):`, diffMinutes);
        if (diffMinutes >= 0 && diffMinutes <= 5) {
          try {
            await emailjs.send(
              "service_7k1uaus",
              "template_3dmpdxo",
              {
                to_email: pet.ownerEmail,
                pet_name: pet.name,
                reminder_title: reminder.title,
                reminder_date: reminder.date,
                reminder_time: reminder.time,
              },
              {
                publicKey: "Fp0nQuFeAXba8AMsM",
                privateKey: emailjsKey.value(),
              }
            );
            const updated = reminders.map((r) =>
              r.id === reminder.id ? { ...r, sent: true } : r
            );
            await db.collection("pets").doc(petDoc.id).update({ reminders: updated });
            console.log("Sent:", reminder.title);
          } catch (err) {
            console.error("EmailJS error:", err);
          }
        }
      }
    }
  }
);

exports.aiProxy = onRequest(
  { cors: true, secrets: [emailjsKey, anthropicKey] },
  async (req, res) => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey.value(),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("AI proxy error:", err);
      res.status(500).json({ error: "AI proxy failed" });
    }
  }
);