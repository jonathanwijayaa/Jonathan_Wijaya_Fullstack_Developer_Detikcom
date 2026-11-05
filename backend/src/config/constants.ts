export const ATTENDANCE_CONFIG = {
  TIMEZONE: "Asia/Jakarta",
  WORK_START_HOUR: 9,
  WORK_START_MINUTE: 0,
  WORK_START_SECOND: 0,
  LATE_THRESHOLD: "09:00",
} as const;

/**
 * Daftar Hari Libur Nasional (Indonesia) yang umum.
 * Format YYYY-MM-DD.
 */
export const INDONESIAN_NATIONAL_HOLIDAYS: string[] = [
  // 2026
  "2026-01-01", // Tahun Baru 2026 Masehi
  "2026-01-16", // Isra Mikraj Nabi Muhammad SAW
  "2026-02-17", // Tahun Baru Imlek 2577 Kongzili
  "2026-03-21", // Hari Suci Nyepi
  "2026-03-20", // Idul Fitri 1447 H (perkiraan)
  "2026-03-21", // Idul Fitri 1447 H (perkiraan)
  "2026-04-03", // Wafat Yesus Kristus
  "2026-04-05", // Hari Paskah
  "2026-05-01", // Hari Buruh Internasional
  "2026-05-14", // Kenaikan Yesus Kristus
  "2026-05-27", // Idul Adha 1447 H (perkiraan)
  "2026-05-31", // Hari Raya Waisak 2570 BE
  "2026-06-01", // Hari Lahir Pancasila
  "2026-06-16", // Tahun Baru Islam 1448 H
  "2026-08-17", // Hari Kemerdekaan RI
  "2026-08-25", // Maulid Nabi Muhammad SAW
  "2026-12-25", // Hari Raya Natal
];

