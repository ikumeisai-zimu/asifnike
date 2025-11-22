import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X, AlertTriangle, Users as UsersIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import AssignShiftForm from "./AssignShiftForm";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const bureauColors = {
  "執行": "#EF4444",
  "事務": "#3B82F6",
  "広報": "#8B5CF6",
  "施設": "#10B981",
  "企画": "#F59E0B",
  "装飾": "#EC4899"
};

export default function TimeTableView({ day, jobs, committees, shifts, viewMode }) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedLane, setSelectedLane] = useState(null);
  const queryClient = useQueryClient();

  const createShiftMutation = useMutation({
    mutationFn: (data) => {
      console.log('🔵 createShiftMutation called with data:', data);
      return base44.entities.Shift.create(data);
    },
    onSuccess: () => {
      console.log('✅ Shift created successfully');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowAssignDialog(false);
      setSelectedItem(null);
      setSelectedLane(null);
      toast.success('シフトを割り当てました');
    },
    onError: (error) => {
      console.error('❌ Shift creation failed:', error);
      toast.error('シフトの割り当てに失敗しました: ' + error.message);
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => {
      console.log('🔴 deleteShiftMutation called with id:', id);
      return base44.entities.Shift.delete(id);
    },
    onSuccess: () => {
      console.log('✅ Shift deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('シフトを削除しました');
    },
    onError: (error) => {
      console.error('❌ Shift deletion failed:', error);
      toast.error('シフトの削除に失敗しました: ' + error.message);
    },
  });

  const availableCommittees = useMemo(() => {
    return committees.filter(c => {
      const committeeShifts = shifts.filter(s => s.committee_id === c.id && s.day === day);
      return committeeShifts.length === 0;
    });
  }, [committees, shifts, day]);

  const handleCellClick = (item, laneIndex = null) => {
    if (viewMode === 'job') {
      setSelectedItem({ type: 'job', data: item });
      setSelectedLane(laneIndex);
    } else {
      setSelectedItem({ type: 'committee', data: item });
    }
    setShowAssignDialog(true);
  };

  const handleDeleteShift = (shiftId, e) => {
    if (e) {
      e.stopPropagation();
    }
    console.log('🔴 handleDeleteShift called with shift ID:', shiftId);
    if (window.confirm('このシフトを削除しますか？')) {
      console.log('🔴 User confirmed deletion');
      deleteShiftMutation.mutate(shiftId);
    } else {
      console.log('🔴 User cancelled deletion');
    }
  };

  const handleAssignShift = (shiftData) => {
    console.log('🟢 handleAssignShift called with:', shiftData);
    console.log('🟢 viewMode:', viewMode);
    console.log('🟢 selectedItem:', selectedItem);
    console.log('🟢 selectedLane:', selectedLane);

    if (viewMode === 'job') {
      const committee = committees.find(c => c.id === shiftData.committee_id);
      const job = selectedItem.data;

      console.log('🟢 Found committee:', committee);
      console.log('🟢 Job:', job);

      if (!committee) {
        console.error('❌ Committee not found');
        toast.error('委員が見つかりません');
        return;
      }

      // 仕事の時間枠外チェック（警告のみ、続行可能）
      if (job.start_time && job.end_time) {
        console.log('🟢 Job time frame:', job.start_time, '-', job.end_time);
        console.log('🟢 Selected time:', shiftData.start_time, '-', shiftData.end_time);
        
        if (shiftData.start_time < job.start_time || shiftData.end_time > job.end_time) {
          const shouldContinue = window.confirm(
            `⚠️ 時間枠の警告\n\nこの仕事の推奨時間枠: ${job.start_time}-${job.end_time}\n選択した時間: ${shiftData.start_time}-${shiftData.end_time}\n\n推奨時間枠外ですが、続行しますか？`
          );
          if (!shouldContinue) {
            console.log('🟡 User cancelled due to time frame');
            return;
          }
        }
      }

      // このレーンの同じ時間帯に他のシフトがないかチェック
      const sameJobShifts = shifts.filter(s => s.job_id === job.id && s.day === day && s.lane_number === selectedLane);
      const overlappingInLane = sameJobShifts.find(s => 
        s.start_time < shiftData.end_time &&
        s.end_time > shiftData.start_time
      );

      if (overlappingInLane) {
        toast.error(`このレーンの${overlappingInLane.start_time}-${overlappingInLane.end_time}に${overlappingInLane.committee_name}が既に入っています`);
        return;
      }

      // 委員の時間重複チェック（強力な警告）
      const overlappingShift = shifts.find(s => 
        s.committee_id === shiftData.committee_id &&
        s.day === day &&
        s.start_time < shiftData.end_time &&
        s.end_time > shiftData.start_time
      );

      console.log('🟢 Overlapping shift for committee:', overlappingShift);

      if (overlappingShift) {
        const shouldContinue = window.confirm(
          `⚠️ 強力な警告 ⚠️\n\n${committee.name}は既に${overlappingShift.start_time}-${overlappingShift.end_time}に「${overlappingShift.job_name}」のシフトに入っています。\n\n二重ブッキングになります！\n本当に続行しますか？`
        );
        console.log('🟢 User confirmed overlap:', shouldContinue);
        if (!shouldContinue) return;
      }

      const startParts = shiftData.start_time.split(':');
      const endParts = shiftData.end_time.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      const durationMinutes = endMinutes - startMinutes;

      console.log('🟢 Duration calculated:', durationMinutes, 'minutes');

      if (durationMinutes <= 0) {
        console.error('❌ Invalid duration');
        toast.error('終了時刻は開始時刻より後にしてください');
        return;
      }

      const shiftToCreate = {
        day,
        job_id: selectedItem.data.id,
        job_name: selectedItem.data.job_name,
        committee_id: committee.id,
        committee_name: committee.name,
        bureau: committee.bureau,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        duration_minutes: durationMinutes,
        lane_number: selectedLane
      };

      console.log('🔵 About to create shift:', shiftToCreate);
      createShiftMutation.mutate(shiftToCreate);
    } else {
      const job = jobs.find(j => j.id === shiftData.job_id);

      if (!job) {
        toast.error('仕事が見つかりません');
        return;
      }

      // 仕事の時間枠外チェック（警告のみ）
      if (job.start_time && job.end_time) {
        if (shiftData.start_time < job.start_time || shiftData.end_time > job.end_time) {
          const shouldContinue = window.confirm(
            `⚠️ 時間枠の警告\n\nこの仕事の推奨時間枠: ${job.start_time}-${job.end_time}\n選択した時間: ${shiftData.start_time}-${shiftData.end_time}\n\n推奨時間枠外ですが、続行しますか？`
          );
          if (!shouldContinue) return;
        }
      }

      // 時間重複チェック（強力な警告）
      const overlappingShift = shifts.find(s => 
        s.committee_id === selectedItem.data.id &&
        s.day === day &&
        s.start_time < shiftData.end_time &&
        s.end_time > shiftData.start_time
      );

      if (overlappingShift) {
        const shouldContinue = window.confirm(
          `⚠️ 強力な警告 ⚠️\n\n${selectedItem.data.name}は既に${overlappingShift.start_time}-${overlappingShift.end_time}に「${overlappingShift.job_name}」のシフトに入っています。\n\n二重ブッキングになります！\n本当に続行しますか？`
        );
        if (!shouldContinue) return;
      }

      const startParts = shiftData.start_time.split(':');
      const endParts = shiftData.end_time.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      const durationMinutes = endMinutes - startMinutes;

      if (durationMinutes <= 0) {
        toast.error('終了時刻は開始時刻より後にしてください');
        return;
      }

      createShiftMutation.mutate({
        day,
        job_id: job.id,
        job_name: job.job_name,
        committee_id: selectedItem.data.id,
        committee_name: selectedItem.data.name,
        bureau: selectedItem.data.bureau,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        duration_minutes: durationMinutes,
        lane_number: 0
      });
    }
  };

  const getShiftsForItem = (itemId) => {
    if (viewMode === 'job') {
      return shifts.filter(s => s.job_id === itemId && s.day === day);
    } else {
      return shifts.filter(s => s.committee_id === itemId && s.day === day);
    }
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 7; h <= 22; h++) {
      for (let m = 0; m < 60; m += 10) {
        if (h === 22 && m > 0) break;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const items = viewMode === 'job' 
    ? jobs.filter(j => Array.isArray(j.days) ? j.days.includes(day) : j.day === day)
    : committees;

  return (
    <div className="space-y-6">
      <AvailableCommitteesList 
        availableCommittees={availableCommittees}
        allCommittees={committees}
        shifts={shifts}
        day={day}
      />

      <div className="overflow-x-scroll max-h-[calc(100vh-400px)] overflow-y-auto" style={{ scrollbarWidth: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div className="min-w-[2000px]">
          <div className="flex border-b-2 border-gray-300 bg-gray-50 sticky top-0 z-10">
            <div className="w-64 flex-shrink-0 p-3 font-bold border-r-2 border-gray-300">
              {viewMode === 'job' ? '仕事名 / レーン' : '委員名'}
            </div>
            <div className="flex-1 flex">
              {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(hour => (
                <div key={hour} className="flex-1 border-r border-gray-300">
                  <div className="text-center p-2 border-b border-gray-200 text-sm font-bold bg-gray-100">
                    {hour}:00
                  </div>
                  <div className="flex">
                    {[0, 10, 20, 30, 40, 50].map(min => (
                      <div key={`${hour}:${min}`} className="flex-1 border-r border-gray-100 text-[10px] text-center text-gray-400 py-1">
                        {min > 0 && `:${min}`}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {viewMode === 'job' ? (
            <>
              {items.map(job => {
                const jobShifts = getShiftsForItem(job.id);
                const requiredStaff = job.required_staff || 1;
                const filledCount = jobShifts.length;
                const isComplete = filledCount >= requiredStaff;
                const isWarning = filledCount < requiredStaff * 0.5;

                return (
                  <div key={job.id} className="border-b-2 border-gray-300">
                    <div className="flex bg-gray-50">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: bureauColors[job.bureau] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">{job.job_name}</div>
                            {job.location && (
                              <div className="text-xs text-gray-500 truncate">📍 {job.location}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                className={
                                  isComplete ? "bg-green-100 text-green-800" :
                                  isWarning ? "bg-red-100 text-red-800" :
                                  "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {filledCount}/{requiredStaff}人
                              </Badge>
                              {job.start_time && job.end_time && (
                                <span className="text-xs text-gray-600">
                                  {job.start_time}-{job.end_time}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1"></div>
                    </div>

                    {Array.from({ length: requiredStaff }).map((_, laneIndex) => {
                      const laneShifts = jobShifts.filter(s => (s.lane_number || 0) === laneIndex);
                      
                      return (
                        <div key={laneIndex} className="flex border-b border-gray-100 hover:bg-blue-50 transition-colors">
                          <div 
                            className="w-64 flex-shrink-0 p-3 border-r border-gray-200 cursor-pointer flex items-center justify-between group"
                            onClick={() => handleCellClick(job, laneIndex)}
                          >
                            <span className="text-sm text-gray-600">レーン {laneIndex + 1}</span>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex-1 relative h-16">
                            {job.start_time && job.end_time && (
                              <>
                                {job.start_time > '07:00' && (
                                  <div
                                    className="absolute top-0 h-full bg-gray-200 opacity-50"
                                    style={{
                                      left: 0,
                                      width: `${((parseInt(job.start_time.split(':')[0]) * 60 + parseInt(job.start_time.split(':')[1]) - 420) / 900) * 100}%`
                                    }}
                                  />
                                )}
                                {job.end_time < '22:00' && (
                                  <div
                                    className="absolute top-0 h-full bg-gray-200 opacity-50"
                                    style={{
                                      left: `${((parseInt(job.end_time.split(':')[0]) * 60 + parseInt(job.end_time.split(':')[1]) - 420) / 900) * 100}%`,
                                      width: `${((1320 - (parseInt(job.end_time.split(':')[0]) * 60 + parseInt(job.end_time.split(':')[1]))) / 900) * 100}%`
                                    }}
                                  />
                                )}
                              </>
                            )}

                            {laneShifts.map(laneShift => (
                              <div
                                key={laneShift.id}
                                className="absolute top-2 h-12 rounded-lg flex items-center justify-between px-2 text-xs font-medium text-white shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                style={{
                                  left: `${(((parseInt(laneShift.start_time.split(':')[0]) - 7) * 60 + parseInt(laneShift.start_time.split(':')[1])) / 900) * 100}%`,
                                  width: `${((parseInt(laneShift.end_time.split(':')[0]) * 60 + parseInt(laneShift.end_time.split(':')[1]) - (parseInt(laneShift.start_time.split(':')[0]) * 60 + parseInt(laneShift.start_time.split(':')[1]))) / 900) * 100}%`,
                                  backgroundColor: bureauColors[laneShift.bureau],
                                  minWidth: '60px'
                                }}
                                title={`${laneShift.committee_name}\n${laneShift.start_time} - ${laneShift.end_time}`}
                              >
                                <div className="flex-1 truncate">
                                  {laneShift.committee_name}
                                  <div className="text-[10px] opacity-90">
                                    {laneShift.start_time}-{laneShift.end_time}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteShift(laneShift.id, e)}
                                  className="ml-1 hover:bg-white/20 rounded p-0.5 z-10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {items.map(committee => {
                const committeeShifts = getShiftsForItem(committee.id);
                const totalMinutes = committeeShifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

                return (
                  <div key={committee.id} className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <div 
                      className="w-64 flex-shrink-0 p-3 border-r border-gray-200 cursor-pointer hover:bg-blue-50 group"
                      onClick={() => handleCellClick(committee)}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bureauColors[committee.bureau] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{committee.name}</div>
                          <div className="text-xs text-gray-500">{committee.grade} / {committee.bureau}</div>
                          <div className="text-xs font-semibold text-blue-600 mt-1">
                            {Math.floor(totalMinutes / 60)}h{totalMinutes % 60}m
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 relative h-16">
                      {committeeShifts.map(shift => {
                        const [startH, startM] = shift.start_time.split(':').map(Number);
                        const [endH, endM] = shift.end_time.split(':').map(Number);
                        
                        const totalMinutes = 900;
                        const startMinutes = (startH - 7) * 60 + startM;
                        const duration = (endH * 60 + endM) - (startH * 60 + startM);
                        
                        const left = (startMinutes / totalMinutes) * 100;
                        const width = (duration / totalMinutes) * 100;
                        
                        return (
                          <div
                            key={shift.id}
                            className="absolute top-2 h-12 rounded-lg flex items-center justify-between px-2 text-xs font-medium text-white shadow-md hover:opacity-90 transition-opacity"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: bureauColors[shift.bureau],
                              minWidth: '60px',
                              zIndex: 1
                            }}
                            title={`${shift.job_name}\n${shift.start_time} - ${shift.end_time}`}
                          >
                            <div className="flex-1 truncate pointer-events-none">
                              {shift.job_name}
                              <div className="text-[10px] opacity-90">
                                {shift.start_time}-{shift.end_time}
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteShift(shift.id, e)}
                              className="ml-1 hover:bg-white/20 rounded p-0.5 flex-shrink-0 z-10 relative"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem && (
                viewMode === 'job' 
                  ? `${selectedItem.data.job_name} - レーン${selectedLane + 1}に割り当て`
                  : `${selectedItem.data.name} - 仕事を割り当て`
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && viewMode === 'job' && (
            <AssignShiftForm
              job={selectedItem.data}
              committees={committees}
              shifts={shifts}
              laneNumber={selectedLane}
              onSubmit={handleAssignShift}
              onCancel={() => {
                setShowAssignDialog(false);
                setSelectedItem(null);
                setSelectedLane(null);
              }}
            />
          )}
          {selectedItem && viewMode === 'committee' && (
            <AssignJobForm
              jobs={jobs}
              shifts={shifts}
              day={day}
              committeeId={selectedItem.data.id}
              onSubmit={handleAssignShift}
              onCancel={() => {
                setShowAssignDialog(false);
                setSelectedItem(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AvailableCommitteesList({ availableCommittees, allCommittees, shifts, day }) {
  const [bureauFilter, setBureauFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredAvailable = availableCommittees.filter(c => {
    const matchesBureau = bureauFilter === "all" || c.bureau === bureauFilter;
    const matchesGrade = gradeFilter === "all" || c.grade === gradeFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBureau && matchesGrade && matchesSearch;
  });

  const displayCommittees = showAll ? allCommittees : filteredAvailable;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            <span>{showAll ? '全委員リスト' : '空き委員リスト'}</span>
            <Badge variant="outline" className="ml-2">
              {showAll ? `${allCommittees.length}人` : `${filteredAvailable.length}人`}
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? '空き委員のみ' : '全委員を表示'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <Input
              placeholder="名前で検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">
                未割当: {availableCommittees.length}人
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {displayCommittees.map(committee => {
              const committeeShifts = shifts.filter(s => s.committee_id === committee.id && s.day === day);
              const totalMinutes = committeeShifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
              
              return (
                <div 
                  key={committee.id}
                  className="border rounded-lg p-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: bureauColors[committee.bureau] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{committee.name}</div>
                      <div className="text-xs text-gray-500">{committee.bureau} / {committee.grade}</div>
                      {totalMinutes > 0 && (
                        <div className="text-xs text-blue-600 font-semibold">
                          {Math.floor(totalMinutes / 60)}h{totalMinutes % 60}m
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignJobForm({ jobs, shifts, day, committeeId, onSubmit, onCancel }) {
  const [selectedJob, setSelectedJob] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJob) {
      toast.error('仕事を選択してください');
      return;
    }
    
    if (startTime >= endTime) {
      toast.error('終了時刻は開始時刻より後にしてください');
      return;
    }
    
    onSubmit({ job_id: selectedJob, start_time: startTime, end_time: endTime });
  };

  const availableJobs = jobs.filter(j => j.days?.includes(day));

  const calculateDuration = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const duration = (endH * 60 + endM) - (startH * 60 + startM);
    return duration > 0 ? `${Math.floor(duration / 60)}時間${duration % 60}分` : '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">開始時刻</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            min="07:00"
            max="22:00"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">終了時刻</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            min="07:00"
            max="22:00"
            required
          />
        </div>
      </div>

      {calculateDuration() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">勤務時間: <strong>{calculateDuration()}</strong></p>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
        {availableJobs.length > 0 ? (
          availableJobs.map(job => (
            <button
              key={job.id}
              type="button"
              onClick={() => setSelectedJob(job.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedJob === job.id
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{job.job_name}</div>
              {job.location && <div className="text-xs opacity-75">📍 {job.location}</div>}
              {job.start_time && job.end_time && (
                <div className="text-xs opacity-75 mt-1">
                  ⏰ {job.start_time} - {job.end_time}
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            この日に実施予定の仕事がありません
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button 
          type="submit" 
          disabled={!selectedJob}
          className="bg-gradient-to-r from-orange-500 to-pink-500"
        >
          割り当て
        </Button>
      </div>
    </form>
  );
}