import jStat from 'jstat';
import {
  BestSubsetRow,
  CoefficientStat,
  ColumnKind,
  ColumnProfile,
  DataRow,
  DiagnosticPoint,
  RegressionModel,
  StepwiseStep,
} from '../types/analytics';
import { computeXtXInverseFromR, backSubstitute, thinQR } from './matrix';
import { seededShuffleIndices } from './prng';

export function toNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'boolean') return null;
  const str = String(val).trim();
  if (!str || str.toUpperCase() === 'NA' || str.toUpperCase() === 'NULL' || str === '-') {
    return null;
  }
  // Support both standard dot decimals and comma decimals when clearly numeric
  const cleaned = str.replace(/\s+/g, '');
  if (/^-?\d+$/.test(cleaned)) {
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (/^-?\d+\.\d+$/.test(cleaned)) {
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  // Colombian style e.g. "1.234,56" or "8,50"
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(cleaned) || /^-?\d+,\d+$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const fallback = Number(cleaned);
  return Number.isFinite(fallback) ? fallback : null;
}

function quantileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function profileColumns(rows: DataRow[], columns: string[]): ColumnProfile[] {
  return columns.map((name) => {
    const totalCount = rows.length;
    let missingCount = 0;
    const numericValues: number[] = [];
    const nonEmptyRaw: (string | number)[] = [];
    const uniqueRaw = new Set<string>();

    for (const row of rows) {
      const raw = row[name];
      if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim().toUpperCase() === 'NA') {
        missingCount++;
        continue;
      }
      nonEmptyRaw.push(raw);
      uniqueRaw.add(String(raw).trim());
      const num = toNumericValue(raw);
      if (num !== null) {
        numericValues.push(num);
      }
    }

    const nonMissingCount = totalCount - missingCount;
    const isNumeric = nonMissingCount > 0 && numericValues.length === nonMissingCount;
    const uniqueNums = new Set(numericValues);

    let kind: ColumnKind = 'text';
    if (isNumeric) {
      const allBinary =
        uniqueNums.size <= 2 &&
        Array.from(uniqueNums).every((v) => v === 0 || v === 1);
      if (allBinary) {
        kind = 'numeric_binary';
      } else if (uniqueNums.size <= 5 && numericValues.every((v) => Number.isInteger(v))) {
        kind = 'numeric_discrete';
      } else {
        kind = 'numeric_continuous';
      }
    }

    const profile: ColumnProfile = {
      name,
      kind,
      totalCount,
      missingCount,
      uniqueCount: uniqueRaw.size,
      sampleValues: rows.slice(0, 5).map((r) => r[name] ?? null),
    };

    if (isNumeric && numericValues.length > 0) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      const n = sorted.length;
      const mean = sorted.reduce((acc, v) => acc + v, 0) / n;
      const variance =
        n > 1
          ? sorted.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (n - 1)
          : 0;
      profile.min = sorted[0];
      profile.q1 = quantileSorted(sorted, 0.25);
      profile.median = quantileSorted(sorted, 0.5);
      profile.mean = mean;
      profile.q3 = quantileSorted(sorted, 0.75);
      profile.max = sorted[n - 1];
      profile.sd = Math.sqrt(variance);
    }

    return profile;
  });
}

export interface CorrelationMatrixResult {
  variables: string[];
  matrix: number[][]; // Pearson r
  pairwiseN: number[][];
}

export function computeCorrelationMatrix(
  rows: DataRow[],
  numericCols: string[]
): CorrelationMatrixResult {
  const m = numericCols.length;
  const matrix: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const pairwiseN: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let i = 0; i < m; i++) {
    matrix[i][i] = 1;
    for (let j = i; j < m; j++) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of rows) {
        const vx = toNumericValue(r[numericCols[i]]);
        const vy = toNumericValue(r[numericCols[j]]);
        if (vx !== null && vy !== null) {
          xs.push(vx);
          ys.push(vy);
        }
      }
      const n = xs.length;
      pairwiseN[i][j] = n;
      pairwiseN[j][i] = n;

      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }

      if (n < 2) {
        matrix[i][j] = 0;
        matrix[j][i] = 0;
        continue;
      }

      const meanX = xs.reduce((a, b) => a + b, 0) / n;
      const meanY = ys.reduce((a, b) => a + b, 0) / n;
      let num = 0;
      let denX = 0;
      let denY = 0;
      for (let k = 0; k < n; k++) {
        const dx = xs[k] - meanX;
        const dy = ys[k] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const denom = Math.sqrt(denX * denY);
      const rVal = denom > 1e-12 ? Math.max(-1, Math.min(1, num / denom)) : 0;
      matrix[i][j] = rVal;
      matrix[j][i] = rVal;
    }
  }

  return { variables: numericCols, matrix, pairwiseN };
}

