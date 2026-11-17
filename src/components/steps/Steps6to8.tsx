import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { DataRow, RegressionModel } from '../../types/analytics';
import { toNumericValue } from '../../stats/regression';
import {
  formatCompactCO,
  formatIntCO,
  formatNumberCO,
  formatPValueCO,
  formatPercentCO,
} from '../../stats/format';

/* -------------------------------------------------------------------------- */
/* PASO 6: REGRESIÓN SIMPLE (MODELO 0)                                        */
/* -------------------------------------------------------------------------- */
interface Step6Props {
  rows: DataRow[];
  yCol: string;
  candidateXCols: string[];
  simpleXCol: string;
  onChangeSimpleX: (col: string) => void;
  model0: RegressionModel | null;
}

export const Step6SimpleRegression: React.FC<Step6Props> = ({
  rows,
  yCol,
  candidateXCols,
  simpleXCol,
  onChangeSimpleX,
  model0,
}) => {
  const scatterData = useMemo(() => {
    if (!model0 || !simpleXCol) return { points: [], line: [] as { x: number; fit: number }[] };
    const pts: { x: number; y: number }[] = [];
    for (const r of rows) {
      const x = toNumericValue(r[simpleXCol]);
      const y = toNumericValue(r[yCol]);
      if (x !== null && y !== null) {
        pts.push({ x, y });
      }
    }
    const xs = pts.map((p) => p.x);
    const minX = xs.length ? Math.min(...xs) : 0;
    const maxX = xs.length ? Math.max(...xs) : 1;
    const b0 = model0.coefficients[0]?.estimate ?? 0;
    const b1 = model0.coefficients[1]?.estimate ?? 0;
    return {
      points: pts,
      line: [
        { x: minX, fit: b0 + b1 * minX },
        { x: maxX, fit: b0 + b1 * maxX },
      ],
    };
  }, [rows, yCol, simpleXCol, model0]);

  const b0 = model0?.coefficients[0];
  const b1 = model0?.coefficients[1];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Elige la variable explicativa (X) para el Modelo 0
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Este modelo simple sirve como línea base antes de incorporar múltiples variables.
            </p>
          </div>
          <select
            value={simpleXCol}
            onChange={(e) => onChangeSimpleX(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600 min-w-[220px]"
          >
            {candidateXCols.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {model0 && b0 && b1 ? (
        <>
          {/* Ecuación e interpretación */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 text-white">
              <div className="text-[11px] font-medium text-indigo-200 mb-1">
                Ecuación estimada (Modelo 0)
              </div>
              <div className="text-lg sm:text-xl font-mono font-semibold text-white tabular-nums break-words">
                {yCol} = {formatNumberCO(b0.estimate, 2)}{' '}
                {b1.estimate >= 0 ? '+' : '−'} {formatNumberCO(Math.abs(b1.estimate), 2)} · ({simpleXCol})
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Interpretación de la pendiente:</strong> Por cada unidad adicional en{' '}
                <strong>{simpleXCol}</strong>, el valor esperado de <strong>{yCol}</strong>{' '}
                {b1.estimate >= 0 ? 'aumenta' : 'disminuye'} en{' '}
                <span className="font-mono font-semibold tabular-nums text-indigo-800">
                  {formatNumberCO(Math.abs(b1.estimate), 2)}
                </span>{' '}
                unidades (p-value ={' '}
                <span className="font-mono tabular-nums">{formatPValueCO(b1.pValue)}</span>).
              </p>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-100">
                <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
                  <div className="text-[11px] text-indigo-800">R²</div>
                  <div className="text-base font-mono font-semibold tabular-nums text-indigo-950">
                    {formatPercentCO(model0.rSquared * 100, 1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100">
                  <div className="text-[11px] text-sky-800">R² ajustado</div>
                  <div className="text-base font-mono font-semibold tabular-nums text-sky-950">
                    {formatPercentCO(model0.adjRSquared * 100, 1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-600">Error est. residual</div>
                  <div className="text-base font-mono font-semibold tabular-nums text-slate-900">
                    {formatNumberCO(model0.residualStdError, 2)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <div className="text-[11px] text-emerald-800">p-value (pendiente)</div>
                  <div
                    className={`text-base font-mono font-semibold tabular-nums ${
                      b1.significant ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {formatPValueCO(b1.pValue)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-violet-50/60 border border-violet-100">
                  <div className="text-[11px] text-violet-800">AIC</div>
                  <div className="text-base font-mono font-semibold tabular-nums text-violet-950">
                    {formatNumberCO(model0.aic, 1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-violet-50/60 border border-violet-100">
                  <div className="text-[11px] text-violet-800">BIC</div>
                  <div className="text-base font-mono font-semibold tabular-nums text-violet-950">
                    {formatNumberCO(model0.bic, 1)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Recta de regresión simple: {yCol} vs. {simpleXCol}
            </h4>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={simpleXCol}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => formatCompactCO(Number(v), 1)}
                    tick={{ fontSize: 11, fill: '#475569' }}
                    label={{ value: simpleXCol, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#475569' }}
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
                      name === 'fit' ? 'Recta ajustada' : String(name),
                    ]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', borderColor: '#CBD5E1' }}
                  />
                  <Scatter
                    name={yCol}
                    data={scatterData.points}
                    fill="#4F46E5"
                    fillOpacity={0.68}
                  />
                  <Line
                    name="fit"
                    data={scatterData.line}
                    dataKey="fit"
                    stroke="#E11D48"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
          No se pudo ajustar el modelo simple. Verifica que la variable elegida tenga suficientes datos válidos y variabilidad.
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 7: REGRESIÓN MÚLTIPLE (MODELO 1)                                      */
/* -------------------------------------------------------------------------- */
interface Step7Props {
  yCol: string;
  candidateXCols: string[];
  selectedXCols: string[];
  onToggleXCol: (col: string) => void;
  onSelectAllX: () => void;
  model1: RegressionModel | null;
  onSaveCustomModel: (name: string, xCols: string[]) => void;
}

export const Step7MultipleRegression: React.FC<Step7Props> = ({
  yCol,
  candidateXCols,
  selectedXCols,
  onToggleXCol,
  onSelectAllX,
  model1,
  onSaveCustomModel,
}) => {
  const [customName, setCustomName] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSaveVariant = () => {
    if (selectedXCols.length === 0) return;
    const label =
      customName.trim() || `Modelo personalizado (${selectedXCols.length} vars)`;
    onSaveCustomModel(label, selectedXCols);
    setCustomName('');
    setSavedNotice(`Guardado "${label}" para comparar en el Paso 12.`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Variables independientes incluidas en el Modelo 1
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Activa o desactiva variables X para medir el efecto neto de cada una manteniendo constantes las demás.
            </p>
          </div>
          <button
            type="button"
            onClick={onSelectAllX}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap self-start"
          >
            Incluir todas ({candidateXCols.length})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {candidateXCols.map((col) => {
            const checked = selectedXCols.includes(col);
            return (
              <label
                key={col}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                  checked
                    ? 'bg-sky-50 border-sky-300 text-sky-950 font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleXCol(col)}
                  className="accent-sky-700 rounded"
                />
                <span>{col}</span>
              </label>
            );
          })}
        </div>

        {selectedXCols.length === 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            Selecciona al menos una variable independiente (X) para estimar el modelo múltiple.
          </div>
        )}
      </div>

      {model1 && (
        <>
          {/* Métricas globales */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
                <div className="text-[11px] text-indigo-800">R²</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-indigo-950">
                  {formatPercentCO(model1.rSquared * 100, 1)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-100">
                <div className="text-[11px] text-sky-800">R² ajustado</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-sky-950">
                  {formatPercentCO(model1.adjRSquared * 100, 1)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-100">
                <div className="text-[11px] text-teal-800">Estadístico F (p-value)</div>
                <div className="text-base font-mono font-semibold tabular-nums text-teal-950">
                  {formatNumberCO(model1.fStatistic, 2)}
                </div>
                <div
                  className={`text-[11px] font-mono tabular-nums ${
                    model1.fPValue < 0.05 ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                  }`}
                >
                  p {formatPValueCO(model1.fPValue)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-600">Error est. residual</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-slate-900">
                  {formatNumberCO(model1.residualStdError, 2)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-violet-50/60 border border-violet-100">
                <div className="text-[11px] text-violet-800">AIC</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-violet-950">
                  {formatNumberCO(model1.aic, 1)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-violet-50/60 border border-violet-100">
                <div className="text-[11px] text-violet-800">BIC</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-violet-950">
                  {formatNumberCO(model1.bic, 1)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de coeficientes estilo summary(modelo) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Tabla de coeficientes — summary(modelo_1)
              </h4>
              <span className="text-xs text-slate-500 tabular-nums">
                n = {formatIntCO(model1.n)} · gl residuales = {formatIntCO(model1.dfResidual)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-medium">Variable / Término</th>
                    <th className="py-2.5 px-3 text-right font-medium">Estimado (β)</th>
                    <th className="py-2.5 px-3 text-right font-medium">Error Estándar</th>
                    <th className="py-2.5 px-3 text-right font-medium">Estadístico t</th>
                    <th className="py-2.5 px-3 text-right font-medium">p-value</th>
                    <th className="py-2.5 px-4 text-left font-medium">Significancia (α = 0,05)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {model1.coefficients.map((c) => (
                    <tr key={c.term} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {c.term === '(Intercept)' ? 'Intercepto (b₀)' : c.term}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatNumberCO(c.estimate, 3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatNumberCO(c.stdError, 3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatNumberCO(c.tValue, 2)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                          c.significant ? 'text-emerald-700 bg-emerald-50/60' : 'text-slate-600'
                        }`}
                      >
                        {formatPValueCO(c.pValue)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {c.significant ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Significativa (p &lt; 0,05)</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">No significativa</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Traducción a frases de negocio */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              ¿Qué dice cada coeficiente en lenguaje de negocio?
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-700">
              {model1.coefficients
                .filter((c) => c.term !== '(Intercept)')
                .map((c) => (
                  <li
                    key={c.term}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
                  >
                    <strong className="text-slate-900">{c.term}:</strong> Manteniendo constantes las demás variables, cada unidad adicional en{' '}
                    <strong>{c.term}</strong>{' '}
                    {c.estimate >= 0 ? 'aumenta' : 'reduce'}{' '}
                    <strong>{yCol}</strong> en{' '}
                    <span className="font-mono font-semibold tabular-nums text-slate-900">
                      {formatNumberCO(Math.abs(c.estimate), 2)}
                    </span>{' '}
                    unidades en promedio
                    {!c.significant &&
                      ' (efecto estadísticamente débil con p ≥ 0,05; podría descartarse al simplificar el modelo)'}
                    .
                  </li>
                ))}
            </ul>
          </div>

          {/* Guardar variante personalizada */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ¿Quieres guardar esta combinación de variables como un modelo extra para el Paso 12?
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej. Modelo sin cervezas"
                className="w-full sm:max-w-sm px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600"
              />
              {savedNotice && (
                <p className="text-xs text-emerald-700 mt-1.5 font-medium">{savedNotice}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSaveVariant}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar en comparador</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 8: SUPUESTOS Y DIAGNÓSTICO (4 GRÁFICOS R + DURBIN-WATSON)             */
/* -------------------------------------------------------------------------- */
interface Step8Props {
  models: RegressionModel[];
}

export const Step8Diagnostics: React.FC<Step8Props> = ({ models }) => {
  const [selectedId, setSelectedId] = useState<string>(
    models.find((m) => m.source === 'multiple')?.id ?? models[0]?.id ?? ''
  );

  const model = models.find((m) => m.id === selectedId) ?? models[0] ?? null;

  const qqReferenceLine = useMemo(() => {
    if (!model || model.diagnostics.length === 0) return [];
    const qs = model.diagnostics.map((d) => d.theoreticalQuantile);
    const minQ = Math.min(...qs);
    const maxQ = Math.max(...qs);
    return [
      { theoreticalQuantile: minQ, ref: minQ },
      { theoreticalQuantile: maxQ, ref: maxQ },
    ];
  }, [model]);

  if (!model) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
        Construye primero el Modelo 0 o Modelo 1 para inspeccionar sus supuestos.
      </div>
    );
  }

  const ratioNPerP = model.p > 0 ? model.n / model.p : model.n;
  const sampleOk = ratioNPerP >= 10;
  const dwOk = model.durbinWatson > 1.8;

  const flaggedPoints = model.diagnostics.filter(
    (d) => d.isOutlier || d.isInfluential || d.isHighLeverage
  );

  return (
    <div className="space-y-6">
      {/* Selector de modelo + resumen DW & n/p */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            Diagnóstico del modelo
          </h3>
          <select
            value={model.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.p} X)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-xl border ${
              dwOk ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-900">
                Prueba de Durbin-Watson (autocorrelación)
              </span>
              <span
                className={`text-xs font-medium inline-flex items-center gap-1 ${
                  dwOk ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {dwOk ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>DW &gt; 1,8 (Sin autocorrelación)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>DW ≤ 1,8 (Revisar autocorrelación)</span>
                  </>
                )}
              </span>
            </div>
            <div className="text-sm font-mono tabular-nums text-slate-900">
              DW = {formatNumberCO(model.durbinWatson, 3)} · p-value ={' '}
              {formatPValueCO(model.durbinWatsonPValue)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Regla práctica: un valor mayor a 1,8 (ideal cerca de 2,0) indica que los errores de un día no arrastran el error del día siguiente.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              sampleOk ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-900">
                Tamaño de muestra (10 a 15 datos por variable X)
              </span>
              <span
                className={`text-xs font-medium inline-flex items-center gap-1 ${
                  sampleOk ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {sampleOk ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Suficiente</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Muestra ajustada</span>
                  </>
                )}
              </span>
            </div>
            <div className="text-sm font-mono tabular-nums text-slate-900">
              {formatIntCO(model.n)} datos / {formatIntCO(model.p)} variables ={' '}
              {formatNumberCO(ratioNPerP, 1)} datos por X
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Con {formatIntCO(model.p)} variables independientes se recomiendan al menos{' '}
              {formatIntCO(model.p * 10)} a {formatIntCO(model.p * 15)} observaciones.
            </p>
          </div>
        </div>
      </div>

      {/* Los 4 gráficos clásicos de diagnóstico de R */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Residuals vs Fitted */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-900 mb-0.5">
            1. Residuos contra Ajustados (Linealidad)
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Busca una nube aleatoria alrededor de 0, sin forma de U ni abanico.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="fitted"
                  name="Ajustado"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 0)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <YAxis
                  type="number"
                  dataKey="residual"
                  name="Residuo"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 1)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <ReferenceLine y={0} stroke="#E11D48" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(v, name) => [formatNumberCO(Number(v), 2), String(name)]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Scatter
                  name="Residuo"
                  data={model.diagnostics}
                  fill="#4F46E5"
                  fillOpacity={0.68}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Normal Q-Q */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-900 mb-0.5">
            2. Q-Q Normal de Residuos (Normalidad)
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Los puntos deben alinearse cerca de la diagonal punteada.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="theoreticalQuantile"
                  name="Cuantil teórico"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 1)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <YAxis
                  type="number"
                  dataKey="stdResidual"
                  name="Residuo estandarizado"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 1)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <Tooltip
                  formatter={(v, name) => [
                    formatNumberCO(Number(v), 2),
                    name === 'ref' ? 'Referencia normal' : String(name),
                  ]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Scatter
                  name="Residuo estandarizado"
                  data={model.diagnostics}
                  fill="#0D9488"
                  fillOpacity={0.7}
                />
                <Line
                  name="ref"
                  data={qqReferenceLine}
                  dataKey="ref"
                  stroke="#E11D48"
                  strokeDasharray="4 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Scale-Location */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-900 mb-0.5">
            3. Escala-Localización (Homocedasticidad)
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            La dispersión vertical de √|Residuo est.| debe mantenerse uniforme.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="fitted"
                  name="Ajustado"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 0)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <YAxis
                  type="number"
                  dataKey="sqrtAbsStdResidual"
                  name="√|Residuo est.|"
                  domain={[0, 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 1)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <Tooltip
                  formatter={(v, name) => [formatNumberCO(Number(v), 2), String(name)]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Scatter
                  name="√|Residuo est.|"
                  data={model.diagnostics}
                  fill="#7C3AED"
                  fillOpacity={0.68}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Residuals vs Leverage */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-900 mb-0.5">
            4. Residuos vs. Apalancamiento (Distancia de Cook)
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Puntos muy a la derecha y lejos de 0 tienen alta influencia (Cook &gt; 4/n).
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="leverage"
                  name="Apalancamiento (h)"
                  domain={[0, 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 3)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <YAxis
                  type="number"
                  dataKey="stdResidual"
                  name="Residuo estandarizado"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 1)}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <ReferenceLine y={0} stroke="#0F172A" strokeDasharray="4 4" />
                <ReferenceLine
                  x={(2 * (model.p + 1)) / model.n}
                  stroke="#D97706"
                  strokeDasharray="3 3"
                />
                <Tooltip
                  formatter={(v, name) => [formatNumberCO(Number(v), 3), String(name)]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Scatter
                  name="Observación"
                  data={model.diagnostics}
                  fill="#D97706"
                  fillOpacity={0.72}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lista de puntos atípicos o influyentes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">
            Puntos atípicos (|r| &gt; 2,5) o influyentes (Distancia de Cook &gt; {formatNumberCO(4 / model.n, 3)})
          </h4>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {formatIntCO(flaggedPoints.length)} observaciones marcadas
          </span>
        </div>
        {flaggedPoints.length === 0 ? (
          <div className="p-4 text-xs text-slate-600">
            No se encontraron observaciones con distancia de Cook elevada ni residuos extremos. La recta no está siendo distorsionada por un único día atípico.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-4 text-right font-medium">Fila</th>
                  <th className="py-2 px-3 text-right font-medium">Real (Y)</th>
                  <th className="py-2 px-3 text-right font-medium">Ajustado</th>
                  <th className="py-2 px-3 text-right font-medium">Residuo est.</th>
                  <th className="py-2 px-3 text-right font-medium">Apalancamiento</th>
                  <th className="py-2 px-3 text-right font-medium">Dist. Cook</th>
                  <th className="py-2 px-4 text-left font-medium">Clasificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flaggedPoints.slice(0, 12).map((d) => {
                  const tags: string[] = [];
                  if (d.isOutlier) tags.push('Atípico');
                  if (d.isInfluential) tags.push('Influyente (Cook)');
                  if (d.isHighLeverage) tags.push('Alto apalancamiento');
                  return (
                    <tr key={d.rowIndex} className="hover:bg-slate-50/70">
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700">
                        #{d.rowIndex}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">
                        {formatNumberCO(d.actual, 2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatNumberCO(d.fitted, 2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-800 font-medium">
                        {formatNumberCO(d.stdResidual, 2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatNumberCO(d.leverage, 4)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatNumberCO(d.cooksDistance, 4)}
                      </td>
                      <td className="py-2 px-4 text-slate-700">{tags.join(' · ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
