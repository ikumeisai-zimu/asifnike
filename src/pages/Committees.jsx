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
import CommitteeForm from "../components/committees/CommitteeForm";
import CSVImportDialog from "../components/committees/CSVImportDialog";
import { toast } from "sonner";

const bureauColors = {
  "執行": "bg-red-100 text-red-800 border-red-200",
  "事務": "bg-blue-100 text-blue-800 border-blue-200",
  "広報": "bg-purple-100 text-purple-800 border-purple-200",
  "施設": "bg-green-100 text-green-800 border-green-200",
  "企画": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "装飾": "bg-pink-100 text-pink-800 border-pink-200"
};

export default function Committees() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [bureauFilter, setBureauFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const queryClient = useQueryClient();

  const { data: committeesRaw = [], isLoading } = useQuery({
    queryKey: ['committees'],
    queryFn: () => base44.entities.Committee.list('-created_date'),
    initialData: [],
  });

  const committees = React.useMemo(() => {
    const bureauOrder = { "執行": 1, "事務": 2, "広報": 3, "施設": 4, "企画": 5, "装飾": 6 };
    const gradeOrder = { "1年": 1, "2年": 2, "3年": 3, "4年": 4, "その他": 5 };
    
    return [...committeesRaw].sort((a, b) => {
      const bureauDiff = (bureauOrder[a.bureau] || 99) - (bureauOrder[b.bureau] || 99);
      if (bureauDiff !== 0) return bureauDiff;
      
      const gradeDiff = (gradeOrder[a.grade] || 99) - (gradeOrder[b.grade] || 99);
      if (gradeDiff !== 0) return gradeDiff;
      
      return a.name.localeCompare(b.name, 'ja');
    });
  }, [committeesRaw]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Committee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      setShowForm(false);
      setEditingCommittee(null);
      toast.success('委員を登録しました');
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Committee.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      setShowImport(false);
      toast.success('CSVインポートが完了しました');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Committee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      setShowForm(false);
      setEditingCommittee(null);
      toast.success('委員情報を更新しました');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Committee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      toast.success('委員を削除しました');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      console.log('🔴 Starting bulk delete for IDs:', ids);
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const id of ids) {
        try {
          console.log('🔴 Deleting committee:', id);
          await base44.entities.Committee.delete(id);
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
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      setSelectedIds([]);
      toast.success(`${data.successCount}人の委員を削除しました`);
    },
    onError: (error) => {
      console.error('❌ Bulk delete mutation error:', error);
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      setSelectedIds([]);
      toast.error(error.message || '一部の削除に失敗しました');
    },
  });

  const handleSubmit = (data) => {
    if (editingCommittee) {
      updateMutation.mutate({ id: editingCommittee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImport = async (data) => {
    await bulkCreateMutation.mutateAsync(data);
  };

  const handleEdit = (committee) => {
    setEditingCommittee(committee);
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
      toast.error('削除する委員を選択してください');
      return;
    }
    
    if (window.confirm(`${selectedIds.length}人の委員を削除しますか？この操作は取り消せません。`)) {
      console.log('🔴 User confirmed, starting bulk delete');
      bulkDeleteMutation.mutate(selectedIds);
    } else {
      console.log('🔴 User cancelled bulk delete');
    }
  };

  const handleSelectAll = (checked) => {
    console.log('handleSelectAll:', checked);
    if (checked) {
      setSelectedIds(filteredCommittees.map(c => c.id));
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
    const headers = ['所属局', '役職', '学年', '氏名', 'ふりがな', '学科', '性別', '班①', '班②', '電話番号', 'メールアドレス', '備考'];
    const rows = filteredCommittees.map(c => [
      c.bureau,
      c.position || '',
      c.grade,
      c.name,
      c.furigana || '',
      c.department || '',
      c.gender || '',
      c.group1 || '',
      c.group2 || '',
      c.phone || '',
      c.email || '',
      c.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `委員リスト_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSVをダウンロードしました');
  };

  const filteredCommittees = committees.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.furigana?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBureau = bureauFilter === 'all' || c.bureau === bureauFilter;
    const matchesGrade = gradeFilter === 'all' || c.grade === gradeFilter;
    return matchesSearch && matchesBureau && matchesGrade;
  });

  const allSelected = filteredCommittees.length > 0 && selectedIds.length === filteredCommittees.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filteredCommittees.length;

  console.log('Render - selectedIds:', selectedIds, 'filteredCommittees:', filteredCommittees.length);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">委員管理</h1>
          <p className="text-gray-600 mt-1">委員会メンバーの情報を管理します</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isLoading}
            >
              <Trash className="w-4 h-4 mr-2" />
              {bulkDeleteMutation.isLoading ? '削除中...' : `${selectedIds.length}人を削除`}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            CSV取込
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={committees.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
          <Button
            onClick={() => {
              setEditingCommittee(null);
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
                  placeholder="氏名・ふりがなで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={bureauFilter} onValueChange={setBureauFilter}>
              <SelectTrigger>
                <SelectValue placeholder="所属局" />
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
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="学年" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての学年</SelectItem>
                <SelectItem value="1年">1年</SelectItem>
                <SelectItem value="2年">2年</SelectItem>
                <SelectItem value="3年">3年</SelectItem>
                <SelectItem value="4年">4年</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>委員一覧（{filteredCommittees.length}人）</CardTitle>
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
                  <TableHead>氏名</TableHead>
                  <TableHead>ふりがな</TableHead>
                  <TableHead>所属局</TableHead>
                  <TableHead>学年</TableHead>
                  <TableHead>役職</TableHead>
                  <TableHead>学科</TableHead>
                  <TableHead>班①</TableHead>
                  <TableHead>班②</TableHead>
                  <TableHead>連絡先</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommittees.map((committee) => (
                  <TableRow key={committee.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(committee.id)}
                        onCheckedChange={(checked) => handleSelectOne(committee.id, checked)}
                        aria-label={`${committee.name}を選択`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{committee.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{committee.furigana}</TableCell>
                    <TableCell>
                      <Badge className={bureauColors[committee.bureau]}>
                        {committee.bureau}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{committee.grade}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{committee.position}</TableCell>
                    <TableCell className="text-sm text-gray-600">{committee.department}</TableCell>
                    <TableCell className="text-sm text-gray-600">{committee.group1}</TableCell>
                    <TableCell className="text-sm text-gray-600">{committee.group2}</TableCell>
                    <TableCell className="text-sm">
                      {committee.phone && (
                        <div className="text-gray-600">{committee.phone}</div>
                      )}
                      {committee.email && (
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {committee.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(committee)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(committee.id)}
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
              {editingCommittee ? '委員情報編集' : '委員新規登録'}
            </DialogTitle>
          </DialogHeader>
          <CommitteeForm
            committee={editingCommittee}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingCommittee(null);
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