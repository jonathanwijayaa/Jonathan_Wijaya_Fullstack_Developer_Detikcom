export { cn } from "cn";

/**
 * Format timestamp ke HH:mm dalam timezone Asia/Jakarta.
 * Placeholder default adalah "--:--".
 */
export function formatTime(
  value: string | null | undefined,
  placeholder: string = "--:--"
): string {
  if (!value) return placeholder;

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return placeholder;

    return date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return placeholder;
  }
}

/**
 * Format tanggal YYYY-MM-DD ke format tampilan (contoh: 05 Nov 2026).
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  try {
    const date = value.includes("T")
      ? new Date(value)
      : new Date(`${value}T00:00:00`);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return "-";
  }
}

/**
 * Menghitung selisih waktu check_in dan check_out dalam format HH:mm.
 */
export function formatDuration(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): string {
  if (!checkIn || !checkOut) return "--:--";

  try {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();

    if (isNaN(start) || isNaN(end) || end < start) return "--:--";

    const diffMs = end - start;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}
