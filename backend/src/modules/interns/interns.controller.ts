import { Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase";

const createInternSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  intern_code: z.string().min(2).max(30),
  department: z.string().min(2).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
}).refine(
    (data) => !data.end_date || data.end_date >= data.start_date,
    {
        message: "End date must be after or equal to start date",
        path: ["end_date"],
    }
);

// GET /api/admin/interns
export async function getAllInterns(req: Request, res: Response) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 10;
    const search = String(req.query.search || "").trim().toLowerCase();
    const department = String(req.query.department || "").trim();
    const status = String(req.query.status || "").trim().toUpperCase();

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const { data, error } = await supabaseAdmin
      .from("interns")
      .select(`
        id,
        user_id,
        intern_code,
        department,
        start_date,
        end_date,
        created_at,
        users (
          name,
          email,
          role
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get interns error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve interns",
      });
    }

    // Derive intern status from start_date and end_date
    const interns = (data || []).map((intern: any) => {
      let internStatus = "ACTIVE";

      if (intern.start_date > today) {
        internStatus = "UPCOMING";
      } else if (intern.end_date && intern.end_date < today) {
        internStatus = "COMPLETED";
      }

      return {
        ...intern,
        status: internStatus,
      };
    });

    // Apply search and filters before pagination
    const filteredInterns = interns.filter((intern: any) => {
      const user = Array.isArray(intern.users)
        ? intern.users[0]
        : intern.users;

      const matchesSearch =
        !search ||
        user?.name?.toLowerCase().includes(search) ||
        intern.intern_code?.toLowerCase().includes(search);

      const matchesDepartment =
        !department || intern.department === department;

      const matchesStatus =
        !status || intern.status === status;

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    const total = filteredInterns.length;
    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit;
    const paginatedInterns = filteredInterns.slice(from, from + limit);

    return res.status(200).json({
      success: true,
      message: "Interns retrieved successfully",
      data: paginatedInterns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        departments: [...new Set(interns.map((intern: any) => intern.department))],
      },
    });
  } catch (error) {
    console.error("Get interns error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// POST /api/admin/interns
export async function createIntern(
    req: Request,
    res: Response
) {
    const validation = createInternSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid request data",
            errors: validation.error.flatten().fieldErrors,
        });
    }

    const {
        name,
        email,
        intern_code,
        department,
        start_date,
        end_date,
    } = validation.data;

    let authUserId: string | null = null;
    let profileCreated = false;

    try {
        // 1. Create Supabase Auth account
        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password: "intern",
                email_confirm: true,
            });

        if (authError || !authData.user) {
            console.error("Create auth user error:", authError);

            return res.status(400).json({
                success: false,
                message: authError?.message || "Failed to create user account",
            });
        }

        authUserId = authData.user.id;

        // 2. Create public.users profile
        const { error: profileError } = await supabaseAdmin
            .from("users")
            .insert({
                id: authUserId,
                name,
                email,
                role: "INTERN",
            });

        if (profileError) {
            console.error("Create profile error:", profileError);

            // Rollback Auth account
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
            authUserId = null;

            return res.status(400).json({
                success: false,
                message: "Failed to create intern profile",
            });
        }

        profileCreated = true;

        // 3. Create intern details
        const { data: intern, error: internError } =
            await supabaseAdmin
                .from("interns")
                .insert({
                    user_id: authUserId,
                    intern_code,
                    department,
                    start_date,
                    end_date: end_date || null,
                })
                .select()
                .single();

        if (internError) {
            console.error("Create intern details error:", internError);

            // Rollback profile and Auth account
            await supabaseAdmin
                .from("users")
                .delete()
                .eq("id", authUserId);

            await supabaseAdmin.auth.admin.deleteUser(authUserId);

            authUserId = null;
            profileCreated = false;

            return res.status(400).json({
                success: false,
                message: "Failed to create intern details",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Intern created successfully",
            data: {
                intern,
                user: {
                    id: authUserId,
                    name,
                    email,
                    role: "INTERN",
                },
            },
        });
    } catch (error) {
        console.error("Create intern error:", error);

        // Cleanup if an unexpected error occurs
        if (authUserId) {
            if (profileCreated) {
                await supabaseAdmin
                    .from("users")
                    .delete()
                    .eq("id", authUserId);
            }

            await supabaseAdmin.auth.admin.deleteUser(authUserId);
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

const updateInternSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  intern_code: z.string().min(2).max(30),
  department: z.string().min(2).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).refine(
  (data) => !data.end_date || data.end_date >= data.start_date,
  {
    message: "End date must be after or equal to start date",
    path: ["end_date"],
  }
);

export async function updateIntern(req: Request, res: Response) {
  const validation = updateInternSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { id } = req.params;
  const {
    name,
    email,
    intern_code,
    department,
    start_date,
    end_date,
  } = validation.data;

  try {
    // Find intern and its associated user
    const { data: intern, error: findError } = await supabaseAdmin
      .from("interns")
      .select("id, user_id, users(name, email)")
      .eq("id", id)
      .single();

    if (findError || !intern) {
      return res.status(404).json({
        success: false,
        message: "Intern not found",
      });
    }

    const userId = intern.user_id;

    // Update Supabase Auth email if changed
    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    // Update public.users
    const { error: userError } = await supabaseAdmin
      .from("users")
      .update({ name, email })
      .eq("id", userId);

    if (userError) {
      console.error("Update user profile error:", userError);

      return res.status(400).json({
        success: false,
        message: "Failed to update user profile",
      });
    }

    // Update public.interns
    const { data: updatedIntern, error: internError } =
      await supabaseAdmin
        .from("interns")
        .update({
          intern_code,
          department,
          start_date,
          end_date: end_date || null,
        })
        .eq("id", id)
        .select()
        .single();

    if (internError) {
      console.error("Update intern details error:", internError);

      return res.status(400).json({
        success: false,
        message: "Failed to update intern details",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Intern updated successfully",
      data: {
        ...updatedIntern,
        users: { name, email, role: "INTERN" },
      },
    });
  } catch (error) {
    console.error("Update intern error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// DELETE /api/admin/interns/:id
export async function deleteIntern(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const { data: intern, error: findError } = await supabaseAdmin
      .from("interns")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (findError || !intern) {
      return res.status(404).json({
        success: false,
        message: "Intern not found",
      });
    }

    // 1. Delete attendance records
    const { error: attendanceError } = await supabaseAdmin
      .from("attendances")
      .delete()
      .eq("intern_id", id);

    if (attendanceError) {
      console.error("Delete attendance error:", attendanceError);

      return res.status(400).json({
        success: false,
        message: "Failed to delete intern attendance records",
      });
    }

    // 2. Delete intern details
    const { error: internError } = await supabaseAdmin
      .from("interns")
      .delete()
      .eq("id", id);

    if (internError) {
      console.error("Delete intern error:", internError);

      return res.status(400).json({
        success: false,
        message: "Failed to delete intern details",
      });
    }

    // 3. Delete public user profile
    const { error: userError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", intern.user_id);

    if (userError) {
      console.error("Delete user profile error:", userError);

      return res.status(400).json({
        success: false,
        message: "Failed to delete user profile",
      });
    }

    // 4. Delete Supabase Auth account
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(intern.user_id);

    if (authError) {
      console.error("Delete Auth account error:", authError);

      return res.status(400).json({
        success: false,
        message: "Intern data deleted, but Auth account cleanup failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Intern deleted successfully",
    });
  } catch (error) {
    console.error("Delete intern error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}