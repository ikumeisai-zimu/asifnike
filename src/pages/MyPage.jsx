import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Download, AlertCircle, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const bureauColors = {
  "執行": "bg-red-100 text-red-800 border-red-200",
  "事務": "bg-blue-100 text-blue-800 border-blue-200",
  "広報": "bg-purple-100 text-purple-800 border-purple-200",
  "施設": "bg-green-100 text-green-800 border-green-200",
  "企画": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "装飾": "bg-pink-100 text-pink-800 border-pink-200"
};

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Day1");
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [changeReason, setChangeReason] = useState("");
  const [selectedCommitteeId, setSelectedCommitteeId] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  // 選択された委員、または自分の委員情報を取得
  const myCommittee = selectedCommitteeId 
    ? committees.find(c => c.id === selectedCommitteeId)
    : committees.find(c => c.created_by === user?.email);
    
  const myShifts = shifts.filter(s => s.committee_id === myCommittee?.id);

  const sendChangeRequestMutation = useMutation({
    mutationFn: async ({ shift, reason }) => {
      const job = jobs.find(j => j.id === shift.job_id);
      await base44.integrations.Core.SendEmail({
        to: "admin@example.com",
        subject: `【シフト変更申請】${myCommittee.name}様より`,
        body: `
シフト変更申請が届きました。

■ 申請者情報
氏名: ${myCommittee.name}
所属局: ${myCommittee.bureau}
メール: ${user.email}

■ 変更希望シフト
日付: ${shift.day}
仕事: ${shift.job_name}
場所: ${job?.location || '-'}
時間: ${shift.start_time} - ${shift.end_time}

■ 変更理由
${reason}

管理画面から承認/却下を行ってください。
        `
      });
    },
    onSuccess: () => {
      toast.success('変更申請を送信しました');
      setShowChangeRequest(false);
      setSelectedShift(null);
      setChangeReason("");
    },
  });

  const handleChangeRequest = (shift) => {
    setSelectedShift(shift);
    setShowChangeRequest(true);
  };

  const handleSubmitChangeRequest = () => {
    if (!changeReason.trim()) {
      toast.error('変更理由を入力してください');
      return;
    }
    sendChangeRequestMutation.mutate({ shift: selectedShift, reason: changeReason });
  };

  const downloadPersonalSchedule = () => {
    if (!myCommittee) return;

    const headers = ['日付', '仕事名', '場所', '開始時刻', '終了時刻', '勤務時間'];
    const rows = myShifts.map(s => {
      const job = jobs.find(j => j.id === s.job_id);
      return [
        s.day,
        s.job_name,
        job?.location || '',
        s.start_time,
        s.end_time,
        `${Math.floor(s.duration_minutes / 60)}時間${s.duration_minutes % 60}分`
      ];
    });

    const csvContent = [
      `${myCommittee.name}様のシフト表`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${myCommittee.name}_シフト表.csv`;
    link.click();
    toast.success('シフト表をダウンロードしました');
  };

  const totalMinutes = myShifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  if (!myCommittee) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">マイページ</h1>
          <p className="text-gray-600 mt-1">委員を選択してシフト情報を確認できます</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">委員を選択</label>
                <Select value={selectedCommitteeId || ""} onValueChange={setSelectedCommitteeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="委員を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {committees.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.bureau} - {c.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedCommitteeId && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    委員情報が見つかりません。上記から委員を選択してください。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">マイページ</h1>
          <p className="text-gray-600 mt-1">シフト情報を確認できます</p>
        </div>
        <Button
          onClick={downloadPersonalSchedule}
          variant="outline"
          disabled={myShifts.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          シフト表をダウンロード
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">委員を選択</label>
            <Select value={myCommittee.id} onValueChange={setSelectedCommitteeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {committees.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.bureau} - {c.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-none">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-pink-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {myCommittee.name[0]}
            </div>
            <div>
              <CardTitle className="text-2xl">{myCommittee.name}</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge className={bureauColors[myCommittee.bureau]}>
                  {myCommittee.bureau}
                </Badge>
                <Badge variant="outline">{myCommittee.grade}</Badge>
                {myCommittee.position && (
                  <Badge variant="outline">{myCommittee.position}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">総シフト数</p>
                <p className="text-2xl font-bold text-gray-900">{myShifts.length}件</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">総勤務時間</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor(totalMinutes / 60)}時間{totalMinutes % 60}分
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">学科</p>
                <p className="text-sm font-semibold text-gray-900">{myCommittee.department}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle>3日間のシフト予定</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="Day1">
                1日目
                <Badge variant="outline" className="ml-2">
                  {myShifts.filter(s => s.day === 'Day1').length}件
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="Day2">
                2日目
                <Badge variant="outline" className="ml-2">
                  {myShifts.filter(s => s.day === 'Day2').length}件
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="Day3">
                3日目
                <Badge variant="outline" className="ml-2">
                  {myShifts.filter(s => s.day === 'Day3').length}件
                </Badge>
              </TabsTrigger>
            </TabsList>

            {['Day1', 'Day2', 'Day3'].map(day => (
              <TabsContent key={day} value={day}>
                {myShifts.filter(s => s.day === day).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>この日のシフトはありません</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myShifts
                      .filter(s => s.day === day)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(shift => {
                        const job = jobs.find(j => j.id === shift.job_id);
                        return (
                          <Card key={shift.id} className="border-2">
                            <CardContent className="pt-6">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-900">{shift.job_name}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      <Badge className={bureauColors[shift.bureau]}>
                                        {shift.bureau}
                                      </Badge>
                                      {job?.location && (
                                        <Badge variant="outline" className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {job.location}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-gray-500" />
                                      <span className="font-medium">{shift.start_time} - {shift.end_time}</span>
                                    </div>
                                    <Badge variant="outline">
                                      {Math.floor(shift.duration_minutes / 60)}時間{shift.duration_minutes % 60}分
                                    </Badge>
                                  </div>

                                  {job?.description && (
                                    <p className="text-sm text-gray-600">{job.description}</p>
                                  )}
                                </div>
                                
                                <div className="flex md:flex-col gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleChangeRequest(shift)}
                                    className="flex items-center gap-2"
                                  >
                                    <Mail className="w-4 h-4" />
                                    変更申請
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showChangeRequest} onOpenChange={setShowChangeRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>シフト変更申請</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">{selectedShift.job_name}</h4>
                <p className="text-sm text-gray-600">
                  {selectedShift.day} | {selectedShift.start_time} - {selectedShift.end_time}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">変更理由</label>
                <Textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="変更が必要な理由を入力してください"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowChangeRequest(false)}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleSubmitChangeRequest}
                  disabled={sendChangeRequestMutation.isLoading}
                  className="bg-gradient-to-r from-orange-500 to-pink-500"
                >
                  {sendChangeRequestMutation.isLoading ? '送信中...' : '申請を送信'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}