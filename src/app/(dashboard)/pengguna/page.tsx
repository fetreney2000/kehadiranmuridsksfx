"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MS } from "@/lib/strings/ms";
import { toast } from "sonner";
import { Plus, Pencil, Lock, AlertCircle, UserPlus } from "lucide-react";

interface SafeUser {
  _id: string;
  username: string;
  fullName: string;
  role: string;
  classId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ClassItem {
  _id: string;
  name: string;
}

const userSchema = z.object({
  username: z.string().min(3, MS.validation.minLength.replace("{min}", "3")),
  password: z.string().min(6, MS.users.passwordMinLength),
  fullName: z.string().min(1, MS.validation.required),
  role: z.enum(["pentadbir", "guru_kelas", "guru_biasa"]),
  classId: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

export default function PenggunaPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: classes } = useQuery<ClassItem[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await fetch("/api/classes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || MS.status.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Pengguna berjaya ditambah.");
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserForm> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(MS.status.error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Pengguna berjaya dikemaskini.");
      setDialogOpen(false);
      setEditingUser(null);
    },
    onError: () => toast.error(MS.status.error),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error(MS.status.error);
    },
    onSuccess: () => {
      toast.success(MS.profile.passwordChanged);
      setPasswordDialogOpen(false);
      setResetUserId(null);
      setNewPassword("");
    },
    onError: () => toast.error(MS.status.error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "guru_biasa" },
  });

  const selectedRole = watch("role");

  const openEdit = (user: SafeUser) => {
    setEditingUser(user);
    reset({
      username: user.username,
      password: "",
      fullName: user.fullName,
      role: user.role as any,
      classId: user.classId || undefined,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingUser(null);
    reset({ username: "", password: "", fullName: "", role: "guru_biasa", classId: undefined });
    setDialogOpen(true);
  };

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      const payload: any = { fullName: data.fullName, role: data.role, classId: data.classId || null };
      if (data.password) payload.password = data.password;
      updateMutation.mutate({ id: editingUser._id, data: payload });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: ColumnDef<SafeUser>[] = [
    { accessorKey: "fullName", header: MS.users.fullName },
    { accessorKey: "username", header: MS.users.username },
    {
      accessorKey: "role",
      header: MS.users.role,
      cell: ({ row }) => (
        <Badge variant="outline">{MS.role[row.original.role as keyof typeof MS.role] || row.original.role}</Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: MS.status.active,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "destructive"}>
          {row.original.isActive ? MS.status.active : MS.status.inactive}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setResetUserId(row.original._id);
              setNewPassword("");
              setPasswordDialogOpen(true);
            }}
          >
            <Lock className="h-4 w-4" />
          </Button>
          <Button
            variant={row.original.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() =>
              toggleActiveMutation.mutate({
                id: row.original._id,
                isActive: !row.original.isActive,
              })
            }
          >
            {row.original.isActive ? "Nyahaktifkan" : "Aktifkan"}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{MS.users.title}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-2" />
            {MS.users.addUser}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? MS.users.editUser : MS.users.addUser}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{MS.users.fullName}</Label>
                <Input {...register("fullName")} placeholder={MS.users.fullName} />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <Label>{MS.users.username}</Label>
                <Input {...register("username")} placeholder={MS.users.username} disabled={!!editingUser} />
                {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
              </div>
              <div>
                <Label>{MS.users.password}</Label>
                <Input type="password" {...register("password")} placeholder={editingUser ? "(Biarkan kosong untuk tidak tukar)" : MS.users.password} />
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <Label>{MS.users.role}</Label>
                <Select value={selectedRole} onValueChange={(v) => setValue("role", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pentadbir">{MS.role.pentadbir}</SelectItem>
                    <SelectItem value="guru_kelas">{MS.role.guru_kelas}</SelectItem>
                    <SelectItem value="guru_biasa">{MS.role.guru_biasa}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedRole === "guru_kelas" && (
                <div>
                  <Label>{MS.users.class}</Label>
                  <Select value={watch("classId") || "none"} onValueChange={(v) => setValue("classId", (v ?? "none") === "none" ? "" : (v ?? ""))}>
                    <SelectTrigger><SelectValue placeholder={MS.classes.noTeacher} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{MS.classes.noTeacher}</SelectItem>
                      {classes?.map((c) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>{MS.actions.cancel}</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {MS.actions.save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable columns={columns} data={users || []} />
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{MS.users.resetPassword}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{MS.users.newPassword}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                placeholder={MS.users.passwordMinLength}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>{MS.actions.cancel}</Button>
              <Button
                disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                onClick={() => resetPasswordMutation.mutate({ id: resetUserId!, password: newPassword })}
              >
                {MS.actions.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}