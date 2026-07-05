# Cursor Prompt — Add Medications & Vet Contact to Public Pet Profile

## Context
The public pet profile page lives at two places:
- **Cloud Function:** `~/mypetdex/functions/index.js` — function `getPetProfile`
- **HTML page:** `~/mypetdex/public/pet/index.html`

The live URL is `https://app.mypetdex.app/pet/{uid}/{petId}`. When someone scans the QR code or opens the link, `index.html` loads, calls `getPetProfile?uid=X&petId=Y`, and renders the pet data.

We recently added two new fields to the pet Firestore document (`users/{uid}/pets/{petId}`):
- `medications` — array of `{ id, name, dosage, frequency, refillDate, note, active }`
- `vet` — object `{ name, clinic, phone, address, email, notes }`

These need to appear on the public profile page so vets and groomers who scan the QR code can see the pet's medications and vet contact.

---

## Step 1 — Update `~/mypetdex/functions/index.js` (getPetProfile function)

Open `~/mypetdex/functions/index.js` and find the `getPetProfile` function.

Check if it already returns `medications` and `vet` from the pet document. If it returns the full pet document (e.g. `res.json({ ...petData })`), then they're already included — **no change needed to the Cloud Function**.

If it only returns specific whitelisted fields (e.g. `name`, `breed`, `vaccines`, etc.), add `medications` and `vet` to the returned object:

**Find** something like:
```js
res.json({
  name: pet.name,
  species: pet.species,
  breed: pet.breed,
  age: pet.age,
  weight: pet.weight,
  weightUnit: pet.weightUnit,
  sex: pet.sex,
  neutered: pet.neutered,
  licenseNumber: pet.licenseNumber,
  activityLevel: pet.activityLevel,
  photoURL: pet.photoURL,
  vaccines: pet.vaccines || [],
});
```

**Change to:**
```js
res.json({
  name: pet.name,
  species: pet.species,
  breed: pet.breed,
  age: pet.age,
  weight: pet.weight,
  weightUnit: pet.weightUnit,
  sex: pet.sex,
  neutered: pet.neutered,
  licenseNumber: pet.licenseNumber,
  activityLevel: pet.activityLevel,
  photoURL: pet.photoURL,
  vaccines: pet.vaccines || [],
  medications: pet.medications || [],
  vet: pet.vet || null,
});
```

**Deploy command (only getPetProfile — do NOT deploy others):**
```bash
cd ~/mypetdex/functions && firebase deploy --only functions:getPetProfile
```
Type **N** if prompted for `rescueProxy`, `deleteAccount`, or `getPublicStats`.

---

## Step 2 — Update `~/mypetdex/public/pet/index.html`

Open `~/mypetdex/public/pet/index.html`.

### 2a — Add Medications section

Find where the vaccines section is rendered. It likely looks something like:
```js
// vaccines section
if (pet.vaccines && pet.vaccines.length > 0) { ... }
```

**After** the vaccines section, add a medications section. Insert this JavaScript block that builds and injects the medications HTML:

```js
// Medications
if (pet.medications && pet.medications.length > 0) {
  const activeMeds = pet.medications.filter(m => m.active !== false);
  const stoppedMeds = pet.medications.filter(m => m.active === false);

  function buildMedRows(meds) {
    return meds.map(m => {
      const refillHtml = m.refillDate
        ? `<span style="font-size:12px;color:#94a3b8;margin-left:8px;">Refill: ${m.refillDate}</span>`
        : '';
      const dosageHtml = m.dosage
        ? `<div style="font-size:13px;color:#555;margin-top:3px;">💊 ${m.dosage}</div>`
        : '';
      const noteHtml = m.note
        ? `<div style="font-size:12px;color:#94a3b8;font-style:italic;margin-top:3px;">${m.note}</div>`
        : '';
      return `
        <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0;align-items:flex-start;">
          <div style="width:4px;min-height:48px;border-radius:4px;background:${m.active !== false ? '#22C55E' : '#94a3b8'};flex-shrink:0;margin-top:2px;"></div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
              <span style="font-size:15px;font-weight:700;color:#0f172a;">${m.name}</span>
              ${refillHtml}
            </div>
            ${dosageHtml}
            <div style="font-size:13px;color:#64748b;margin-top:3px;">🔁 ${m.frequency || 'Daily'}</div>
            ${noteHtml}
          </div>
        </div>`;
    }).join('');
  }

  let medsHtml = '';
  if (activeMeds.length > 0) {
    medsHtml += `
      <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Active</div>
      ${buildMedRows(activeMeds)}`;
  }
  if (stoppedMeds.length > 0) {
    medsHtml += `
      <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-top:12px;margin-bottom:4px;">Stopped</div>
      ${buildMedRows(stoppedMeds)}`;
  }

  const medsSection = document.createElement('div');
  medsSection.style.cssText = 'background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);';
  medsSection.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#4486f4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">💊 Medications</div>
    ${medsHtml}
  `;
  // Insert after vaccines section — find the container and append
  document.querySelector('#content').appendChild(medsSection);
}
```

### 2b — Add Vet Contact section

**After** the medications section insertion, add this:

```js
// Vet Contact
if (pet.vet && pet.vet.name) {
  const v = pet.vet;

  const phoneHtml = v.phone
    ? `<a href="tel:${v.phone.replace(/\D/g,'')}" style="display:block;font-size:14px;color:#4486f4;font-weight:600;text-decoration:none;margin-top:6px;">📞 ${v.phone}</a>`
    : '';
  const clinicHtml = v.clinic
    ? `<div style="font-size:13px;color:#555;margin-top:4px;">🏥 ${v.clinic}</div>`
    : '';
  const addressHtml = v.address
    ? `<div style="font-size:13px;color:#555;margin-top:4px;">📍 ${v.address}</div>`
    : '';
  const emailHtml = v.email
    ? `<a href="mailto:${v.email}" style="display:block;font-size:13px;color:#4486f4;text-decoration:none;margin-top:4px;">✉️ ${v.email}</a>`
    : '';
  const notesHtml = v.notes
    ? `<div style="font-size:12px;color:#94a3b8;font-style:italic;margin-top:6px;">${v.notes}</div>`
    : '';

  const vetSection = document.createElement('div');
  vetSection.style.cssText = 'background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);';
  vetSection.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#4486f4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">🏥 Vet Contact</div>
    <div style="font-size:15px;font-weight:700;color:#0f172a;">${v.name}</div>
    ${clinicHtml}
    ${phoneHtml}
    ${addressHtml}
    ${emailHtml}
    ${notesHtml}
  `;
  document.querySelector('#content').appendChild(vetSection);
}
```

### Important notes for Cursor:
- The exact container selector (`#content`) may differ — look at the existing HTML structure and use whatever div wraps the sections (vaccines section, pet details section, etc.) and use the same parent container.
- Keep the existing page structure, styles, and branding completely unchanged.
- Only add the two new sections after the existing content.

**Deploy command (just a git push — Vercel auto-deploys):**
```bash
cd ~/mypetdex && git add public/pet/index.html && git commit -m "Public pet profile: add medications and vet contact sections" && git push
```

---

## Summary
- Step 1: Check/update `getPetProfile` to return `medications` and `vet` → deploy the function
- Step 2: Add medications + vet sections to `public/pet/index.html` → git push
- No changes to the iOS app needed
- No `eas update` needed — this is web only