export function computeLinearRelationship(
  rows: DataRow[],
  fromCol: string,
  toCol: string
): { slope: number; intercept: number; r: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of rows) {
    const x = toNumericValue(r[fromCol]);
    const y = toNumericValue(r[toCol]);
    if (x !== null && y !== null) {
      xs.push(x);
      ys.push(y);
    }
  }
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: 0, r: 0 };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const slope = sxx > 1e-12 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const denom = Math.sqrt(sxx * syy);
  const r = denom > 1e-12 ? sxy / denom : 0;
  return { slope, intercept, r };
}

/**
 * Exact O(n * k^2) Durbin-Watson test normal approximation matching lmtest::dwtest().
 */
function computeDurbinWatson(
  residuals: number[],
  Q: number[][],
  dfResidual: number
): { dw: number; pValue: number } {
  const n = residuals.length;
  const k = Q[0]?.length ?? 1;
  if (n < 3 || dfResidual <= 1) {
    return { dw: 2, pValue: 1 };
  }

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    den += residuals[i] * residuals[i];
    if (i > 0) {
      const diff = residuals[i] - residuals[i - 1];
      num += diff * diff;
    }
  }
  const dw = den > 1e-12 ? num / den : 2;

  // Compute B = A * Q where A is tridiagonal first-difference matrix
  const B: number[][] = Array.from({ length: n }, () => new Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const diag = i === 0 || i === n - 1 ? 1 : 2;
    for (let j = 0; j < k; j++) {
      let val = diag * Q[i][j];
      if (i > 0) val -= Q[i - 1][j];
      if (i < n - 1) val -= Q[i + 1][j];
      B[i][j] = val;
    }
  }

  // tr(Q^T A Q) = sum(Q * B)
  let trQtAQ = 0;
  let trBtB = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      trQtAQ += Q[i][j] * B[i][j];
      trBtB += B[i][j] * B[i][j];
    }
  }

  // C = Q^T * B (k x k)
  const C: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      let s = 0;
      for (let i = 0; i < n; i++) {
        s += Q[i][a] * B[i][b];
      }
      C[a][b] = s;
    }
  }

  let trC2 = 0;
  for (let a = 0; a < k; a++) {
    for (let b = 0; b < k; b++) {
      trC2 += C[a][b] * C[b][a];
    }
  }

  const trA = 2 * (n - 1);
  const trA2 = 6 * n - 8;
  const trMA = trA - trQtAQ;
  const trMA2 = trA2 - 2 * trBtB + trC2;

  const meanDW = trMA / dfResidual;
  const varDW =
    (2 * Math.max(1e-12, trMA2 - dfResidual * meanDW * meanDW)) /
    (dfResidual * (dfResidual + 2));
  const sdDW = Math.sqrt(Math.max(1e-12, varDW));
  const z = Math.abs(dw - meanDW) / sdDW;
  const pValue = Math.max(0, Math.min(1, 2 * (1 - jStat.normal.cdf(z, 0, 1))));

  return { dw, pValue };
}

