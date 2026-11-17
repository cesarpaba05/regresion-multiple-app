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
} from 'recharts';
import { CheckCircle2, AlertCircle, Trophy, Plus } from 'lucide-react';
import {
  BestSubsetRow,
  RegressionModel,
  StepwiseStep,
} from '../../types/analytics';
import {
  formatCompactCO,
  formatIntCO,
  formatNumberCO,
  formatPercentCO,
} from '../../stats/format';

/* -------------------------------------------------------------------------- */
/* PASO 9: ENTRENAMIENTO Y PRUEBA + CONFINT                                   */
/* -------------------------------------------------------------------------- */
interface Step9Props {
  seed: number;
  onChangeSeed: (seed: number) => void;
  trainRatio: number;
  onChangeTrainRatio: (ratio: number) => void;
  trainCount: number;
  testCount: number;
  evaluatedModels: RegressionModel[];
}

export const Step9TrainTest: React.FC<Step9Props> = ({
  seed,
  onChangeSeed,
  trainRatio,
  onChangeTrainRatio,
  trainCount,
  testCount,
  evaluatedModels,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    evaluatedModels.find((m) => m.source === 'multiple')?.id ??
      evaluatedModels[0]?.id ??
      ''
  );

  const activeModel =
    evaluatedModels.find((m) => m.id === selectedModelId) ??
    evaluatedModels[0] ??
    null;

  const coeffs = activeModel?.trainCoefficients ?? activeModel?.coefficients ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Configurar partición reproducible (set.seed)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Semilla aleatoria (seed)
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) onChangeSeed(v);
              }}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-sky-600"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Cambiar la semilla cambia qué días van a prueba; usar el mismo número repite exactamente la división.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Proporción Entrenamiento / Prueba
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {[
                { label: '80 / 20', val: 0.8 },
                { label: '75 / 25', val: 0.75 },
                { label: '70 / 30', val: 0.7 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onChangeTrainRatio(opt.val)}
                  className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    Math.abs(trainRatio - opt.val) < 0.01
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 to-teal-50/70 border border-indigo-200 rounded-lg flex flex-col justify-center">
            <div className="text-xs font-medium text-indigo-900">Resultado de la división</div>
            <div className="mt-1 flex items-baseline gap-4 font-mono tabular-nums">
              <div>
                <span className="text-lg font-bold text-indigo-950">
                  {formatIntCO(trainCount)}
                </span>{' '}
                <span className="text-xs text-indigo-800">entrenamiento</span>
              </div>
              <span className="text-indigo-300">·</span>
              <div>
                <span className="text-lg font-bold text-teal-800">
                  {formatIntCO(testCount)}
                </span>{' '}
                <span className="text-xs text-teal-800">prueba</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeModel && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Reestimación en entrenamiento e intervalos de confianza al 95% (confint)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Si el intervalo [LI 2,5%, LS 97,5%] NO incluye el cero, hay evidencia sólida de que la variable sí influye.
              </p>
            </div>
            <select
              value={activeModel.id}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900"
            >
              {evaluatedModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left font-medium">Variable</th>
                  <th className="py-2.5 px-3 text-right font-medium">Estimado (Train)</th>
                  <th className="py-2.5 px-3 text-right font-medium">LI 2,5%</th>
                  <th className="py-2.5 px-3 text-right font-medium">LS 97,5%</th>
                  <th className="py-2.5 px-4 text-left font-medium">¿Incluye al cero?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coeffs.map((c) => {
                  const lo = c.ciLower ?? 0;
                  const hi = c.ciUpper ?? 0;
                  const excludesZero = (lo > 0 && hi > 0) || (lo < 0 && hi < 0);
                  return (
                    <tr key={c.term} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {c.term === '(Intercept)' ? 'Intercepto (b₀)' : c.term}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatNumberCO(c.estimate, 3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatNumberCO(lo, 3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatNumberCO(hi, 3)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {c.term === '(Intercept)' ? (
                          <span className="text-slate-500">Término base</span>
                        ) : excludesZero ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>No incluye al 0 → Sí influye</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Cruza el 0 → Efecto incierto</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 10: PREDICCIÓN Y VALIDACIÓN EN PRUEBA                                 */
/* -------------------------------------------------------------------------- */
interface Step10Props {
  evaluatedModels: RegressionModel[];
  yCol: string;
}

export const Step10Validation: React.FC<Step10Props> = ({
  evaluatedModels,
  yCol,
}) => {
  const bestByTestRmse = useMemo(() => {
    const valid = evaluatedModels.filter(
      (m) => m.testMetrics && Number.isFinite(m.testMetrics.rmse)
    );
    if (valid.length === 0) return null;
    return valid.reduce((best, cur) =>
      (cur.testMetrics?.rmse ?? Infinity) < (best.testMetrics?.rmse ?? Infinity)
        ? cur
        : best
    );
  }, [evaluatedModels]);

  const [chartModelId, setChartModelId] = useState<string>(
    bestByTestRmse?.id ?? evaluatedModels[0]?.id ?? ''
  );

  const chartModel =
    evaluatedModels.find((m) => m.id === chartModelId) ??
    bestByTestRmse ??
    evaluatedModels[0] ??
    null;

  const diagLine = useMemo(() => {
    const preds = chartModel?.testPredictions ?? [];
    if (preds.length === 0) return [];
    const allVals = preds.flatMap((p) => [p.actual, p.predicted]);
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    return [
      { actual: min, ideal: min },
      { actual: max, ideal: max },
    ];
  }, [chartModel]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Desempeño en datos que el modelo nunca vio (Conjunto de Prueba)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Gana el modelo con menor error en prueba (RMSE más bajo). Comparar Train vs. Test ayuda a detectar sobreajuste.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">Modelo</th>
                <th className="py-2.5 px-3 text-right font-medium">Variables X</th>
                <th className="py-2.5 px-3 text-right font-medium">RMSE (Train)</th>
                <th className="py-2.5 px-3 text-right font-medium">RMSE (Prueba)</th>
                <th className="py-2.5 px-3 text-right font-medium">MAE (Prueba)</th>
                <th className="py-2.5 px-4 text-right font-medium">MAPE (Prueba)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evaluatedModels.map((m) => {
                const isWinner = bestByTestRmse?.id === m.id;
                return (
                  <tr
                    key={m.id}
                    className={isWinner ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{m.name}</span>
                        {isWinner && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Menor error</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatIntCO(m.p)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatNumberCO(m.trainMetrics?.rmse, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatNumberCO(m.testMetrics?.rmse, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatNumberCO(m.testMetrics?.mae, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatPercentCO(m.testMetrics?.mape, 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {chartModel && chartModel.testPredictions && chartModel.testPredictions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Valores reales contra pronosticados en Prueba ({yCol})
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Cuanto más cerca estén los puntos de la línea diagonal, más exacto fue el pronóstico.
              </p>
            </div>
            <select
              value={chartModel.id}
              onChange={(e) => setChartModelId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900"
            >
              {evaluatedModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="actual"
                  name="Valor real"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 0)}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  label={{
                    value: `Real (${yCol})`,
                    position: 'insideBottom',
                    offset: -10,
                    fontSize: 11,
                    fill: '#475569',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="predicted"
                  name="Pronosticado"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactCO(Number(v), 0)}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <Tooltip
                  formatter={(v, name) => [
                    formatNumberCO(Number(v), 2),
                    name === 'ideal' ? 'Predicción perfecta (y = x)' : String(name),
                  ]}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', borderColor: '#CBD5E1' }}
                />
                <Scatter
                  name="Pronosticado"
                  data={chartModel.testPredictions}
                  fill="#059669"
                  fillOpacity={0.78}
                />
                <Line
                  name="ideal"
                  data={diagLine}
                  dataKey="ideal"
                  stroke="#4F46E5"
                  strokeDasharray="4 4"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 11: SELECCIÓN DE VARIABLES (STEPWISE Y BEST SUBSETS)                  */
/* -------------------------------------------------------------------------- */
interface Step11Props {
  stepwiseResult: {
    steps: StepwiseStep[];
    finalVars: string[];
    finalModel: RegressionModel | null;
  };
  bestSubsetsResult: {
    subsets: BestSubsetRow[];
    bestByAdjR2: BestSubsetRow | null;
    bestByCp: BestSubsetRow | null;
    bestByBic: BestSubsetRow | null;
  };
  savedModelIds: string[];
  onSaveSubsetModel: (name: string, xCols: string[], source: 'best_subset') => void;
}

export const Step11VariableSelection: React.FC<Step11Props> = ({
  stepwiseResult,
  bestSubsetsResult,
  savedModelIds,
  onSaveSubsetModel,
}) => {
  const [savedSubMsg, setSavedSubMsg] = useState<string | null>(null);

  const handleAddSubset = (row: BestSubsetRow, metricLabel: string) => {
    const name = `Best Subset ${row.size} var (${metricLabel})`;
    onSaveSubsetModel(name, row.vars, 'best_subset');
    setSavedSubMsg(`"${name}" agregado al comparador del Paso 12.`);
    setTimeout(() => setSavedSubMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* (a) Stepwise bidireccional por AIC */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              (a) Stepwise en ambas direcciones por AIC — step(modelo, direction = "both")
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              En cada ronda evalúa quitar o agregar una variable; se detiene cuando ningún cambio baja más el AIC.
            </p>
          </div>
          {stepwiseResult.finalModel && (
            <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">
              Modelo Stepwise guardado automáticamente
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-right font-medium w-14">Paso</th>
                <th className="py-2.5 px-4 text-left font-medium">Acción ejecutada</th>
                <th className="py-2.5 px-4 text-left font-medium">Variables activas</th>
                <th className="py-2.5 px-4 text-right font-medium">AIC resultante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stepwiseResult.steps.map((st) => (
                <tr key={st.stepNumber} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                    {st.stepNumber}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    {st.action}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">
                    {st.currentVars.join(' + ')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatNumberCO(st.aic, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* (b) Best Subsets */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            (b) Mejores subconjuntos (regsubsets) por número de variables
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evalúa todas las combinaciones posibles y muestra la mejor de cada tamaño.
          </p>
        </div>

        {/* Qué recomienda cada métrica */}
        {bestSubsetsResult.subsets.length > 0 && (
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
            {bestSubsetsResult.bestByAdjR2 && (
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs">
                <div className="text-indigo-800 font-semibold">Según R² ajustado (máximo)</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {bestSubsetsResult.bestByAdjR2.size} variables:{' '}
                  {bestSubsetsResult.bestByAdjR2.vars.join(' + ')}
                </div>
                <div className="font-mono tabular-nums text-indigo-700 font-semibold mt-1">
                  R² aj. = {formatPercentCO(bestSubsetsResult.bestByAdjR2.adjRSquared * 100, 1)}
                </div>
              </div>
            )}
            {bestSubsetsResult.bestByCp && (
              <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-lg text-xs">
                <div className="text-teal-800 font-semibold">Según Cp de Mallows (mínimo)</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {bestSubsetsResult.bestByCp.size} variables:{' '}
                  {bestSubsetsResult.bestByCp.vars.join(' + ')}
                </div>
                <div className="font-mono tabular-nums text-teal-700 font-semibold mt-1">
                  Cp = {formatNumberCO(bestSubsetsResult.bestByCp.mallowsCp, 2)}
                </div>
              </div>
            )}
            {bestSubsetsResult.bestByBic && (
              <div className="p-3.5 bg-violet-50/60 border border-violet-200 rounded-lg text-xs">
                <div className="text-violet-800 font-semibold">Según BIC (mínimo)</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {bestSubsetsResult.bestByBic.size} variables:{' '}
                  {bestSubsetsResult.bestByBic.vars.join(' + ')}
                </div>
                <div className="font-mono tabular-nums text-violet-700 font-semibold mt-1">
                  BIC = {formatNumberCO(bestSubsetsResult.bestByBic.bic, 1)}
                </div>
              </div>
            )}
          </div>
        )}

        {savedSubMsg && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
            {savedSubMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-right font-medium"># Vars</th>
                <th className="py-2.5 px-4 text-left font-medium">Mejor combinación de variables</th>
                <th className="py-2.5 px-3 text-right font-medium">R² aj.</th>
                <th className="py-2.5 px-3 text-right font-medium">Cp de Mallows</th>
                <th className="py-2.5 px-3 text-right font-medium">BIC</th>
                <th className="py-2.5 px-4 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bestSubsetsResult.subsets.map((row) => {
                const isAdjBest = bestSubsetsResult.bestByAdjR2?.size === row.size;
                const isCpBest = bestSubsetsResult.bestByCp?.size === row.size;
                const isBicBest = bestSubsetsResult.bestByBic?.size === row.size;
                const badges: string[] = [];
                if (isAdjBest) badges.push('Mejor R² aj.');
                if (isCpBest) badges.push('Mejor Cp');
                if (isBicBest) badges.push('Mejor BIC');
                const alreadySaved = savedModelIds.includes(`subset_${row.vars.join('_')}`);

                return (
                  <tr key={row.size} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {row.size}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">
                      <div>{row.vars.join(' + ')}</div>
                      {badges.length > 0 && (
                        <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {badges.join(' · ')}
                        </div>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                        isAdjBest ? 'font-semibold text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {formatPercentCO(row.adjRSquared * 100, 1)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                        isCpBest ? 'font-semibold text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {formatNumberCO(row.mallowsCp, 2)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                        isBicBest ? 'font-semibold text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {formatNumberCO(row.bic, 1)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={alreadySaved}
                        onClick={() =>
                          handleAddSubset(row, badges[0] ?? 'Subconjunto')
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                          alreadySaved
                            ? 'text-slate-400 bg-slate-100 cursor-default'
                            : 'text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{alreadySaved ? 'Guardado' : 'Guardar'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PASO 12: COMPARAR MODELOS                                                  */
/* -------------------------------------------------------------------------- */
interface Step12Props {
  evaluatedModels: RegressionModel[];
  recommendedModelId: string;
  selectedActiveModelId: string;
  onSelectActiveModel: (id: string) => void;
}

export const Step12CompareModels: React.FC<Step12Props> = ({
  evaluatedModels,
  recommendedModelId,
  selectedActiveModelId,
  onSelectActiveModel,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tabla comparativa de todos los modelos candidatos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Elige qué modelo quieres llevar al Simulador de Escenarios (Paso 13).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">Usar</th>
                <th className="py-2.5 px-4 text-left font-medium">Modelo y variables</th>
                <th className="py-2.5 px-3 text-right font-medium">R²</th>
                <th className="py-2.5 px-3 text-right font-medium">R² aj.</th>
                <th className="py-2.5 px-3 text-right font-medium">AIC</th>
                <th className="py-2.5 px-3 text-right font-medium">BIC</th>
                <th className="py-2.5 px-4 text-right font-medium">RMSE Prueba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evaluatedModels.map((m) => {
                const isRec = m.id === recommendedModelId;
                const isActive = m.id === selectedActiveModelId;
                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectActiveModel(m.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="radio"
                        name="active-sim-model"
                        checked={isActive}
                        onChange={() => onSelectActiveModel(m.id)}
                        className="accent-sky-700"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span>{m.name}</span>
                        {isRec && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Recomendado</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {m.xCols.join(' + ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatPercentCO(m.rSquared * 100, 1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                      {formatPercentCO(m.adjRSquared * 100, 1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatNumberCO(m.aic, 1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatNumberCO(m.bic, 1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatNumberCO(m.testMetrics?.rmse, 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
