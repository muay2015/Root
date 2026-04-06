// 파일 업로드 패널 컴포넌트
import type { ChangeEvent } from 'react';

export function UploadPanel({
  title,
  files,
  onChange,
}: {
  title: string;
  files: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="border border-slate-200 bg-white px-5 py-5">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="mt-4 border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        파일을 선택해 업로드하세요.
      </div>
      <input type="file" multiple className="mt-4 block w-full text-sm" onChange={onChange} />
      {files.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {files.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}
