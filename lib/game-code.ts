const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createGameCode(length = 6) {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function normalizeGameCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
