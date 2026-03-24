const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const emailjs = require("@emailjs/nodejs");

admin.initializeApp();
const db = admin.firestore();

exports.sendScheduledReminders = onSchedule("every 60 minutes", async () => {
  const now = new Date();
  const petsSnap = await db.collection("pets").get();

  for (const petDoc of petsSnap.docs) {
    const pet = petDoc.data();
    const reminders = pet.reminders || [];

    for (const reminder of reminders) {
      if (reminder.sent) continue;

      const reminderTime = new Date(`${reminder.date}T${reminder.time}`);
      const diffMinutes = (reminderTime - now) / 1000 / 60;

      if (diffMinutes <= 60 && diffMinutes >= 0) {
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
              publicKey: "pHuUcf_xuyMHp1qPG",
              privateKey: "tGHnJwvPSCyi8XZo8TNlo",
            }
          );

          const updatedReminders = reminders.map((r) =>
            r.id === reminder.id ? { ...r, sent: true } : r
          );
          await db.collection("pets").doc(petDoc.id).update({
            reminders: updatedReminders,
          });

          console.log(`Sent reminder "${reminder.title}" for ${pet.name}`);
        } catch (err) {
          console.error("EmailJS error:", err);
        }
      }
    }
  }
});