import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase } from "lucide-react";
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
import AssignJobForm from "./AssignJobForm";
import { toast } from "sonner";

const bureauColors = {
  "執行": "#EF4444",
  "事務": "#3B82F6",
  "広報": "#8B5CF6",
  "施設": "#10B981",
  "企画": "#F59E0B",
  "装飾": "#EC4899"
};

export default function CommitteeView({ day, committees, jobs, shifts }) {
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [bureauFilter, setBureauFilter] = useState("all");
  const queryClient = useQueryClient();

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowAssignForm(false);
      setSelectedCommittee(null);
      toast.success('シフトを割り当てました');
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('シフトを削除しました');
    },
  });

  const handleAssignShift = (shiftData) => {
    const job = jobs.find(j => j.id === shiftData.job_id);
    
    const overlappingShift = shifts.find(s => 
      s.committee_id === selectedCommittee.id &&
      s.start_time < shiftData.end_time &&
      s.end_time > shiftData.start_time
    );

    if (overlappingShift) {
      const shouldContinue = window.confirm(
        `警告: ${selectedCommittee.name}は既に${overlappingShift.start_time}-${overlappingShift.end_time}に「${overlappingShift.job_name}」のシフトに入っています。\n\n二重ブッキングになりますが、続行しますか？`
      );
      if (!shouldContinue) return;
    }

    const startParts = shiftData.start_time.split(':');
    const endParts = shiftData.end_time.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    const durationMinutes = endMinutes - startMinutes;

    createShiftMutation.mutate({
      day,
      job_id: job.id,
      job_name: job.job_name,
      committee_id: selectedCommittee.id,
      committee_name: selectedCommittee.name,
      bureau: selectedCommittee.bureau,
      start_time: shiftData.start_time,
      end_time: shiftData.end_time,
      duration_minutes: durationMinutes
    });
  };

  const handleDeleteShift = (shiftId) => {
    if (window.confirm('このシフトを削除しますか？')) {
      deleteShiftMutation.mutate(shiftId);
    }
  };

  const getCommitteeShifts = (committeeId) => {
    return shifts.filter(s => s.committee_id === committeeId).sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });
  };

  const filteredCommittees = bureauFilter === 'all' 
    ? committees 
    : committees.filter(c => c.bureau === bureauFilter);

  const calculateTotalMinutes = (committeeId) => {
    const committeeShifts = getCommitteeShifts(committeeId);
    return committeeShifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Select value={bureauFilter} onValueChange={setBureauFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="局で絞り込み" />
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
      </div>

      {filteredCommittees.map(committee => {
        const committeeShifts = getCommitteeShifts(committee.id);
        const totalMinutes = calculateTotalMinutes(committee.id);

        return (
          <div 
            key={committee.id}
            className="border-2 rounded-xl p-4 transition-all hover:shadow-md"
            style={{ borderColor: bureauColors[committee.bureau] }}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">{committee.name}</h3>
                  <Badge 
                    className="border"
                    style={{ 
                      backgroundColor: bureauColors[committee.bureau] + '20',
                      color: bureauColors[committee.bureau],
                      borderColor: bureauColors[committee.bureau]
                    }}
                  >
                    {committee.bureau}
                  </Badge>
                  <span className="text-sm text-gray-600">{committee.grade}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{committee.position}</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {committeeShifts.length}件のシフト
                  </span>
                  <span>
                    合計: {Math.floor(totalMinutes / 60)}時間{totalMinutes % 60}分
                  </span>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedCommittee(committee);
                  setShowAssignForm(true);
                }}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-pink-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                仕事を割り当て
              </Button>
            </div>

            <div className="space-y-2">
              {committeeShifts.length > 0 ? (
                committeeShifts.map(shift => {
                  const job = jobs.find(j => j.id === shift.job_id);
                  return (
                    <div 
                      key={shift.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: bureauColors[job?.bureau || shift.bureau] }}
                        />
                        <span className="font-medium">{shift.job_name}</span>
                        {job?.location && (
                          <span className="text-sm text-gray-500">📍 {job.location}</span>
                        )}
                        <span className="text-sm text-gray-600">
                          {shift.start_time} - {shift.end_time}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({Math.floor(shift.duration_minutes / 60)}h {shift.duration_minutes % 60}m)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteShift(shift.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        削除
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  まだシフトが割り当てられていません
                </div>
              )}
            </div>
          </div>
        );
      })}

      <Dialog open={showAssignForm} onOpenChange={setShowAssignForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCommittee?.name} - 仕事を割り当て
            </DialogTitle>
          </DialogHeader>
          {selectedCommittee && (
            <AssignJobForm
              jobs={jobs}
              shifts={shifts}
              committeeId={selectedCommittee.id}
              onSubmit={handleAssignShift}
              onCancel={() => {
                setShowAssignForm(false);
                setSelectedCommittee(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}