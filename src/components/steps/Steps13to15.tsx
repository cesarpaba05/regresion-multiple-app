import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  RotateCcw,
  Download,
  FileText,
  FileCode,
  Table as TableIcon,
  Trophy,
} from 'lucide-react';
import {
  BusinessContext,
  ColumnProfile,
  DataRow,
  RegressionModel,
} from '../../types/analytics';
import {
  computeLinearRelationship,
  predictFromValues,
  predictRow,
} from '../../stats/regression';
import {
  formatCompactCO,
  formatCurrencyCO,
  formatIntCO,
  formatNumberCO,
  formatPercentCO,
  formatPValueCO,
} from '../../stats/format';
import { buildFullRScript, RScriptContext } from '../../stats/rCodeGenerator';

/* -------------------------------------------------------------------------- */
/* PASO 13: SIMULADOR DE ESCENARIOS ("MOVER LAS PALANCAS")                    */
/* -------------------------------------------------------------------------- */
interface Step13Props {
  rows: DataRow[];
  profiles: ColumnProfile[];
  models: RegressionModel[];
  activeModelId: string;
  onSelectActiveModel: (id: string) => void;
  simValues: Record<string, number>;
  onChangeSimValues: (next: Record<string, number>) => void;
  priceCol: string;
  onChangePriceCol: (col: string) => void;
  context: BusinessContext;
}