export function fitOLS(
  rows: DataRow[],
  yCol: string,
  xCols: string[],
  options?: {
    id?: string;
    name?: string;
    source?: RegressionModel['source'];
    rowIndices?: number[];
  }
): RegressionModel | null {
  const cleanY: number[] = [];
  const cleanXRows: number[][] = [];
  const keptIndices: number[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const yVal = toNumericValue(r[yCol]);
    if (yVal === null) continue;

    const xRow: number[] = [1]; // Intercept
    let valid = true;
    for (const xc of xCols) {
      const xv = toNumericValue(r[xc]);
      if (xv === null) {
        valid = false;
        break;
      }
      xRow.push(xv);
    }
    if (!valid) continue;

    cleanY.push(yVal);
    cleanXRows.push(xRow);
    keptIndices.push(options?.rowIndices ? options.rowIndices[idx] : idx);
  }

  const n = cleanY.length;
  const p = xCols.length;
  const k = p + 1;
  if (n <= k + 1) {
    return null;
  }

  const qr = thinQR(cleanXRows);
  if (!qr.rankOk) {
    return null;
  }

  // Q^T * y
  const qty = new Array(k).fill(0);
  for (let j = 0; j < k; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += qr.q[i][j] * cleanY[i];
    }
    qty[j] = s;
  }

  const beta = backSubstitute(qr.r, qty);
  const xtxInv = computeXtXInverseFromR(qr.r);

  // Fitted values and residuals
  const yMean = cleanY.reduce((a, b) => a + b, 0) / n;
  const fitted = new Array(n);
  const residuals = new Array(n);
  let rss = 0;
  let tss = 0;

  for (let i = 0; i < n; i++) {
    let yh = 0;
    for (let j = 0; j < k; j++) {
      yh += cleanXRows[i][j] * beta[j];
    }
    fitted[i] = yh;
    const res = cleanY[i] - yh;
    residuals[i] = res;
    rss += res * res;
    const dy = cleanY[i] - yMean;
    tss += dy * dy;
  }

  const dfResidual = n - k;
  const sigma2 = rss / dfResidual;
  const residualStdError = Math.sqrt(sigma2);

  const rSquared = tss > 1e-12 ? Math.max(0, Math.min(1, 1 - rss / tss)) : 0;
  const adjRSquared =
    tss > 1e-12
      ? 1 - ((1 - rSquared) * (n - 1)) / dfResidual
      : 0;

  const ess = Math.max(0, tss - rss);
  const fStatistic =
    p > 0 && sigma2 > 1e-15 ? ess / p / sigma2 : 0;
  const fPValue =
    p > 0 && fStatistic > 0
      ? Math.max(0, Math.min(1, 1 - jStat.centralF.cdf(fStatistic, p, dfResidual)))
      : 1;

  // R's logLik.lm and AIC/BIC (df = k + 1 because sigma^2 is estimated)
  const rssSafe = Math.max(1e-15, rss);
  const logLik = (-n / 2) * (Math.log(2 * Math.PI) + 1 + Math.log(rssSafe / n));
  const dfLogLik = k + 1;
  const aic = -2 * logLik + 2 * dfLogLik;
  const bic = -2 * logLik + Math.log(n) * dfLogLik;

  const tCrit = jStat.studentt.inv(0.975, dfResidual);
  const terms = ['(Intercept)', ...xCols];
  const coefficients: CoefficientStat[] = terms.map((term, j) => {
    const estimate = beta[j];
    const stdError = Math.sqrt(Math.max(1e-18, sigma2 * xtxInv[j][j]));
    const tValue = estimate / stdError;
    const pValue = Math.max(
      0,
      Math.min(1, 2 * (1 - jStat.studentt.cdf(Math.abs(tValue), dfResidual)))
    );
    const ciLower = estimate - tCrit * stdError;
    const ciUpper = estimate + tCrit * stdError;
    return {
      term,
      estimate,
      stdError,
      tValue,
      pValue,
      ciLower,
      ciUpper,
      significant: pValue < 0.05,
    };
  });

  // Leverage h_i = sum_j Q[i][j]^2
  const leverages = new Array(n);
  const stdResiduals = new Array(n);
  const cooksDistances = new Array(n);

  for (let i = 0; i < n; i++) {
    let h = 0;
    for (let j = 0; j < k; j++) {
      h += qr.q[i][j] * qr.q[i][j];
    }
    h = Math.min(0.9999, Math.max(0, h));
    leverages[i] = h;
    const denom = residualStdError * Math.sqrt(Math.max(1e-6, 1 - h));
    const sr = denom > 1e-12 ? residuals[i] / denom : 0;
    stdResiduals[i] = sr;
    cooksDistances[i] = ((sr * sr) / k) * (h / Math.max(1e-6, 1 - h));
  }

  // Theoretical normal quantiles (R's ppoints + qnorm for Q-Q plot)
  const indexedStdRes = stdResiduals
    .map((val, i) => ({ val, i }))
    .sort((a, b) => a.val - b.val);
  const theoreticalQuantiles = new Array(n).fill(0);
  const aOffset = n <= 10 ? 0.375 : 0.5;
  for (let rank = 0; rank < n; rank++) {
    const pProb = (rank + 1 - aOffset) / (n + 1 - 2 * aOffset);
    theoreticalQuantiles[indexedStdRes[rank].i] = jStat.normal.inv(pProb, 0, 1);
  }

  const leverageThreshold = (2 * k) / n;
  const cooksThreshold = 4 / n;

  const diagnostics: DiagnosticPoint[] = Array.from({ length: n }, (_, i) => ({
    rowIndex: keptIndices[i] + 1,
    actual: cleanY[i],
    fitted: fitted[i],
    residual: residuals[i],
    stdResidual: stdResiduals[i],
    sqrtAbsStdResidual: Math.sqrt(Math.abs(stdResiduals[i])),
    theoreticalQuantile: theoreticalQuantiles[i],
    leverage: leverages[i],
    cooksDistance: cooksDistances[i],
    isOutlier: Math.abs(stdResiduals[i]) > 2.5,
    isHighLeverage: leverages[i] > leverageThreshold,
    isInfluential: cooksDistances[i] > cooksThreshold,
  }));

  const { dw: durbinWatson, pValue: durbinWatsonPValue } = computeDurbinWatson(
    residuals,
    qr.q,
    dfResidual
  );

  return {
    id: options?.id ?? `model_${Date.now()}`,
    name: options?.name ?? 'Modelo OLS',
    source: options?.source ?? 'custom',
    yCol,
    xCols: [...xCols],
    n,
    p,
    dfResidual,
    coefficients,
    rSquared,
    adjRSquared,
    residualStdError,
    fStatistic,
    fPValue,
    aic,
    bic,
    rss,
    tss,
    durbinWatson,
    durbinWatsonPValue,
    diagnostics,
  };
}

