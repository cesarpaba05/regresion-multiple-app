import React from 'react';
import { formatNumberCO } from '../stats/format';

interface CorrplotMatrixProps {
  variables: string[];
  matrix: number[][];
  yCol: string;
}

function correlationColor(r: number): string {
  const abs = Math.min(1, Math.abs(r));
  if (r >= 0) {
    const alpha = 0.18 + abs * 0.78;
    return `rgba(79, 70, 229, ${alpha.toFixed(2)})`; // Indigo
  } else {
    const alpha = 0.18 + abs * 0.78;
    return `rgba(225, 29, 72, ${alpha.toFixed(2)})`; // Rose/Coral
  }
}

export const CorrplotMatrix: React.FC<CorrplotMatrixProps> = ({
  variables,
  matrix,
  yCol,
}) => {
  const n = variables.length;
  if (n === 0) return null;

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <table className="border-collapse w-full text-xs">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="p-2.5 text-left font-semibold text-slate-600 border-b border-slate-200 min-w-[120px]">
                Variable
              </th>
              {variables.map((v) => (
                <th
                  key={v}
                  className={`p-2.5 text-center font-semibold border-b border-slate-200 min-w-[88px] ${
                    v === yCol ? 'text-indigo-900 bg-indigo-50/70' : 'text-slate-700'
                  }`}
                >
                  <span className="block truncate max-w-[110px] mx-auto" title={v}>
                    {v}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variables.map((rowVar, i) => (
              <tr key={rowVar} className="border-b border-slate-100">
                <td
                  className={`p-2.5 font-semibold whitespace-nowrap ${
                    rowVar === yCol ? 'text-indigo-900 bg-indigo-50/70' : 'text-slate-800'
                  }`}
                >
                  {rowVar}
                </td>
                {variables.map((colVar, j) => {
                  const r = matrix[i]?.[j] ?? 0;
                  if (i === j) {
                    return (
                      <td
                        key={colVar}
                        className="p-2 text-center bg-slate-100/70 text-slate-400 font-mono tabular-nums"
                      >
                        1,00
                      </td>
                    );
                  }

                  if (j > i) {
                    const radius = 6 + Math.abs(r) * 14;
                    const fill = correlationColor(r);
                    return (
                      <td
                        key={colVar}
                        className="p-2 text-center align-middle"
                        title={`${rowVar} vs ${colVar}: r = ${formatNumberCO(r, 3)}`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <svg width="42" height="42" viewBox="0 0 42 42" className="shrink-0">
                            <circle
                              cx="21"
                              cy="21"
                              r={radius}
                              fill={fill}
                              stroke={r >= 0 ? '#4338CA' : '#BE123C'}
                              strokeOpacity={0.45}
                              strokeWidth={1.25}
                            />
                          </svg>
                          <span
                            className={`font-mono tabular-nums text-[11px] font-semibold ${
                              Math.abs(r) >= 0.7
                                ? r >= 0
                                  ? 'text-indigo-800'
                                  : 'text-rose-700'
                                : 'text-slate-700'
                            }`}
                          >
                            {formatNumberCO(r, 2)}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  const cellTint =
                    Math.abs(r) >= 0.65
                      ? r >= 0
                        ? 'bg-indigo-50/60 text-indigo-800 font-semibold'
                        : 'bg-rose-50/60 text-rose-800 font-semibold'
                      : 'text-slate-500';

                  return (
                    <td
                      key={colVar}
                      className={`p-2 text-center font-mono tabular-nums ${cellTint}`}
                      title={`${rowVar} vs ${colVar}: r = ${formatNumberCO(r, 3)}`}
                    >
                      {formatNumberCO(r, 2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <span>Triángulo superior: tamaño del círculo proporcional a |r| y coeficiente exacto.</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-rose-600/85" />
            <span>Negativa (-1,0)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
            <span>Nula (0,0)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-600/85" />
            <span>Positiva (+1,0)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
