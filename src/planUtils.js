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
      background: 'rgba(139,92,246,0.07)',
      border: '1px dashed rgba(139,92,246,0.35)',
      borderRadius: '16px',
      textAlign: 'center',
      gap: '12px',
    },
    icon: { fontSize: '2rem' },
    title: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 700,
      fontSize: '1.1rem',
      color: '#f0f4ff',
      margin: 0,
    },
    sub: {
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '0.88rem',
      color: 'rgba(176,190,217,0.65)',
      margin: 0,
    },
    btn: {
      marginTop: '8px',
      padding: '10px 24px',
      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 600,
      fontSize: '0.9rem',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.icon}>🔒</div>
      <p style={styles.title}>{feature} is a {requiredPlan}+ feature</p>
      <p style={styles.sub}>Upgrade to unlock {feature} and more.</p>
      {onUpgrade && (
        <button style={styles.btn} onClick={onUpgrade}>
          Upgrade to {requiredPlan} →
        </button>
      )}
    </div>
  );
}