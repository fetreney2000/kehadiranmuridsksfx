"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { MS } from "@/lib/strings/ms";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { formatDateMalayFull } from "@/lib/utils/date";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TodayReport {
  date: string;
  totalStudents: number;
  totalHadir: number;
  totalTidakHadir: number;
  attendancePercentage: number;
  perClass: {
    classId: string;
    className: string;
    total: number;
    hadir: number;
    tidakHadir: number;
    percentage: number;
  }[];
  absentList: {
    _id: string;
    name: string;
    classId: string;
    sex: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery<TodayReport>({
    queryKey: ["reports", "today"],
    queryFn: async () => {
      const res = await fetch("/api/reports?mode=today");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{MS.status.error}</AlertDescription>
      </Alert>
    );
  }

  const absentColumns: ColumnDef<any>[] = [
    { accessorKey: "name", header: MS.students.name },
    { accessorKey: "sex", header: MS.students.sex,
      cell: ({ row }) => MS.sex[row.original.sex as "L" | "P"] || row.original.sex,
    },
    {
      accessorKey: "classId",
      header: MS.students.class,
      cell: ({ row }) => {
        const cls = data?.perClass.find(
          (c) => c.classId === row.original.classId
        );
        return cls?.className || row.original.classId;
      },
    },
  ];

  const stats = [
    {
      label: MS.reports.totalStudents,
      value: data?.totalStudents || 0,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: MS.status.present,
      value: data?.totalHadir || 0,
      icon: UserCheck,
      color: "text-green-600 bg-green-50",
    },
    {
      label: MS.status.absent,
      value: data?.totalTidakHadir || 0,
      icon: UserX,
      color: "text-red-600 bg-red-50",
    },
    {
      label: MS.reports.attendancePercentage,
      value: `${data?.attendancePercentage || 0}%`,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {MS.nav.dashboard}
        </h1>
        <p className="text-muted-foreground">
          {formatDateMalayFull(new Date())}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Overall progress bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{MS.reports.attendancePercentage}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={data?.attendancePercentage || 0} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {data?.totalHadir} / {data?.totalStudents} {MS.status.present.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {/* Per-class breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{MS.reports.perClassBreakdown}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.perClass.map((cls) => (
              <Card key={cls.classId} className="border bg-muted/40">
                <CardContent className="p-3">
                  <p className="font-semibold text-sm">{cls.className}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={cls.percentage} className="h-2 flex-1" />
                    <span className="text-xs font-bold">{cls.percentage}%</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      <UserCheck className="h-3 w-3 inline text-green-500 mr-1" />
                      {cls.hadir}
                    </span>
                    <span>
                      <UserX className="h-3 w-3 inline text-red-500 mr-1" />
                      {cls.tidakHadir}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Absent students list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            <AlertCircle className="h-4 w-4 inline mr-2 text-red-500" />
            {MS.reports.absentToday} ({data?.absentList.length || 0})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/laporan")}
          >
            {MS.reports.title}
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={absentColumns}
            data={data?.absentList || []}
            searchPlaceholder={`${MS.actions.search} ${MS.students.name.toLowerCase()}...`}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}