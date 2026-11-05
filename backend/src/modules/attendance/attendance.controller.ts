import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase";
import { AuthUser } from "../../middlewares/auth.middleware";
import {
  determineAttendanceStatus,
  getJakartaDate,
  getWorkingDaysInRange,
  calculateAttendanceRate,
  calculateWorkDuration,
} from "../../utils/attendance.util";

function getAttendanceDate() {
  return getJakartaDate();
}

async function getInternId(user: AuthUser) {
  const { data, error } = await supabaseAdmin
    .from("interns")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

// POST /api/attendance/check-in
export async function checkIn(req: Request, res: Response) {
  try {
    const user = res.locals.user as AuthUser;
    const internId = await getInternId(user);

    if (!internId) {
      return res.status(404).json({
        success: false,
        message: "Intern profile not found",
      });
    }

    const now = new Date();
    const attendanceStatus = determineAttendanceStatus(now);

    const { data, error } = await supabaseAdmin
      .from("attendances")
      .insert({
        intern_id: internId,
        attendance_date: getAttendanceDate(),
        check_in: now.toISOString(),
        status: attendanceStatus,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "You have already checked in today",
        });
      }

      console.error("Check-in error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to check in",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Check-in successful",
      data,
    });
  } catch (error) {
    console.error("Check-in error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// POST /api/attendance/check-out
export async function checkOut(req: Request, res: Response) {
  try {
    const user = res.locals.user as AuthUser;
    const internId = await getInternId(user);

    if (!internId) {
      return res.status(404).json({
        success: false,
        message: "Intern profile not found",
      });
    }

    const attendanceDate = getAttendanceDate();

    const { data: attendance, error: findError } = await supabaseAdmin
      .from("attendances")
      .select("id, check_in, check_out")
      .eq("intern_id", internId)
      .eq("attendance_date", attendanceDate)
      .maybeSingle();

    if (findError) {
      console.error("Find attendance error:", findError);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attendance",
      });
    }

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: "You must check in before checking out",
      });
    }

    if (attendance.check_out) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("attendances")
      .update({
        check_out: new Date().toISOString(),
      })
      .eq("id", attendance.id)
      .is("check_out", null)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Check-out error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to check out",
      });
    }

    if (!data) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Check-out successful",
      data,
    });
  } catch (error) {
    console.error("Check-out error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET /api/attendance/me
export async function getMyAttendance(req: Request, res: Response) {
  try {
    const user = res.locals.user as AuthUser;
    const internId = await getInternId(user);

    if (!internId) {
      return res.status(404).json({
        success: false,
        message: "Intern profile not found",
      });
    }

    const today = getAttendanceDate();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const month = typeof req.query.month === "string" ? req.query.month.trim() : "";

    // Get today's attendance
    const { data: todayAttendance, error: todayError } =
      await supabaseAdmin
        .from("attendances")
        .select("*")
        .eq("intern_id", internId)
        .eq("attendance_date", today)
        .maybeSingle();

    if (todayError) {
      console.error("Today's attendance error:", todayError);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve today's attendance",
      });
    }

    // Get attendance history with pagination and month filter
    let historyQuery = supabaseAdmin
      .from("attendances")
      .select("*", { count: "exact" })
      .eq("intern_id", internId);

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      historyQuery = historyQuery
        .gte("attendance_date", `${month}-01`)
        .lte("attendance_date", `${month}-31`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: history, count: totalCount, error: historyError } =
      await historyQuery
        .order("attendance_date", { ascending: false })
        .range(from, to);

    if (historyError) {
      console.error("Attendance history error:", historyError);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attendance history",
      });
    }

    const total = totalCount ?? (history?.length || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const historyWithDuration = (history || []).map((item) => ({
      ...item,
      duration: calculateWorkDuration(item.check_in, item.check_out),
    }));

    return res.status(200).json({
      success: true,
      message: "Attendance retrieved successfully",
      data: {
        today: todayAttendance,
        history: historyWithDuration,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getAllAttendance(
  req: Request,
  res: Response
) {
  try {
    const { date, status, intern_id } = req.query;

    let query = supabaseAdmin
      .from("attendances")
      .select(`
        id,
        attendance_date,
        check_in,
        check_out,
        status,
        created_at,
        interns (
          id,
          intern_code,
          department,
          users (
            name,
            email
          )
        )
      `)
      .order("attendance_date", { ascending: false })
      .order("check_in", { ascending: false });

    // Filter by attendance date
    if (typeof date === "string") {
      query = query.eq("attendance_date", date);
    }

    // Filter by attendance status
    if (typeof status === "string") {
      if (!["PRESENT", "LATE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
      }

      query = query.eq("status", status);
    }

    // Filter by intern ID
    if (typeof intern_id === "string") {
      query = query.eq("intern_id", intern_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get all attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attendance reports",
      });
    }

    const recordsWithDuration = (data || []).map((item: any) => ({
      ...item,
      duration: calculateWorkDuration(item.check_in, item.check_out),
    }));

    return res.status(200).json({
      success: true,
      message: "Attendance reports retrieved successfully",
      data: recordsWithDuration,
      total: recordsWithDuration.length,
    });
  } catch (error) {
    console.error("Get all attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

function getReportDateRange() {
  const today = getAttendanceDate();
  const [year, month] = today.split("-");

  const lastDay = new Date(
    Date.UTC(Number(year), Number(month), 0)
  ).getUTCDate();

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

// GET /api/admin/attendance/report
export async function getAttendanceReport(
  req: Request,
  res: Response
) {
  try {
    const defaults = getReportDateRange();

    const startDate =
      typeof req.query.start_date === "string"
        ? req.query.start_date
        : defaults.startDate;

    const endDate =
      typeof req.query.end_date === "string"
        ? req.query.end_date
        : defaults.endDate;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().toLowerCase()
        : "";

    const department =
      typeof req.query.department === "string"
        ? req.query.department
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : "";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 10;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !dateRegex.test(startDate) ||
      !dateRegex.test(endDate) ||
      startDate > endDate ||
      Number.isNaN(Date.parse(`${startDate}T00:00:00Z`)) ||
      Number.isNaN(Date.parse(`${endDate}T00:00:00Z`))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    if (status && !["PRESENT", "LATE", "ABSENT", "NOT_CHECKED_IN"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status",
      });
    }

    // Get all interns
    const { data: interns, error: internError } =
      await supabaseAdmin
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

    if (internError) throw internError;

    // Filter interns based on internship period, search, and department
    const matchedInterns = (interns ?? []).filter((intern: any) => {
      const overlaps =
        intern.start_date <= endDate &&
        (!intern.end_date || intern.end_date >= startDate);

      const user = Array.isArray(intern.users)
        ? intern.users[0]
        : intern.users;

      const matchesSearch =
        !search ||
        user?.name?.toLowerCase().includes(search) ||
        intern.intern_code.toLowerCase().includes(search);

      const matchesDepartment =
        !department || intern.department === department;

      return overlaps && matchesSearch && matchesDepartment;
    });

    const internIds = matchedInterns.map((intern: any) => intern.id);

    // Do not count future dates as absent
    const today = getAttendanceDate();
    const effectiveEnd = endDate < today ? endDate : today;

    let attendanceRecords: any[] = [];

    if (internIds.length > 0 && startDate <= effectiveEnd) {
      const { data, error } = await supabaseAdmin
        .from("attendances")
        .select(`
          id,
          intern_id,
          attendance_date,
          check_in,
          check_out,
          status
        `)
        .in("intern_id", internIds)
        .gte("attendance_date", startDate)
        .lte("attendance_date", effectiveEnd);

      if (error) throw error;

      attendanceRecords = data ?? [];
    }

    const attendanceMap = new Map<string, any>();

    for (const record of attendanceRecords) {
      attendanceMap.set(
        `${record.intern_id}_${record.attendance_date}`,
        record
      );
    }

    const rows: any[] = [];

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    for (const intern of matchedInterns) {
      const user = Array.isArray(intern.users)
        ? intern.users[0]
        : intern.users;

      const activeStart =
        intern.start_date > startDate
          ? intern.start_date
          : startDate;

      const activeEnd = intern.end_date
        ? (intern.end_date < effectiveEnd
            ? intern.end_date
            : effectiveEnd)
        : effectiveEnd;

      // Skip interns whose active period has not started yet
      if (activeStart > activeEnd) continue;

      const workingDays = getWorkingDaysInRange(
        activeStart,
        activeEnd
      );

      for (const date of workingDays) {
        const attendance = attendanceMap.get(
          `${intern.id}_${date}`
        );

        const isToday = date === today;
        let rowStatus: "PRESENT" | "LATE" | "ABSENT" | "NOT_CHECKED_IN";

        if (attendance?.status === "PRESENT") {
          rowStatus = "PRESENT";
          presentCount++;
        } else if (attendance?.status === "LATE") {
          rowStatus = "LATE";
          lateCount++;
        } else if (isToday) {
          rowStatus = "NOT_CHECKED_IN";
          // Hari berjalan belum check-in tidak dihitung sebagai absent
        } else {
          rowStatus = "ABSENT";
          absentCount++;
        }

        const duration = calculateWorkDuration(
          attendance?.check_in,
          attendance?.check_out
        );

        rows.push({
          id: attendance?.id ?? `${intern.id}_${date}`,
          intern_id: intern.id,
          intern_name: user?.name ?? "-",
          email: user?.email ?? "-",
          intern_code: intern.intern_code,
          department: intern.department,
          attendance_date: date,
          check_in: attendance?.check_in ?? null,
          check_out: attendance?.check_out ?? null,
          duration,
          status: rowStatus,
        });
      }
    }

    // Sort newest attendance first
    rows.sort((a, b) =>
      b.attendance_date.localeCompare(a.attendance_date)
    );

    // Summary is calculated before status filtering
    const attendanceRate = calculateAttendanceRate(
      presentCount,
      lateCount,
      absentCount
    );

    // Apply status filter to table only
    const filteredRows = status
      ? rows.filter((row) => row.status === status)
      : rows;

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;

    const paginatedRows = filteredRows.slice(
      startIndex,
      startIndex + limit
    );

    // Get department options
    const { data: allInterns, error: departmentError } =
      await supabaseAdmin
        .from("interns")
        .select("department");

    if (departmentError) throw departmentError;

    const departments = [
      ...new Set(
        (allInterns ?? []).map((item) => item.department)
      ),
    ].sort();

    return res.status(200).json({
      success: true,
      message: "Attendance report retrieved successfully",
      data: paginatedRows,
      summary: {
        totalInterns: matchedInterns.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        attendanceRate,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        departments,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Get attendance report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance report",
    });
  }
}

// PATCH /api/admin/attendance/:id (Koreksi absensi oleh admin)
export async function correctAttendance(req: Request, res: Response) {
  try {
    const id = String(req.params.id || "");
    const { check_in, check_out, status, intern_id, attendance_date } = req.body;

    // Jika ID adalah compound internId_date (virtual absent row), kita buat baris baru
    if (id.includes("_") || (!id && intern_id && attendance_date)) {
      const [parsedInternId, parsedDate] = id.includes("_")
        ? id.split("_")
        : [intern_id, attendance_date];

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("attendances")
        .insert({
          intern_id: parsedInternId,
          attendance_date: parsedDate,
          check_in: check_in || null,
          check_out: check_out || null,
          status: status || "PRESENT",
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return res.status(201).json({
        success: true,
        message: "Attendance record created successfully",
        data: inserted,
      });
    }

    const updatePayload: Record<string, any> = {};
    if (check_in !== undefined) updatePayload.check_in = check_in;
    if (check_out !== undefined) updatePayload.check_out = check_out;
    if (status !== undefined) updatePayload.status = status;

    const { data, error } = await supabaseAdmin
      .from("attendances")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: "Attendance corrected successfully",
      data,
    });
  } catch (error: any) {
    console.error("Correct attendance error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to correct attendance record",
    });
  }
}
