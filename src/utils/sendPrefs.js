// Send-flow preferences, scoped per account (by DID).

// Skip the send confirmation dialog. The bare key is the legacy global value,
// kept only to seed a new account's preference the first time.
export const SKIP_CONFIRM_LEGACY_KEY = 'xell_skipSendConfirmation';
export const skipConfirmKey = (did) =>
  did ? `${SKIP_CONFIRM_LEGACY_KEY}:${did}` : SKIP_CONFIRM_LEGACY_KEY;

// Read the per-account skip-confirmation preference, seeding from the legacy
// global value if this account has none yet.
export const getSkipConfirm = (did) => {
  if (!did) return false;
  let stored = localStorage.getItem(skipConfirmKey(did));
  if (stored == null) {
    const legacy = localStorage.getItem(SKIP_CONFIRM_LEGACY_KEY);
    if (legacy != null) {
      localStorage.setItem(skipConfirmKey(did), legacy);
      stored = legacy;
    }
  }
  return stored === 'true';
};

export const setSkipConfirm = (did, value) => {
  localStorage.setItem(skipConfirmKey(did), String(value));
};
