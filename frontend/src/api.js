import { acquireBestLocation } from "./geolocation";

const API = import.meta.env.VITE_API_URL || "/api";
export async function apiRequest(path, options = {}) {
  const multipart = options.body instanceof FormData;
  const headers = {
    ...(options.body && !multipart
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };
  if (options.method && options.method !== "GET")
    headers["X-WHC-Request"] = "wellness-web";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 30_000);
  try {
    const response = await fetch(`${API}${path}`, {
      credentials: "same-origin",
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        payload.error ||
          "We could not complete that request. Please try again.",
      );
      error.status = response.status;
      error.details = payload;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error(
        "The request timed out. Check your connection and try again.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "We cannot reach the service right now. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function acquireLocation() {
  const fix = await acquireBestLocation({ maxAccuracyMeters: 100 });
  return {
    ...fix.coords,
    capturedAt: fix.timestamp,
    sampleCount: fix.sampleCount,
  };
}

export function downloadCsv(filename, rows) {
  const quote = (value) => {
    let cell = String(value ?? "")
      .replace(/[\r\n]+/g, " ")
      .trim();
    if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replaceAll('"', '""')}"`;
  };
  const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
