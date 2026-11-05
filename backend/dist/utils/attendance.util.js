"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJakartaDate = getJakartaDate;
exports.getJakartaTimeParts = getJakartaTimeParts;
exports.determineAttendanceStatus = determineAttendanceStatus;
exports.isWorkingDay = isWorkingDay;
exports.getWorkingDaysInRange = getWorkingDaysInRange;
exports.calculateAttendanceRate = calculateAttendanceRate;
exports.calculateWorkDuration = calculateWorkDuration;
exports.validateCheckInRule = validateCheckInRule;
exports.validateCheckOutRule = validateCheckOutRule;
const constants_1 = require("../config/constants");
/**
 * Mendapatkan tanggal hari ini dalam timezone Asia/Jakarta (format YYYY-MM-DD).
 */
function getJakartaDate(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: constants_1.ATTENDANCE_CONFIG.TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}
/**
 * Mendapatkan komponen waktu (jam, menit, detik) dari suatu tanggal/timestamp di timezone Asia/Jakarta.
 */
function getJakartaTimeParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: constants_1.ATTENDANCE_CONFIG.TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
    return { hour, minute, second };
}
/**
 * Menentukan status kehadiran saat check-in:
 * - Jika check-in <= 09:00:00 WIB -> PRESENT
 * - Jika check-in > 09:00:00 WIB -> LATE
 */
function determineAttendanceStatus(checkInDate = new Date()) {
    const { hour, minute, second } = getJakartaTimeParts(checkInDate);
    const totalSeconds = hour * 3600 + minute * 60 + second;
    const thresholdSeconds = constants_1.ATTENDANCE_CONFIG.WORK_START_HOUR * 3600 +
        constants_1.ATTENDANCE_CONFIG.WORK_START_MINUTE * 60 +
        constants_1.ATTENDANCE_CONFIG.WORK_START_SECOND;
    return totalSeconds > thresholdSeconds ? "LATE" : "PRESENT";
}
/**
 * Memeriksa apakah tanggal tertentu merupakan hari kerja (Senin-Jumat dan bukan hari libur nasional).
 */
function isWorkingDay(dateStr, holidays = constants_1.INDONESIAN_NATIONAL_HOLIDAYS) {
    // Gunakan jam tengah hari UTC untuk menghindari boundary shift
    const d = new Date(`${dateStr}T12:00:00.000Z`);
    const day = d.getUTCDay();
    // 0 = Minggu, 6 = Sabtu
    if (day === 0 || day === 6) {
        return false;
    }
    // Cek libur nasional
    if (holidays.includes(dateStr)) {
        return false;
    }
    return true;
}
/**
 * Menghasilkan daftar hari kerja antara startDate dan endDate (inklusif).
 */
function getWorkingDaysInRange(startDate, endDate, holidays = constants_1.INDONESIAN_NATIONAL_HOLIDAYS) {
    const dates = [];
    const current = new Date(`${startDate}T12:00:00.000Z`);
    const end = new Date(`${endDate}T12:00:00.000Z`);
    while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        if (isWorkingDay(dateStr, holidays)) {
            dates.push(dateStr);
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
}
/**
 * Menghitung persentase Attendance Rate:
 * Formula: ((Present + Late) / Total Expected Days) * 100
 */
function calculateAttendanceRate(present, late, absent) {
    const total = present + late + absent;
    if (total <= 0)
        return 0;
    return Number((((present + late) / total) * 100).toFixed(1));
}
/**
 * Menghitung durasi kerja dalam format HH:mm antara check_in dan check_out.
 */
function calculateWorkDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut)
        return "--:--";
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (isNaN(start) || isNaN(end) || end < start)
        return "--:--";
    const diffMs = end - start;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
/**
 * Validasi aturan check-in (maks 1x sehari).
 */
function validateCheckInRule(existingAttendance) {
    if (existingAttendance?.check_in) {
        return {
            allowed: false,
            message: "You have already checked in today",
        };
    }
    return { allowed: true };
}
/**
 * Validasi aturan check-out (harus sudah check-in, maks 1x sehari).
 */
function validateCheckOutRule(existingAttendance) {
    if (!existingAttendance || !existingAttendance.check_in) {
        return {
            allowed: false,
            message: "You must check in before checking out",
        };
    }
    if (existingAttendance.check_out) {
        return {
            allowed: false,
            message: "You have already checked out today",
        };
    }
    return { allowed: true };
}
//# sourceMappingURL=attendance.util.js.map