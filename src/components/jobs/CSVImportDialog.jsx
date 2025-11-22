import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CSVImportDialog({ onImport }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setStatus(null);
    } else {
      setStatus("error");
      setMessage("CSVファイルを選択してください");
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // CSVの行を正しくパースする関数（引用符内のカンマを区切りとして扱わない）
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(v => v.replace(/^"|"$/g, ''));
    };

    const headers = parseCSVLine(lines[0]);
    const data = [];

    const fieldMap = {
      '仕事名': 'job_name',
      '場所': 'location',
      '担当局': 'bureau',
      '必要人数（同時）': 'required_staff',
      '開始時刻': 'start_time',
      '終了時刻': 'end_time',
      '実施日': 'days',
      '仕事内容の説明': 'description'
    };

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {};

      headers.forEach((header, index) => {
        const field = fieldMap[header];
        if (field && values[index]) {
          if (field === 'required_staff') {
            row[field] = parseInt(values[index]) || 1;
          } else if (field === 'days') {
            const dayValues = values[index].split(/[,;]/).map(d => d.trim());
            row[field] = dayValues.filter(d => ['Day1', 'Day2', 'Day3'].includes(d));
            if (row[field].length === 0) row[field] = ['Day1'];
          } else {
            row[field] = values[index];
          }
        }
      });

      if (row.job_name && row.bureau) {
        if (!row.required_staff) row.required_staff = 1;
        if (!row.days || row.days.length === 0) row.days = ['Day1'];
        data.push(row);
      }
    }

    return data;
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus("loading");
    setMessage("インポート中...");

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        setStatus("error");
        setMessage("有効なデータが見つかりませんでした");
        return;
      }

      await onImport(data);
      setStatus("success");
      setMessage(`${data.length}件の仕事をインポートしました`);
      setFile(null);
    } catch (error) {
      setStatus("error");
      setMessage("インポートに失敗しました: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload-jobs"
        />
        <label
          htmlFor="csv-upload-jobs"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900">CSVファイルを選択</p>
            <p className="text-sm text-gray-500 mt-1">
              {file ? file.name : "クリックしてファイルを選択"}
            </p>
          </div>
        </label>
      </div>

      {status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {status === "success" && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-sm text-blue-900 mb-2">CSVフォーマット</h4>
        <p className="text-xs text-blue-800 mb-2">
          1行目にヘッダー、2行目以降にデータを記載してください。<br/>
          実施日は複数指定する場合、<strong>必ず引用符で囲んで</strong>カンマ区切り（"Day1,Day2,Day3"）で記載してください。
        </p>
        <div className="text-xs bg-white p-2 rounded border border-blue-200 overflow-x-auto">
          <pre className="whitespace-pre-wrap break-all">仕事名,場所,担当局,必要人数（同時）,開始時刻,終了時刻,実施日,仕事内容の説明
      正門テント運営,正門前,施設,3,09:00,17:00,"Day1,Day2,Day3",来場者の案内と受付業務</pre>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          onClick={handleImport}
          disabled={!file || status === "loading"}
          className="bg-gradient-to-r from-orange-500 to-pink-500"
        >
          {status === "loading" ? "インポート中..." : "インポート実行"}
        </Button>
      </div>
    </div>
  );
}