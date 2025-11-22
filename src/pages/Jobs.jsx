import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Download, Upload, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JobForm from "../components/jobs/JobForm";
import CSVImportDialog from "../components/jobs/CSVImportDialog";
import { toast } from "sonner";

const bureauColors = {
  "執行": "bg-red-100 text-red-800 border-red-200",
  "事務": "bg-blue-100 text-blue-800 border-blue-200",
  "広報": "bg-purple-100 text-purple-800 border-purple-200",
  "施設": "bg-green-100 text-green-800 border-green-200",
  "企画": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "装飾": "bg-pink-100 text-pink-800 border-pink-200"
};

export default function Jobs() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [bureauFilter, setBureauFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
    initialData: [],
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowForm(false);
      setEditingJob(null);
      toast.success('仕事を登録しました');
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowImport(false);
      toast.success('CSVインポートが完了しました');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Job.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.refetchQueries({ queryKey: ['jobs'] });
      setShowForm(false);
      setEditingJob(null);
      toast.success('仕事情報を更新しました');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // この仕事に関連するシフトを削除
      const relatedShifts = shifts.filter(s => s.job_id === id);
      for (const shift of relatedShifts) {
        await base44.entities.Shift.delete(shift.id);
      }
      // 仕事を削除
      await base44.entities.Job.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('仕事と関連するシフトを削除しました');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      console.log('🔴 Starting bulk delete for job IDs:', ids);
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const id of ids) {
        try {
          console.log('🔴 Deleting job and related shifts:', id);
          // この仕事に関連するシフトを削除
          const relatedShifts = shifts.filter(s => s.job_id === id);
          for (const shift of relatedShifts) {
            await base44.entities.Shift.delete(shift.id);
          }
          // 仕事を削除
          await base44.entities.Job.delete(id);
          successCount++;
          console.log('✅ Successfully deleted:', id);
        } catch (error) {
          errorCount++;
          console.error('❌ Failed to delete:', id, error);
          results.push({ id, error: error.message });
        }
      }

      console.log(`🔴 Bulk delete complete: ${successCount} success, ${errorCount} errors`);
      
      if (errorCount > 0) {
        throw new Error(`${errorCount}件の削除に失敗しました`);
      }
      
      return { successCount, errorCount };
    },
    onSuccess: (data) => {
      console.log('✅ Bulk delete mutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSelectedIds([]);
      toast.success(`${data.successCount}件の仕事を削除しました`);
    },
    onError: (error) => {
      console.error('❌ Bulk delete mutation error:', error);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSelectedIds([]);
      toast.error(error.message || '一部の削除に失敗しました');
    },
  });

  const handleSubmit = (data) => {
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImport = async (data) => {
    await bulkCreateMutation.mutateAsync(data);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('本当に削除しますか？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = async () => {
    console.log('🔴 handleBulkDelete called with selectedIds:', selectedIds);
    
    if (selectedIds.length === 0) {
      toast.error('削除する仕事を選択してください');
      return;
    }
    
    if (window.confirm(`${selectedIds.length}件の仕事を削除しますか？この操作は取り消せません。`)) {
      console.log('🔴 User confirmed, starting bulk delete');
      bulkDeleteMutation.mutate(selectedIds);
    } else {
      console.log('🔴 User cancelled bulk delete');
    }
  };

  const handleSelectAll = (checked) => {
    console.log('handleSelectAll:', checked);
    if (checked) {
      setSelectedIds(filteredJobs.map(j => j.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    console.log('handleSelectOne:', id, checked);
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const exportToCSV = () => {
    const headers = ['仕事名', '場所', '担当局', '必要人数（同時）', '開始時刻', '終了時刻', '実施日', '仕事内容の説明'];
    const rows = filteredJobs.map(j => [
      j.job_name,
      j.location || '',
      j.bureau,
      j.required_staff,
      j.start_time || '',
      j.end_time || '',
      j.days?.join('-') || '',
      j.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `仕事リスト_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSVをダウンロードしました');
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBureau = bureauFilter === 'all' || j.bureau === bureauFilter;
    const matchesDay = dayFilter === 'all' || j.days?.includes(dayFilter);
    return matchesSearch && matchesBureau && matchesDay;
  });

  const allSelected = filteredJobs.length > 0 && selectedIds.length === filteredJobs.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filteredJobs.length;

  console.log('Render - selectedIds:', selectedIds, 'filteredJobs:', filteredJobs.length);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">仕事管理</h1>
          <p className="text-gray-600 mt-1">学園祭期間中の仕事を管理します</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isLoading}
            >
              <Trash className="w-4 h-4 mr-2" />
              {bulkDeleteMutation.isLoading ? '削除中...' : `${selectedIds.length}件を削除`}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            CSV取込
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={jobs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
          <Button
            onClick={() => {
              setEditingJob(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規登録
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="仕事名・場所で検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={bureauFilter} onValueChange={setBureauFilter}>
              <SelectTrigger>
                <SelectValue placeholder="担当局" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての局</SelectItem>
                <SelectItem value="執行">執行</SelectItem>
                <SelectItem value="事務">事務</SelectItem>
                <SelectItem value="広報">広報</SelectItem>
                <SelectItem value="施設">施設</SelectItem>
                <SelectItem value="企画">企画</SelectItem>
                <SelectItem value="装飾">装飾</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger>
                <SelectValue placeholder="実施日" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての日</SelectItem>
                <SelectItem value="Day1">1日目</SelectItem>
                <SelectItem value="Day2">2日目</SelectItem>
                <SelectItem value="Day3">3日目</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>仕事一覧（{filteredJobs.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="すべて選択"
                    />
                  </TableHead>
                  <TableHead>仕事名</TableHead>
                  <TableHead>場所</TableHead>
                  <TableHead>担当局</TableHead>
                  <TableHead>実施日</TableHead>
                  <TableHead>時間帯</TableHead>
                  <TableHead>必要人数</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(job.id)}
                        onCheckedChange={(checked) => handleSelectOne(job.id, checked)}
                        aria-label={`${job.job_name}を選択`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{job.job_name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{job.location}</TableCell>
                    <TableCell>
                      <Badge className={bureauColors[job.bureau]}>
                        {job.bureau}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {job.days?.map(day => (
                          <Badge key={day} variant="outline" className="text-xs">
                            {day === 'Day1' ? '1日目' : day === 'Day2' ? '2日目' : '3日目'}
                          </Badge>
                        )) || <span className="text-gray-400">未設定</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {job.start_time && job.end_time ? (
                        <span>{job.start_time} - {job.end_time}</span>
                      ) : (
                        <span className="text-gray-400">未設定</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{job.required_staff}人</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-gray-600 truncate">
                        {job.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(job)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(job.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? '仕事情報編集' : '仕事新規登録'}
            </DialogTitle>
          </DialogHeader>
          <JobForm
            job={editingJob}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingJob(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CSV一括取込</DialogTitle>
          </DialogHeader>
          <CSVImportDialog onImport={handleImport} />
        </DialogContent>
      </Dialog>
    </div>
  );
}