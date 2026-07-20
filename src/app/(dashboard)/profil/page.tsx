"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MS } from "@/lib/strings/ms";
import { toast } from "sonner";
import { Lock, Pencil, UserCircle } from "lucide-react";

interface Me {
  userId: string; username: string; fullName: string; role: string; roles: string[]; classId: string | null;
}

const profileSchema = z.object({
  fullName: z.string().min(1, "Nama penuh wajib diisi"),
  username: z.string().min(3, "Nama pengguna mesti sekurang-kurangnya 3 aksara"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, MS.validation.required),
  newPassword: z.string().min(6, MS.users.passwordMinLength),
  confirmPassword: z.string().min(6, MS.users.passwordMinLength),
}).refine(d => d.newPassword === d.confirmPassword, { message: MS.profile.passwordMismatch, path: ["confirmPassword"] });

export default function ProfilPage() {
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);

  const { data: me } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then(r => { if (!r.ok) throw new Error("Not auth"); return r.json(); }),
  });

  const roles = me?.roles && me.roles.length > 0 ? me.roles : [me?.role || ""];

  // Profile edit form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: me?.fullName || "", username: me?.username || "" },
    values: { fullName: me?.fullName || "", username: me?.username || "" },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { fullName: string; username: string }) => {
      const res = await fetch(`/api/users/${me?.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengemaskini profil");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profil berjaya dikemaskini.");
      setEditingProfile(false);
    },
    onError: (err: Error) => toast.error(err.message || MS.status.error),
  });

  // Password change form
  const {
    register: registerPass,
    handleSubmit: handlePassSubmit,
    reset: resetPass,
    formState: { errors: passErrors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const res = await fetch(`/api/users/${me?.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.newPassword }),
      });
      if (!res.ok) throw new Error(MS.status.error);
    },
    onSuccess: () => { toast.success(MS.profile.passwordChanged); resetPass(); },
    onError: () => toast.error(MS.status.error),
  });

  const initials = (me?.fullName || "")
    .split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{MS.profile.title}</h1>

      {/* Profile info card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {editingProfile ? (
                <form onSubmit={handleProfileSubmit(data => updateProfileMutation.mutate(data))} className="space-y-3">
                  <div>
                    <Label className="text-xs">{MS.users.fullName}</Label>
                    <Input {...registerProfile("fullName")} placeholder={MS.users.fullName} className="h-9" />
                    {profileErrors.fullName && <p className="text-xs text-destructive mt-0.5">{profileErrors.fullName.message}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">{MS.users.username}</Label>
                    <Input {...registerProfile("username")} placeholder={MS.users.username} className="h-9" />
                    {profileErrors.username && <p className="text-xs text-destructive mt-0.5">{profileErrors.username.message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={updateProfileMutation.isPending}>{MS.actions.save}</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingProfile(false)}>{MS.actions.cancel}</Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-lg font-semibold">{me?.fullName}</p>
                  <p className="text-sm text-muted-foreground">@{me?.username}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {roles.map(r => (
                      <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">{MS.role[r as keyof typeof MS.role] || r}</Badge>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditingProfile(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    {MS.actions.edit}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base"><Lock className="h-4 w-4 inline mr-2" />{MS.profile.changePassword}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassSubmit(data => changePasswordMutation.mutate({ newPassword: data.newPassword }))} className="space-y-4">
            <div>
              <Label>{MS.profile.currentPassword}</Label>
              <Input type="password" {...registerPass("currentPassword")} />
              {passErrors.currentPassword && <p className="text-xs text-destructive mt-1">{passErrors.currentPassword.message}</p>}
            </div>
            <div>
              <Label>{MS.profile.newPassword}</Label>
              <Input type="password" {...registerPass("newPassword")} />
              {passErrors.newPassword && <p className="text-xs text-destructive mt-1">{passErrors.newPassword.message}</p>}
            </div>
            <div>
              <Label>{MS.profile.confirmNewPassword}</Label>
              <Input type="password" {...registerPass("confirmPassword")} />
              {passErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{passErrors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>{MS.actions.save}</Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}