import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CommitteeForm({ committee, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(committee || {
    bureau: "",
    position: "",
    grade: "",
    name: "",
    furigana: "",
    department: "",
    gender: "",
    group1: "",
    group2: "",
    phone: "",
    email: "",
    notes: "",
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
          <Label htmlFor="bureau">所属局 <span className="text-red-500">*</span></Label>
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
          <Label htmlFor="position">役職</Label>
          <Select value={formData.position} onValueChange={(v) => handleChange('position', v)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="委員長">委員長</SelectItem>
              <SelectItem value="副委員長">副委員長</SelectItem>
              <SelectItem value="会計">会計</SelectItem>
              <SelectItem value="局長">局長</SelectItem>
              <SelectItem value="局次長">局次長</SelectItem>
              <SelectItem value="局員">局員</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="grade">学年 <span className="text-red-500">*</span></Label>
          <Select value={formData.grade} onValueChange={(v) => handleChange('grade', v)} required>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1年">1年</SelectItem>
              <SelectItem value="2年">2年</SelectItem>
              <SelectItem value="3年">3年</SelectItem>
              <SelectItem value="4年">4年</SelectItem>
              <SelectItem value="その他">その他</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">性別</Label>
          <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="男">男</SelectItem>
              <SelectItem value="女">女</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">氏名 <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="山田太郎"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="furigana">ふりがな</Label>
          <Input
            id="furigana"
            value={formData.furigana}
            onChange={(e) => handleChange('furigana', e.target.value)}
            placeholder="やまだたろう"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="department">学科</Label>
          <Select value={formData.department} onValueChange={(v) => handleChange('department', v)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="情報科学科">情報科学科</SelectItem>
              <SelectItem value="数学科">数学科</SelectItem>
              <SelectItem value="物理学科">物理学科</SelectItem>
              <SelectItem value="電気電子生命学科">電気電子生命学科</SelectItem>
              <SelectItem value="機械工学科">機械工学科</SelectItem>
              <SelectItem value="機械情報工学科">機械情報工学科</SelectItem>
              <SelectItem value="建築学科">建築学科</SelectItem>
              <SelectItem value="応用化学科">応用化学科</SelectItem>
              <SelectItem value="農学科">農学科</SelectItem>
              <SelectItem value="農芸化学科">農芸化学科</SelectItem>
              <SelectItem value="生命科学科">生命科学科</SelectItem>
              <SelectItem value="食料環境政策学科">食料環境政策学科</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="group1">班①</Label>
          <Input
            id="group1"
            value={formData.group1}
            onChange={(e) => handleChange('group1', e.target.value)}
            placeholder="班の名前など"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="group2">班②</Label>
          <Input
            id="group2"
            value={formData.group2}
            onChange={(e) => handleChange('group2', e.target.value)}
            placeholder="班の名前など"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">電話番号</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="09012345678"
            pattern="[0-9]*"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="example@meiji.ac.jp"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">備考</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="特記事項など"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-orange-500 to-pink-500">
          {committee ? '更新' : '登録'}
        </Button>
      </div>
    </form>
  );
}