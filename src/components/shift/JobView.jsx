import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AssignShiftForm from "./AssignShiftForm";
import { toast } from "sonner";

const bureauColors = {
  "執行": "#EF4444",
  "事務": "#3B82F6",
  "広報": "#8B5CF6",
  "施設": "#10B981",
  "企画": "#F59E0B",
  "装飾": "#EC4899"
};

export default function JobView({ day, jobs, committees, shifts }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const queryClient = useQueryClient();

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowAssignForm(false);
      setSelectedJob(null);
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
    const committee = committees.find(c => c.id === shiftData.committee_id);
    const job = jobs.find(j => j.id === selectedJob.id);
    
    const overlappingShift = shifts.find(s => 
      s.committee_id === shiftData.committee_id &&
      s.start_time < shiftData.end_time &&
      s.end_time > shiftData.start_time
    );

    if (overlappingShift) {
      const shouldContinue = window.confirm(
        `警告: ${committee.name}は既に${overlappingShift.start_time}-${overlappingShift.end_time}に「${overlappingShift.job_name}」のシフトに入っています。\n\n二重ブッキングになりますが、続行しますか？`
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
      committee_id: committee.id,
      committee_name: committee.name,
      bureau: committee.bureau,
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

  const getJobShifts = (jobId) => {
    return shifts.filter(s => s.job_id === jobId);
  };

  return (
    <div className="space-y-4">
      {jobs.map(job => {
        const jobShifts = getJobShifts(job.id);
        const assignedCount = new Set(jobShifts.map(s => s.committee_id)).size;
        const isFullyStaffed = assignedCount >= job.required_staff;

        return (
          <div 
            key={job.id}
            className="border-2 rounded-xl p-4 transition-all hover:shadow-md"
            style={{ borderColor: bureauColors[job.bureau] }}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">{job.job_name}</h3>
                  <Badge 
                    className="border"
                    style={{ 
                      backgroundColor: bureauColors[job.bureau] + '20',
                      color: bureauColors[job.bureau],
                      borderColor: bureauColors[job.bureau]
                    }}
                  >
                    {job.bureau}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {job.location && <span>📍 {job.location}</span>}
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {assignedCount} / {job.required_staff}人
                    {isFullyStaffed && <span className="text-green-600 ml-1">✓</span>}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedJob(job);
                  setShowAssignForm(true);
                }}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-pink-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                委員を割り当て
              </Button>
            </div>

            <div className="space-y-2">
              {jobShifts.length > 0 ? (
                jobShifts.map(shift => (
                  <div 
                    key={shift.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: bureauColors[shift.bureau] }}
                      />
                      <span className="font-medium">{shift.committee_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {shift.bureau}
                      </Badge>
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
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  まだ委員が割り当てられていません
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
              {selectedJob?.job_name} - 委員を割り当て
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <AssignShiftForm
              committees={committees}
              shifts={shifts}
              onSubmit={handleAssignShift}
              onCancel={() => {
                setShowAssignForm(false);
                setSelectedJob(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}