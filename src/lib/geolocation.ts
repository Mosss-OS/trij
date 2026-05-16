export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Best-effort browser geolocation. Resolves null instead of rejecting so
 * patient creation never blocks on missing permission, offline GPS, or
 * unsupported browsers.
 */
export function getCurrentPosition(timeoutMs = 8000): Promise<GeoCoords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: GeoCoords | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        finish({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timer);
        finish(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
