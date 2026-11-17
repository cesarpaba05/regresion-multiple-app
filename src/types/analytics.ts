export type DataRow = Record<string, string | number | null>;

export type ColumnKind = 'numeric_continuous' | 'numeric_binary' | 'numeric_discrete' | 'text';

export interface ColumnProfile {
  name: string;
  kind: ColumnKind;
  totalCount: number;
  missingCount: number;
  uniqueCount: number;
  sampleValues: (string | number | null)[];
  min?: number;
  q1?: number;
  median?: number;
  mean?: number;
  q3?: number;
  max?: number;
  sd?: number;
}

export interface CoefficientStat {
  term: string;
  estimate: number;
  stdError: number;
  tValue: number;
  pValue: number;
  ciLower?: number;
  ciUpper?: number;
  significant: boolean;
}

export interface DiagnosticPoint {
  rowIndex: number;
  actual: number;
  fitted: number;
  residual: number;
  stdResidual: number;
  sqrtAbsStdResidual: number;
  theoreticalQuantile: number;
  leverage: number;
  cooksDistance: number;
  isOutlier: boolean;
  isHighLeverage: boolean;
  isInfluential: boolean;
}

export interface RegressionModel {
  id: string;
  name: string;
  source: 'simple' | 'multiple' | 'stepwise' | 'best_subset' | 'custom';
  yCol: string;
  xCols: string[];
  n: number;
  p: number;
  dfResidual: number;
  coefficients: CoefficientStat[];
  rSquared: number;
  adjRSquared: number;
  residualStdError: number;
  fStatistic: number;
  fPValue: number;
  aic: number;
  bic: number;
  rss: number;
  tss: number;
  durbinWatson: number;
  durbinWatsonPValue: number;
  diagnostics: DiagnosticPoint[];
  trainMetrics?: {
    n: number;
    rmse: number;
    mae: number;
    mape: number;
  };
  testMetrics?: {
    n: number;
    rmse: number;
    mae: number;
    mape: number;
  };
  testPredictions?: {
    rowIndex: number;
    actual: number;
    predicted: number;
    residual: number;
  }[];
  trainCoefficients?: CoefficientStat[];
  trainRSE?: number;
  trainRSquared?: number;
  trainAdjRSquared?: number;
}

export interface StepwiseStep {
  stepNumber: number;
  action: string;
  currentVars: string[];
  aic: number;
  rss: number;
  candidates: {
    action: string;
    variable: string;
    aic: number;
    rss: number;
    selected: boolean;
  }[];
}

export interface BestSubsetRow {
  size: number;
  vars: string[];
  rSquared: number;
  adjRSquared: number;
  mallowsCp: number;
  bic: number;
  aic: number;
  rss: number;
}

export interface BusinessContext {
  targetGoal: string;
  decisionUse: string;
  unitLabel: string;
  currencySymbol: string;
}
