"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MS } from "@/lib/strings/ms";
import { toast } from "sonner";
import { Pencil, Lock, UserPlus } from "lucide-react";

interface SafeUser { _id: string; username: string; fullName: string; role: string; classId: string | null; isActive: boolean; }
interface ClassItem { _id: string; name: string; }

const userSchema = z.object({
  username: z.string().min(3, "Min 3 aksara"),
  password: z.string().min(6, MS.users.passwordMinLength).optional().or(z.literal("")),
  fullName: z.string().min(1),
  role: z.enum(["pentadbir", "guru_kelas", "guru_biasa"]),
  classId: z.string().optional(),
});

export default function PenggunaPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: users, isLoading } = useQuery<SafeUser[]>({ queryKey: ["users"], staleTime: 2 * 60 * 1000, queryFn: () => fetch("/api/users").then(r => r.json()) });
  const { data: classes } = useQuery<ClassItem[]>({ queryKey: ["classes"], staleTime: 5 * 60 * 1000, queryFn: () => fetch("/api/classes").then(r => r.json()) });

  const classMap = useMemo(() => { const m = new Map<string, string>(); classes?.forEach(c => m.set(c._id, c.name)); return m; }, [classes]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(userSchema), defaultValues: { username: "", password: "", fullName: "", role: "guru_biasa" as const, classId: "" } });

  const selectedRole = watch("role");
  const selectedClassId = watch("classId");

  // Whether to show class picker: pentadbir or guru_kelas
  const showClassPicker = selectedRole === "guru_kelas" || selectedRole === "pentadbir";

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Pengguna berjaya ditambah."); setDialogOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Pengguna berjaya dikemaskini."); setDialogOpen(false); setEditingUser(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).then(r => { if (!r.ok) throw new Error("Gagal"); }),
    onSuccess: () => { toast.success(MS.profile.passwordChanged); setPasswordDialogOpen(false); },
    onError: () => toast.error(MS.status.error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const openEdit = (user: SafeUser) => { setEditingUser(user); reset({ username: user.username, password: "", fullName: user.fullName, role: user.role as any, classId: user.classId || "" }); setDialogOpen(true); };
  const openCreate = () => { setEditingUser(null); reset({ username: "", password: "", fullName: "", role: "guru_biasa", classId: "" }); setDialogOpen(true); };

  const onSubmit = (data: any) => {
    if (editingUser) {
      // Editing: send everything except password (password is handled separately via lock icon)
      const isGuruKelas = data.role === "guru_kelas";
      updateMutation.mutate({ id: editingUser._id, data: { username: data.username, fullName: data.fullName, role: data.role, classId: isGuruKelas ? (data.classId || null) : null } });
    } else {
      // Creating: send password too
      createMutation.mutate(data);
    }
  };

  const columns: ColumnDef<SafeUser>[] = [
    { accessorKey: "fullName", header: MS.users.fullName },
    { accessorKey: "username", header: MS.users.username },
    { accessorKey: "role", header: MS.users.role, cell: ({ row }) => <Badge variant="outline">{MS.role[row.original.role as keyof typeof MS.role] || row.original.role}</Badge> },
    { accessorKey: "isActive", header: MS.status.active, cell: ({ row }) => <Badge variant={row.original.isActive ? "default" : "destructive"}>{row.original.isActive ? MS.status.active : MS.status.inactive}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { setResetUserId(row.original._id); setNewPassword(""); setPasswordDialogOpen(true); }}><Lock className="h-4 w-4" /></Button>
        <Button variant={row.original.isActive ? "destructive" : "default"} size="sm" onClick={() => toggleActiveMutation.mutate({ id: row.original._id, isActive: !row.original.isActive })}>{row.original.isActive ? "Nyahaktifkan" : "Aktifkan"}</Button>
      </div>)},
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{MS.users.title}</h1>
        <Button onClick={openCreate}><UserPlus className="h-4 w-4 mr-2" />{MS.users.addUser}</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingUser ? MS.users.editUser : MS.users.addUser}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>{MS.users.fullName}</Label><Input {...register("fullName")} />{errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}</div>
            <div><Label>{MS.users.username}</Label><Input {...register("username")} />{errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}</div>

            {/* Password field: only shown for creating new users */}
            {!editingUser && (
              <div><Label>{MS.users.password}</Label><Input type="password" {...register("password")} />{errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}</div>
            )}

            <div><Label>{MS.users.role}</Label>
              <Select value={selectedRole} onValueChange={(v) => { setValue("role", v as any); setValue("classId", ""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pentadbir">{MS.role.pentadbir}</SelectItem><SelectItem value="guru_kelas">{MS.role.guru_kelas}</SelectItem><SelectItem value="guru_biasa">{MS.role.guru_biasa}</SelectItem></SelectContent>
              </Select>
            </div>

            {showClassPicker && (
              <div><Label>{MS.users.class}</Label>
                <Select value={selectedClassId || ""} onValueChange={(v) => setValue("classId", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder={MS.classes.noTeacher}>{selectedClassId ? (classMap.get(selectedClassId) || selectedClassId) : MS.classes.noTeacher}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{MS.classes.noTeacher}</SelectItem>
                    {classes?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>{MS.actions.cancel}</Button><Button type="submit">{MS.actions.save}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Card><CardContent className="p-4"><DataTable columns={columns} data={users || []} /></CardContent></Card>

      {/* Separate password reset dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{MS.users.resetPassword}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{MS.users.newPassword}</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>{MS.actions.cancel}</Button><Button disabled={newPassword.length < 6} onClick={() => resetPasswordMutation.mutate({ id: resetUserId!, password: newPassword })}>{MS.actions.save}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}