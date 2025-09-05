export function validatePin(pin) {
  if (pin.length !== 6) return false;
  if (!/^\d+$/.test(pin)) return false;

  // Check for sequential numbers
  const sequential = '0123456789';
  const reverseSequential = '9876543210';
  if (sequential.includes(pin) || reverseSequential.includes(pin)) return false;

  // Check for repeating digits
  if (/^(.)\1+$/.test(pin)) return false;

  return true;
}

export function validateUsername(username) {
  if (username.length < 3) return false;
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
  return true;
}