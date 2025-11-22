import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, LayoutGrid, Users } from "lucide-react";
import TimeTableView from "../components/shift/TimeTableView";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ShiftManagement() {
  const [selectedDay, setSelectedDay] = useState("Day1");
  const [viewMode, setViewMode] = useState("job");

  const { data: committeesRaw = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => base44.entities.Committee.list(),
    initialData: [],
  });

  const committees = React.useMemo(() => {
    const bureauOrder = { "執行": 1, "事務": 2, "広報": 3, "施設": 4, "企画": 5, "装飾": 6 };
    const gradeOrder = { "3年": 1, "2年": 2, "1年": 3, "4年": 4, "その他": 5 };
    
    return [...committeesRaw].sort((a, b) => {
      const bureauDiff = (bureauOrder[a.bureau] || 99) - (bureauOrder[b.bureau] || 99);
      if (bureauDiff !== 0) return bureauDiff;
      
      const gradeDiff = (gradeOrder[a.grade] || 99) - (gradeOrder[b.grade] || 99);
      if (gradeDiff !== 0) return gradeDiff;
      
      return a.name.localeCompare(b.name, 'ja');
    });
  }, [committeesRaw]);

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
    initialData: [],
  });

  const exportByBureau = () => {
    const bureaus = ["執行", "事務", "広報", "施設", "企画", "装飾"];
    
    bureaus.forEach(bureau => {
      const bureauCommittees = committees.filter(c => c.bureau === bureau);
      const bureauShifts = shifts.filter(s => s.bureau === bureau);
      
      const headers = ['氏名', '所属局', '学年', 'Day1', 'Day2', 'Day3'];
      const rows = bureauCommittees.map(c => {
        const day1Shifts = bureauShifts.filter(s => s.committee_id === c.id && s.day === 'Day1')
          .map(s => `${s.job_name} (${s.start_time}-${s.end_time})`).join('\n');
        const day2Shifts = bureauShifts.filter(s => s.committee_id === c.id && s.day === 'Day2')
          .map(s => `${s.job_name} (${s.start_time}-${s.end_time})`).join('\n');
        const day3Shifts = bureauShifts.filter(s => s.committee_id === c.id && s.day === 'Day3')
          .map(s => `${s.job_name} (${s.start_time}-${s.end_time})`).join('\n');
        
        return [c.name, c.bureau, c.grade, day1Shifts, day2Shifts, day3Shifts];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${bureau}局_シフト表.csv`;
      link.click();
    });
    
    toast.success('局ごとのCSVをダウンロードしました');
  };

  const exportByJob = () => {
    jobs.forEach(job => {
      const jobShifts = shifts.filter(s => s.job_id === job.id);
      
      const headers = ['日付', '委員名', '所属局', '開始時刻', '終了時刻', '勤務時間'];
      const rows = jobShifts.map(s => [
        s.day,
        s.committee_name,
        s.bureau,
        s.start_time,
        s.end_time,
        `${Math.floor(s.duration_minutes / 60)}時間${s.duration_minutes % 60}分`
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${job.job_name}_シフト表.csv`;
      link.click();
    });
    
    toast.success('仕事ごとのCSVをダウンロードしました');
  };

  const exportAll = () => {
    const headers = ['日付', '仕事名', '場所', '委員名', '所属局', '学年', '開始時刻', '終了時刻', '勤務時間'];
    const rows = shifts.map(s => {
      const committee = committees.find(c => c.id === s.committee_id);
      const job = jobs.find(j => j.id === s.job_id);
      return [
        s.day,
        s.job_name,
        job?.location || '',
        s.committee_name,
        s.bureau,
        committee?.grade || '',
        s.start_time,
        s.end_time,
        `${Math.floor(s.duration_minutes / 60)}時間${s.duration_minutes % 60}分`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `全シフト一覧_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success('全シフト一覧をダウンロードしました');
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">シフト管理</h1>
          <p className="text-gray-600 mt-1">タイムテーブル形式で3日間のシフトを管理します</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportByBureau} size="sm">
            <Download className="w-4 h-4 mr-2" />
            局ごと
          </Button>
          <Button variant="outline" onClick={exportByJob} size="sm">
            <Download className="w-4 h-4 mr-2" />
            仕事ごと
          </Button>
          <Button variant="outline" onClick={exportAll} size="sm">
            <Download className="w-4 h-4 mr-2" />
            全シフト
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>タイムテーブル（7:00〜22:00）</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "job" ? "default" : "outline"}
                onClick={() => setViewMode("job")}
                size="sm"
                className={viewMode === "job" ? "bg-gradient-to-r from-orange-500 to-pink-500" : ""}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                仕事軸
              </Button>
              <Button
                variant={viewMode === "committee" ? "default" : "outline"}
                onClick={() => setViewMode("committee")}
                size="sm"
                className={viewMode === "committee" ? "bg-gradient-to-r from-orange-500 to-pink-500" : ""}
              >
                <Users className="w-4 h-4 mr-2" />
                委員軸
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="Day1">Day 1</TabsTrigger>
              <TabsTrigger value="Day2">Day 2</TabsTrigger>
              <TabsTrigger value="Day3">Day 3</TabsTrigger>
            </TabsList>

            {['Day1', 'Day2', 'Day3'].map(day => (
              <TabsContent key={day} value={day}>
                <TimeTableView 
                  day={day} 
                  jobs={jobs} 
                  committees={committees}
                  shifts={shifts}
                  viewMode={viewMode}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}