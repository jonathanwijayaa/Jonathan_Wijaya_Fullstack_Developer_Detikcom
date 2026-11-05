import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Intern {
  id: string;
  user_id: string;
  intern_code: string;
  department: string;
  start_date: string;
  end_date: string | null;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
  users:
    | { name: string; email: string; role: string }
    | { name: string; email: string; role: string }[]
    | null;
}

interface InternForm {
  name: string;
  email: string;
  intern_code: string;
  department: string;
  start_date: string;
  end_date: string;
}

const LIMIT = 10;

const emptyForm: InternForm = {
  name: "",
  email: "",
  intern_code: "",
  department: "",
  start_date: "",
  end_date: "",
};

export default function InternManagement() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState<Intern | null>(null);
  const [form, setForm] = useState<InternForm>(emptyForm);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingIntern, setDeletingIntern] = useState<Intern | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInterns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/interns", {
        params: {
          page,
          search,
          department: department === "ALL" ? "" : department,
          status: status === "ALL" ? "" : status,
        },
      });

      setInterns(response.data.data || []);
      setTotal(response.data.pagination.total);
      setTotalPages(Math.max(response.data.pagination.totalPages, 1));
      setDepartments(response.data.filters.departments || []);
    } catch (err) {
      console.error("Failed to fetch interns:", err);
      setError("Failed to load interns. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, department, status]);

  useEffect(() => {
    fetchInterns();
  }, [fetchInterns]);

  const openAddDialog = () => {
    setEditingIntern(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (intern: Intern) => {
    const user = Array.isArray(intern.users)
      ? intern.users[0]
      : intern.users;

    setEditingIntern(intern);
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      intern_code: intern.intern_code,
      department: intern.department,
      start_date: intern.start_date,
      end_date: intern.end_date || "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleFormChange = (field: keyof InternForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.intern_code.trim() ||
      !form.department.trim() ||
      !form.start_date
    ) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setFormError("End date must be after or equal to start date.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        intern_code: form.intern_code.trim(),
        department: form.department.trim(),
        start_date: form.start_date,
        end_date: form.end_date || null,
        };

        if (editingIntern) {
        await api.put(`/admin/interns/${editingIntern.id}`, payload);
        } else {
        await api.post("/admin/interns", payload);
        }

      setDialogOpen(false);
      setForm(emptyForm);
      setEditingIntern(null);
      setPage(1);

      // Refresh immediately when already on page 1.
      if (page === 1) {
        await fetchInterns();
      }
    } catch (err: any) {
      console.error("Save intern error:", err);
      setFormError(
        err.response?.data?.message || "Failed to save intern. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (intern: Intern) => {
    setDeletingIntern(intern);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingIntern) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(`/admin/interns/${deletingIntern.id}`);

      setDeleteDialogOpen(false);
      setDeletingIntern(null);

      // Return to previous page if the last row on this page was deleted.
      const nextPage = interns.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);

      if (nextPage === page) {
        await fetchInterns();
      }
    } catch (err: any) {
      console.error("Delete intern error:", err);
      setError(
        err.response?.data?.message || "Failed to delete intern. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (internStatus: Intern["status"]) => {
    switch (internStatus) {
      case "ACTIVE":
        return (
          <Badge className="border border-chart-3/20 bg-chart-3/10 text-chart-3 hover:bg-chart-3/20">
            Active
          </Badge>
        );
      case "UPCOMING":
        return (
          <Badge className="border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20">
            Upcoming
          </Badge>
        );
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or intern code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={department}
              onValueChange={(value) => {
                setDepartment(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchInterns}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Intern Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Intern List</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage all registered interns.
            </p>
          </div>

          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Intern
          </Button>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Intern</th>
                  <th className="pb-3 font-medium">Intern Code</th>
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading interns...
                    </td>
                  </tr>
                ) : interns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      No interns found.
                    </td>
                  </tr>
                ) : (
                  interns.map((intern) => {
                    const user = Array.isArray(intern.users)
                      ? intern.users[0]
                      : intern.users;

                    return (
                      <tr key={intern.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-4">
                          <p className="font-medium text-foreground">
                            {user?.name || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user?.email || "-"}
                          </p>
                        </td>

                        <td className="py-4">{intern.intern_code}</td>
                        <td className="py-4">{intern.department}</td>

                        <td className="py-4">
                          <p>{formatDate(intern.start_date)}</p>
                          <p className="text-xs text-muted-foreground">
                            to {intern.end_date ? formatDate(intern.end_date) : "Ongoing"}
                          </p>
                        </td>

                        <td className="py-4">
                          {getStatusBadge(intern.status)}
                        </td>

                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              title="Edit intern"
                              onClick={() => openEditDialog(intern)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              title="Delete intern"
                              onClick={() => openDeleteDialog(intern)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination always visible */}
          <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "Showing 0 of 0 interns"
                : `Showing ${(page - 1) * LIMIT + 1}–${Math.min(
                    page * LIMIT,
                    total
                  )} of ${total} interns`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>

              <span className="px-2 text-sm font-medium">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIntern ? "Edit Intern" : "Add New Intern"}
            </DialogTitle>
            <DialogDescription>
              {editingIntern
                ? "Update intern account and internship information."
                : "Create a new intern account and internship profile."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
                placeholder="intern@example.com"
                required
              />
            </div>


            <div className="space-y-2">
              <label className="text-sm font-medium">Intern Code</label>
              <Input
                value={form.intern_code}
                onChange={(e) => handleFormChange("intern_code", e.target.value)}
                placeholder="INT-001"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Input
                value={form.department}
                onChange={(e) => handleFormChange("department", e.target.value.toUpperCase())}
                placeholder="IT Product Development"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleFormChange("start_date", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={form.end_date}
                  min={form.start_date || undefined}
                  onChange={(e) => handleFormChange("end_date", e.target.value)}
                />
              </div>
            </div>

            {formError && (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingIntern
                    ? "Save Changes"
                    : "Create Intern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Intern?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deletingIntern &&
                  (Array.isArray(deletingIntern.users)
                    ? deletingIntern.users[0]?.name
                    : deletingIntern.users?.name)}
              </strong>
              ? This action will permanently delete the intern account and
              their attendance history.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Intern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}