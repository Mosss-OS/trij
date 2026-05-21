export function hapticLight() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export function hapticMedium() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(20);
  }
}

export function hapticHeavy() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([30, 50, 30]);
  }
}
