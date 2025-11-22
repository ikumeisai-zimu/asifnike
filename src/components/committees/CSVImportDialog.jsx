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

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    const fieldMap = {
      '所属局': 'bureau',
      '役職': 'position',
      '学年': 'grade',
      '氏名': 'name',
      'ふりがな': 'furigana',
      '学科': 'department',
      '性別': 'gender',
      '班①': 'group1',
      '班②': 'group2',
      '電話番号': 'phone',
      'メールアドレス': 'email',
      '備考': 'notes'
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      
      headers.forEach((header, index) => {
        const field = fieldMap[header];
        if (field && values[index]) {
          row[field] = values[index];
        }
      });

      if (row.name && row.bureau && row.grade) {
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
      setMessage(`${data.length}件の委員をインポートしました`);
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
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
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
          1行目にヘッダー、2行目以降にデータを記載してください。
        </p>
        <div className="bg-white p-3 rounded border border-blue-200 overflow-x-auto">
          <pre className="text-xs whitespace-pre">所属局,役職,学年,氏名,ふりがな,学科,性別,班①,班②,電話番号,メールアドレス,備考</pre>
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