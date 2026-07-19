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
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ClassData {
  _id: string; name: string; guruKelasId: string | null; guruKelasName: string | null; studentCount: number;
}
interface Teacher {
  _id: string; fullName: string;
}

const classSchema = z.object({
  name: z.string().min(1, MS.validation.required),
  guruKelasId: z.string().optional(),
});

export default function KelasPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassData | null>(null);

  const { data: classes, isLoading } = useQuery<ClassData[]>({ queryKey: ["classes"], staleTime: 5 * 60 * 1000, queryFn: () => fetch("/api/classes").then(r => r.json()) });
  const { data: teachers } = useQuery<Teacher[]>({ queryKey: ["users"], queryFn: () => fetch("/api/users").then(r => r.json()), select: (d: any[]) => d.filter(u => u.isActive && (u.role === "guru_kelas" || (u.roles && u.roles.includes("guru_kelas")))), staleTime: 5 * 60 * 1000 });

  const teacherMap = useMemo(() => {
    const m = new Map<string, string>();
    teachers?.forEach(t => m.set(t._id, t.fullName));
    return m;
  }, [teachers]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(classSchema), defaultValues: { name: "", guruKelasId: "" } });

  const selectedTeacherId = watch("guruKelasId");

  // Convert form value (empty string = no teacher) to API value (null = no teacher)
  const toApiGuruId = (v: string | undefined | null): string | null => {
    if (!v || v === "") return null;
    return v;
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, guruKelasId: toApiGuruId(data.guruKelasId) }) }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes"] }); toast.success("Kelas berjaya ditambah."); setDialogOpen(false); },
    onError: () => toast.error(MS.status.error),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: any }) => fetch(`/api/classes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, guruKelasId: toApiGuruId(d.guruKelasId) }) }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes"] }); toast.success("Kelas berjaya dikemaskini."); setDialogOpen(false); setEditing(null); },
    onError: () => toast.error(MS.status.error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/classes/${id}`, { method: "DELETE" }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes"] }); toast.success("Kelas berjaya dihapus."); },
    onError: (err: Error) => toast.error(err.message || MS.status.error),
  });

  const onSubmit = (data: any) => {
    if (editing) updateMutation.mutate({ id: editing._id, data });
    else createMutation.mutate(data);
  };

  const columns: ColumnDef<ClassData>[] = [
    { accessorKey: "name", header: MS.classes.name },
    { accessorKey: "guruKelasName", header: MS.classes.teacher, cell: ({ row }) => row.original.guruKelasName || <span className="text-muted-foreground italic">{MS.classes.noTeacher}</span> },
    { accessorKey: "studentCount", header: MS.classes.studentCount, cell: ({ row }) => <Badge variant="secondary">{row.original.studentCount}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); reset({ name: row.original.name, guruKelasId: row.original.guruKelasId ?? "" }); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm(MS.classes.deleteConfirm)) deleteMutation.mutate(row.original._id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{MS.classes.title}</h1>
        <Button onClick={() => { setEditing(null); reset({ name: "", guruKelasId: "" }); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />{MS.classes.addClass}</Button>
      </div>
      <Card><CardContent className="p-4"><DataTable columns={columns} data={classes || []} /></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? MS.classes.editClass : MS.classes.addClass}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>{MS.classes.name}</Label><Input {...register("name")} placeholder="cth: 5 Bestari" />{errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}</div>
            <div><Label>{MS.classes.teacher}</Label>
              <Select value={selectedTeacherId || ""} onValueChange={(v) => setValue("guruKelasId", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={MS.classes.noTeacher}>
                    {selectedTeacherId && selectedTeacherId !== "" ? (teacherMap.get(selectedTeacherId) || selectedTeacherId) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{MS.classes.noTeacher}</SelectItem>
                  {(teachers as Teacher[] | undefined)?.map((t: Teacher) => <SelectItem key={t._id} value={t._id}>{t.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>{MS.actions.cancel}</Button>
              <Button type="submit">{MS.actions.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}