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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MS } from "@/lib/strings/ms";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface StudentData {
  _id: string; name: string; sex: "L" | "P"; classId: string; className: string | null; qrCode: string; isActive: boolean;
}
interface ClassData {
  _id: string; name: string;
}

const studentSchema = z.object({ name: z.string().min(1, MS.validation.required), sex: z.enum(["L", "P"]), classId: z.string().min(1, MS.validation.required) });

export default function MuridPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentData | null>(null);

  const { data: students, isLoading } = useQuery<StudentData[]>({ queryKey: ["students"], staleTime: 2 * 60 * 1000, queryFn: () => fetch("/api/students?active=true").then(r => r.json()) });
  const { data: classes } = useQuery<ClassData[]>({ queryKey: ["classes"], staleTime: 5 * 60 * 1000, queryFn: () => fetch("/api/classes").then(r => r.json()) });

  const classMap = useMemo(() => { const m = new Map<string, string>(); classes?.forEach(c => m.set(c._id, c.name)); return m; }, [classes]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(studentSchema), defaultValues: { name: "", sex: "L" as const, classId: "" } });

  const selectedClassId = watch("classId");

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); toast.success("Murid berjaya ditambah."); setDialogOpen(false); },
    onError: () => toast.error(MS.status.error),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: any }) => fetch(`/api/students/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => { if (!r.ok) throw new Error("Gagal"); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); toast.success("Murid berjaya dikemaskini."); setDialogOpen(false); setEditing(null); },
    onError: () => toast.error(MS.status.error),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/students/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); toast.success("Murid berjaya dihapus."); },
    onError: () => toast.error(MS.status.error),
  });

  const onSubmit = (data: any) => { if (editing) updateMutation.mutate({ id: editing._id, data }); else createMutation.mutate(data); };

  const columns: ColumnDef<StudentData>[] = [
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "sex", header: MS.students.sex, cell: ({ row }) => MS.sex[row.original.sex] },
    { accessorKey: "className", header: MS.students.class, cell: ({ row }) => row.original.className || classMap.get(row.original.classId) || row.original.classId || "—" },
    { accessorKey: "qrCode", header: MS.students.qrCode, cell: ({ row }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.qrCode.substring(0, 8)}...</code> },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); reset({ name: row.original.name, sex: row.original.sex, classId: row.original.classId }); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm(MS.students.deleteConfirm)) deleteMutation.mutate(row.original._id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>)},
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{MS.students.title}</h1>
        <Button onClick={() => { setEditing(null); reset({ name: "", sex: "L", classId: "" }); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />{MS.students.addStudent}</Button>
      </div>
      <Card><CardContent className="p-4"><DataTable columns={columns} data={students || []} /></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? MS.students.editStudent : MS.students.addStudent}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>{MS.students.name}</Label><Input {...register("name")} placeholder={MS.students.name} />{errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}</div>
            <div><Label>{MS.students.sex}</Label>
              <Select value={watch("sex") || "L"} onValueChange={(v) => setValue("sex", v as "L" | "P")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="L">{MS.sex.L}</SelectItem><SelectItem value="P">{MS.sex.P}</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>{MS.students.class}</Label>
              <Select value={selectedClassId || ""} onValueChange={(v) => setValue("classId", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={MS.students.class}>{selectedClassId ? (classMap.get(selectedClassId) || selectedClassId) : null}</SelectValue>
                </SelectTrigger>
                <SelectContent>{classes?.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.classId && <p className="text-xs text-destructive mt-1">{errors.classId.message}</p>}
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