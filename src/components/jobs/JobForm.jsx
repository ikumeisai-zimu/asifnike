import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function JobForm({ job, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(job || {
    job_name: "",
    location: "",
    bureau: "",
    required_staff: 1,
    start_time: "",
    end_time: "",
    days: ["Day1"],
    description: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="job_name">仕事名 <span className="text-red-500">*</span></Label>
          <Input
            id="job_name"
            value={formData.job_name}
            onChange={(e) => handleChange('job_name', e.target.value)}
            placeholder="例: 正門テント運営"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">場所</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="例: 正門前"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bureau">担当局 <span className="text-red-500">*</span></Label>
          <Select value={formData.bureau} onValueChange={(v) => handleChange('bureau', v)} required>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="執行">執行</SelectItem>
              <SelectItem value="事務">事務</SelectItem>
              <SelectItem value="広報">広報</SelectItem>
              <SelectItem value="施設">施設</SelectItem>
              <SelectItem value="企画">企画</SelectItem>
              <SelectItem value="装飾">装飾</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="required_staff">必要人数（同時） <span className="text-red-500">*</span></Label>
          <Input
            id="required_staff"
            type="number"
            min="1"
            value={formData.required_staff}
            onChange={(e) => handleChange('required_staff', parseInt(e.target.value))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_time">開始時刻</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleChange('start_time', e.target.value)}
            min="07:00"
            max="22:00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">終了時刻</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleChange('end_time', e.target.value)}
            min="07:00"
            max="22:00"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>実施日 <span className="text-red-500">*</span></Label>
          <div className="flex gap-4 p-3 border rounded-lg">
            {['Day1', 'Day2', 'Day3'].map((day, idx) => (
              <label key={day} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.days?.includes(day)}
                  onCheckedChange={(checked) => {
                    const newDays = checked
                      ? [...(formData.days || []), day]
                      : (formData.days || []).filter(d => d !== day);
                    handleChange('days', newDays);
                  }}
                />
                <span className="text-sm">{idx + 1}日目</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">仕事内容の説明</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="仕事の詳細な内容を記入してください"
            rows={4}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-orange-500 to-pink-500">
          {job ? '更新' : '登録'}
        </Button>
      </div>
    </form>
  );
}