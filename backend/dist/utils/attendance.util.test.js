"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const attendance_util_1 = require("./attendance.util");
(0, node_test_1.describe)("Logika Status Kehadiran (PRESENT / LATE)", () => {
    (0, node_test_1.it)("harus PRESENT jika check-in tepat pukul 08:30 WIB (sebelum batas 09:00)", () => {
        // 08:30 WIB = 01:30 UTC
        const date = new Date("2026-11-05T01:30:00.000Z");
        const status = (0, attendance_util_1.determineAttendanceStatus)(date);
        strict_1.default.equal(status, "PRESENT");
    });
    (0, node_test_1.it)("harus PRESENT jika check-in tepat pukul 09:00:00 WIB", () => {
        // 09:00:00 WIB = 02:00:00 UTC
        const date = new Date("2026-11-05T02:00:00.000Z");
        const status = (0, attendance_util_1.determineAttendanceStatus)(date);
        strict_1.default.equal(status, "PRESENT");
    });
    (0, node_test_1.it)("harus LATE jika check-in lewat dari 09:00:00 WIB (misal 09:01 WIB)", () => {
        // 09:01:00 WIB = 02:01:00 UTC
        const date = new Date("2026-11-05T02:01:00.000Z");
        const status = (0, attendance_util_1.determineAttendanceStatus)(date);
        strict_1.default.equal(status, "LATE");
    });
    (0, node_test_1.it)("harus LATE jika check-in pukul 10:15 WIB", () => {
        // 10:15:00 WIB = 03:15:00 UTC
        const date = new Date("2026-11-05T03:15:00.000Z");
        const status = (0, attendance_util_1.determineAttendanceStatus)(date);
        strict_1.default.equal(status, "LATE");
    });
});
(0, node_test_1.describe)("Aturan Check-In & Check-Out", () => {
    (0, node_test_1.it)("check-in diizinkan jika belum pernah check-in hari ini", () => {
        const check = (0, attendance_util_1.validateCheckInRule)(null);
        strict_1.default.equal(check.allowed, true);
        const checkWithEmpty = (0, attendance_util_1.validateCheckInRule)({ check_in: null });
        strict_1.default.equal(checkWithEmpty.allowed, true);
    });
    (0, node_test_1.it)("check-in ditolak jika sudah pernah check-in hari ini (maksimal 1x per hari)", () => {
        const check = (0, attendance_util_1.validateCheckInRule)({
            check_in: "2026-11-05T08:00:00.000Z",
        });
        strict_1.default.equal(check.allowed, false);
        strict_1.default.equal(check.message, "You have already checked in today");
    });
    (0, node_test_1.it)("check-out ditolak jika belum melakukan check-in", () => {
        const checkNull = (0, attendance_util_1.validateCheckOutRule)(null);
        strict_1.default.equal(checkNull.allowed, false);
        strict_1.default.equal(checkNull.message, "You must check in before checking out");
        const checkNoCheckIn = (0, attendance_util_1.validateCheckOutRule)({ check_in: null });
        strict_1.default.equal(checkNoCheckIn.allowed, false);
        strict_1.default.equal(checkNoCheckIn.message, "You must check in before checking out");
    });
    (0, node_test_1.it)("check-out diizinkan jika sudah check-in dan belum check-out", () => {
        const check = (0, attendance_util_1.validateCheckOutRule)({
            check_in: "2026-11-05T08:00:00.000Z",
            check_out: null,
        });
        strict_1.default.equal(check.allowed, true);
    });
    (0, node_test_1.it)("check-out ditolak jika sudah pernah check-out hari ini (maksimal 1x per hari)", () => {
        const check = (0, attendance_util_1.validateCheckOutRule)({
            check_in: "2026-11-05T08:00:00.000Z",
            check_out: "2026-11-05T17:00:00.000Z",
        });
        strict_1.default.equal(check.allowed, false);
        strict_1.default.equal(check.message, "You have already checked out today");
    });
});
(0, node_test_1.describe)("Perhitungan Attendance Rate", () => {
    (0, node_test_1.it)("menghitung 100% jika semua hari hadir (Present atau Late)", () => {
        const rate = (0, attendance_util_1.calculateAttendanceRate)(18, 2, 0);
        strict_1.default.equal(rate, 100);
    });
    (0, node_test_1.it)("menghitung rate dengan benar jika ada Absent", () => {
        // 8 Present + 2 Late = 10 hadir dari total 12 hari (2 absent) -> (10/12)*100 = 83.3%
        const rate = (0, attendance_util_1.calculateAttendanceRate)(8, 2, 2);
        strict_1.default.equal(rate, 83.3);
    });
    (0, node_test_1.it)("menghasilkan 0% jika belum ada hari kerja yang tercatat", () => {
        const rate = (0, attendance_util_1.calculateAttendanceRate)(0, 0, 0);
        strict_1.default.equal(rate, 0);
    });
    (0, node_test_1.it)("menghasilkan 0% jika semua hari absent", () => {
        const rate = (0, attendance_util_1.calculateAttendanceRate)(0, 0, 5);
        strict_1.default.equal(rate, 0);
    });
});
(0, node_test_1.describe)("Durasi Kerja (HH:mm)", () => {
    (0, node_test_1.it)("menghitung durasi tepat (misal 08:30 ke 17:00 = 08:30)", () => {
        const duration = (0, attendance_util_1.calculateWorkDuration)("2026-11-05T08:30:00.000Z", "2026-11-05T17:00:00.000Z");
        strict_1.default.equal(duration, "08:30");
    });
    (0, node_test_1.it)("mengembalikan --:-- jika salah satu atau kedua timestamp kosong", () => {
        strict_1.default.equal((0, attendance_util_1.calculateWorkDuration)(null, null), "--:--");
        strict_1.default.equal((0, attendance_util_1.calculateWorkDuration)("2026-11-05T08:00:00.000Z", null), "--:--");
        strict_1.default.equal((0, attendance_util_1.calculateWorkDuration)(null, "2026-11-05T17:00:00.000Z"), "--:--");
    });
    (0, node_test_1.it)("mengembalikan --:-- jika check_out lebih awal dari check_in (invalid)", () => {
        const duration = (0, attendance_util_1.calculateWorkDuration)("2026-11-05T17:00:00.000Z", "2026-11-05T08:00:00.000Z");
        strict_1.default.equal(duration, "--:--");
    });
});
(0, node_test_1.describe)("Hari Kerja & Libur Nasional", () => {
    (0, node_test_1.it)("Senin sampai Jumat adalah hari kerja", () => {
        // 2026-11-02 adalah Senin, 2026-11-06 adalah Jumat
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-11-02"), true);
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-11-03"), true);
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-11-04"), true);
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-11-05"), true);
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-11-06"), true);
    });
    (0, node_test_1.it)("Sabtu dan Minggu bukan hari kerja", () => {
        // 2026-11-07 adalah Sabtu, 2026-11-08 adalah Minggu
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-11-07"), false);
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-11-08"), false);
    });
    (0, node_test_1.it)("Hari Libur Nasional Indonesia dikecualikan dari hari kerja", () => {
        // 2026-08-17 adalah Senin (HUT RI), terdaftar di daftar libur nasional
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-08-17"), false);
        // 2026-05-01 adalah Jumat (Hari Buruh)
        strict_1.default.equal((0, attendance_util_1.isWorkingDay)("2026-05-01"), false);
    });
    (0, node_test_1.it)("getWorkingDaysInRange hanya mengembalikan hari kerja non-libur", () => {
        // Rentang 2026-11-02 (Senin) sampai 2026-11-08 (Minggu) = 5 hari kerja (Senin-Jumat)
        const days = (0, attendance_util_1.getWorkingDaysInRange)("2026-11-02", "2026-11-08");
        strict_1.default.equal(days.length, 5);
        strict_1.default.deepEqual(days, [
            "2026-11-02",
            "2026-11-03",
            "2026-11-04",
            "2026-11-05",
            "2026-11-06",
        ]);
    });
});
(0, node_test_1.describe)("Timezone Asia/Jakarta", () => {
    (0, node_test_1.it)("getJakartaDate mengembalikan format YYYY-MM-DD sesuai zona WIB", () => {
        // Jam 23:30 UTC tanggal 2026-11-04 di WIB adalah 06:30 tanggal 2026-11-05
        const utcDate = new Date("2026-11-04T23:30:00.000Z");
        strict_1.default.equal((0, attendance_util_1.getJakartaDate)(utcDate), "2026-11-05");
    });
});
//# sourceMappingURL=attendance.util.test.js.map