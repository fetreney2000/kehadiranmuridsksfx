"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, Eye, EyeOff, School } from "lucide-react";
import { MS } from "@/lib/strings/ms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  username: z.string().min(1, MS.validation.required),
  password: z.string().min(1, MS.validation.required),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || MS.login.errorInvalid);
      }
      return result;
    },
    onSuccess: () => {
      router.push(redirectTo);
      router.refresh();
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute top-1/3 left-1/4 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-2xl shadow-primary/5 overflow-hidden">
          {/* Brand header */}
          <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-center relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/15" />
            <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-accent/10" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg mb-3"
            >
              <GraduationCap className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-xl font-bold text-white relative z-10">{MS.appName}</h1>
            <p className="text-sm text-white/80 mt-0.5 relative z-10">{MS.schoolName}</p>
            <div className="mt-2 h-px bg-white/20 mx-8 relative z-10" />
            <p className="text-[11px] text-white/60 mt-2 relative z-10">{MS.login.subtitle}</p>
          </div>

          <CardContent className="p-6 pt-8">
            {loginMutation.isError && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                <Alert variant="destructive" className="mb-4 border-destructive/30 bg-destructive/5">
                  <AlertDescription className="text-sm">
                    {loginMutation.error?.message || MS.login.errorInvalid}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <form
              onSubmit={handleSubmit((data) => loginMutation.mutate(data))}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">{MS.login.username}</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  {...register("username")}
                  className={cn("h-11", errors.username && "border-destructive")}
                  placeholder={MS.login.username}
                  disabled={loginMutation.isPending}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{MS.login.password}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
                    className={cn("h-11 pr-10", errors.password && "border-destructive")}
                    placeholder={MS.login.password}
                    disabled={loginMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/20"
                size="lg"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {MS.login.loggingIn}
                  </>
                ) : (
                  MS.login.loginButton
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          &copy; {new Date().getFullYear()} {MS.schoolName}
        </p>
      </motion.div>
    </div>
  );
}