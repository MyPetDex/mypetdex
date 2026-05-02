// src/planUtils.js
// ─────────────────────────────────────────────────────────────
// MyPetDex — Plan gating helpers
// Usage: import { canAddPet, hasFeature, PET_LIMIT, UpgradePrompt } from './planUtils';
// ─────────────────────────────────────────────────────────────

// ── Plan config ──────────────────────────────────────────────
export const PLANS = {
  free:   { petLimit: 1,        ai: false, recipes: false, priority: false, early: false, yearly: false },
  plus:   { petLimit: 3,        ai: true,  recipes: true,  priority: false, early: false, yearly: true  },
  family: { petLimit: Infinity, ai: true,  recipes: true,  priority: true,  early: true,  yearly: true  },
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Get the plan object for a user.
 * @param {object} userDoc  — Firestore user document data
 * @returns {object} plan config
 */
export function getPlan(userDoc) {
  const plan = userDoc?.plan || 'free';
  return PLANS[plan] || PLANS.free;
}

/**
 * Returns true if the user can add another pet.
 * @param {object} userDoc  — Firestore user document
 * @param {number} currentPetCount — how many pets they already have
 */
export function canAddPet(userDoc, currentPetCount) {
  const plan = getPlan(userDoc);
  return currentPetCount < plan.petLimit;
}

/**
 * Returns the pet limit for display (e.g. "3" or "Unlimited")
 */
export function getPetLimitLabel(userDoc) {
  const plan = getPlan(userDoc);
  return plan.petLimit === Infinity ? 'Unlimited' : String(plan.petLimit);
}

/**
 * Check if a feature is available on the user's plan.
 * @param {object} userDoc
 * @param {'ai'|'recipes'|'priority'|'early'|'yearly'} feature
 */
export function hasFeature(userDoc, feature) {
  return getPlan(userDoc)[feature] === true;
}

/**
 * Returns plan display name
 */
export function getPlanName(userDoc) {
  const p = userDoc?.plan || 'free';
  return { free: 'Free', plus: 'Plus', family: 'Family' }[p] || 'Free';
}


// ─────────────────────────────────────────────────────────────
// UPGRADE PROMPT COMPONENT
// Drop this anywhere you want to show a locked-feature callout
// ─────────────────────────────────────────────────────────────
//
// Usage:
//   import { UpgradePrompt } from './planUtils';
//
//   <UpgradePrompt
//     feature="AI Assistant"
//     requiredPlan="Plus"
//     onUpgrade={() => setScreen('pricing')}   // or wherever your pricing lives
//   />

export function UpgradePrompt({ feature, requiredPlan = 'Plus', onUpgrade }) {
  const styles = {
    wrap: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'rgba(59,130,246,0.06)',
      border: '1px dashed rgba(59,130,246,0.3)',
      borderRadius: '16px',
      textAlign: 'center',
      gap: '12px',
    },
    icon: { fontSize: '2rem' },
    title: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 700,
      fontSize: '1.1rem',
      color: '#1E293B',
      margin: 0,
    },
    sub: {
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '0.88rem',
      color: '#64748B',
      margin: 0,
    },
    btn: {
      marginTop: '8px',
      padding: '10px 24px',
      background: '#3B82F6',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 700,
      fontSize: '0.9rem',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.icon}>🔒</div>
      <p style={styles.title}>{feature} is a {requiredPlan}+ feature</p>
      <p style={styles.sub}>Upgrade to unlock {feature} and more.</p>
      <button style={styles.btn} onClick={onUpgrade}>
          🎁 Start Free Trial — Upgrade to {requiredPlan}
        </button>
    </div>
  );
}