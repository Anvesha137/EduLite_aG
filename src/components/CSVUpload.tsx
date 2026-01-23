import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

interface CSVUploadProps {
  onDataParsed: (data: any[]) => Promise<{ success: number; errors: string[] }>;
  templateHeaders: string[];
  entityName: string;
}

export function CSVUpload({ onDataParsed, templateHeaders, entityName }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = templateHeaders.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityName.toLowerCase()}_template.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const uploadResult = await onDataParsed(results.data);
          setResult(uploadResult);
        } catch (error: any) {
          setResult({ success: 0, errors: [error.message] });
        } finally {
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error) => {
        setResult({ success: 0, errors: [error.message] });
        setUploading(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">CSV Upload Instructions</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Download the CSV template</li>
              <li>Fill in your data (one row per {entityName.toLowerCase()})</li>
              <li>Save the file as CSV</li>
              <li>Upload the file below</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>

        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload CSV'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {result && (
        <div className={`rounded-lg p-4 ${result.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-start gap-3">
            <CheckCircle className={`w-5 h-5 mt-0.5 ${result.errors.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
            <div className="flex-1">
              <h4 className={`font-medium mb-1 ${result.errors.length > 0 ? 'text-amber-900' : 'text-green-900'}`}>
                Upload Complete
              </h4>
              <p className={`text-sm ${result.errors.length > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                Successfully processed {result.success} {entityName.toLowerCase()}(s)
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-amber-900 mb-2">Errors:</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {result.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-amber-600 italic">
                        ... and {result.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
