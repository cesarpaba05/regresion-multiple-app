import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Menu,
  AlertTriangle,
} from 'lucide-react';
import { generateBowlsDataset } from './data/bowlsDataset';
import { getMaosPalaceDataset, MAOS_PALACE_CONTEXT } from './data/maosbaseDataset';
import { CRISP_STEPS } from './data/stepsConfig';
import {
  BusinessContext,
  DataRow,
  RegressionModel,
} from './types/analytics';
import {
  evaluateModelOnSplit,
  fitOLS,
  profileColumns,
  runBestSubsets,
  runStepwiseBoth,
  splitTrainTest,
} from './stats/regression';
import { buildKeyFinding } from './stats/keyFindings';
import { getRCodeForStep, RScriptContext } from './stats/rCodeGenerator';
import { WizardSidebar } from './components/WizardSidebar';
import {
  CollapsibleRCode,
  KeyFindingBox,
  WhatItMeansToggle,
} from './components/StepCallouts';
import {
  ExampleCaseId,
  Step1BusinessQuestion,
  Step2LoadData,
  Step3SelectTarget,
  Step4Descriptive,
  Step5Correlations,
} from './components/steps/Steps1to5';
import {
  Step6SimpleRegression,
  Step7MultipleRegression,
  Step8Diagnostics,
} from './components/steps/Steps6to8';
import {
  Step9TrainTest,
  Step10Validation,
  Step11VariableSelection,
  Step12CompareModels,
} from './components/steps/Steps9to12';
import {
  Step13Simulator,
  Step14Recommendations,
  Step15Export,
} from './components/steps/Steps13to15';

interface CustomModelDef {
  id: string;
  name: string;
  xCols: string[];
  source: 'custom' | 'best_subset';
}

const SYNTHETIC_CONTEXT: BusinessContext = {
  targetGoal: 'Demanda diaria de bowls (Bowls Vendidos)',
  decisionUse: 'Optimizar el precio del bowl y planificar compras diarias de insumos y bebidas',
  unitLabel: 'bowls',
  currencySymbol: '$',
};

