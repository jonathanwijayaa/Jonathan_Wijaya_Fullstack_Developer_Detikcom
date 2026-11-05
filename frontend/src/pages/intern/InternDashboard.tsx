import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  LogIn,
  LogOut,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  InternProfile,
  TodayAttendance,
  AttendanceRecord,
  DashboardResponse,
} from "@/types";
import { formatTime, formatDate, formatDuration } from "@/lib/utils";

const LIMIT = 10;

export default function InternDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [today, setToday] = useState<TodayAttendance | null>(null);

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [monthFilter, setMonthFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Change password states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Buka otomatis dialog jika user wajib ganti password pertama kali
  useEffect(() => {
    if (user?.mustChangePassword) {
      setPasswordDialogOpen(true);
    }
  }, [user]);

  const totalPages = Math.ceil(totalRecords / LIMIT);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardResponse, historyResponse] = await Promise.all([
        api.get("/dashboard/intern"),
        api.get("/attendance/me", {
          params: { page, limit: LIMIT, month: monthFilter || undefined },
        }),
      ]);

      const dashboardData: DashboardResponse = dashboardResponse.data.data;
      setProfile(dashboardData.profile);
      setToday(dashboardData.today);

      const responseData = historyResponse.data.data;
      const attendanceData = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.history)
        ? responseData.history
        : Array.isArray(responseData?.attendances)
        ? responseData.attendances
        : Array.isArray(responseData?.records)
        ? responseData.records
        : [];

      setHistory(attendanceData);

      const total =
        historyResponse.data.pagination?.total ??
        responseData?.pagination?.total ??
        attendanceData.length;

      setTotalRecords(total);
    } catch (err) {
      console.error("Failed to fetch intern dashboard:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, monthFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleAttendance = async (type: "check-in" | "check-out") => {
    try {
      setActionLoading(true);
      setError("");
      setActionMessage("");

      await api.post(`/attendance/${type}`);

      setActionMessage(
        type === "check-in"
          ? "Check-in successful!"
          : "Check-out successful!"
      );

      await fetchDashboard();
    } catch (err: any) {
      console.error(`${type} failed:`, err);

      setError(
        err.response?.data?.message ||
          `Failed to ${type}. Please try again.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Password confirmation does not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      await api.post("/auth/change-password", { newPassword });

      setPasswordSuccess("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");

      // Update user state di local storage
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.mustChangePassword = false;
        localStorage.setItem("user", JSON.stringify(parsed));
      }

      setTimeout(() => {
        setPasswordDialogOpen(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.message || "Failed to change password. Please try again."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const hasCheckedIn = Boolean(today?.check_in);
  const hasCheckedOut = Boolean(today?.check_out);

  return (
    <div className="space-y-8">
      {/* Dashboard Heading */}
      <Card className="border-l-4 border-l-accent bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Welcome back, {user?.name || "Intern"}!
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage your daily attendance and view your attendance history.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {profile?.intern_code || "-"}
                </Badge>

                <span className="text-sm text-muted-foreground">
                  {profile?.department || "-"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPasswordError("");
                setPasswordSuccess("");
                setPasswordDialogOpen(true);
              }}
              className="gap-2 border-border text-foreground hover:bg-muted"
            >
              <KeyRound size={16} className="text-muted-foreground" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Success Message */}
      {actionMessage && (
        <div className="rounded-lg border border-chart-3/20 bg-chart-3/10 p-4 text-sm text-chart-3">
          {actionMessage}
        </div>
      )}

      {/* Today's Attendance */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Today's Attendance</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              <CalendarDays className="mr-1 inline h-4 w-4 text-primary" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              })}
            </p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchDashboard}
            disabled={loading}
            className="border-border text-foreground hover:bg-muted"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"}`}
            />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 border border-border p-5">
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <LogIn size={18} className="text-primary" />
                Check In
              </div>

              <p className="text-3xl font-bold text-foreground">
                {loading ? "..." : formatTime(today?.check_in, "--:--")}
              </p>
            </div>

            <div className="rounded-lg bg-muted/40 border border-border p-5">
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <LogOut size={18} className="text-primary" />
                Check Out
              </div>

              <p className="text-3xl font-bold text-foreground">
                {loading ? "..." : formatTime(today?.check_out, "--:--")}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>

              {loading ? (
                <Badge variant="secondary">Loading</Badge>
              ) : !hasCheckedIn ? (
                <Badge variant="secondary">Not Checked In</Badge>
              ) : today?.status === "LATE" ? (
                <Badge className="border border-chart-4/20 bg-chart-4/10 text-chart-4">
                  Late
                </Badge>
              ) : (
                <Badge className="border border-chart-3/20 bg-chart-3/10 text-chart-3">
                  Present
                </Badge>
              )}
            </div>

            {!hasCheckedIn ? (
              <Button
                onClick={() => handleAttendance("check-in")}
                disabled={loading || actionLoading}
                className="sm:min-w-40"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {actionLoading ? "Processing..." : "Check In"}
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                onClick={() => handleAttendance("check-out")}
                disabled={loading || actionLoading}
                className="sm:min-w-40"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {actionLoading ? "Processing..." : "Check Out"}
              </Button>
            ) : (
              <Button disabled className="sm:min-w-40">
                Attendance Completed
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-foreground">Attendance History</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your recent attendance records.
            </p>
          </div>

          {/* Filter Tanggal/Bulan di Sisi Kanan Label Attendance History */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Month:</span>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 w-36 text-xs border-border bg-card text-foreground focus-visible:ring-ring"
            />
            {monthFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMonthFilter("");
                  setPage(1);
                }}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
              >
                Reset
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-foreground border-b border-border">
                <tr className="text-left font-semibold">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Check In</th>
                  <th className="px-4 py-3 font-semibold">Check Out</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading attendance history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-foreground">
                        {formatDate(record.attendance_date)}
                      </td>

                      <td className="px-4 py-3.5 text-foreground">
                        {formatTime(record.check_in, "--:--")}
                      </td>

                      <td className="px-4 py-3.5 text-foreground">
                        {formatTime(record.check_out, "--:--")}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                        {record.duration || formatDuration(record.check_in, record.check_out)}
                      </td>

                      <td className="px-4 py-3.5">
                        {record.status === "LATE" ? (
                          <span className="rounded-full border border-chart-4/20 bg-chart-4/10 px-2.5 py-0.5 text-xs font-medium text-chart-4">
                            Late
                          </span>
                        ) : (
                          <span className="rounded-full border border-chart-3/20 bg-chart-3/10 px-2.5 py-0.5 text-xs font-medium text-chart-3">
                            Present
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalRecords > 0 && (
            <div className="mt-4 flex flex-col justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * LIMIT + 1}–
                {Math.min(page * LIMIT, totalRecords)} of {totalRecords} records
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Previous
                </Button>

                <span className="px-2 text-sm font-medium text-foreground">
                  {page} / {Math.max(totalPages, 1)}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ganti Password (Requirement 10) */}
      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        // Jangan izinkan tutup jika masih dipaksa ganti password pertama kali
        if (!open && user?.mustChangePassword) return;
        setPasswordDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {user?.mustChangePassword ? "Password Change Required" : "Change Password"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {user?.mustChangePassword
                ? "Your account currently uses the default password 'intern'. For security, you must create a new password before continuing."
                : "Enter a new password with at least 6 characters."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="border-border focus-visible:ring-ring"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the new password"
                className="border-border focus-visible:ring-ring"
                required
              />
            </div>

            {passwordError && (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {passwordError}
              </p>
            )}

            {passwordSuccess && (
              <p className="rounded-md border border-chart-3/20 bg-chart-3/10 p-2.5 text-xs text-chart-3">
                {passwordSuccess}
              </p>
            )}

            <DialogFooter>
              {!user?.mustChangePassword && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(false)}
                  disabled={passwordLoading}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
              )}

              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? "Saving..." : "Save New Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
