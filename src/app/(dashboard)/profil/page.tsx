"use client";

import { useMutation } from "@tanstack/react-query";
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
import { MS } from "@/lib/strings/ms";
import { toast } from "sonner";
import { Lock, UserCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Me {
  userId: string; username: string; fullName: string; role: string; classId: string | null;
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, MS.validation.required),
  newPassword: z.string().min(6, MS.users.passwordMinLength),
  confirmPassword: z.string().min(6, MS.users.passwordMinLength),
}).refine(d => d.newPassword === d.confirmPassword, { message: MS.profile.passwordMismatch, path: ["confirmPassword"] });

export default function ProfilPage() {
  const { data: me } = useQuery<Me>({ queryKey: ["me"], queryFn: () => fetch("/api/auth/me").then(r => { if (!r.ok) throw new Error("Not auth"); return r.json(); }) });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const changeMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch(`/api/users/${me?.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.newPassword }),
      });
      if (!res.ok) throw new Error(MS.status.error);
    },
    onSuccess: () => { toast.success(MS.profile.passwordChanged); reset(); },
    onError: () => toast.error(MS.status.error),
  });

  const initials = (me?.fullName || "")
    .split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{MS.profile.title}</h1>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{me?.fullName}</p>
            <p className="text-sm text-muted-foreground">@{me?.username}</p>
            <Badge variant="outline" className="mt-1">{MS.role[me?.role as keyof typeof MS.role] || me?.role}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base"><Lock className="h-4 w-4 inline mr-2" />{MS.profile.changePassword}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(data => changeMutation.mutate(data))} className="space-y-4">
            <div>
              <Label>{MS.profile.currentPassword}</Label>
              <Input type="password" {...register("currentPassword")} />
              {errors.currentPassword && <p className="text-xs text-destructive mt-1">{errors.currentPassword.message}</p>}
            </div>
            <div>
              <Label>{MS.profile.newPassword}</Label>
              <Input type="password" {...register("newPassword")} />
              {errors.newPassword && <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>}
            </div>
            <div>
              <Label>{MS.profile.confirmNewPassword}</Label>
              <Input type="password" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" disabled={changeMutation.isPending}>{MS.actions.save}</Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}