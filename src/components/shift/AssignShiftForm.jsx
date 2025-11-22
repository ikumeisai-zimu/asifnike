import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

const bureauColors = {
  "執行": "bg-red-100 text-red-800 border-red-200",
  "事務": "bg-blue-100 text-blue-800 border-blue-200",
  "広報": "bg-purple-100 text-purple-800 border-purple-200",
  "施設": "bg-green-100 text-green-800 border-green-200",
  "企画": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "装飾": "bg-pink-100 text-pink-800 border-pink-200"
};

export default function AssignShiftForm({ job, committees, shifts, laneNumber, onSubmit, onCancel }) {
  const [selectedCommittee, setSelectedCommittee] = useState("");
  const [startTime, setStartTime] = useState(job.start_time || "07:00");
  const [endTime, setEndTime] = useState(job.end_time || "08:00");
  const [searchTerm, setSearchTerm] = useState("");
  const [bureauFilter, setBureauFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCommittee) {
      return;
    }
    onSubmit({ committee_id: selectedCommittee, start_time: startTime, end_time: endTime });
  };

  // このレーンの既存シフトを取得
  const laneShifts = shifts.filter(s => s.job_id === job.id && (s.lane_number || 0) === laneNumber);

  // フィルタリングとソート
  const filteredCommittees = committees
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBureau = bureauFilter === "all" || c.bureau === bureauFilter;
      const matchesGrade = gradeFilter === "all" || c.grade === gradeFilter;
      return matchesSearch && matchesBureau && matchesGrade;
    })
    .map(c => {
      // このレーンでの時間重複チェック
      const hasLaneConflict = laneShifts.some(s => 
        s.start_time < endTime &&
        s.end_time > startTime
      );
      
      // 委員自身の時間重複チェック
      const hasCommitteeConflict = shifts.some(s => 
        s.committee_id === c.id &&
        s.start_time < endTime &&
        s.end_time > startTime
      );
      
      return { ...c, hasLaneConflict, hasCommitteeConflict };
    })
    .sort((a, b) => {
      // 重複なし > 委員のみ重複 > レーン重複
      if (a.hasLaneConflict !== b.hasLaneConflict) {
        return a.hasLaneConflict ? 1 : -1;
      }
      if (a.hasCommitteeConflict !== b.hasCommitteeConflict) {
        return a.hasCommitteeConflict ? 1 : -1;
      }
      
      // 局順でソート
      const bureauOrder = { "執行": 1, "事務": 2, "広報": 3, "施設": 4, "企画": 5, "装飾": 6 };
      const bureauDiff = (bureauOrder[a.bureau] || 99) - (bureauOrder[b.bureau] || 99);
      if (bureauDiff !== 0) return bureauDiff;
      
      // 学年順でソート（3年、2年、1年、4年）
      const gradeOrder = { "3年": 1, "2年": 2, "1年": 3, "4年": 4, "その他": 5 };
      const gradeDiff = (gradeOrder[a.grade] || 99) - (gradeOrder[b.grade] || 99);
      if (gradeDiff !== 0) return gradeDiff;
      
      // 名前順でソート
      return a.name.localeCompare(b.name, 'ja');
    });

  const calculateDuration = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const duration = (endH * 60 + endM) - (startH * 60 + startM);
    return duration > 0 ? `${Math.floor(duration / 60)}時間${duration % 60}分` : '';
  };

  const selectedCommitteeData = committees.find(c => c.id === selectedCommittee);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{job.job_name}</h3>
        {job.location && (
          <p className="text-sm text-gray-600">📍 {job.location}</p>
        )}
        {job.start_time && job.end_time && (
          <p className="text-sm text-gray-600">⏰ 推奨時間: {job.start_time} - {job.end_time}</p>
        )}
        {job.description && (
          <p className="text-sm text-gray-600 mt-2">{job.description}</p>
        )}
        <Badge variant="outline" className="mt-2">レーン {laneNumber + 1}</Badge>
      </div>

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

      {laneShifts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-900 font-semibold mb-2">このレーンの既存シフト:</p>
          {laneShifts.map(s => (
            <div key={s.id} className="text-xs text-orange-800">
              • {s.committee_name}: {s.start_time}-{s.end_time}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <label className="text-sm font-medium block">委員を選択</label>
        
        <Input
          placeholder="名前で検索"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
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

        <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2">
          {filteredCommittees.map(committee => (
            <button
              key={committee.id}
              type="button"
              onClick={() => setSelectedCommittee(committee.id)}
              disabled={committee.hasLaneConflict}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedCommittee === committee.id
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent'
                  : committee.hasLaneConflict
                    ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                    : committee.hasCommitteeConflict
                      ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                      : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{committee.name}</span>
                    {committee.hasLaneConflict && (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    {!committee.hasLaneConflict && committee.hasCommitteeConflict && (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge 
                      className={selectedCommittee === committee.id ? 'bg-white/20 text-white' : bureauColors[committee.bureau]}
                    >
                      {committee.bureau}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={selectedCommittee === committee.id ? 'border-white/40 text-white' : ''}
                    >
                      {committee.grade}
                    </Badge>
                    {committee.position && (
                      <Badge 
                        variant="outline"
                        className={selectedCommittee === committee.id ? 'border-white/40 text-white' : 'bg-purple-50 text-purple-700 border-purple-200'}
                      >
                        {committee.position}
                      </Badge>
                    )}
                    {committee.group1 && (
                      <Badge 
                        variant="outline"
                        className={selectedCommittee === committee.id ? 'border-white/40 text-white' : 'bg-blue-50 text-blue-700 border-blue-200'}
                      >
                        班① {committee.group1}
                      </Badge>
                    )}
                    {committee.group2 && (
                      <Badge 
                        variant="outline"
                        className={selectedCommittee === committee.id ? 'border-white/40 text-white' : 'bg-green-50 text-green-700 border-green-200'}
                      >
                        班② {committee.group2}
                      </Badge>
                    )}
                  </div>
                  {committee.hasLaneConflict && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ このレーンの同時刻に既にシフトがあります
                    </p>
                  )}
                  {!committee.hasLaneConflict && committee.hasCommitteeConflict && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ この委員は他の仕事に入っています
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filteredCommittees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              該当する委員が見つかりません
            </div>
          )}
        </div>
      </div>

      {selectedCommitteeData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-900">
            <strong>{selectedCommitteeData.name}</strong> さんを選択中
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button 
          type="submit" 
          disabled={!selectedCommittee}
          className="bg-gradient-to-r from-orange-500 to-pink-500"
        >
          割り当て
        </Button>
      </div>
    </form>
  );
}