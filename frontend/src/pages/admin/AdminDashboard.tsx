import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  RefreshCw,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import api from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { formatTime, formatDate } from "@/lib/utils";

interface UnattendedIntern {
  id: string;
  name: string;
  email: string;
  intern_code: string;
  department: string;
}

interface NotCheckedOutIntern {
  id: string;
  attendance_id: string;
  name: string;
  email: string;
  intern_code: string;
  department: string;
  check_in: string;
  status: "PRESENT" | "LATE";
}

interface DashboardData {
  totalInterns: number;
  today: {
    totalAttendance: number;
    present: number;
    late: number;
    notCheckedIn: number;
  };
  unattendedInterns?: UnattendedIntern[];
  notCheckedOutInterns?: NotCheckedOutIntern[];
}

interface RecentAttendance {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "PRESENT" | "LATE";
  intern_name: string;
  intern_code: string;
}

const initialData: DashboardData = {
  totalInterns: 0,
  today: {
    totalAttendance: 0,
    present: 0,
    late: 0,
    notCheckedIn: 0,
  },
  unattendedInterns: [],
  notCheckedOutInterns: [],
};

const statCards = [
  {
    title: "Total Interns",
    value: (data: DashboardData) => data.totalInterns,
    icon: Users,
    iconColor: "text-primary",
    description: "Total registered interns",
  },
  {
    title: "Present Today",
    value: (data: DashboardData) => data.today.present,
    icon: UserCheck,
    iconColor: "text-primary",
    description: "Interns present today",
  },
  {
    title: "Late Today",
    value: (data: DashboardData) => data.today.late,
    icon: Clock,
    iconColor: "text-accent",
    description: "Interns arriving late",
  },
  {
    title: "Not Checked In",
    value: (data: DashboardData) => data.today.notCheckedIn,
    icon: UserX,
    iconColor: "text-muted-foreground",
    description: "Interns not yet checked in",
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>(initialData);
  const [recentAttendances, setRecentAttendances] = useState<RecentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const LIMIT = 10;

  const [page, setPage] = useState(1);

  const totalRecords = recentAttendances.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / LIMIT));

  const firstRow =
    totalRecords === 0 ? 0 : (page - 1) * LIMIT + 1;

  const lastRow = Math.min(page * LIMIT, totalRecords);

  const paginatedAttendances = recentAttendances.slice(
    (page - 1) * LIMIT,
    page * LIMIT
  );

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardResponse, attendanceResponse] = await Promise.all([
        api.get("/dashboard/admin"),
        api.get("/dashboard/admin/recent-attendance"),
      ]);

      setData(dashboardResponse.data.data);
      setRecentAttendances(attendanceResponse.data.data);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const unattendedList = data.unattendedInterns || [];
  const notCheckedOutList = data.notCheckedOutInterns || [];

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Card className="border-l-4 border-l-accent bg-card">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Welcome back, {user?.name || "Admin"}!
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Monitor intern attendance and manage your internship program.
                </p>
              </div>

              <Badge variant="secondary">
                Administrator
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={fetchDashboard}
          disabled={loading}
          className="gap-2 border-border bg-card text-foreground hover:bg-muted"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"}
          />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button
            onClick={fetchDashboard}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>

                <Icon size={18} className={item.iconColor} />
              </CardHeader>

              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {loading ? "..." : item.value(data)}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Attendance Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">
            Recent Attendance
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Latest attendance records from all interns.
          </p>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-foreground border-b border-border">
                <tr className="text-left font-semibold">
                  <th className="px-4 py-3 font-semibold">Intern</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Check In</th>
                  <th className="px-4 py-3 font-semibold">Check Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : recentAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  paginatedAttendances.map((attendance) => (
                    <tr key={attendance.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">
                          {attendance.intern_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {attendance.intern_code}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-foreground">
                        {formatDate(attendance.attendance_date)}
                      </td>

                      <td className="px-4 py-3.5 text-foreground">
                        {formatTime(attendance.check_in, "-")}
                      </td>

                      <td className="px-4 py-3.5 text-foreground">
                        {formatTime(attendance.check_out, "-")}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                            attendance.status === "LATE"
                              ? "bg-chart-4/10 text-chart-4 border-chart-4/20"
                              : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                          }`}
                        >
                          {attendance.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              {totalRecords === 0
                ? "Showing 0 of 0 records"
                : `Showing ${firstRow}–${lastRow} of ${totalRecords} records`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="border-border text-foreground hover:bg-muted"
              >
                Previous
              </Button>

              <span className="px-2 text-sm font-medium text-foreground">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="border-border text-foreground hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operasional Harian (Additive Sections) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intern Belum Check-in Hari Ini */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Interns Not Checked In Today
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  List of active interns who have not checked in today.
                </p>
              </div>
              <Badge variant="outline" className="text-muted-foreground bg-muted border-border">
                {unattendedList.length} Intern
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-foreground border-b border-border">
                  <tr className="text-left font-semibold">
                    <th className="px-4 py-2.5 font-semibold">Intern</th>
                    <th className="px-4 py-2.5 font-semibold">Department</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted-foreground">
                        Loading data...
                      </td>
                    </tr>
                  ) : unattendedList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground text-xs">
                        All interns have checked in today.
                      </td>
                    </tr>
                  ) : (
                    unattendedList.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.intern_code}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.department}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant="secondary">Not Checked In</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Intern Belum Check-out Hari Ini */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Interns Not Checked Out Today
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Interns who have checked in but have not completed their check-out.
                </p>
              </div>
              <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20">
                {notCheckedOutList.length} Intern
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-foreground border-b border-border">
                  <tr className="text-left font-semibold">
                    <th className="px-4 py-2.5 font-semibold">Intern</th>
                    <th className="px-4 py-2.5 font-semibold">Check In</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted-foreground">
                        Loading data...
                      </td>
                    </tr>
                  ) : notCheckedOutList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground text-xs">
                        No pending check-outs.
                      </td>
                    </tr>
                  ) : (
                    notCheckedOutList.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.intern_code}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <LogIn size={14} className="text-primary" />
                            <span className="text-foreground">{formatTime(item.check_in, "-")}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                              item.status === "LATE"
                                ? "bg-chart-4/10 text-chart-4 border-chart-4/20"
                                : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
