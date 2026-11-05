export type UserRole = "ADMIN" | "INTERN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword?: boolean;
}

export interface InternProfile {
  name: string;
  department: string;
  intern_code: string;
}

export interface TodayAttendance {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "PRESENT" | "LATE";
}

export interface AttendanceRecord {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  duration?: string;
  status: "PRESENT" | "LATE";
}

export interface DashboardResponse {
  profile: InternProfile;
  today: TodayAttendance | null;
}
