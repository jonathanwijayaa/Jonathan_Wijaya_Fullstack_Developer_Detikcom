import { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  UserX,
  TrendingUp,
  Search,
  X,
  Download,
  FileSpreadsheet,
  Pencil,
} from "lucide-react";

import api from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTime, formatDate, formatDuration } from "@/lib/utils";

const PDF_PRIMARY: [number, number, number] = [34, 64, 154];
const PDF_BACKGROUND: [number, number, number] = [245, 247, 252];

interface AttendanceRecord {
  id: string;
  intern_id: string;
  intern_name: string;
  email: string;
  intern_code: string;
  department: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  duration?: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "NOT_CHECKED_IN";
}

interface Summary {
  totalInterns: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getStatusBadge(status: AttendanceRecord["status"]) {
  switch (status) {
    case "PRESENT":
      return (
        <Badge className="border border-chart-3/20 bg-chart-3/10 text-chart-3 hover:bg-chart-3/20">
          Present
        </Badge>
      );
    case "LATE":
      return (
        <Badge className="border border-chart-4/20 bg-chart-4/10 text-chart-4 hover:bg-chart-4/20">
          Late
        </Badge>
      );
    case "NOT_CHECKED_IN":
      return <Badge variant="secondary">Not Checked In</Badge>;
    default:
      return <Badge variant="destructive">Absent</Badge>;
  }
}

export default function AttendanceReport() {
  const defaultRange = getCurrentMonthRange();

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const [summary, setSummary] = useState<Summary>({
    totalInterns: 0,
    present: 0,
    late: 0,
    absent: 0,
    attendanceRate: 0,
  });

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  // Koreksi dialog state
  const [correctDialogOpen, setCorrectDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editStatus, setEditStatus] = useState<"PRESENT" | "LATE" | "ABSENT">("PRESENT");
  const [correcting, setCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState("");

  async function fetchAttendance(page = 1) {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/attendance/report", {
        params: {
          start_date: startDate,
          end_date: endDate,
          search,
          department: department === "ALL" ? "" : department,
          status: status === "ALL" ? "" : status,
          page,
        },
      });

      const result = response.data;

      setRecords(result.data ?? []);
      setSummary(result.summary);
      setPagination(result.pagination);
      setDepartments(result.filters?.departments ?? []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
          "Failed to load attendance report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      fetchAttendance(1);
    }
  }, [startDate, endDate, search, department, status]);

  const summaryCards = [
    {
      title: "Total Intern",
      value: summary.totalInterns,
      description: "Active during selected period",
      icon: Users,
    },
    {
      title: "Present",
      value: summary.present,
      description: "On-time attendance",
      icon: CheckCircle2,
    },
    {
      title: "Late",
      value: summary.late,
      description: "Late attendance",
      icon: Clock,
    },
    {
      title: "Absent",
      value: summary.absent,
      description: "Missed working days",
      icon: UserX,
    },
    {
      title: "Attendance Rate",
      value: `${summary.attendanceRate}%`,
      description: "Present + Late / Expected days",
      icon: TrendingUp,
    },
  ];

  // Helper untuk menarik semua data laporan sesuai filter saat ini (untuk download)
  async function fetchAllFilteredRecords(): Promise<AttendanceRecord[]> {
    const params = {
      start_date: startDate,
      end_date: endDate,
      search,
      department: department === "ALL" ? "" : department,
      status: status === "ALL" ? "" : status,
    };

    const firstResponse = await api.get("/admin/attendance/report", {
      params: { ...params, page: 1 },
    });

    let allRecords: AttendanceRecord[] = firstResponse.data.data ?? [];
    const totalPages = Math.max(firstResponse.data.pagination?.totalPages ?? 1, 1);

    for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
      const response = await api.get("/admin/attendance/report", {
        params: { ...params, page: currentPage },
      });
      allRecords = [...allRecords, ...(response.data.data ?? [])];
    }

    return allRecords;
  }

  async function downloadPDF() {
    try {
      setDownloading(true);
      const allRecords = await fetchAllFilteredRecords();

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(18);
      doc.text("Attendance Report", 14, 18);

      doc.setFontSize(10);
      doc.text(
        `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`,
        14,
        26
      );

      doc.text(
        `Department: ${department === "ALL" ? "All Departments" : department}`,
        14,
        32
      );

      doc.text(
        `Status: ${status === "ALL" ? "All Status" : status}`,
        14,
        38
      );

      doc.text(
        `Search: ${search.trim() || "All Interns"}`,
        14,
        44
      );

      autoTable(doc, {
        startY: 51,
        head: [[
          "No.",
          "Intern Name",
          "Intern Code",
          "Department",
          "Date",
          "Check In",
          "Check Out",
          "Duration",
          "Status",
        ]],
        body: allRecords.map((record, index) => [
          index + 1,
          record.intern_name,
          record.intern_code,
          record.department,
          formatDate(record.attendance_date),
          formatTime(record.check_in, "-"),
          formatTime(record.check_out, "-"),
          record.duration || formatDuration(record.check_in, record.check_out),
          record.status,
        ]),
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: PDF_PRIMARY,
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: PDF_BACKGROUND,
        },
        margin: {
          left: 14,
          right: 14,
        },
      });

      const safeDate = new Date().toISOString().slice(0, 10);
      doc.save(`attendance-report-${safeDate}.pdf`);
    } catch (err) {
      console.error("Failed to download attendance report:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function downloadCSV() {
    try {
      setDownloadingCSV(true);
      const allRecords = await fetchAllFilteredRecords();

      const headers = [
        "No.",
        "Intern Name",
        "Intern Code",
        "Department",
        "Date",
        "Check In",
        "Check Out",
        "Duration",
        "Status",
      ];

      const csvRows = allRecords.map((record, index) => {
        const row = [
          index + 1,
          `"${record.intern_name.replace(/"/g, '""')}"`,
          `"${record.intern_code.replace(/"/g, '""')}"`,
          `"${record.department.replace(/"/g, '""')}"`,
          formatDate(record.attendance_date),
          formatTime(record.check_in, "-"),
          formatTime(record.check_out, "-"),
          record.duration || formatDuration(record.check_in, record.check_out),
          record.status,
        ];
        return row.join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeDate = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance-report-${safeDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download CSV:", err);
      setError("Failed to generate CSV. Please try again.");
    } finally {
      setDownloadingCSV(false);
    }
  }

  function openCorrectionDialog(record: AttendanceRecord) {
    setSelectedRecord(record);
    setEditCheckIn(record.check_in ? formatTime(record.check_in, "") : "");
    setEditCheckOut(record.check_out ? formatTime(record.check_out, "") : "");
    setEditStatus(record.status === "NOT_CHECKED_IN" ? "PRESENT" : record.status);
    setCorrectError("");
    setCorrectDialogOpen(true);
  }

  async function handleSaveCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      setCorrecting(true);
      setCorrectError("");

      const dateStr = selectedRecord.attendance_date;
      const checkInIso = editCheckIn
        ? new Date(`${dateStr}T${editCheckIn}:00+07:00`).toISOString()
        : null;
      const checkOutIso = editCheckOut
        ? new Date(`${dateStr}T${editCheckOut}:00+07:00`).toISOString()
        : null;

      await api.patch(`/admin/attendance/${selectedRecord.id}`, {
        intern_id: selectedRecord.intern_id,
        attendance_date: dateStr,
        check_in: checkInIso,
        check_out: checkOutIso,
        status: editStatus,
      });

      setCorrectDialogOpen(false);
      await fetchAttendance(pagination.page);
    } catch (err: any) {
      console.error("Failed to correct attendance:", err);
      setCorrectError(
        err.response?.data?.message || "Failed to save correction. Please try again."
      );
    } finally {
      setCorrecting(false);
    }
  }

  // Data aggregasi chart harian dari data record tabel saat ini
  const dailyChartData = useMemo(() => {
    const map = new Map<string, { date: string; present: number; late: number; absent: number }>();
    records.forEach((r) => {
      const dateLabel = formatDate(r.attendance_date);
      if (!map.has(dateLabel)) {
        map.set(dateLabel, { date: dateLabel, present: 0, late: 0, absent: 0 });
      }
      const entry = map.get(dateLabel)!;
      if (r.status === "PRESENT") entry.present++;
      else if (r.status === "LATE") entry.late++;
      else if (r.status === "ABSENT") entry.absent++;
    });
    return Array.from(map.values()).reverse();
  }, [records]);

  const pieChartData = useMemo(() => {
    return [
      { name: "Present", value: summary.present, color: "var(--chart-3)" },
      { name: "Late", value: summary.late, color: "var(--chart-4)" },
      { name: "Absent", value: summary.absent, color: "var(--chart-5)" },
    ].filter((item) => item.value > 0);
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </p>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>

                <p className="mt-3 text-2xl font-bold">
                  {item.value}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Report Filters</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Search Intern
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name or intern code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Department
              </label>
              <Select
                value={department}
                onValueChange={setDepartment}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="ALL">
                    All Departments
                  </SelectItem>
                  {departments.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Status
              </label>
              <Select
                value={status}
                onValueChange={setStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    All Status
                  </SelectItem>
                  <SelectItem value="PRESENT">
                    Present
                  </SelectItem>
                  <SelectItem value="LATE">
                    Late
                  </SelectItem>
                  <SelectItem value="ABSENT">
                    Absent
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch("");
                  setDepartment("ALL");
                  setStatus("ALL");
                }}
                title="Clear filters"
                aria-label="Clear filters"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualisasi Tren & Distribusi (Additive Section Recharts) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Daily Attendance Trend
            </CardTitle>
            <CardDescription>
              Daily attendance count (Present, Late, Absent) based on the active filters
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {dailyChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data available for the trend chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="present" name="Present" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="Late" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Attendance Distribution
            </CardTitle>
            <CardDescription>
              Present, Late, and Absent proportions for this period
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center">
            {pieChartData.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No attendance distribution data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {pieChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} days`, "Count"]} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">
                Attendance Records
              </h2>
              <p className="text-sm text-muted-foreground">
                Attendance details based on selected filters
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={downloadCSV}
                disabled={downloadingCSV || loading || pagination.total === 0}
                size="sm"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {downloadingCSV ? "Exporting..." : "Export CSV"}
              </Button>

              <Button
                onClick={downloadPDF}
                disabled={downloading || loading || pagination.total === 0}
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading ? "Generating PDF..." : "Download PDF"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="px-5 pb-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intern</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Loading attendance records...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">
                          {record.intern_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.intern_code}
                        </div>
                      </TableCell>

                      <TableCell>
                        {record.department}
                      </TableCell>

                      <TableCell>
                        {formatDate(record.attendance_date)}
                      </TableCell>

                      <TableCell>
                        {formatTime(record.check_in, "-")}
                      </TableCell>

                      <TableCell>
                        {formatTime(record.check_out, "-")}
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {record.duration || formatDuration(record.check_in, record.check_out)}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Correct attendance"
                          onClick={() => openCorrectionDialog(record)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              {pagination.total === 0
                ? "Showing 0 of 0 records"
                : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )} of ${pagination.total} records`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchAttendance(pagination.page - 1)}
              >
                Previous
              </Button>

              <span className="px-2 text-sm font-medium">
                {pagination.page} / {Math.max(pagination.totalPages, 1)}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={
                  pagination.page >= pagination.totalPages || loading
                }
                onClick={() => fetchAttendance(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Koreksi Absensi (Requirement 9) */}
      <Dialog open={correctDialogOpen} onOpenChange={setCorrectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Correct Attendance</DialogTitle>
            <DialogDescription>
              Correct the check-in or check-out time for{" "}
              <strong>{selectedRecord?.intern_name}</strong> on{" "}
              <strong>{selectedRecord && formatDate(selectedRecord.attendance_date)}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCorrection} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Check-In Time (HH:mm)</label>
              <Input
                type="time"
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Check-Out Time (HH:mm)</label>
              <Input
                type="time"
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={editStatus}
                onValueChange={(val: any) => setEditStatus(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {correctError && (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {correctError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCorrectDialogOpen(false)}
                disabled={correcting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={correcting}>
                {correcting ? "Saving..." : "Save Correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
