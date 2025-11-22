import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PDFExport({ committee, shifts, jobs }) {
  const generatePersonalPDF = () => {
    // HTMLとして個人用シフト表を作成
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>${committee.name}様 シフト表</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            text-align: center;
            color: #EF4444;
            border-bottom: 3px solid #EF4444;
            padding-bottom: 10px;
        }
        .info-box {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            width: 120px;
        }
        .day-section {
            margin: 30px 0;
            page-break-inside: avoid;
        }
        .day-title {
            background: linear-gradient(to right, #F97316, #EC4899);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
        }
        .shift-card {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            background: white;
        }
        .shift-header {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .shift-detail {
            display: flex;
            margin: 5px 0;
            font-size: 14px;
        }
        .shift-label {
            font-weight: bold;
            width: 100px;
            color: #6b7280;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }
        .badge-bureau {
            background: #fee2e2;
            color: #991b1b;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>🎪 生明祭 シフト表</h1>
    
    <div class="info-box">
        <div class="info-row">
            <div class="info-label">氏名:</div>
            <div>${committee.name}</div>
        </div>
        <div class="info-row">
            <div class="info-label">ふりがな:</div>
            <div>${committee.furigana || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">所属局:</div>
            <div><span class="badge badge-bureau">${committee.bureau}</span></div>
        </div>
        <div class="info-row">
            <div class="info-label">役職:</div>
            <div>${committee.position || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">学年:</div>
            <div>${committee.grade}</div>
        </div>
        <div class="info-row">
            <div class="info-label">総シフト数:</div>
            <div>${shifts.length}件</div>
        </div>
        <div class="info-row">
            <div class="info-label">総勤務時間:</div>
            <div>${Math.floor(shifts.reduce((sum, s) => sum + s.duration_minutes, 0) / 60)}時間${shifts.reduce((sum, s) => sum + s.duration_minutes, 0) % 60}分</div>
        </div>
    </div>

    ${['Day1', 'Day2', 'Day3'].map(day => {
      const dayShifts = shifts.filter(s => s.day === day);
      return `
    <div class="day-section">
        <div class="day-title">${day === 'Day1' ? '1日目' : day === 'Day2' ? '2日目' : '3日目'} (${dayShifts.length}件)</div>
        ${dayShifts.length === 0 ? '<p style="text-align: center; color: #9ca3af; margin: 20px 0;">この日のシフトはありません</p>' : 
          dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(shift => {
            const job = jobs.find(j => j.id === shift.job_id);
            return `
        <div class="shift-card">
            <div class="shift-header">${shift.job_name}</div>
            <div class="shift-detail">
                <div class="shift-label">時間:</div>
                <div>${shift.start_time} - ${shift.end_time} (${Math.floor(shift.duration_minutes / 60)}時間${shift.duration_minutes % 60}分)</div>
            </div>
            <div class="shift-detail">
                <div class="shift-label">場所:</div>
                <div>${job?.location || '-'}</div>
            </div>
            <div class="shift-detail">
                <div class="shift-label">担当局:</div>
                <div><span class="badge badge-bureau">${shift.bureau}</span></div>
            </div>
            ${job?.description ? `
            <div class="shift-detail">
                <div class="shift-label">内容:</div>
                <div>${job.description}</div>
            </div>` : ''}
        </div>`;
          }).join('')
        }
    </div>`;
    }).join('')}

    <div class="footer">
        生明祭シフト管理システム | 発行日: ${new Date().toLocaleDateString('ja-JP')}
    </div>
</body>
</html>
    `;

    // 新しいウィンドウで開いて印刷ダイアログを表示
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      toast.success('印刷プレビューを開きました');
    }, 500);
  };

  return (
    <Button
      onClick={generatePersonalPDF}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <FileText className="w-4 h-4" />
      PDF出力
    </Button>
  );
}