export const Step13Simulator: React.FC<Step13Props> = ({
  rows,
  profiles,
  models,
  activeModelId,
  onSelectActiveModel,
  simValues,
  onChangeSimValues,
  priceCol,
  onChangePriceCol,
  context,
}) => {
  const [allowExtrapolation, setAllowExtrapolation] = useState(false);
  const [autoAdjustOthers, setAutoAdjustOthers] = useState(false);
  const [priceMin, setPriceMin] = useState(6);
  const [priceMax, setPriceMax] = useState(15);
  const [priceStep, setPriceStep] = useState(0.5);

  const model = models.find((m) => m.id === activeModelId) ?? models[0] ?? null;

  const profileMap = useMemo(() => {
    const map = new Map<string, ColumnProfile>();
    profiles.forEach((p) => map.set(p.name, p));
    return map;
  }, [profiles]);

  // Compute pairwise linear relationships among X's for optional co-movement adjustment
  const pairwiseRelations = useMemo(() => {
    const rels = new Map<string, { slope: number; intercept: number; r: number }>();
    if (!model) return rels;
    for (const fromCol of model.xCols) {
      for (const toCol of model.xCols) {
        if (fromCol === toCol) continue;
        rels.set(
          `${fromCol}=>${toCol}`,
          computeLinearRelationship(rows, fromCol, toCol)
        );
      }
    }
    return rels;
  }, [rows, model]);

  const handleSliderChange = (changedCol: string, newVal: number) => {
    const next = { ...simValues, [changedCol]: newVal };
    if (autoAdjustOthers && model) {
      for (const otherCol of model.xCols) {
        if (otherCol === changedCol) continue;
        const prof = profileMap.get(otherCol);
        const rel = pairwiseRelations.get(`${changedCol}=>${otherCol}`);
        if (rel && Math.abs(rel.r) >= 0.15) {
          let adjusted = rel.intercept + rel.slope * newVal;
          if (!allowExtrapolation && prof?.min !== undefined && prof?.max !== undefined) {
            adjusted = Math.max(prof.min, Math.min(prof.max, adjusted));
          }
          next[otherCol] = Number(adjusted.toFixed(2));
        }
      }
    }
    onChangeSimValues(next);
  };

  const handleResetToMeans = () => {
    if (!model) return;
    const defaults: Record<string, number> = {};
    for (const xc of model.xCols) {
      const prof = profileMap.get(xc);
      defaults[xc] = Number((prof?.mean ?? 0).toFixed(2));
    }
    onChangeSimValues(defaults);
  };

  if (!model) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
        Necesitas un modelo entrenado para usar el simulador.
      </div>
    );
  }

  const predictedY = predictFromValues(model, simValues);
  const twoSE = 2 * model.residualStdError;
  const predLow = predictedY - twoSE;
  const predHigh = predictedY + twoSE;

  const extrapolatingVars = model.xCols.filter((xc) => {
    const prof = profileMap.get(xc);
    const val = simValues[xc] ?? prof?.mean ?? 0;
    if (prof?.min === undefined || prof?.max === undefined) return false;
    return val < prof.min - 1e-6 || val > prof.max + 1e-6;
  });

  const activePriceCol = model.xCols.includes(priceCol) ? priceCol : '';
  const currentPrice = activePriceCol ? simValues[activePriceCol] ?? 0 : 0;
  const estimatedRevenue = activePriceCol ? Math.max(0, predictedY) * currentPrice : null;

  // Price simulation table
  const priceSimulationRows = useMemo(() => {
    if (!activePriceCol || priceStep <= 0 || priceMax < priceMin) return [];
    const list: {
      price: number;
      units: number;
      unitsLow: number;
      unitsHigh: number;
      revenue: number;
      isExtrapolating: boolean;
      isOptimal: boolean;
    }[] = [];

    const priceProf = profileMap.get(activePriceCol);
    const stepsCount = Math.min(40, Math.floor((priceMax - priceMin) / priceStep + 0.0001) + 1);
    for (let i = 0; i < stepsCount; i++) {
      const pVal = Number((priceMin + i * priceStep).toFixed(2));
      const scenario: Record<string, number> = { ...simValues, [activePriceCol]: pVal };
      if (autoAdjustOthers) {
        for (const otherCol of model.xCols) {
          if (otherCol === activePriceCol) continue;
          const rel = pairwiseRelations.get(`${activePriceCol}=>${otherCol}`);
          if (rel && Math.abs(rel.r) >= 0.15) {
            scenario[otherCol] = rel.intercept + rel.slope * pVal;
          }
        }
      }
      const units = Math.max(0, predictFromValues(model, scenario));
      const rev = units * pVal;
      const isExt =
        priceProf?.min !== undefined &&
        priceProf?.max !== undefined &&
        (pVal < priceProf.min - 1e-6 || pVal > priceProf.max + 1e-6);
      list.push({
        price: pVal,
        units,
        unitsLow: Math.max(0, units - twoSE),
        unitsHigh: units + twoSE,
        revenue: rev,
        isExtrapolating: isExt,
        isOptimal: false,
      });
    }

    if (list.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < list.length; i++) {
        if (list[i].revenue > list[maxIdx].revenue) maxIdx = i;
      }
      list[maxIdx].isOptimal = true;
    }
    return list;
  }, [
    activePriceCol,
    priceMin,
    priceMax,
    priceStep,
    simValues,
    autoAdjustOthers,
    model,
    pairwiseRelations,
    profileMap,
    twoSE,
  ]);

  const optimalPriceRow = priceSimulationRows.find((r) => r.isOptimal);

  return (
    <div className="space-y-6">
      {/* Barra superior de configuración del simulador */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Modelo activo en el simulador
              </label>
              <select
                value={model.id}
                onChange={(e) => onSelectActiveModel(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Variable de Precio (para ingresos)
              </label>
              <select
                value={activePriceCol}
                onChange={(e) => onChangePriceCol(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                <option value="">Ninguna (solo unidades)</option>
                {model.xCols.map((xc) => (
                  <option key={xc} value={xc}>
                    {xc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdjustOthers}
                onChange={(e) => setAutoAdjustOthers(e.target.checked)}
                className="accent-sky-700 rounded"
              />
              <span>Ajustar variables relacionadas automáticamente</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowExtrapolation}
                onChange={(e) => {
                  const nextAllow = e.target.checked;
                  setAllowExtrapolation(nextAllow);
                  if (!nextAllow) {
                    const clamped = { ...simValues };
                    for (const xc of model.xCols) {
                      const prof = profileMap.get(xc);
                      if (prof?.min !== undefined && prof?.max !== undefined) {
                        const v = clamped[xc] ?? prof.mean ?? prof.min;
                        clamped[xc] = Number(
                          Math.max(prof.min, Math.min(prof.max, v)).toFixed(2)
                        );
                      }
                    }
                    onChangeSimValues(clamped);
                  }
                }}
                className="accent-amber-600 rounded"
              />
              <span>Ampliar rango (extrapolación)</span>
            </label>

            <button
              type="button"
              onClick={handleResetToMeans}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer promedios</span>
            </button>
          </div>
        </div>
      </div>

      {extrapolatingVars.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-950">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">
              Advertencia de extrapolación fuera de la regla de negocio
            </span>
            <p className="mt-1 leading-relaxed">
              Has movido <strong>{extrapolatingVars.join(', ')}</strong> fuera del rango histórico observado en los datos. La relación lineal podría no cumplirse en valores extremos; usa esta cifra solo como referencia exploratoria.
            </p>
          </div>
        </div>
      )}

      {/* Grid principal: Palancas a la izquierda + Resultado pronosticado a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Palancas del escenario
            </h3>
            <span className="text-[11px] text-slate-500">
              {autoAdjustOthers
                ? 'Modo: variables relacionadas se ajustan juntas'
                : 'Modo: demás variables fijas'}
            </span>
          </div>

          <div className="space-y-4">
            {model.xCols.map((xc) => {
              const prof = profileMap.get(xc);
              const obsMin = prof?.min ?? 0;
              const obsMax = prof?.max ?? 100;
              const span = Math.max(1, obsMax - obsMin);
              const sliderMin = allowExtrapolation
                ? Number(Math.max(0, obsMin - span * 0.6).toFixed(2))
                : obsMin;
              const sliderMax = allowExtrapolation
                ? Number((obsMax + span * 0.6).toFixed(2))
                : obsMax;
              const stepVal = prof?.kind === 'numeric_binary' ? 1 : span <= 5 ? 0.05 : span <= 30 ? 0.25 : 1;
              const val = simValues[xc] ?? prof?.mean ?? obsMin;
              const isOut = val < obsMin - 1e-6 || val > obsMax + 1e-6;

              return (
                <div
                  key={xc}
                  className={`p-3.5 rounded-lg border ${
                    isOut
                      ? 'bg-amber-50/50 border-amber-300'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-900">
                        {xc}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2 font-mono tabular-nums">
                        (Observado: {formatCompactCO(obsMin, 2)} a {formatCompactCO(obsMax, 2)})
                      </span>
                    </div>
                    <input
                      type="number"
                      step={stepVal}
                      min={sliderMin}
                      max={sliderMax}
                      value={val}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        if (!Number.isNaN(parsed)) {
                          const clamped = Math.max(sliderMin, Math.min(sliderMax, parsed));
                          handleSliderChange(xc, clamped);
                        }
                      }}
                      className="w-24 px-2 py-1 text-xs font-mono tabular-nums text-right border border-slate-300 rounded-md bg-white text-slate-900"
                    />
                  </div>
                  <input
                    type="range"
                    min={sliderMin}
                    max={sliderMax}
                    step={stepVal}
                    value={val}
                    onChange={(e) => handleSliderChange(xc, parseFloat(e.target.value))}
                    className="w-full sim-slider"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de predicción */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-sm">
            <div className="text-xs font-medium text-indigo-200">
              Pronóstico esperado ({model.yCol})
            </div>
            <div className="text-3xl sm:text-4xl font-display font-bold font-mono tabular-nums text-white mt-1.5">
              {formatNumberCO(predictedY, 1)}{' '}
              <span className="text-sm font-normal text-indigo-200">
                {context.unitLabel}
              </span>
            </div>

            <div className="mt-4 p-3.5 bg-white/10 border border-white/15 rounded-lg">
              <div className="text-[11px] font-medium text-indigo-100 mb-1">
                Intervalo aproximado (±2 errores estándar)
              </div>
              <div className="text-sm font-mono font-semibold tabular-nums text-white">
                {formatNumberCO(Math.max(0, predLow), 1)} a{' '}
                {formatNumberCO(predHigh, 1)} {context.unitLabel}
              </div>
              <div className="text-[11px] text-indigo-200 mt-1 tabular-nums">
                Margen ± {formatNumberCO(twoSE, 1)} (RSE = {formatNumberCO(model.residualStdError, 2)})
              </div>
            </div>

            {estimatedRevenue !== null && (
              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 rounded-lg">
                <div className="text-[11px] font-medium text-emerald-200 mb-1">
                  Ingreso diario estimado ({activePriceCol} × {model.yCol})
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold tabular-nums text-emerald-300">
                  {formatCurrencyCO(estimatedRevenue, context.currencySymbol, 2)}
                </div>
                <div className="text-[11px] text-emerald-100 mt-1 font-mono tabular-nums">
                  {formatNumberCO(Math.max(0, predictedY), 1)} ×{' '}
                  {formatCurrencyCO(currentPrice, context.currencySymbol, 2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla y gráfico de simulación de precios */}
      {activePriceCol && priceSimulationRows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Tabla de simulación de precios ({activePriceCol})
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Evalúa unidades e ingresos esperados en distintos precios. El precio con mayor ingreso estimado aparece resaltado.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5">
                <span className="text-slate-600">Desde</span>
                <input
                  type="number"
                  step="0.5"
                  value={priceMin}
                  onChange={(e) => setPriceMin(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 font-mono border border-slate-300 rounded-md"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-slate-600">Hasta</span>
                <input
                  type="number"
                  step="0.5"
                  value={priceMax}
                  onChange={(e) => setPriceMax(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 font-mono border border-slate-300 rounded-md"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-slate-600">Paso</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  value={priceStep}
                  onChange={(e) => setPriceStep(Math.max(0.1, parseFloat(e.target.value) || 0.5))}
                  className="w-16 px-2 py-1 font-mono border border-slate-300 rounded-md"
                />
              </label>
            </div>
          </div>

          <div className="p-5 border-b border-slate-200">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={priceSimulationRows}
                  margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="price"
                    tickFormatter={(v) => formatCurrencyCO(Number(v), context.currencySymbol, 1)}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => formatCompactCO(Number(v), 0)}
                    tick={{ fontSize: 11, fill: '#0284C7' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => formatCurrencyCO(Number(v), context.currencySymbol, 0)}
                    tick={{ fontSize: 11, fill: '#4F46E5' }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'revenue') {
                        return [
                          formatCurrencyCO(Number(value), context.currencySymbol, 2),
                          'Ingreso estimado',
                        ];
                      }
                      return [formatNumberCO(Number(value), 1), `Unidades (${model.yCol})`];
                    }}
                    labelFormatter={(lbl) =>
                      `${activePriceCol}: ${formatCurrencyCO(Number(lbl), context.currencySymbol, 2)}`
                    }
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  {optimalPriceRow && (
                    <ReferenceLine
                      yAxisId="right"
                      x={optimalPriceRow.price}
                      stroke="#059669"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  )}
                  <Bar
                    yAxisId="left"
                    dataKey="units"
                    fill="#7DD3FC"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    dot={{ r: 3.5, fill: '#4F46E5' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">{activePriceCol}</th>
                  <th className="py-2.5 px-3 text-right font-medium">Unidades estimadas</th>
                  <th className="py-2.5 px-3 text-right font-medium">Intervalo (±2 SE)</th>
                  <th className="py-2.5 px-3 text-right font-medium">Ingreso estimado</th>
                  <th className="py-2.5 px-4 text-left font-medium">Nota operativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceSimulationRows.map((row) => (
                  <tr
                    key={row.price}
                    className={
                      row.isOptimal
                        ? 'bg-emerald-50/70 font-semibold'
                        : row.isExtrapolating
                        ? 'bg-amber-50/30'
                        : 'hover:bg-slate-50/70'
                    }
                  >
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrencyCO(row.price, context.currencySymbol, 2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-800">
                      {formatNumberCO(row.units, 1)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500">
                      {formatNumberCO(row.unitsLow, 0)} – {formatNumberCO(row.unitsHigh, 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrencyCO(row.revenue, context.currencySymbol, 2)}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      {row.isOptimal ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Mayor ingreso estimado</span>
                        </span>
                      ) : row.isExtrapolating ? (
                        <span className="text-amber-700">Extrapolación (fuera de rango)</span>
                      ) : (
                        <span className="text-slate-500">Dentro de regla de negocio</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 14: RECOMENDACIONES DE NEGOCIO                                        */
/* -------------------------------------------------------------------------- */
interface Step14Props {
  model: RegressionModel | null;
  profiles: ColumnProfile[];
  priceCol: string;
  context: BusinessContext;
}

export const Step14Recommendations: React.FC<Step14Props> = ({
  model,
  profiles,
  priceCol,
  context,
}) => {
  if (!model) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
        Selecciona o entrena un modelo ganador para ver las recomendaciones de negocio.
      </div>
    );
  }

  const sigDrivers = model.coefficients.filter(
    (c) => c.term !== '(Intercept)' && c.significant
  );
  const priceCoeff = model.coefficients.find((c) => c.term === priceCol);
  const yProfile = profiles.find((p) => p.name === model.yCol);
  const yMean = yProfile?.mean ?? 100;
  const safetyBuffer = Math.round(model.residualStdError * 2);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-2">
          Interpretación ejecutiva del modelo seleccionado: {model.name}
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          Para responder a <strong>{context.targetGoal || model.yCol}</strong> ({context.decisionUse}), el modelo explica el{' '}
          <strong className="font-mono tabular-nums">
            {formatPercentCO(model.adjRSquared * 100, 1)}
          </strong>{' '}
          de la variación diaria (R² ajustado), con un error típico en prueba de{' '}
          <strong className="font-mono tabular-nums">
            {formatNumberCO(model.testMetrics?.rmse ?? model.residualStdError, 1)}{' '}
            {context.unitLabel}
          </strong>
          .
        </p>

        <div className="space-y-2">
          {sigDrivers.length > 0 ? (
            sigDrivers.map((d) => (
              <div
                key={d.term}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <strong className="text-slate-900">{d.term}:</strong> Es una palanca confirmada estadísticamente (p ={' '}
                <span className="font-mono">{formatPValueCO(d.pValue)}</span>). Cada unidad adicional{' '}
                {d.estimate >= 0 ? 'suma' : 'resta'}{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {formatNumberCO(Math.abs(d.estimate), 2)}
                </span>{' '}
                {context.unitLabel} en promedio.
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-600">
              Revisa la significancia individual de tus variables en el Paso 7 antes de ejecutar cambios fuertes de precio.
            </p>
          )}
        </div>
      </div>

      {/* Implicaciones operativas */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">
          Implicaciones operativas para el equipo
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-lg">
            <h5 className="font-semibold text-indigo-950 mb-1.5">
              1. Inventario y compras de insumos
            </h5>
            <p className="text-slate-700 leading-relaxed">
              Usa el pronóstico puntual como base de compra diaria (promedio histórico:{' '}
              <span className="font-mono">{formatNumberCO(yMean, 0)}</span> {context.unitLabel}) y suma un colchón de seguridad de{' '}
              <span className="font-mono font-semibold text-indigo-950">
                +{formatIntCO(safetyBuffer)} {context.unitLabel}
              </span>{' '}
              (+2 errores estándar) para días de alta demanda sin quebrar stock de ingredientes frescos.
            </p>
          </div>

          <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-lg">
            <h5 className="font-semibold text-teal-950 mb-1.5">
              2. Personal y programación de turnos
            </h5>
            <p className="text-slate-700 leading-relaxed">
              {priceCoeff && priceCoeff.estimate < 0
                ? `Si decides bajar ${priceCol} para impulsar volumen, anticipa ~${formatNumberCO(
                    Math.abs(priceCoeff.estimate),
                    1
                  )} ${context.unitLabel} adicionales por cada unidad de rebaja y refuerza el turno de cocina en horas pico.`
                : 'Ajusta las horas del equipo de preparación y caja según el escenario proyectado en el Paso 13 para evitar tiempos muertos o filas largas.'}
            </p>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg">
            <h5 className="font-semibold text-emerald-950 mb-1.5">
              3. Productos complementarios e insumos clave
            </h5>
            <p className="text-slate-700 leading-relaxed">
              Las variables complementarias significativas (como bebidas o acompañantes) permiten sincronizar pedidos al proveedor y diseñar combos. Mantén visibilidad en nevera cuando bajes el precio del producto principal.
            </p>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg">
            <h5 className="font-semibold text-amber-950 mb-1.5">
              4. Bodega y control de merma
            </h5>
            <p className="text-slate-700 leading-relaxed">
              Cuando subas el precio o proyectes menor demanda, reduce proporcionalmente la pre-producción perecedera usando la banda inferior del intervalo (±2 SE) para proteger el margen y evitar desperdicio en bodega.
            </p>
          </div>
        </div>
      </div>

      {/* Próximos pasos */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">
          Próximos pasos para mejorar el modelo (Iteración 2 CRISP-DM)
        </h4>
        <ul className="space-y-2 text-xs text-slate-700 list-disc pl-5">
          <li>
            <strong>Día de la semana y quincenas:</strong> Incorporar variables indicadoras (viernes, sábado, domingo, días de pago) suele explicar gran parte del ruido residual restante.
          </li>
          <li>
            <strong>Calendario de promociones y campañas:</strong> Registrar inversión diaria en pauta, cupones o alianzas con apps de domicilios para separar el efecto real del marketing.
          </li>
          <li>
            <strong>Precios de la competencia y tráfico del entorno:</strong> Monitorear ofertas de locales cercanos y el conteo de visitantes del centro comercial o clima en días lluviosos.
          </li>
          <li>
            <strong>Pruebas piloto controladas:</strong> Si quieres explorar precios fuera del rango actual (ej. $10,50 o $7,50), realiza primero una prueba acotada de 2 semanas antes de cambiar el menú definitivo.
          </li>
        </ul>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 15: EXPORTAR INFORME HTML, CSV Y SCRIPT R                             */
/* -------------------------------------------------------------------------- */
interface Step15Props {
  rows: DataRow[];
  columns: string[];
  models: RegressionModel[];
  activeModel: RegressionModel | null;
  testIndices: number[];
  context: BusinessContext;
  rContext: RScriptContext;
  priceCol: string;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const Step15Export: React.FC<Step15Props> = ({
  rows,
  columns,
  models,
  activeModel,
  testIndices,
  context,
  rContext,
  priceCol,
}) => {
  const [downloadedMsg, setDownloadedMsg] = useState<string | null>(null);

  const testSet = useMemo(() => new Set(testIndices), [testIndices]);

  const handleDownloadCSV = () => {
    if (!activeModel) return;
    const headers = [
      ...columns,
      'Conjunto',
      'Prediccion',
      'Residuo',
      'Residuo_Estandarizado',
    ];
    const diagByRow = new Map(activeModel.diagnostics.map((d) => [d.rowIndex, d]));

    const lines = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')];
    rows.forEach((row, idx) => {
      const pred = predictRow(activeModel, row, true);
      const yActual = Number(row[activeModel.yCol]);
      const res = pred !== null && Number.isFinite(yActual) ? yActual - pred : null;
      const diag = diagByRow.get(idx + 1);
      const splitLabel = testSet.has(idx) ? 'Prueba' : 'Entrenamiento';

      const vals = columns.map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return '';
        const str = String(v);
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      });
      vals.push(
        splitLabel,
        pred !== null ? pred.toFixed(4) : '',
        res !== null ? res.toFixed(4) : '',
        diag ? diag.stdResidual.toFixed(4) : ''
      );
      lines.push(vals.join(','));
    });

    downloadBlob(
      lines.join('\n'),
      'pronostico_ventas_predicciones.csv',
      'text/csv;charset=utf-8;'
    );
    setDownloadedMsg('Archivo CSV con predicciones y residuos descargado.');
    setTimeout(() => setDownloadedMsg(null), 3000);
  };

  const handleDownloadR = () => {
    const script = buildFullRScript(rContext);
    downloadBlob(script, 'modelo_pronostico_ventas.R', 'text/plain;charset=utf-8;');
    setDownloadedMsg('Script R reproducible (.R) descargado.');
    setTimeout(() => setDownloadedMsg(null), 3000);
  };

  const handleDownloadHTML = () => {
    if (!activeModel) return;
    const fullR = buildFullRScript(rContext)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const eqTerms = activeModel.coefficients
      .map((c, idx) => {
        if (idx === 0) return formatNumberCO(c.estimate, 2);
        const sign = c.estimate >= 0 ? ' + ' : ' − ';
        return `${sign}${formatNumberCO(Math.abs(c.estimate), 2)}·(${c.term})`;
      })
      .join('');

    // Build simple inline SVG chart for Real vs Predicted in test set
    const testPts = activeModel.testPredictions ?? [];
    let svgScatter = '<p>No hay puntos de prueba disponibles.</p>';
    if (testPts.length > 0) {
      const vals = testPts.flatMap((p) => [p.actual, p.predicted]);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const span = Math.max(1e-6, maxV - minV);
      const w = 520;
      const h = 260;
      const pad = 36;
      const mapX = (v: number) => pad + ((v - minV) / span) * (w - 2 * pad);
      const mapY = (v: number) => h - pad - ((v - minV) / span) * (h - 2 * pad);

      const circles = testPts
        .map(
          (p) =>
            `<circle cx="${mapX(p.actual).toFixed(1)}" cy="${mapY(p.predicted).toFixed(1)}" r="4" fill="#0369A1" fill-opacity="0.75" />`
        )
        .join('');
      svgScatter = `
        <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:560px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;">
          <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${pad}" stroke="#0f172a" stroke-dasharray="4 4" stroke-width="1.5" />
          ${circles}
          <text x="${w / 2}" y="${h - 8}" text-anchor="middle" font-size="11" fill="#475569">Real (${activeModel.yCol})</text>
          <text x="14" y="${h / 2}" text-anchor="middle" font-size="11" fill="#475569" transform="rotate(-90 14 ${h / 2})">Pronosticado</text>
        </svg>`;
    }

    const compareRowsHtml = models
      .map(
        (m) => `
      <tr>
        <td>${m.name}${m.id === activeModel.id ? ' <strong>(Elegido)</strong>' : ''}</td>
        <td>${m.xCols.join(', ')}</td>
        <td style="text-align:right">${formatPercentCO(m.rSquared * 100, 1)}</td>
        <td style="text-align:right">${formatPercentCO(m.adjRSquared * 100, 1)}</td>
        <td style="text-align:right">${formatNumberCO(m.aic, 1)}</td>
        <td style="text-align:right">${formatNumberCO(m.bic, 1)}</td>
        <td style="text-align:right">${formatNumberCO(m.testMetrics?.rmse, 2)}</td>
      </tr>`
      )
      .join('');

    const coeffRowsHtml = activeModel.coefficients
      .map(
        (c) => `
      <tr>
        <td>${c.term === '(Intercept)' ? 'Intercepto' : c.term}</td>
        <td style="text-align:right">${formatNumberCO(c.estimate, 3)}</td>
        <td style="text-align:right">${formatNumberCO(c.stdError, 3)}</td>
        <td style="text-align:right">${formatNumberCO(c.tValue, 2)}</td>
        <td style="text-align:right;${c.significant ? 'color:#15803d;font-weight:600;' : ''}">${formatPValueCO(c.pValue)}</td>
      </tr>`
      )
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Informe Ejecutivo - Simulador de Pronóstico de Ventas</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 920px; margin: 32px auto; padding: 0 20px; line-height: 1.55; }
  h1, h2, h3 { color: #0f172a; }
  .meta { color: #475569; font-size: 13px; margin-bottom: 24px; }
  .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0; background: #f8fafc; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; }
  pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 10px; overflow-x: auto; font-size: 12px; }
  .eq { font-family: ui-monospace, monospace; font-size: 15px; font-weight: 600; }
</style>
</head>
<body>
  <h1>Informe Ejecutivo: Pronóstico de Ventas (CRISP-DM)</h1>
  <div class="meta">Objetivo: ${context.targetGoal} · Decisión: ${context.decisionUse} · Generado: ${new Date().toLocaleDateString('es-CO')}</div>

  <h2>1. Modelo Seleccionado y Ecuación</h2>
  <div class="box">
    <p><strong>${activeModel.name}</strong> (n = ${formatIntCO(activeModel.n)}, ${formatIntCO(activeModel.p)} variables explicativas)</p>
    <p class="eq">${activeModel.yCol} = ${eqTerms}</p>
    <p>R²: <strong>${formatPercentCO(activeModel.rSquared * 100, 1)}</strong> · R² ajustado: <strong>${formatPercentCO(activeModel.adjRSquared * 100, 1)}</strong> · Error estándar residual: <strong>${formatNumberCO(activeModel.residualStdError, 2)}</strong> · Durbin-Watson: <strong>${formatNumberCO(activeModel.durbinWatson, 2)}</strong></p>
  </div>

  <h2>2. Coeficientes del Modelo</h2>
  <table>
    <thead><tr><th>Variable</th><th style="text-align:right">Estimado</th><th style="text-align:right">Error Est.</th><th style="text-align:right">t</th><th style="text-align:right">p-value</th></tr></thead>
    <tbody>${coeffRowsHtml}</tbody>
  </table>

  <h2>3. Comparación de Modelos Candidatos</h2>
  <table>
    <thead><tr><th>Modelo</th><th>Variables</th><th style="text-align:right">R²</th><th style="text-align:right">R² aj.</th><th style="text-align:right">AIC</th><th style="text-align:right">BIC</th><th style="text-align:right">RMSE Prueba</th></tr></thead>
    <tbody>${compareRowsHtml}</tbody>
  </table>

  <h2>4. Validación Fuera de Muestra (Real vs. Pronosticado)</h2>
  ${svgScatter}

  <h2>5. Conclusiones Operativas</h2>
  <div class="box">
    <ul>
      <li>Usar la banda de seguridad de ±${formatNumberCO(2 * activeModel.residualStdError, 1)} ${context.unitLabel} para planificar inventario y evitar quiebres o merma excesiva.</li>
      <li>${priceCol ? `Monitorear la sensibilidad de ${priceCol} dentro del rango histórico observado antes de aplicar descuentos o aumentos permanentes.` : 'Controlar las palancas principales dentro de sus rangos observados.'}</li>
      <li>Próxima iteración: incorporar estacionalidad por día de la semana, promociones y precios de la competencia.</li>
    </ul>
  </div>

  <h2>6. Código R Equivalente Reproducible</h2>
  <pre>${fullR}</pre>
</body>
</html>`;

    downloadBlob(
      htmlDoc,
      'informe_pronostico_ventas.html',
      'text/html;charset=utf-8;'
    );
    setDownloadedMsg('Informe HTML completo descargado.');
    setTimeout(() => setDownloadedMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-b from-indigo-50/70 to-white border border-indigo-200 rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Informe ejecutivo (HTML)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Documento autocontenido listo para abrir en cualquier navegador o guardar en PDF. Incluye ecuación, tablas comparativas, gráfico de validación, conclusiones y el script completo en R.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadHTML}
            disabled={!activeModel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar informe HTML</span>
          </button>
        </div>

        <div className="bg-gradient-to-b from-emerald-50/70 to-white border border-emerald-200 rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3">
              <TableIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Datos y predicciones (CSV)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Tabla completa con cada fila original más las columnas <code className="font-mono">Conjunto</code> (Entrenamiento/Prueba), <code className="font-mono">Prediccion</code>, <code className="font-mono">Residuo</code> y <code className="font-mono">Residuo_Estandarizado</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={!activeModel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar CSV de resultados</span>
          </button>
        </div>

        <div className="bg-gradient-to-b from-slate-100/80 to-white border border-slate-300 rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-teal-300 flex items-center justify-center mb-3">
              <FileCode className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Script reproducible (R)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Archivo <code className="font-mono">.R</code> con todos los pasos del taller en orden (<code className="font-mono">summary</code>, <code className="font-mono">corrplot</code>, <code className="font-mono">lm</code>, <code className="font-mono">dwtest</code>, <code className="font-mono">confint</code>, <code className="font-mono">step</code>, <code className="font-mono">regsubsets</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadR}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar script .R</span>
          </button>
        </div>
      </div>

      {downloadedMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
          {downloadedMsg}
        </div>
      )}

      {activeModel && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">
            Resumen del modelo listo para exportar: {activeModel.name}
          </h4>
          <p className="text-xs text-slate-600 font-mono tabular-nums">
            Variables: {activeModel.xCols.join(' + ')} · R² aj.: {formatPercentCO(activeModel.adjRSquared * 100, 1)} · RMSE Prueba: {formatNumberCO(activeModel.testMetrics?.rmse, 2)} · AIC: {formatNumberCO(activeModel.aic, 1)} · BIC: {formatNumberCO(activeModel.bic, 1)}
          </p>
        </div>
      )}
    </div>
  );
};
