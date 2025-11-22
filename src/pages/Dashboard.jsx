
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Calendar, TrendingUp, ChevronRight, AlertTriangle, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const bureauColors = {
  "執行": "#EF4444",
  "事務": "#3B82F6",
  "広報": "#8B5CF6",
  "施設": "#10B981",
  "企画": "#F59E0B",
  "装飾": "#EC4899"
};

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: committees = [], isLoading: loadingCommittees } = useQuery({
    queryKey: ['committees'],
    queryFn: () => base44.entities.Committee.list(),
    initialData: [],
    staleTime: 0,
    cacheTime: 0,
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
    staleTime: 0,
    cacheTime: 0,
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
    initialData: [],
    staleTime: 0,
    cacheTime: 0,
  });

  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      // シフト → 仕事 → 委員の順で削除（依存関係を考慮）
      const shiftIds = shifts.map(s => s.id);
      const jobIds = jobs.map(j => j.id);
      const committeeIds = committees.map(c => c.id);

      console.log('🔴 Deleting all data:', { shifts: shiftIds.length, jobs: jobIds.length, committees: committeeIds.length });

      // シフトを削除
      for (const id of shiftIds) {
        await base44.entities.Shift.delete(id);
      }

      // 仕事を削除
      for (const id of jobIds) {
        await base44.entities.Job.delete(id);
      }

      // 委員を削除
      for (const id of committeeIds) {
        await base44.entities.Committee.delete(id);
      }

      return { shifts: shiftIds.length, jobs: jobIds.length, committees: committeeIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      toast.success(`全データを削除しました（委員${data.committees}人、仕事${data.jobs}件、シフト${data.shifts}件）`);
    },
    onError: (error) => {
      console.error('❌ Failed to delete all data:', error);
      toast.error('データの削除に失敗しました: ' + error.message);
    },
  });

  const handleDeleteAllData = () => {
    const totalItems = committees.length + jobs.length + shifts.length;
    
    if (totalItems === 0) {
      toast.info('削除するデータがありません');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ 全データ削除の確認 ⚠️\n\n以下のデータを完全に削除します：\n- 委員: ${committees.length}人\n- 仕事: ${jobs.length}件\n- シフト: ${shifts.length}件\n\nこの操作は取り消せません。\n本当に削除しますか？`
    );

    if (confirmed) {
      const doubleConfirm = window.confirm(
        '本当によろしいですか？\n\nもう一度確認します。この操作は元に戻せません。'
      );

      if (doubleConfirm) {
        deleteAllDataMutation.mutate();
      }
    }
  };

  React.useEffect(() => {
    console.log('📊 Dashboard data:', {
      committees: committees.length,
      jobs: jobs.length,
      shifts: shifts.length
    });
  }, [committees, jobs, shifts]);

  const getStatsByDay = (day) => {
    const dayShifts = shifts.filter(s => s.day === day);
    const dayJobs = jobs.filter(j => j.days?.includes(day));
    
    const totalMinutes = dayShifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const uniqueCommittees = new Set(dayShifts.map(s => s.committee_id)).size;
    
    // 必要総人時間の計算
    const requiredMinutes = dayJobs.reduce((sum, job) => {
      if (!job.start_time || !job.end_time) return sum;
      const [startH, startM] = job.start_time.split(':').map(Number);
      const [endH, endM] = job.end_time.split(':').map(Number);
      const duration = (endH * 60 + endM) - (startH * 60 + startM);
      return sum + (duration * (job.required_staff || 1));
    }, 0);
    
    // 充足率の計算
    const completionRate = requiredMinutes > 0 ? Math.round((totalMinutes / requiredMinutes) * 100) : 0;
    
    return { 
      totalMinutes, 
      uniqueCommittees, 
      shiftCount: dayShifts.length,
      requiredMinutes,
      completionRate,
      jobCount: dayJobs.length
    };
  };

  // 時間帯別の人員状況を計算（7:00-22:00を1時間単位で）
  const getHourlyStaffing = () => {
    const hourlyData = [];
    for (let hour = 7; hour < 22; hour++) {
      const timeSlot = `${hour}:00-${hour + 1}:00`;
      let required = 0;
      let assigned = 0;
      
      ['Day1', 'Day2', 'Day3'].forEach(day => {
        // この時間帯に必要な人数
        jobs.filter(j => j.days?.includes(day)).forEach(job => {
          if (!job.start_time || !job.end_time) return;
          const [startH] = job.start_time.split(':').map(Number);
          const [endH] = job.end_time.split(':').map(Number);
          if (startH <= hour && endH > hour) {
            required += job.required_staff || 0;
          }
        });
        
        // この時間帯に割り当てられている人数
        shifts.filter(s => s.day === day).forEach(shift => {
          if (!shift.start_time || !shift.end_time) return;
          const [startH] = shift.start_time.split(':').map(Number);
          const [endH] = shift.end_time.split(':').map(Number);
          if (startH <= hour && endH > hour) {
            assigned += 1;
          }
        });
      });
      
      hourlyData.push({ timeSlot, required, assigned, rate: required > 0 ? Math.round((assigned / required) * 100) : 0 });
    }
    return hourlyData;
  };

  const bureauStats = Object.keys(bureauColors).map(bureau => ({
    name: bureau,
    color: bureauColors[bureau],
    members: committees.filter(c => c.bureau === bureau).length,
    jobs: jobs.filter(j => j.bureau === bureau).length,
    shifts: shifts.filter(s => s.bureau === bureau).length,
  }));

  const hourlyStaffing = getHourlyStaffing();

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            ダッシュボード
          </h1>
          <p className="text-gray-600">生明祭シフト管理システムの概要</p>
        </div>
        <Button 
          variant="destructive"
          onClick={handleDeleteAllData}
          disabled={deleteAllDataMutation.isLoading || (committees.length === 0 && jobs.length === 0 && shifts.length === 0)}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {deleteAllDataMutation.isLoading ? '削除中...' : '全データ削除'}
        </Button>
      </div>

      {/* メインステータス */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden shadow-lg border-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">登録委員数</p>
                <CardTitle className="text-4xl font-bold mt-2 text-gray-900">
                  {committees.length}
                </CardTitle>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl("Committees")}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 -ml-2">
                委員管理へ <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-lg border-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">登録仕事数</p>
                <CardTitle className="text-4xl font-bold mt-2 text-gray-900">
                  {jobs.length}
                </CardTitle>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl("Jobs")}>
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 -ml-2">
                仕事管理へ <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-lg border-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8" />
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">総シフト数</p>
                <CardTitle className="text-4xl font-bold mt-2 text-gray-900">
                  {shifts.length}
                </CardTitle>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl("ShiftManagement")}>
              <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 -ml-2">
                シフト管理へ <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 3日間のシフト完成率 */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            3日間のシフト完成率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {['Day1', 'Day2', 'Day3'].map((day, index) => {
              const stats = getStatsByDay(day);
              const isComplete = stats.completionRate >= 100;
              const isWarning = stats.completionRate < 50;
              
              return (
                <div key={day} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{day}</h3>
                      <span className="text-sm text-gray-500">（{index + 1}日目）</span>
                    </div>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">完成率</span>
                      <span className={`text-2xl font-bold ${
                        isComplete ? 'text-green-600' : 
                        isWarning ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {stats.completionRate}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, stats.completionRate)} 
                      className="h-3"
                    />
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2">
                      <div>必要: {Math.floor(stats.requiredMinutes / 60)}h{stats.requiredMinutes % 60}m</div>
                      <div>割当: {Math.floor(stats.totalMinutes / 60)}h{stats.totalMinutes % 60}m</div>
                      <div>仕事数: {stats.jobCount}件</div>
                      <div>参加: {stats.uniqueCommittees}人</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 時間帯別人員充足状況 */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle>時間帯別人員充足状況（全日程合計）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {hourlyStaffing.map((slot) => (
              <div key={slot.timeSlot} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{slot.timeSlot}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">
                      {slot.assigned} / {slot.required}人
                    </span>
                    <span className={`font-bold ${
                      slot.rate >= 100 ? 'text-green-600' : 
                      slot.rate >= 80 ? 'text-blue-600' :
                      slot.rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {slot.rate}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={Math.min(100, slot.rate)} 
                  className={`h-2 ${
                    slot.rate >= 100 ? '[&>div]:bg-green-500' : 
                    slot.rate >= 80 ? '[&>div]:bg-blue-500' :
                    slot.rate >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>完了（100%以上）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>良好（80%以上）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span>注意（50%以上）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>不足（50%未満）</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 局別統計 */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle>局別統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bureauStats.map(bureau => (
              <div 
                key={bureau.name}
                className="border-2 rounded-xl p-4 hover:shadow-md transition-shadow"
                style={{ borderColor: bureau.color }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
                    style={{ backgroundColor: bureau.color }}
                  >
                    {bureau.name[0]}
                  </div>
                  <h3 className="font-bold text-gray-900">{bureau.name}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">委員</span>
                    <span className="font-semibold">{bureau.members}人</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">仕事</span>
                    <span className="font-semibold">{bureau.jobs}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">シフト</span>
                    <span className="font-semibold">{bureau.shifts}件</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
