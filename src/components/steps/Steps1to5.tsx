import React, { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  Line,
  ComposedChart,
} from 'recharts';
import {
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { BusinessContext, ColumnProfile, DataRow } from '../../types/analytics';
import {
  computeCorrelationMatrix,
  computeLinearRelationship,
  toNumericValue,
} from '../../stats/regression';
import {
  formatCompactCO,
  formatIntCO,
  formatNumberCO,
  formatPercentCO,
} from '../../stats/format';
import { CorrplotMatrix } from '../CorrplotMatrix';

export type ExampleCaseId = 'maos' | 'synthetic' | 'custom' | 'empty';

/* -------------------------------------------------------------------------- */
/* PASO 1: PREGUNTA DE NEGOCIO                                                */
/* -------------------------------------------------------------------------- */
interface Step1Props {
  context: BusinessContext;
  onChangeContext: (next: BusinessContext) => void;
  activeCaseId: ExampleCaseId;
  rowCount: number;
  onLoadMaosExample: () => void;
  onLoadSyntheticExample: () => void;
}

export const Step1BusinessQuestion: React.FC<Step1Props> = ({
  context,
  onChangeContext,
  activeCaseId,
  rowCount,
  onLoadMaosExample,
  onLoadSyntheticExample,
}) => {
  const [selectedExample, setSelectedExample] = useState<'maos' | 'synthetic'>('maos');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-2">
          ¿Por qué "lo del año pasado más un 20%" no es suficiente?
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Proyectar ventas aplicando un porcentaje fijo sobre el histórico ignora lo que realmente mueve la caja cada día. Un aumento de precio frena la demanda, los productos complementarios acompañan la compra principal y la competencia o las promociones cambian la respuesta del cliente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-lg">
            <span className="font-semibold text-indigo-950 block mb-1">Precio</span>
            <span className="text-slate-700">
              Subir o bajar el precio cambia directamente el volumen de unidades vendidas y el margen.
            </span>
          </div>
          <div className="p-3.5 bg-teal-50/60 border border-teal-200/80 rounded-lg">
            <span className="font-semibold text-teal-950 block mb-1">Complementarios</span>
            <span className="text-slate-700">
              Bebidas o acompañantes se mueven junto con el producto principal e indican tráfico.
            </span>
          </div>
          <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-lg">
            <span className="font-semibold text-amber-950 block mb-1">Publicidad y promos</span>
            <span className="text-slate-700">
              Campañas puntuales generan picos que no deben confundirse con crecimiento orgánico.
            </span>
          </div>
          <div className="p-3.5 bg-rose-50/50 border border-rose-200/80 rounded-lg">
            <span className="font-semibold text-rose-950 block mb-1">Competencia y entorno</span>
            <span className="text-slate-700">
              Ofertas cercanas o días del calendario modifican la disposición a pagar del comprador.
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Define tu pregunta de pronóstico
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ¿Qué variable quieres pronosticar?
            </label>
            <input
              type="text"
              value={context.targetGoal}
              onChange={(e) =>
                onChangeContext({ ...context, targetGoal: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600"
              placeholder="Ej. Demanda diaria de bowls"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ¿Para qué decisión de negocio se usará?
            </label>
            <input
              type="text"
              value={context.decisionUse}
              onChange={(e) =>
                onChangeContext({ ...context, decisionUse: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600"
              placeholder="Ej. Fijar precio óptimo y planificar compras de insumos"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Unidad de la variable objetivo (Y)
            </label>
            <input
              type="text"
              value={context.unitLabel}
              onChange={(e) =>
                onChangeContext({ ...context, unitLabel: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600"
              placeholder="Ej. bowls, unidades, miles COP"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Símbolo monetario (para precios e ingresos)
            </label>
            <select
              value={context.currencySymbol}
              onChange={(e) =>
                onChangeContext({ ...context, currencySymbol: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600"
            >
              <option value="$">$ (Dólares / Pesos)</option>
              <option value="USD ">USD (Dólares)</option>
              <option value="COP $">COP $ (Pesos colombianos)</option>
              <option value="€">€ (Euros)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 text-white rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
            <FileSpreadsheet className="w-4 h-4 text-teal-300 shrink-0" />
            <span>
              {activeCaseId === 'maos'
                ? "Base activa: Taller – Mao's Palace (186 días)"
                : activeCaseId === 'synthetic'
                ? 'Base activa: Restaurante de Bowls sintético (186 días)'
                : activeCaseId === 'custom'
                ? `Base cargada por el usuario (${formatIntCO(rowCount)} filas)`
                : 'Sin base cargada actualmente'}
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
            El caso del taller del restaurante <strong className="text-white">Mao&apos;s Palace</strong> incluye 186 días de operación con <code className="font-mono text-teal-200">Bowls</code> como variable dependiente y <code className="font-mono text-teal-200">Bowl Price</code>, <code className="font-mono text-teal-200">Soda</code> y <code className="font-mono text-teal-200">Beer</code> como variables independientes. Puedes trabajar con él, borrarlo o subir tu propio archivo en el Paso 2.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Seleccionar caso ejemplo"
            value={selectedExample}
            onChange={(e) => setSelectedExample(e.target.value as 'maos' | 'synthetic')}
            className="px-3 py-2 text-xs font-medium text-slate-900 bg-white rounded-lg border border-slate-200 focus:outline-none"
          >
            <option value="maos">Taller – Mao&apos;s Palace (186 días)</option>
            <option value="synthetic">Ejemplo sintético ampliado (186 días)</option>
          </select>
          <button
            type="button"
            onClick={() =>
              selectedExample === 'maos' ? onLoadMaosExample() : onLoadSyntheticExample()
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-teal-300 hover:bg-teal-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cargar caso ejemplo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 2: CARGAR DATOS, VISTA PREVIA, TIPOS (str) Y FALTANTES                */
/* -------------------------------------------------------------------------- */
interface Step2Props {
  rows: DataRow[];
  columns: string[];
  profiles: ColumnProfile[];
  datasetName: string;
  activeCaseId: ExampleCaseId;
  onLoadDataset: (rows: DataRow[], columns: string[], name: string) => void;
  onLoadMaosExample: () => void;
  onLoadSyntheticExample: () => void;
  onClearDataset: () => void;
  onDropMissingRows: () => void;
}

const KIND_LABELS: Record<ColumnProfile['kind'], string> = {
  numeric_continuous: 'Numérica continua (num)',
  numeric_binary: 'Numérica binaria 0/1 (int)',
  numeric_discrete: 'Numérica discreta (int)',
  text: 'Texto / Fecha (chr)',
};

export const Step2LoadData: React.FC<Step2Props> = ({
  rows,
  columns,
  profiles,
  datasetName,
  activeCaseId,
  onLoadDataset,
  onLoadMaosExample,
  onLoadSyntheticExample,
  onClearDataset,
  onDropMissingRows,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [exampleChoice, setExampleChoice] = useState<'maos' | 'synthetic'>('maos');

  const totalMissingCells = profiles.reduce((acc, p) => acc + p.missingCount, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'txt') {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (res) => {
          if (res.errors.length > 0 && res.data.length === 0) {
            setUploadError('No se pudo leer el archivo CSV. Verifica que tenga encabezados válidos.');
            return;
          }
          const cols = res.meta.fields?.filter((c) => c && c.trim() !== '') ?? [];
          if (cols.length < 2 || res.data.length < 5) {
            setUploadError('El archivo necesita al menos 2 columnas y 5 filas con datos.');
            return;
          }
          const parsedRows: DataRow[] = res.data.map((raw) => {
            const clean: DataRow = {};
            for (const c of cols) {
              const v = raw[c];
              if (v === undefined || v === null || String(v).trim() === '') {
                clean[c] = null;
              } else {
                const num = toNumericValue(v);
                clean[c] = num !== null && !/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? num : String(v).trim();
              }
            }
            return clean;
          });
          onLoadDataset(parsedRows, cols, file.name);
        },
        error: () => {
          setUploadError('Error al procesar el archivo CSV.');
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
          if (json.length < 5) {
            setUploadError('La primera hoja de Excel necesita al menos 5 filas de datos.');
            return;
          }
          const cols = Object.keys(json[0]).filter((c) => c && c.trim() !== '');
          const parsedRows: DataRow[] = json.map((raw) => {
            const clean: DataRow = {};
            for (const c of cols) {
              const v = raw[c];
              if (v === undefined || v === null || String(v).trim() === '') {
                clean[c] = null;
              } else {
                const num = toNumericValue(v);
                clean[c] = num !== null && !(v instanceof Date) ? num : String(v).trim();
              }
            }
            return clean;
          });
          onLoadDataset(parsedRows, cols, file.name);
        } catch {
          setUploadError('No se pudo leer el archivo Excel (.xlsx).');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setUploadError('Formato no compatible. Sube un archivo .csv o .xlsx.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Fuente de datos actual: {datasetName}
            </h3>
            <p className="text-xs text-slate-600 mt-1 tabular-nums">
              {formatIntCO(rows.length)} observaciones (filas) · {formatIntCO(columns.length)} variables (columnas) · {formatIntCO(totalMissingCells)} datos faltantes (NA)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="dataset-upload-input"
            />
            <label
              htmlFor="dataset-upload-input"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors whitespace-nowrap shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir CSV o XLSX</span>
            </label>

            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <select
                aria-label="Seleccionar caso ejemplo"
                value={exampleChoice}
                onChange={(e) => setExampleChoice(e.target.value as 'maos' | 'synthetic')}
                className="px-2 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none"
              >
                <option value="maos">Taller – Mao&apos;s Palace (186 días)</option>
                <option value="synthetic">Ejemplo sintético ampliado (186 días)</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  exampleChoice === 'maos' ? onLoadMaosExample() : onLoadSyntheticExample()
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cargar caso ejemplo</span>
              </button>
            </div>

            {rows.length > 0 && (
              <button
                type="button"
                onClick={onClearDataset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar base actual</span>
              </button>
            )}

            {totalMissingCells > 0 && (
              <button
                type="button"
                onClick={onDropMissingRows}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar filas con NA</span>
              </button>
            )}
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
          <h4 className="text-sm font-semibold text-slate-900">
            No hay ninguna base de datos cargada
          </h4>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            Sube tu propio archivo <strong>CSV</strong> o <strong>Excel (.xlsx)</strong> con el botón &ldquo;Subir CSV o XLSX&rdquo;, o carga el caso <strong>&ldquo;Taller – Mao&apos;s Palace (186 días)&rdquo;</strong> desde &ldquo;Cargar caso ejemplo&rdquo;.
          </p>
        </div>
      ) : (
        <>
          {/* Estructura y datos faltantes (str) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Estructura de variables (str) y datos faltantes (NA)
              </h4>
              <span className="text-xs text-slate-500">
                {activeCaseId === 'maos'
                  ? "Base: Mao's Palace"
                  : activeCaseId === 'synthetic'
                  ? 'Base: Ejemplo sintético'
                  : 'Base personalizada'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-medium">Columna</th>
                    <th className="py-2.5 px-4 text-left font-medium">Tipo detectado</th>
                    <th className="py-2.5 px-4 text-right font-medium">Valores únicos</th>
                    <th className="py-2.5 px-4 text-right font-medium">Faltantes (NA)</th>
                    <th className="py-2.5 px-4 text-left font-medium">Primeros valores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((p) => (
                    <tr key={p.name} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        {KIND_LABELS[p.kind]}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {formatIntCO(p.uniqueCount)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums ${
                          p.missingCount > 0 ? 'text-amber-700 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {formatIntCO(p.missingCount)} ({formatPercentCO((p.missingCount / Math.max(1, p.totalCount)) * 100, 1)})
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 truncate max-w-[260px]">
                        {p.sampleValues
                          .map((v) => (v === null ? 'NA' : typeof v === 'number' ? formatCompactCO(v, 2) : String(v)))
                          .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista previa primeras 10 filas */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Vista previa de los datos (primeras 10 filas)
              </h4>
              <span className="text-xs text-slate-500 tabular-nums">
                Mostrando {Math.min(10, rows.length)} de {formatIntCO(rows.length)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-right font-medium w-10">#</th>
                    {columns.map((c) => (
                      <th key={c} className="py-2.5 px-4 text-left font-medium whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      {columns.map((c) => {
                        const val = row[c];
                        const isNum = typeof val === 'number';
                        return (
                          <td
                            key={c}
                            className={`py-2 px-4 whitespace-nowrap ${
                              isNum ? 'font-mono tabular-nums text-slate-800' : 'text-slate-700'
                            }`}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-amber-700 font-mono">NA</span>
                            ) : isNum ? (
                              formatCompactCO(val, 2)
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 3: ELEGIR VARIABLE DEPENDIENTE (Y)                                    */
/* -------------------------------------------------------------------------- */
interface Step3Props {
  profiles: ColumnProfile[];
  rows: DataRow[];
  yCol: string;
  onSelectY: (col: string) => void;
}

export const Step3SelectTarget: React.FC<Step3Props> = ({
  profiles,
  rows,
  yCol,
  onSelectY,
}) => {
  const selectedProfile = profiles.find((p) => p.name === yCol);

  const histogramData = useMemo(() => {
    if (!selectedProfile || selectedProfile.kind === 'text') return [];
    const vals = rows
      .map((r) => toNumericValue(r[yCol]))
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return [];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max - min < 1e-9) {
      return [{ rango: formatCompactCO(min, 2), frecuencia: vals.length }];
    }
    const bins = Math.min(12, Math.max(5, Math.round(Math.sqrt(vals.length))));
    const step = (max - min) / bins;
    const counts = new Array(bins).fill(0);
    for (const v of vals) {
      const idx = Math.min(bins - 1, Math.floor((v - min) / step));
      counts[idx]++;
    }
    return counts.map((count, i) => {
      const lo = min + i * step;
      const hi = lo + step;
      return {
        rango: `${formatCompactCO(lo, 1)}–${formatCompactCO(hi, 1)}`,
        frecuencia: count,
      };
    });
  }, [rows, yCol, selectedProfile]);

  if (rows.length === 0 || profiles.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs text-amber-950 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span>
          No hay datos cargados actualmente. Regresa al Paso 2 para subir tu archivo CSV/XLSX o cargar el caso <strong>Taller – Mao&apos;s Palace (186 días)</strong>.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Selecciona la variable objetivo (Y)
        </h3>
        <p className="text-xs text-slate-600 mb-4">
          Debe ser una variable numérica continua (ventas, ingresos, unidades). Haz clic en una columna para evaluarla.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map((p) => {
            const isSelected = p.name === yCol;
            const isValidContinuous = p.kind === 'numeric_continuous';
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelectY(p.name)}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? isValidContinuous
                      ? 'border-sky-600 bg-sky-50/60'
                      : 'border-red-400 bg-red-50/50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-900 truncate">
                    {p.name}
                  </span>
                  {isSelected && (
                    <span className="text-[11px] font-medium text-sky-800 shrink-0">
                      Seleccionada
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600">
                  {KIND_LABELS[p.kind]}
                </div>
                {p.kind !== 'text' && p.min !== undefined && p.max !== undefined && (
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1.5">
                    Rango: {formatCompactCO(p.min, 2)} a {formatCompactCO(p.max, 2)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Validation Feedback */}
        {selectedProfile && selectedProfile.kind === 'text' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Variable no válida para regresión lineal (Texto / Categórica)</span>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                La columna <strong>{selectedProfile.name}</strong> contiene texto o categorías. Si intentas predecir categorías con regresión lineal no existe una escala numérica válida; para clasificar categorías o eventos binarios debes usar <strong>regresión logística</strong> o modelos de clasificación. Elige una columna numérica continua para continuar.
              </p>
            </div>
          </div>
        )}

        {selectedProfile && selectedProfile.kind === 'numeric_binary' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Advertencia: variable binaria (0/1) requiere regresión logística</span>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                La variable <strong>{selectedProfile.name}</strong> solo toma valores 0 y 1. Si aplicas regresión lineal (<code className="font-mono">lm()</code>), obtendrás predicciones absurdas (menores a 0 o mayores a 1) y un <strong>R² sin sentido</strong>. Para variables 0/1 se debe usar <strong>regresión logística</strong> (<code className="font-mono">glm(..., family = binomial)</code>). Selecciona una variable numérica continua (como <code className="font-mono">Bowls Vendidos</code>) para continuar.
              </p>
            </div>
          </div>
        )}

        {selectedProfile && selectedProfile.kind === 'numeric_discrete' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-sm text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Precaución: pocos valores distintos</span>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                Esta variable tiene {selectedProfile.uniqueCount} valores únicos. Asegúrate de que represente una cantidad continua real y no una categoría codificada como número.
              </p>
            </div>
          </div>
        )}

        {selectedProfile && selectedProfile.kind === 'numeric_continuous' && (
          <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3 text-sm text-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Variable válida: numérica continua</span>
              <p className="text-xs text-emerald-900 mt-1">
                <strong>{selectedProfile.name}</strong> tiene {formatIntCO(selectedProfile.uniqueCount)} valores distintos entre {formatCompactCO(selectedProfile.min, 2)} y {formatCompactCO(selectedProfile.max, 2)}. Es apta para regresión lineal.
              </p>
            </div>
          </div>
        )}
      </div>

      {histogramData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">
            Distribución de {yCol}
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 10, right: 20, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="rango" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(value) => [formatIntCO(Number(value)), 'Días / Registros']}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', borderColor: '#C7D2FE' }}
                />
                <Bar dataKey="frecuencia" fill="#4F46E5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 4: DESCRIPTIVO Y REGLAS DE NEGOCIO                                    */
/* -------------------------------------------------------------------------- */
interface Step4Props {
  profiles: ColumnProfile[];
  yCol: string;
}

export const Step4Descriptive: React.FC<Step4Props> = ({ profiles, yCol }) => {
  const numericProfiles = profiles.filter((p) => p.kind !== 'text');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Estadísticos descriptivos (summary y describe)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">Variable</th>
                <th className="py-2.5 px-3 text-right font-medium">n</th>
                <th className="py-2.5 px-3 text-right font-medium">Mínimo</th>
                <th className="py-2.5 px-3 text-right font-medium">Q1 (25%)</th>
                <th className="py-2.5 px-3 text-right font-medium">Mediana</th>
                <th className="py-2.5 px-3 text-right font-medium">Media</th>
                <th className="py-2.5 px-3 text-right font-medium">Q3 (75%)</th>
                <th className="py-2.5 px-3 text-right font-medium">Máximo</th>
                <th className="py-2.5 px-4 text-right font-medium">Desv. Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {numericProfiles.map((p) => (
                <tr
                  key={p.name}
                  className={p.name === yCol ? 'bg-sky-50/40 font-medium' : 'hover:bg-slate-50/70'}
                >
                  <td className="py-2.5 px-4 text-slate-900 whitespace-nowrap">
                    {p.name}{' '}
                    {p.name === yCol && (
                      <span className="text-[11px] text-sky-700 font-semibold">(Y)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatIntCO(p.totalCount - p.missingCount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatNumberCO(p.min, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {formatNumberCO(p.q1, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                    {formatNumberCO(p.median, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 font-semibold">
                    {formatNumberCO(p.mean, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {formatNumberCO(p.q3, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatNumberCO(p.max, 2)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatNumberCO(p.sd, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">
          Reglas de negocio observadas (límites seguros para simular)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {numericProfiles
            .filter((p) => p.name !== yCol)
            .map((p) => (
              <div
                key={p.name}
                className="p-3.5 bg-gradient-to-r from-teal-50/60 to-white border border-teal-200/80 rounded-lg text-xs flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-semibold text-slate-900 block">{p.name}</span>
                  <span className="text-slate-600">
                    Rango histórico observado en la operación
                  </span>
                </div>
                <div className="text-right font-mono tabular-nums text-teal-950 shrink-0">
                  <span className="font-semibold">
                    {formatNumberCO(p.min, 2)} a {formatNumberCO(p.max, 2)}
                  </span>
                  <span className="block text-[11px] text-teal-700">
                    Promedio: {formatNumberCO(p.mean, 2)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 5: CORRELACIONES Y DISPERSIONES                                       */
/* -------------------------------------------------------------------------- */
interface Step5Props {
  rows: DataRow[];
  profiles: ColumnProfile[];
  yCol: string;
}

export const Step5Correlations: React.FC<Step5Props> = ({ rows, profiles, yCol }) => {
  const numericCols = useMemo(
    () => [yCol, ...profiles.filter((p) => p.kind !== 'text' && p.name !== yCol).map((p) => p.name)],
    [profiles, yCol]
  );

  const corr = useMemo(() => computeCorrelationMatrix(rows, numericCols), [rows, numericCols]);
  const xCols = numericCols.slice(1);
  const [selectedScatterX, setSelectedScatterX] = useState<string>(xCols[0] ?? '');

  const activeX = xCols.includes(selectedScatterX) ? selectedScatterX : xCols[0] ?? '';

  // Detect multicollinearity pairs among X's
  const collinearPairs = useMemo(() => {
    const pairs: { a: string; b: string; r: number }[] = [];
    for (let i = 1; i < corr.variables.length; i++) {
      for (let j = i + 1; j < corr.variables.length; j++) {
        const r = corr.matrix[i][j];
        if (Math.abs(r) >= 0.4) {
          pairs.push({ a: corr.variables[i], b: corr.variables[j], r });
        }
      }
    }
    return pairs.sort((p1, p2) => Math.abs(p2.r) - Math.abs(p1.r));
  }, [corr]);

  const scatterPayload = useMemo(() => {
    if (!activeX) return { points: [], line: [] as { x: number; trend: number }[], r: 0 };
    const pts: { x: number; y: number }[] = [];
    for (const row of rows) {
      const xv = toNumericValue(row[activeX]);
      const yv = toNumericValue(row[yCol]);
      if (xv !== null && yv !== null) {
        pts.push({ x: xv, y: yv });
      }
    }
    const rel = computeLinearRelationship(rows, activeX, yCol);
    const xs = pts.map((p) => p.x);
    const minX = xs.length ? Math.min(...xs) : 0;
    const maxX = xs.length ? Math.max(...xs) : 1;
    const line = [
      { x: minX, trend: rel.intercept + rel.slope * minX },
      { x: maxX, trend: rel.intercept + rel.slope * maxX },
    ];
    return { points: pts, line, r: rel.r };
  }, [rows, activeX, yCol]);

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Recordatorio clave:</strong> Correlación no implica causalidad. Que dos variables se muevan juntas (como gaseosas y bowls, o precio y bebidas) no significa automáticamente que una cause directamente a la otra; puede haber un factor común detrás (ej. tráfico de clientes).
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Matriz de correlación (cor y corrplot)
        </h3>
        <CorrplotMatrix variables={corr.variables} matrix={corr.matrix} yCol={yCol} />
      </div>

      {/* Multicollinearity warning / co-movement */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">
          Relación entre variables explicativas (multicolinealidad)
        </h4>
        {collinearPairs.length === 0 ? (
          <p className="text-xs text-slate-600">
            No se detectaron pares de variables explicativas con correlación moderada o alta (|r| ≥ 0,40). Cada palanca aporta información relativamente independiente.
          </p>
        ) : (
          <div className="space-y-2.5">
            {collinearPairs.map((pair) => {
              const high = Math.abs(pair.r) >= 0.7;
              return (
                <div
                  key={`${pair.a}-${pair.b}`}
                  className={`p-3 rounded-lg border text-xs ${
                    high
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-semibold mb-1">
                    <span>
                      {pair.a} ↔ {pair.b}
                    </span>
                    <span className="font-mono tabular-nums">
                      r = {formatNumberCO(pair.r, 2)} ({high ? 'Multicolinealidad alta' : 'Co-movimiento moderado'})
                    </span>
                  </div>
                  <p className="text-slate-700">
                    {pair.r < 0
                      ? `Se mueven en sentido opuesto: cuando baja ${pair.a}, tiende a subir ${pair.b} (y viceversa). Ten esto presente al simular escenarios para no mover una variable asumiendo que la otra queda totalmente inmóvil si en la práctica cambian juntas.`
                      : `Se mueven en el mismo sentido: cuando sube ${pair.a}, también tiende a subir ${pair.b}. En regresión múltiple el modelo separa el aporte neto de cada una, aunque los errores estándar pueden ampliarse si la correlación es muy alta.`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scatter plots of Y vs each X */}
      {xCols.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Dispersión de {yCol} contra cada variable X
              </h4>
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                Correlación r({yCol}, {activeX}) = {formatNumberCO(scatterPayload.r, 3)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {xCols.map((xc) => (
                <button
                  key={xc}
                  type="button"
                  onClick={() => setSelectedScatterX(xc)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    xc === activeX
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                  }`}
                >
                  {xc}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={activeX}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 1)}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  label={{ value: activeX, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#475569' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={yCol}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 0)}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatNumberCO(Number(value), 2),
                    name === 'trend' ? 'Línea de tendencia' : String(name),
                  ]}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', borderColor: '#CBD5E1' }}
                />
                <Scatter
                  name={yCol}
                  data={scatterPayload.points}
                  fill="#4F46E5"
                  fillOpacity={0.68}
                />
                <Line
                  name="trend"
                  data={scatterPayload.line}
                  dataKey="trend"
                  stroke="#E11D48"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
