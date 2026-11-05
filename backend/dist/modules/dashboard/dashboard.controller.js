"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboard = getAdminDashboard;
exports.getInternDashboard = getInternDashboard;
exports.getRecentAttendance = getRecentAttendance;
const supabase_1 = require("../../config/supabase");
function getTodayDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}
async function getAdminDashboard(_req, res) {
    try {
        const today = getTodayDate();
        // Ambil semua intern beserta relasi profil user
        const { data: interns, error: internError } = await supabase_1.supabaseAdmin
            .from("interns")
            .select(`
          id,
          intern_code,
          department,
          start_date,
          end_date,
          users (
            name,
            email
          )
        `);
        if (internError)
            throw internError;
        const totalInterns = interns?.length || 0;
        // Ambil seluruh data absensi hari ini
        const { data: attendance, error: attendanceError } = await supabase_1.supabaseAdmin
            .from("attendances")
            .select("id, intern_id, check_in, check_out, status")
            .eq("attendance_date", today);
        if (attendanceError)
            throw attendanceError;
        const attendanceMap = new Map();
        (attendance || []).forEach((item) => {
            attendanceMap.set(item.intern_id, item);
        });
        // Intern yang aktif hari ini
        const activeInterns = (interns || []).filter((intern) => {
            const isStarted = !intern.start_date || intern.start_date <= today;
            const isNotEnded = !intern.end_date || intern.end_date >= today;
            return isStarted && isNotEnded;
        });
        const unattendedInterns = [];
        const notCheckedOutInterns = [];
        activeInterns.forEach((intern) => {
            const user = Array.isArray(intern.users)
                ? intern.users[0]
                : intern.users;
            const record = attendanceMap.get(intern.id);
            if (!record || !record.check_in) {
                // Belum check-in hari ini
                unattendedInterns.push({
                    id: intern.id,
                    intern_code: intern.intern_code,
                    department: intern.department,
                    name: user?.name || "Unknown",
                    email: user?.email || "-",
                });
            }
            else if (record.check_in && !record.check_out) {
                // Sudah check-in tapi belum check-out
                notCheckedOutInterns.push({
                    id: intern.id,
                    attendance_id: record.id,
                    intern_code: intern.intern_code,
                    department: intern.department,
                    name: user?.name || "Unknown",
                    email: user?.email || "-",
                    check_in: record.check_in,
                    status: record.status,
                });
            }
        });
        const present = attendance?.filter((item) => item.status === "PRESENT").length || 0;
        const late = attendance?.filter((item) => item.status === "LATE").length || 0;
        const totalAttendance = attendance?.length || 0;
        return res.status(200).json({
            success: true,
            message: "Admin dashboard retrieved successfully",
            data: {
                totalInterns,
                today: {
                    totalAttendance,
                    present,
                    late,
                    notCheckedIn: unattendedInterns.length,
                },
                unattendedInterns,
                notCheckedOutInterns,
            },
        });
    }
    catch (error) {
        console.error("Admin dashboard error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve admin dashboard",
        });
    }
}
async function getInternDashboard(_req, res) {
    try {
        const user = res.locals.user;
        const today = getTodayDate();
        const { data: intern, error: internError } = await supabase_1.supabaseAdmin
            .from("interns")
            .select("id, intern_code, department, start_date, end_date")
            .eq("user_id", user.id)
            .single();
        if (internError || !intern) {
            return res.status(404).json({
                success: false,
                message: "Intern profile not found",
            });
        }
        const { data: todayAttendance, error: todayError } = await supabase_1.supabaseAdmin
            .from("attendances")
            .select("*")
            .eq("intern_id", intern.id)
            .eq("attendance_date", today)
            .maybeSingle();
        if (todayError)
            throw todayError;
        const { data: history, error: historyError } = await supabase_1.supabaseAdmin
            .from("attendances")
            .select("id, attendance_date, check_in, check_out, status")
            .eq("intern_id", intern.id)
            .order("attendance_date", { ascending: false })
            .limit(5);
        if (historyError)
            throw historyError;
        return res.status(200).json({
            success: true,
            message: "Intern dashboard retrieved successfully",
            data: {
                profile: {
                    ...user,
                    intern_code: intern.intern_code,
                    department: intern.department,
                    start_date: intern.start_date,
                    end_date: intern.end_date,
                },
                today: todayAttendance,
                history: history || [],
            },
        });
    }
    catch (error) {
        console.error("Intern dashboard error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve intern dashboard",
        });
    }
}
async function getRecentAttendance(_req, res) {
    try {
        // Get latest attendance records
        const { data: attendance, error: attendanceError } = await supabase_1.supabaseAdmin
            .from("attendances")
            .select("id, intern_id, attendance_date, check_in, check_out, status")
            .order("attendance_date", { ascending: false })
            .order("check_in", { ascending: false })
            .limit(10);
        if (attendanceError)
            throw attendanceError;
        // Return empty list if no attendance records exist
        if (!attendance || attendance.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Recent attendance retrieved successfully",
                data: [],
            });
        }
        const internIds = [
            ...new Set(attendance.map((item) => item.intern_id)),
        ];
        // Get intern profiles
        const { data: interns, error: internError } = await supabase_1.supabaseAdmin
            .from("interns")
            .select("id, intern_code, user_id")
            .in("id", internIds);
        if (internError)
            throw internError;
        const userIds = [
            ...new Set((interns || []).map((intern) => intern.user_id)),
        ];
        // Get intern names
        const { data: users, error: userError } = await supabase_1.supabaseAdmin
            .from("users")
            .select("id, name")
            .in("id", userIds);
        if (userError)
            throw userError;
        // Combine attendance, intern, and user data
        const recentAttendances = attendance.map((item) => {
            const intern = interns?.find((record) => record.id === item.intern_id);
            const user = users?.find((record) => record.id === intern?.user_id);
            return {
                id: item.id,
                attendance_date: item.attendance_date,
                check_in: item.check_in,
                check_out: item.check_out,
                status: item.status,
                intern_name: user?.name || "Unknown",
                intern_code: intern?.intern_code || "-",
            };
        });
        return res.status(200).json({
            success: true,
            message: "Recent attendance retrieved successfully",
            data: recentAttendances,
        });
    }
    catch (error) {
        console.error("Recent attendance error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve recent attendance",
        });
    }
}
//# sourceMappingURL=dashboard.controller.js.map