import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle } from "lucide-react";

const bureauColors = {
  "執行": "bg-red-100 text-red-800",
  "事務": "bg-blue-100 text-blue-800",
  "広報": "bg-purple-100 text-purple-800",
  "施設": "bg-green-100 text-green-800",
  "企画": "bg-yellow-100 text-yellow-800",
  "装飾": "bg-pink-100 text-pink-800"
};

export default function AssignJobForm({ jobs, shifts, committeeId, onSubmit, onCancel }) {
  const [selectedJob, setSelectedJob] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    onSubmit({
      job_id: selectedJob,
      start_time: startTime,
      end_time: endTime
    });
  };

  const filteredJobs = jobs.filter(j =>
    j.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateDuration = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">開始時刻</Label>
          <Input
            id="start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            step="600"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">終了時刻</Label>
          <Input
            id="end_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            step="600"
            required
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <AlertCircle className="w-4 h-4" />
          勤務時間: {calculateDuration()}
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="space-y-3 mb-4">
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

        <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
          {filteredJobs.map(job => (
            <button
              key={job.id}
              type="button"
              onClick={() => setSelectedJob(job.id)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                selectedJob === job.id
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                  : 'bg-white hover:bg-gray-100 border'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{job.job_name}</span>
                  <Badge className={selectedJob === job.id ? 'bg-white/20' : bureauColors[job.bureau]}>
                    {job.bureau}
                  </Badge>
                </div>
              </div>
              {job.location && (
                <div className="text-sm opacity-75">📍 {job.location}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
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