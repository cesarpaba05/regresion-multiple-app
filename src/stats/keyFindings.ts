import {
  BestSubsetRow,
  ColumnProfile,
  DataRow,
  RegressionModel,
  StepwiseStep,
} from '../types/analytics';
import {
  computeCorrelationMatrix,
} from './regression';
import {
  formatCompactCO,
  formatIntCO,
  formatNumberCO,
  formatPercentCO,
  formatPValueCO,
} from './format';

export interface KeyFindingResult {
  text: string;
  tone: 'neutral' | 'positive' | 'warning';
}

export function buildKeyFinding(
  step: number,
  params: {
    rows: DataRow[];
    profiles: ColumnProfile[];
    yCol: string;
    simpleXCol: string;
    model0: RegressionModel | null;
    model1: RegressionModel | null;
    evaluatedModels: RegressionModel[];
    recommendedModel: RegressionModel | null;
    activeModel: RegressionModel | null;
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
    seed: number;
    trainRatio: number;
    trainCount: number;
    testCount: number;
    priceCol: string;
    simValues: Record<string, number>;
  }
): KeyFindingResult {
  const {
    rows,
    profiles,
    yCol,
    simpleXCol,
    model0,
    model1,
    evaluatedModels,
    recommendedModel,
    activeModel,
    stepwiseResult,
    bestSubsetsResult,
    seed,
    trainRatio,
    trainCount,
    testCount,
  } = params;

  const yProfile = profiles.find((p) => p.name === yCol);
  const numericProfiles = profiles.filter((p) => p.kind !== 'text');
  const totalMissing = profiles.reduce((acc, p) => acc + p.missingCount, 0);

  switch (step) {
    case 1:
      return {
        text: `Tienes cargada una base de ${formatIntCO(rows.length)} registros para responder qué variables impulsan ${yCol || 'tus ventas'}. Medir el efecto de cada palanca evita proyecciones ciegas como "+20% al año pasado".`,
        tone: 'neutral',
      };

    case 2:
      return {
        text: `La base cuenta con ${formatIntCO(rows.length)} filas, ${formatIntCO(numericProfiles.length)} columnas numéricas utilizables en regresión y ${
          totalMissing === 0
            ? 'cero datos faltantes (NA), por lo que no perderás registros al modelar.'
            : `${formatIntCO(totalMissing)} celdas vacías (NA) que conviene revisar o limpiar.`
        }`,
        tone: totalMissing === 0 ? 'positive' : 'warning',
      };

    case 3:
      if (!yProfile || yProfile.kind === 'text' || yProfile.kind === 'numeric_binary') {
        return {
          text: `La columna "${yCol}" no es numérica continua. Cambia a una métrica de volumen o dinero antes de avanzar al análisis descriptivo y al modelado lineal.`,
          tone: 'warning',
        };
      }
      return {
        text: `La variable objetivo "${yCol}" es numérica continua y varía entre ${formatCompactCO(
          yProfile.min,
          1
        )} y ${formatCompactCO(yProfile.max, 1)} (promedio ${formatNumberCO(
          yProfile.mean,
          1
        )}), lo que permite usar regresión lineal con confianza.`,
        tone: 'positive',
      };

    case 4: {
      const priceProf = profiles.find((p) => p.name === 'Bowl Price') ?? numericProfiles.find((p) => p.name !== yCol);
      if (priceProf) {
        return {
          text: `Regla de negocio clave: "${priceProf.name}" solo se observó entre ${formatCompactCO(
            priceProf.min,
            2
          )} y ${formatCompactCO(
            priceProf.max,
            2
          )} (desviación ${formatNumberCO(
            priceProf.sd,
            2
          )}). Cualquier simulación fuera de esos rangos históricos será extrapolación.`,
          tone: 'neutral',
        };
      }
      return {
        text: `Los rangos mínimo y máximo observados definen las reglas de negocio seguras dentro de las cuales el modelo tiene respaldo histórico.`,
        tone: 'neutral',
      };
    }

    case 5: {
      const cols = numericProfiles.map((p) => p.name);
      const corr = computeCorrelationMatrix(rows, cols);
      const yIdx = corr.variables.indexOf(yCol);
      let topX = '';
      let topR = 0;
      if (yIdx >= 0) {
        corr.variables.forEach((v, idx) => {
          if (idx !== yIdx && Math.abs(corr.matrix[yIdx][idx]) > Math.abs(topR)) {
            topR = corr.matrix[yIdx][idx];
            topX = v;
          }
        });
      }
      return {
        text: topX
          ? `La relación lineal más fuerte con ${yCol} la tiene "${topX}" (r = ${formatNumberCO(
              topR,
              2
            )}, relación ${
              topR >= 0 ? 'positiva' : 'negativa'
            }). Revisa también las correlaciones entre las X para entender qué palancas se mueven juntas.`
          : `Observa los pares con mayor |r| frente a ${yCol} y verifica si existen variables explicativas muy correlacionadas entre sí.`,
        tone: 'neutral',
      };
    }

    case 6: {
      if (!model0 || model0.coefficients.length < 2) {
        return {
          text: `Elige una variable explicativa numérica para construir el Modelo 0 y medir cuánto explica por sí sola.`,
          tone: 'warning',
        };
      }
      const slope = model0.coefficients[1].estimate;
      return {
        text: `Por sí sola, "${simpleXCol}" explica el ${formatPercentCO(
          model0.rSquared * 100,
          1
        )} de la variación de ${yCol}: cada unidad adicional ${
          slope >= 0 ? 'suma' : 'resta'
        } ${formatNumberCO(Math.abs(slope), 2)} unidades, con un error típico de ±${formatNumberCO(
          model0.residualStdError,
          1
        )}.`,
        tone: 'neutral',
      };
    }

    case 7: {
      if (!model1) {
        return {
          text: `Activa al menos una variable X para estimar el modelo de regresión múltiple.`,
          tone: 'warning',
        };
      }
      const sigCount = model1.coefficients.filter(
        (c) => c.term !== '(Intercept)' && c.significant
      ).length;
      const r2Gain = model0 ? (model1.adjRSquared - model0.adjRSquared) * 100 : 0;
      return {
        text: `El Modelo 1 alcanza un R² ajustado de ${formatPercentCO(
          model1.adjRSquared * 100,
          1
        )} (${
          r2Gain >= 0 ? `+${formatNumberCO(r2Gain, 1)} pp` : `${formatNumberCO(r2Gain, 1)} pp`
        } frente al Modelo 0) con ${sigCount} de ${model1.p} variables estadísticamente significativas (p < 0,05) y prueba F global p ${formatPValueCO(
          model1.fPValue
        )}.`,
        tone: model1.fPValue < 0.05 ? 'positive' : 'warning',
      };
    }

    case 8: {
      const m = model1 ?? model0;
      if (!m) {
        return { text: `Ajusta un modelo para evaluar sus supuestos.`, tone: 'warning' };
      }
      const dwOk = m.durbinWatson > 1.8;
      const inflCount = m.diagnostics.filter((d) => d.isInfluential).length;
      return {
        text: `El estadístico de Durbin-Watson es ${formatNumberCO(
          m.durbinWatson,
          2
        )} (${
          dwOk
            ? 'mayor a 1,8: no hay autocorrelación relevante en los errores'
            : 'menor o igual a 1,8: conviene revisar posible dependencia temporal'
        }). Se detectaron ${formatIntCO(inflCount)} observaciones influyentes según distancia de Cook y contamos con ${formatNumberCO(
          m.n / Math.max(1, m.p),
          1
        )} datos por variable.`,
        tone: dwOk ? 'positive' : 'warning',
      };
    }

    case 9:
      return {
        text: `Con semilla ${seed} y división ${Math.round(trainRatio * 100)}/${Math.round(
          (1 - trainRatio) * 100
        )}, quedaron ${formatIntCO(trainCount)} registros en entrenamiento y ${formatIntCO(
          testCount
        )} reservados en prueba. Revisa en la tabla confint() cuáles variables mantienen su intervalo sin cruzar el cero.`,
        tone: 'neutral',
      };

    case 10: {
      const valid = evaluatedModels.filter((m) => m.testMetrics);
      if (valid.length === 0) {
        return { text: `No hay modelos evaluados en prueba todavía.`, tone: 'warning' };
      }
      const best = valid.reduce((a, b) =>
        (b.testMetrics?.rmse ?? Infinity) < (a.testMetrics?.rmse ?? Infinity) ? b : a
      );
      return {
        text: `En datos que nunca vio, el ganador es "${best.name}" con RMSE de ${formatNumberCO(
          best.testMetrics?.rmse,
          2
        )}, MAE de ${formatNumberCO(best.testMetrics?.mae, 2)} y MAPE de ${formatPercentCO(
          best.testMetrics?.mape,
          2
        )}.`,
        tone: 'positive',
      };
    }

    case 11: {
      const sw = stepwiseResult.finalModel;
      const bicBest = bestSubsetsResult.bestByBic;
      return {
        text: `Stepwise por AIC selecciona ${
          sw ? `${sw.p} variables (${sw.xCols.join(', ')}) con AIC = ${formatNumberCO(sw.aic, 1)}` : 'un subconjunto óptimo'
        }${
          bicBest
            ? `; por su parte, el criterio BIC recomienda ${bicBest.size} variables (${bicBest.vars.join(', ')})`
            : ''
        }.`,
        tone: 'positive',
      };
    }

    case 12:
      return {
        text: recommendedModel
          ? `Se recomienda "${recommendedModel.name}" porque logra el mejor equilibrio entre menor error fuera de muestra (RMSE prueba = ${formatNumberCO(
              recommendedModel.testMetrics?.rmse,
              2
            )}) y menor BIC (${formatNumberCO(recommendedModel.bic, 1)}).`
          : `Compara los modelos y elige el de menor error en prueba.`,
        tone: 'positive',
      };

    case 13:
      return {
        text: activeModel
          ? `Estás simulando con "${activeModel.name}". Mantén las palancas dentro del rango histórico para decisiones inmediatas, y revisa en la tabla de precios el punto donde el ingreso estimado alcanza su máximo.`
          : `Ajusta los controles para simular escenarios comerciales.`,
        tone: 'neutral',
      };

    case 14:
      return {
        text: activeModel
          ? `Con un margen operativo de ±${formatNumberCO(
              2 * activeModel.residualStdError,
              1
            )} unidades (±2 errores estándar), el equipo puede alinear compras de inventario, turnos y stock de bebidas con base cuantitativa.`
          : `Revisa las recomendaciones operativas para implementar el modelo.`,
        tone: 'positive',
      };

    case 15:
    default:
      return {
        text: `Todo el análisis es reproducible y exportable: comparte el informe HTML con gerencia, entrega el CSV con residuos al equipo de planeación y conserva el script .R para auditoría técnica.`,
        tone: 'positive',
      };
  }
}