export function predictRow(model: RegressionModel, row: DataRow, useTrainCoeffs = false): number | null {
  const coeffs = useTrainCoeffs && model.trainCoefficients ? model.trainCoefficients : model.coefficients;
  let pred = coeffs[0].estimate;
  for (let j = 0; j < model.xCols.length; j++) {
    const val = toNumericValue(row[model.xCols[j]]);
    if (val === null) return null;
    pred += coeffs[j + 1].estimate * val;
  }
  return pred;
}

export function predictFromValues(
  model: RegressionModel,
  values: Record<string, number>
): number {
  let pred = model.coefficients[0].estimate;
  for (let j = 0; j < model.xCols.length; j++) {
    const xCol = model.xCols[j];
    pred += model.coefficients[j + 1].estimate * (values[xCol] ?? 0);
  }
  return pred;
}

export function splitTrainTest(
  rows: DataRow[],
  trainRatio: number,
  seed: number
): { trainRows: DataRow[]; testRows: DataRow[]; trainIndices: number[]; testIndices: number[] } {
  const n = rows.length;
  const shuffled = seededShuffleIndices(n, seed);
  const trainCount = Math.max(1, Math.min(n - 1, Math.round(n * trainRatio)));
  const trainIndices = shuffled.slice(0, trainCount).sort((a, b) => a - b);
  const testIndices = shuffled.slice(trainCount).sort((a, b) => a - b);
  return {
    trainRows: trainIndices.map((i) => rows[i]),
    testRows: testIndices.map((i) => rows[i]),
    trainIndices,
    testIndices,
  };
}

