import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  determineAttendanceStatus,
  calculateAttendanceRate,
  calculateWorkDuration,
  isWorkingDay,
  getWorkingDaysInRange,
  validateCheckInRule,
  validateCheckOutRule,
  getJakartaDate,
} from "./attendance.util";

describe("Logika Status Kehadiran (PRESENT / LATE)", () => {
  it("harus PRESENT jika check-in tepat pukul 08:30 WIB (sebelum batas 09:00)", () => {
    // 08:30 WIB = 01:30 UTC
    const date = new Date("2026-11-05T01:30:00.000Z");
    const status = determineAttendanceStatus(date);
    assert.equal(status, "PRESENT");
  });

  it("harus PRESENT jika check-in tepat pukul 09:00:00 WIB", () => {
    // 09:00:00 WIB = 02:00:00 UTC
    const date = new Date("2026-11-05T02:00:00.000Z");
    const status = determineAttendanceStatus(date);
    assert.equal(status, "PRESENT");
  });

  it("harus LATE jika check-in lewat dari 09:00:00 WIB (misal 09:01 WIB)", () => {
    // 09:01:00 WIB = 02:01:00 UTC
    const date = new Date("2026-11-05T02:01:00.000Z");
    const status = determineAttendanceStatus(date);
    assert.equal(status, "LATE");
  });

  it("harus LATE jika check-in pukul 10:15 WIB", () => {
    // 10:15:00 WIB = 03:15:00 UTC
    const date = new Date("2026-11-05T03:15:00.000Z");
    const status = determineAttendanceStatus(date);
    assert.equal(status, "LATE");
  });
});

describe("Aturan Check-In & Check-Out", () => {
  it("check-in diizinkan jika belum pernah check-in hari ini", () => {
    const check = validateCheckInRule(null);
    assert.equal(check.allowed, true);

    const checkWithEmpty = validateCheckInRule({ check_in: null });
    assert.equal(checkWithEmpty.allowed, true);
  });

  it("check-in ditolak jika sudah pernah check-in hari ini (maksimal 1x per hari)", () => {
    const check = validateCheckInRule({
      check_in: "2026-11-05T08:00:00.000Z",
    });
    assert.equal(check.allowed, false);
    assert.equal(check.message, "You have already checked in today");
  });

  it("check-out ditolak jika belum melakukan check-in", () => {
    const checkNull = validateCheckOutRule(null);
    assert.equal(checkNull.allowed, false);
    assert.equal(checkNull.message, "You must check in before checking out");

    const checkNoCheckIn = validateCheckOutRule({ check_in: null });
    assert.equal(checkNoCheckIn.allowed, false);
    assert.equal(checkNoCheckIn.message, "You must check in before checking out");
  });

  it("check-out diizinkan jika sudah check-in dan belum check-out", () => {
    const check = validateCheckOutRule({
      check_in: "2026-11-05T08:00:00.000Z",
      check_out: null,
    });
    assert.equal(check.allowed, true);
  });

  it("check-out ditolak jika sudah pernah check-out hari ini (maksimal 1x per hari)", () => {
    const check = validateCheckOutRule({
      check_in: "2026-11-05T08:00:00.000Z",
      check_out: "2026-11-05T17:00:00.000Z",
    });
    assert.equal(check.allowed, false);
    assert.equal(check.message, "You have already checked out today");
  });
});

describe("Perhitungan Attendance Rate", () => {
  it("menghitung 100% jika semua hari hadir (Present atau Late)", () => {
    const rate = calculateAttendanceRate(18, 2, 0);
    assert.equal(rate, 100);
  });

  it("menghitung rate dengan benar jika ada Absent", () => {
    // 8 Present + 2 Late = 10 hadir dari total 12 hari (2 absent) -> (10/12)*100 = 83.3%
    const rate = calculateAttendanceRate(8, 2, 2);
    assert.equal(rate, 83.3);
  });

  it("menghasilkan 0% jika belum ada hari kerja yang tercatat", () => {
    const rate = calculateAttendanceRate(0, 0, 0);
    assert.equal(rate, 0);
  });

  it("menghasilkan 0% jika semua hari absent", () => {
    const rate = calculateAttendanceRate(0, 0, 5);
    assert.equal(rate, 0);
  });
});

describe("Durasi Kerja (HH:mm)", () => {
  it("menghitung durasi tepat (misal 08:30 ke 17:00 = 08:30)", () => {
    const duration = calculateWorkDuration(
      "2026-11-05T08:30:00.000Z",
      "2026-11-05T17:00:00.000Z"
    );
    assert.equal(duration, "08:30");
  });

  it("mengembalikan --:-- jika salah satu atau kedua timestamp kosong", () => {
    assert.equal(calculateWorkDuration(null, null), "--:--");
    assert.equal(calculateWorkDuration("2026-11-05T08:00:00.000Z", null), "--:--");
    assert.equal(calculateWorkDuration(null, "2026-11-05T17:00:00.000Z"), "--:--");
  });

  it("mengembalikan --:-- jika check_out lebih awal dari check_in (invalid)", () => {
    const duration = calculateWorkDuration(
      "2026-11-05T17:00:00.000Z",
      "2026-11-05T08:00:00.000Z"
    );
    assert.equal(duration, "--:--");
  });
});

describe("Hari Kerja & Libur Nasional", () => {
  it("Senin sampai Jumat adalah hari kerja", () => {
    // 2026-11-02 adalah Senin, 2026-11-06 adalah Jumat
    assert.equal(isWorkingDay("2026-11-02"), true);
    assert.equal(isWorkingDay("2026-11-03"), true);
    assert.equal(isWorkingDay("2026-11-04"), true);
    assert.equal(isWorkingDay("2026-11-05"), true);
    assert.equal(isWorkingDay("2026-11-06"), true);
  });

  it("Sabtu dan Minggu bukan hari kerja", () => {
    // 2026-11-07 adalah Sabtu, 2026-11-08 adalah Minggu
    assert.equal(isWorkingDay("2026-11-07"), false);
    assert.equal(isWorkingDay("2026-11-08"), false);
  });

  it("Hari Libur Nasional Indonesia dikecualikan dari hari kerja", () => {
    // 2026-08-17 adalah Senin (HUT RI), terdaftar di daftar libur nasional
    assert.equal(isWorkingDay("2026-08-17"), false);
    // 2026-05-01 adalah Jumat (Hari Buruh)
    assert.equal(isWorkingDay("2026-05-01"), false);
  });

  it("getWorkingDaysInRange hanya mengembalikan hari kerja non-libur", () => {
    // Rentang 2026-11-02 (Senin) sampai 2026-11-08 (Minggu) = 5 hari kerja (Senin-Jumat)
    const days = getWorkingDaysInRange("2026-11-02", "2026-11-08");
    assert.equal(days.length, 5);
    assert.deepEqual(days, [
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
  });
});

describe("Timezone Asia/Jakarta", () => {
  it("getJakartaDate mengembalikan format YYYY-MM-DD sesuai zona WIB", () => {
    // Jam 23:30 UTC tanggal 2026-11-04 di WIB adalah 06:30 tanggal 2026-11-05
    const utcDate = new Date("2026-11-04T23:30:00.000Z");
    assert.equal(getJakartaDate(utcDate), "2026-11-05");
  });
});

