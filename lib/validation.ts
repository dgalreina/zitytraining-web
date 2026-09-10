// Misma regla que el backend (IsStrongPassword): al menos 8 caracteres,
// una mayúscula, una minúscula, un número y un símbolo.
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const STRONG_PASSWORD_HINT =
  'Al menos 8 caracteres, con mayúsculas, minúsculas, números y algún símbolo.';