function computePredictionMetrics(
  actuals: number[],
  preds: number[]
): { n: number; rmse: number; mae: number; mape: number } {
  const n = actuals.length;
  if (n === 0) return { n: 0, rmse: NaN, mae: NaN, mape: NaN };
  let sqErr = 0;
  let absErr = 0;
  let pctErr = 0;
  let pctCount = 0;

  for (let i = 0; i < n; i++) {
    const err = actuals[i] - preds[i];
    sqErr += err * err;
    absErr += Math.abs(err);
    if (Math.abs(actuals[i]) > 1e-9) {
      pctErr += Math.abs(err / actuals[i]);
      pctCount++;
    }
  }
  return {
    n,
    rmse: Math.sqrt(sqErr / n),
    mae: absErr / n,
    mape: pctCount > 0 ? (pctErr / pctCount) * 100 : NaN,
  };
}

export function evaluateModelOnSplit(
  model: RegressionModel,
  trainRows: DataRow[],
  testRows: DataRow[],
  testIndices: number[]
): RegressionModel {
  const trainFit = fitOLS(trainRows, model.yCol, model.xCols, {
    id: `${model.id}_train`,
    name: `${model.name} (Entrenamiento)`,
    source: model.source,
  });

  if (!trainFit) return model;

  const trainActuals: number[] = [];
  const trainPreds: number[] = [];
  for (const r of trainRows) {
    const y = toNumericValue(r[model.yCol]);
    const p = predictRow(trainFit, r, false);
    if (y !== null && p !== null) {
      trainActuals.push(y);
      trainPreds.push(p);
    }
  }

  const testActuals: number[] = [];
  const testPreds: number[] = [];
  const testPredictions: NonNullable<RegressionModel['testPredictions']> = [];

  for (let i = 0; i < testRows.length; i++) {
    const r = testRows[i];
    const y = toNumericValue(r[model.yCol]);
    const p = predictRow(trainFit, r, false);
    if (y !== null && p !== null) {
      testActuals.push(y);
      testPreds.push(p);
      testPredictions.push({
        rowIndex: (testIndices[i] ?? i) + 1,
        actual: y,
        predicted: p,
        residual: y - p,
      });
    }
  }

  return {
    ...model,
    trainCoefficients: trainFit.coefficients,
    trainRSE: trainFit.residualStdError,
    trainRSquared: trainFit.rSquared,
    trainAdjRSquared: trainFit.adjRSquared,
    trainMetrics: computePredictionMetrics(trainActuals, trainPreds),
    testMetrics: computePredictionMetrics(testActuals, testPreds),
    testPredictions,
  };
}

/**
 * Bidirectional Stepwise Selection by AIC (matching R's step(modelo, direction = "both")).
 */
export function runStepwiseBoth(
  rows: DataRow[],
  yCol: string,
  candidateCols: string[]
): { steps: StepwiseStep[]; finalVars: string[]; finalModel: RegressionModel | null } {
  let active = [...candidateCols];
  let currentModel = fitOLS(rows, yCol, active);
  if (!currentModel) {
    return { steps: [], finalVars: active, finalModel: null };
  }

  const steps: StepwiseStep[] = [];
  let stepNum = 0;

  // Initial state
  steps.push({
    stepNumber: stepNum,
    action: 'Inicio (modelo completo)',
    currentVars: [...active],
    aic: currentModel.aic,
    rss: currentModel.rss,
    candidates: [],
  });

  const maxSteps = Math.max(10, candidateCols.length * 3);
  for (let iter = 0; iter < maxSteps; iter++) {
    const baseAIC = currentModel.aic;
    const candidates: StepwiseStep['candidates'] = [
      {
        action: '<none>',
        variable: 'Mantener actual',
        aic: baseAIC,
        rss: currentModel.rss,
        selected: false,
      },
    ];

    // Try removing each active variable (keep at least 1 predictor)
    if (active.length > 1) {
      for (const v of active) {
        const nextVars = active.filter((x) => x !== v);
        const m = fitOLS(rows, yCol, nextVars);
        if (m) {
          candidates.push({
            action: `- ${v}`,
            variable: v,
            aic: m.aic,
            rss: m.rss,
            selected: false,
          });
        }
      }
    }

    // Try adding each inactive candidate variable
    for (const v of candidateCols) {
      if (active.includes(v)) continue;
      const nextVars = [...active, v];
      const m = fitOLS(rows, yCol, nextVars);
      if (m) {
        candidates.push({
          action: `+ ${v}`,
          variable: v,
          aic: m.aic,
          rss: m.rss,
          selected: false,
        });
      }
    }

    candidates.sort((a, b) => a.aic - b.aic);
    const best = candidates[0];
    best.selected = true;

    stepNum++;
    if (best.action === '<none>' || best.aic >= baseAIC - 1e-6) {
      steps.push({
        stepNumber: stepNum,
        action: 'Detener (<none> tiene el menor AIC)',
        currentVars: [...active],
        aic: baseAIC,
        rss: currentModel.rss,
        candidates,
      });
      break;
    }

    if (best.action.startsWith('- ')) {
      active = active.filter((x) => x !== best.variable);
    } else if (best.action.startsWith('+ ')) {
      active = [...active, best.variable];
    }

    const updated = fitOLS(rows, yCol, active);
    if (!updated) break;
    currentModel = updated;

    steps.push({
      stepNumber: stepNum,
      action: best.action,
      currentVars: [...active],
      aic: currentModel.aic,
      rss: currentModel.rss,
      candidates,
    });
  }

  const finalModel = fitOLS(rows, yCol, active, {
    id: 'model_stepwise',
    name: 'Modelo Stepwise (AIC)',
    source: 'stepwise',
  });

  return { steps, finalVars: active, finalModel };
}