export default function App() {
  const initialRows = useMemo(() => getMaosPalaceDataset(), []);
  const initialCols = useMemo(() => Object.keys(initialRows[0] ?? {}), [initialRows]);

  const [rows, setRows] = useState<DataRow[]>(initialRows);
  const [columns, setColumns] = useState<string[]>(initialCols);
  const [datasetName, setDatasetName] = useState<string>(
    "Taller – Mao's Palace (186 días)"
  );
  const [activeCaseId, setActiveCaseId] = useState<ExampleCaseId>('maos');
  const [context, setContext] = useState<BusinessContext>(MAOS_PALACE_CONTEXT);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [yCol, setYCol] = useState<string>('Bowls');
  const [simpleXCol, setSimpleXCol] = useState<string>('Bowl Price');
  const [multipleXCols, setMultipleXCols] = useState<string[]>([
    'Bowl Price',
    'Soda',
    'Beer',
  ]);
  const [customModels, setCustomModels] = useState<CustomModelDef[]>([]);

  const [seed, setSeed] = useState<number>(123);
  const [trainRatio, setTrainRatio] = useState<number>(0.8);
  const [manualActiveModelId, setManualActiveModelId] = useState<string | null>(null);
  const [priceCol, setPriceCol] = useState<string>('Bowl Price');
  const [simValues, setSimValues] = useState<Record<string, number>>({});
  const [navWarning, setNavWarning] = useState<string | null>(null);

  const profiles = useMemo(() => profileColumns(rows, columns), [rows, columns]);

  const yProfile = profiles.find((p) => p.name === yCol);
  const hasValidY =
    Boolean(yProfile) &&
    (yProfile?.kind === 'numeric_continuous' || yProfile?.kind === 'numeric_discrete');

  const candidateXCols = useMemo(
    () => profiles.filter((p) => p.kind !== 'text' && p.name !== yCol).map((p) => p.name),
    [profiles, yCol]
  );

  const safeSimpleX = candidateXCols.includes(simpleXCol)
    ? simpleXCol
    : candidateXCols[0] ?? '';

  const safeMultipleX = useMemo(() => {
    const filtered = multipleXCols.filter((c) => candidateXCols.includes(c));
    return filtered.length > 0 ? filtered : candidateXCols;
  }, [multipleXCols, candidateXCols]);

  // Fit base models
  const model0 = useMemo(() => {
    if (!hasValidY || !safeSimpleX) return null;
    return fitOLS(rows, yCol, [safeSimpleX], {
      id: 'model_0',
      name: `Modelo 0 (Simple: ${safeSimpleX})`,
      source: 'simple',
    });
  }, [rows, yCol, safeSimpleX, hasValidY]);

  const model1 = useMemo(() => {
    if (!hasValidY || safeMultipleX.length === 0) return null;
    return fitOLS(rows, yCol, safeMultipleX, {
      id: 'model_1',
      name: `Modelo 1 (Múltiple: ${safeMultipleX.length} vars)`,
      source: 'multiple',
    });
  }, [rows, yCol, safeMultipleX, hasValidY]);

  const stepwiseResult = useMemo(() => {
    if (!hasValidY || candidateXCols.length === 0) {
      return { steps: [], finalVars: [], finalModel: null };
    }
    return runStepwiseBoth(rows, yCol, candidateXCols);
  }, [rows, yCol, candidateXCols, hasValidY]);

  const bestSubsetsResult = useMemo(() => {
    if (!hasValidY || candidateXCols.length === 0) {
      return { subsets: [], bestByAdjR2: null, bestByCp: null, bestByBic: null };
    }
    return runBestSubsets(rows, yCol, candidateXCols);
  }, [rows, yCol, candidateXCols, hasValidY]);

  const rawSavedModels = useMemo(() => {
    const list: RegressionModel[] = [];
    if (model0) list.push(model0);
    if (model1) list.push(model1);
    if (
      stepwiseResult.finalModel &&
      !list.some(
        (m) =>
          m.xCols.length === stepwiseResult.finalModel!.xCols.length &&
          m.xCols.every((v) => stepwiseResult.finalModel!.xCols.includes(v))
      )
    ) {
      list.push(stepwiseResult.finalModel);
    } else if (stepwiseResult.finalModel && list.length > 0) {
      // Also include Stepwise explicitly if its name differs
      list.push({
        ...stepwiseResult.finalModel,
        id: 'model_stepwise',
        name: 'Modelo Stepwise (AIC)',
      });
    }

    for (const cm of customModels) {
      const validCols = cm.xCols.filter((c) => candidateXCols.includes(c));
      if (validCols.length === 0) continue;
      const fitted = fitOLS(rows, yCol, validCols, {
        id: cm.id,
        name: cm.name,
        source: cm.source,
      });
      if (fitted) list.push(fitted);
    }
    return list;
  }, [model0, model1, stepwiseResult.finalModel, customModels, candidateXCols, rows, yCol]);

  // Train / test split
  const split = useMemo(
    () => splitTrainTest(rows, trainRatio, seed),
    [rows, trainRatio, seed]
  );

  const evaluatedModels = useMemo(
    () =>
      rawSavedModels.map((m) =>
        evaluateModelOnSplit(m, split.trainRows, split.testRows, split.testIndices)
      ),
    [rawSavedModels, split]
  );

  // Recommend best model: lowest Test RMSE, tie-broken by lowest BIC
  const recommendedModel = useMemo(() => {
    if (evaluatedModels.length === 0) return null;
    return evaluatedModels.reduce((best, cur) => {
      const bestRmse = best.testMetrics?.rmse ?? Infinity;
      const curRmse = cur.testMetrics?.rmse ?? Infinity;
      if (Math.abs(curRmse - bestRmse) > 0.05) {
        return curRmse < bestRmse ? cur : best;
      }
      return cur.bic < best.bic ? cur : best;
    });
  }, [evaluatedModels]);

  const activeModel = useMemo(() => {
    if (manualActiveModelId) {
      const found = evaluatedModels.find((m) => m.id === manualActiveModelId);
      if (found) return found;
    }
    return recommendedModel ?? evaluatedModels[0] ?? null;
  }, [manualActiveModelId, evaluatedModels, recommendedModel]);

  // Keep simulator default values synced to variable means when dataset/model changes
  useEffect(() => {
    const defaults: Record<string, number> = {};
    for (const prof of profiles) {
      if (prof.kind !== 'text' && prof.name !== yCol) {
        defaults[prof.name] = Number((prof.mean ?? 0).toFixed(2));
      }
    }
    setSimValues((prev) => {
      const next: Record<string, number> = {};
      for (const k of Object.keys(defaults)) {
        next[k] = prev[k] !== undefined ? prev[k] : defaults[k];
      }
      return next;
    });
  }, [profiles, yCol]);

  const handleLoadDataset = (
    newRows: DataRow[],
    newCols: string[],
    name: string,
    caseId: ExampleCaseId = 'custom'
  ) => {
    setRows(newRows);
    setColumns(newCols);
    setDatasetName(name);
    setActiveCaseId(caseId);
    setCustomModels([]);
    setManualActiveModelId(null);

    const newProfs = profileColumns(newRows, newCols);
    const continuousCols = newProfs.filter((p) => p.kind === 'numeric_continuous');
    const numericCols = newProfs.filter((p) => p.kind !== 'text');

    const preferredY =
      continuousCols.find((p) => /venta|sales|bowl|ingreso|unidad|demanda/i.test(p.name))
        ?.name ??
      continuousCols[continuousCols.length - 1]?.name ??
      numericCols[0]?.name ??
      newCols[0] ??
      '';

    const nextXs = numericCols.filter((p) => p.name !== preferredY).map((p) => p.name);
    const detectedPrice =
      nextXs.find((c) => /price|precio|tarifa|valor/i.test(c)) ?? '';

    setYCol(preferredY);
    setSimpleXCol(detectedPrice || nextXs[0] || '');
    setMultipleXCols(nextXs);
    setPriceCol(detectedPrice);
    setSimValues({});
  };

  const handleLoadMaosExample = () => {
    const exRows = getMaosPalaceDataset();
    const exCols = Object.keys(exRows[0] ?? {});
    handleLoadDataset(
      exRows,
      exCols,
      "Taller – Mao's Palace (186 días)",
      'maos'
    );
    setContext(MAOS_PALACE_CONTEXT);
    setYCol('Bowls');
    setSimpleXCol('Bowl Price');
    setMultipleXCols(['Bowl Price', 'Soda', 'Beer']);
    setPriceCol('Bowl Price');
    setSeed(123);
    setTrainRatio(0.8);
  };

  const handleLoadSyntheticExample = () => {
    const exRows = generateBowlsDataset();
    const exCols = Object.keys(exRows[0] ?? {});
    handleLoadDataset(
      exRows,
      exCols,
      'Ejemplo sintético ampliado (186 días)',
      'synthetic'
    );
    setContext(SYNTHETIC_CONTEXT);
    setYCol('Bowls Vendidos');
    setSimpleXCol('Bowl Price');
    setMultipleXCols(['Bowl Price', 'Gaseosas', 'Cervezas', 'Dia Promo']);
    setPriceCol('Bowl Price');
    setSeed(123);
    setTrainRatio(0.8);
  };

  const handleClearDataset = () => {
    setRows([]);
    setColumns([]);
    setDatasetName('Sin base de datos cargada');
    setActiveCaseId('empty');
    setYCol('');
    setSimpleXCol('');
    setMultipleXCols([]);
    setCustomModels([]);
    setManualActiveModelId(null);
    setPriceCol('');
    setSimValues({});
  };

  const handleResetWorkshop = () => {
    handleLoadMaosExample();
    setCurrentStep(1);
    setMaxReachedStep(1);
    setNavWarning(null);
  };

  const handleDropMissingRows = () => {
    const cleaned = rows.filter((r) =>
      columns.every((c) => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== '')
    );
    if (cleaned.length >= 5) {
      setRows(cleaned);
    }
  };

  const handleSelectY = (col: string) => {
    setYCol(col);
    setNavWarning(null);
    const newXs = profiles
      .filter((p) => p.kind !== 'text' && p.name !== col)
      .map((p) => p.name);
    setSimpleXCol(newXs.find((c) => /price|precio/i.test(c)) ?? newXs[0] ?? '');
    setMultipleXCols(newXs);
    setCustomModels([]);
    setManualActiveModelId(null);
  };

  const handleToggleMultipleX = (col: string) => {
    setMultipleXCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSaveCustomModel = (
    name: string,
    xCols: string[],
    source: 'custom' | 'best_subset' = 'custom'
  ) => {
    const id =
      source === 'best_subset'
        ? `subset_${xCols.join('_')}`
        : `custom_${Date.now()}`;
    setCustomModels((prev) => {
      if (prev.some((m) => m.id === id)) return prev;
      return [...prev, { id, name, xCols: [...xCols], source }];
    });
  };

  const goToStep = (targetStep: number) => {
    if (targetStep > 3 && !hasValidY) {
      setNavWarning(
        'Debes seleccionar una variable dependiente (Y) numérica continua en el Paso 3 antes de avanzar al modelado lineal.'
      );
      setCurrentStep(3);
      return;
    }
    setNavWarning(null);
    const clamped = Math.max(1, Math.min(15, targetStep));
    setCurrentStep(clamped);
    setMaxReachedStep((prev) => Math.max(prev, clamped));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stepDef = CRISP_STEPS[currentStep - 1];
  const progressPct = Math.round((currentStep / 15) * 100);

  const rContext: RScriptContext = {
    yCol,
    simpleXCol: safeSimpleX,
    multipleXCols: safeMultipleX,
    allNumericXCols: candidateXCols,
    trainRatio,
    seed,
    stepwiseVars: stepwiseResult.finalVars,
    simValues,
    activeModelXCols: activeModel?.xCols ?? safeMultipleX,
  };

  const keyFinding = buildKeyFinding(currentStep, {
    rows,
    profiles,
    yCol,
    simpleXCol: safeSimpleX,
    model0,
    model1,
    evaluatedModels,
    recommendedModel,
    activeModel,
    stepwiseResult,
    bestSubsetsResult,
    seed,
    trainRatio,
    trainCount: split.trainRows.length,
    testCount: split.testRows.length,
    priceCol,
    simValues,
  });

  const rCode = getRCodeForStep(currentStep, rContext);

  return (
    <div className="min-h-screen flex flex-col text-slate-900">
      {/* Top Bar Contract: Brand wordmark — 4 concise single-line nav links — 1 primary CTA */}
      <header className="sticky top-0 z-40 h-16 bg-[#0F172A] text-white border-b border-indigo-900/60 px-4 lg:px-6 flex items-center justify-between gap-8 shadow-sm">
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-300 hover:text-white rounded-lg"
            aria-label="Abrir menú de pasos"
          >
            <Menu className="w-5 h-5" />
          </button>
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              goToStep(1);
            }}
            className="flex items-center gap-2.5 font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
              <rect x="2" y="13" width="4" height="9" rx="1.5" fill="#818CF8" />
              <rect x="9" y="8" width="4" height="14" rx="1.5" fill="#2DD4BF" />
              <rect x="16" y="4" width="4" height="18" rx="1.5" fill="#34D399" />
              <path d="M3 10L10 6L19 2" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Simulador de Pronóstico de Ventas</span>
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => goToStep(2)}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              currentStep >= 2 && currentStep <= 5 ? 'text-teal-300' : ''
            }`}
          >
            Datos
          </button>
          <button
            type="button"
            onClick={() => goToStep(7)}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              currentStep >= 6 && currentStep <= 12 ? 'text-teal-300' : ''
            }`}
          >
            Modelos
          </button>
          <button
            type="button"
            onClick={() => goToStep(13)}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              currentStep === 13 || currentStep === 14 ? 'text-teal-300' : ''
            }`}
          >
            Simulador
          </button>
          <button
            type="button"
            onClick={() => goToStep(15)}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              currentStep === 15 ? 'text-teal-300' : ''
            }`}
          >
            Exportar
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={handleResetWorkshop}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-teal-300 hover:bg-teal-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Reiniciar taller
          </button>
        </div>
      </header>

      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <WizardSidebar
          currentStep={currentStep}
          maxReachedStep={maxReachedStep}
          hasValidY={hasValidY}
          onSelectStep={goToStep}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-20">
          {/* Barra de progreso del asistente */}
          <div className="mb-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span className="font-semibold text-indigo-800">{stepDef.phase}</span>
              <span className="font-mono tabular-nums font-medium text-slate-700">
                Paso {currentStep} de 15 · {progressPct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 via-teal-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {stepDef.title}
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl">
                {stepDef.subtitle}
              </p>
            </div>
          </div>

          <WhatItMeansToggle step={stepDef} />

          {navWarning && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{navWarning}</span>
            </div>
          )}

          {/* Contenido dinámico del paso */}
          <div>
            {currentStep === 1 && (
              <Step1BusinessQuestion
                context={context}
                onChangeContext={setContext}
                activeCaseId={activeCaseId}
                rowCount={rows.length}
                onLoadMaosExample={handleLoadMaosExample}
                onLoadSyntheticExample={handleLoadSyntheticExample}
              />
            )}
            {currentStep === 2 && (
              <Step2LoadData
                rows={rows}
                columns={columns}
                profiles={profiles}
                datasetName={datasetName}
                activeCaseId={activeCaseId}
                onLoadDataset={(newRows, newCols, name) =>
                  handleLoadDataset(newRows, newCols, name, 'custom')
                }
                onLoadMaosExample={handleLoadMaosExample}
                onLoadSyntheticExample={handleLoadSyntheticExample}
                onClearDataset={handleClearDataset}
                onDropMissingRows={handleDropMissingRows}
              />
            )}
            {currentStep === 3 && (
              <Step3SelectTarget
                profiles={profiles}
                rows={rows}
                yCol={yCol}
                onSelectY={handleSelectY}
              />
            )}
            {currentStep === 4 && (
              <Step4Descriptive profiles={profiles} yCol={yCol} />
            )}
            {currentStep === 5 && (
              <Step5Correlations rows={rows} profiles={profiles} yCol={yCol} />
            )}
            {currentStep === 6 && (
              <Step6SimpleRegression
                rows={rows}
                yCol={yCol}
                candidateXCols={candidateXCols}
                simpleXCol={safeSimpleX}
                onChangeSimpleX={setSimpleXCol}
                model0={model0}
              />
            )}
            {currentStep === 7 && (
              <Step7MultipleRegression
                yCol={yCol}
                candidateXCols={candidateXCols}
                selectedXCols={safeMultipleX}
                onToggleXCol={handleToggleMultipleX}
                onSelectAllX={() => setMultipleXCols(candidateXCols)}
                model1={model1}
                onSaveCustomModel={(name, xCols) =>
                  handleSaveCustomModel(name, xCols, 'custom')
                }
              />
            )}
            {currentStep === 8 && <Step8Diagnostics models={evaluatedModels} />}
            {currentStep === 9 && (
              <Step9TrainTest
                seed={seed}
                onChangeSeed={setSeed}
                trainRatio={trainRatio}
                onChangeTrainRatio={setTrainRatio}
                trainCount={split.trainRows.length}
                testCount={split.testRows.length}
                evaluatedModels={evaluatedModels}
              />
            )}
            {currentStep === 10 && (
              <Step10Validation evaluatedModels={evaluatedModels} yCol={yCol} />
            )}
            {currentStep === 11 && (
              <Step11VariableSelection
                stepwiseResult={stepwiseResult}
                bestSubsetsResult={bestSubsetsResult}
                savedModelIds={customModels.map((c) => c.id)}
                onSaveSubsetModel={(name, xCols, source) =>
                  handleSaveCustomModel(name, xCols, source)
                }
              />
            )}
            {currentStep === 12 && (
              <Step12CompareModels
                evaluatedModels={evaluatedModels}
                recommendedModelId={recommendedModel?.id ?? ''}
                selectedActiveModelId={activeModel?.id ?? ''}
                onSelectActiveModel={setManualActiveModelId}
              />
            )}
            {currentStep === 13 && (
              <Step13Simulator
                rows={rows}
                profiles={profiles}
                models={evaluatedModels}
                activeModelId={activeModel?.id ?? ''}
                onSelectActiveModel={setManualActiveModelId}
                simValues={simValues}
                onChangeSimValues={setSimValues}
                priceCol={priceCol}
                onChangePriceCol={setPriceCol}
                context={context}
              />
            )}
            {currentStep === 14 && (
              <Step14Recommendations
                model={activeModel}
                profiles={profiles}
                priceCol={priceCol}
                context={context}
              />
            )}
            {currentStep === 15 && (
              <Step15Export
                rows={rows}
                columns={columns}
                models={evaluatedModels}
                activeModel={activeModel}
                testIndices={split.testIndices}
                context={context}
                rContext={rContext}
                priceCol={priceCol}
              />
            )}
          </div>

          {/* Hallazgo clave + Código R equivalente */}
          <KeyFindingBox finding={keyFinding.text} tone={keyFinding.tone} />
          <CollapsibleRCode code={rCode} />

          {/* Navegación Anterior / Siguiente */}
          <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => goToStep(currentStep - 1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <span className="text-xs text-slate-500 hidden sm:inline font-mono tabular-nums">
              Paso {currentStep} / 15
            </span>

            {currentStep < 15 ? (
              <button
                type="button"
                onClick={() => goToStep(currentStep + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToStep(13)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
              >
                <span>Volver al simulador</span>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