/**
 * Exhaustive Best Subsets (matching leaps::regsubsets) for up to 12 predictors.
 */
export function runBestSubsets(
  rows: DataRow[],
  yCol: string,
  candidateCols: string[]
): {
  subsets: BestSubsetRow[];
  bestByAdjR2: BestSubsetRow | null;
  bestByCp: BestSubsetRow | null;
  bestByBic: BestSubsetRow | null;
} {
  const vars = candidateCols.slice(0, 12); // Cap exhaustive search at 2^12 = 4096
  const fullModel = fitOLS(rows, yCol, vars);
  if (!fullModel || vars.length === 0) {
    return { subsets: [], bestByAdjR2: null, bestByCp: null, bestByBic: null };
  }

  const sigma2Full = fullModel.rss / fullModel.dfResidual;
  const n = fullModel.n;
  const pMax = vars.length;

  const bestPerSize = new Map<number, BestSubsetRow>();
  const totalCombos = 1 << pMax;

  for (let mask = 1; mask < totalCombos; mask++) {
    const subsetVars: string[] = [];
    for (let j = 0; j < pMax; j++) {
      if ((mask & (1 << j)) !== 0) {
        subsetVars.push(vars[j]);
      }
    }
    const size = subsetVars.length;
    const fit = fitOLS(rows, yCol, subsetVars);
    if (!fit) continue;

    const existing = bestPerSize.get(size);
    if (!existing || fit.rss < existing.rss) {
      // Mallows' Cp = RSS_m / sigma2_full - (n - 2*(m+1))
      const mallowsCp = fit.rss / sigma2Full - (n - 2 * (size + 1));
      bestPerSize.set(size, {
        size,
        vars: subsetVars,
        rSquared: fit.rSquared,
        adjRSquared: fit.adjRSquared,
        mallowsCp,
        bic: fit.bic,
        aic: fit.aic,
        rss: fit.rss,
      });
    }
  }

  const subsets = Array.from(bestPerSize.values()).sort((a, b) => a.size - b.size);
  if (subsets.length === 0) {
    return { subsets: [], bestByAdjR2: null, bestByCp: null, bestByBic: null };
  }

  const bestByAdjR2 = subsets.reduce((best, cur) =>
    cur.adjRSquared > best.adjRSquared ? cur : best
  );
  // Best Cp is smallest Cp (or closest to p+1)
  const bestByCp = subsets.reduce((best, cur) =>
    cur.mallowsCp < best.mallowsCp ? cur : best
  );
  const bestByBic = subsets.reduce((best, cur) =>
    cur.bic < best.bic ? cur : best
  );

  return { subsets, bestByAdjR2, bestByCp, bestByBic };
}
