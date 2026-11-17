import { quoteRVar } from './format';

export interface RScriptContext {
  yCol: string;
  simpleXCol: string;
  multipleXCols: string[];
  allNumericXCols: string[];
  trainRatio: number;
  seed: number;
  stepwiseVars: string[];
  simValues: Record<string, number>;
  activeModelXCols: string[];
}

export function getRCodeForStep(step: number, ctx: RScriptContext): string {
  const yR = quoteRVar(ctx.yCol || 'Bowls Vendidos');
  const x0R = quoteRVar(ctx.simpleXCol || 'Bowl Price');
  const xMultTerms =
    ctx.multipleXCols.length > 0
      ? ctx.multipleXCols.map(quoteRVar).join(' + ')
      : x0R;
  const xAllTerms =
    ctx.allNumericXCols.length > 0
      ? ctx.allNumericXCols.map(quoteRVar).join(' + ')
      : x0R;
  const activeVars =
    ctx.activeModelXCols.length > 0 ? ctx.activeModelXCols : ctx.multipleXCols;
  const activeTerms =
    activeVars.length > 0 ? activeVars.map(quoteRVar).join(' + ') : x0R;
  const numColsVector = [ctx.yCol, ...ctx.allNumericXCols]
    .filter(Boolean)
    .map((c) => `"${c}"`)
    .join(', ');

  switch (step) {
    case 1:
      return `# Paso 1: Configurar entorno y definir la pregunta de negocio
# Variable objetivo (Y): ${ctx.yCol || 'Bowls Vendidos'}
# En lugar de aplicar un crecimiento fijo (+20%), modelamos el efecto de cada variable.
library(tidyverse)
library(psych)
library(corrplot)
library(lmtest)
library(leaps)`;

    case 2:
      return `# Paso 2: Cargar datos, inspeccionar estructura y valores faltantes
datos <- read.csv("datos_ventas.csv", check.names = FALSE)
head(datos, 10)
str(datos)
colSums(is.na(datos))`;

    case 3:
      return `# Paso 3: Verificar que la variable dependiente Y sea numérica continua
class(datos[[${JSON.stringify(ctx.yCol || 'Bowls Vendidos')}]])
is.numeric(datos[[${JSON.stringify(ctx.yCol || 'Bowls Vendidos')}]])
hist(datos[[${JSON.stringify(ctx.yCol || 'Bowls Vendidos')}]],
     main = "Distribución de ${ctx.yCol || 'Y'}", xlab = "${ctx.yCol || 'Y'}")`;

    case 4:
      return `# Paso 4: Estadística descriptiva y rangos observados (reglas de negocio)
datos_num <- datos[, c(${numColsVector})]
summary(datos_num)
psych::describe(datos_num)`;

    case 5:
      return `# Paso 5: Matriz de correlaciones y diagramas de dispersión
mat_cor <- cor(datos_num, use = "complete.obs")
round(mat_cor, 3)

corrplot::corrplot(mat_cor, method = "circle", type = "upper",
                   addCoef.col = "black", tl.col = "black", number.cex = 0.8)

# Dispersión de Y contra cada X
pairs(datos_num, main = "Relaciones bivariadas")`;

    case 6:
      return `# Paso 6: Regresión lineal simple (Modelo 0)
modelo_0 <- lm(${yR} ~ ${x0R}, data = datos)
summary(modelo_0)
AIC(modelo_0)
BIC(modelo_0)

plot(datos[[${JSON.stringify(ctx.simpleXCol || 'Bowl Price')}]], datos[[${JSON.stringify(ctx.yCol || 'Bowls Vendidos')}]],
     xlab = "${ctx.simpleXCol}", ylab = "${ctx.yCol}", pch = 19)
abline(modelo_0, col = "steelblue", lwd = 2)`;

    case 7:
      return `# Paso 7: Regresión lineal múltiple (Modelo 1)
modelo_1 <- lm(${yR} ~ ${xMultTerms}, data = datos)
summary(modelo_1)
AIC(modelo_1)
BIC(modelo_1)`;

    case 8:
      return `# Paso 8: Diagnóstico de supuestos y autocorrelación
par(mfrow = c(2, 2))
plot(modelo_1)

# Prueba de autocorrelación de errores (regla práctica: DW > 1.8)
lmtest::dwtest(modelo_1)

# Puntos influyentes (distancia de Cook)
cooks_d <- cooks.distance(modelo_1)
which(cooks_d > 4 / nrow(datos))`;

    case 9:
      return `# Paso 9: Partición entrenamiento/prueba reproducible e intervalos de confianza
set.seed(${ctx.seed})
idx_train <- sample(seq_len(nrow(datos)), size = floor(${ctx.trainRatio} * nrow(datos)))
train <- datos[idx_train, ]
test  <- datos[-idx_train, ]

modelo_0_train <- lm(${yR} ~ ${x0R}, data = train)
modelo_1_train <- lm(${yR} ~ ${xMultTerms}, data = train)

confint(modelo_1_train, level = 0.95)`;

    case 10:
      return `# Paso 10: Predicción y error en datos de prueba
pred_m0 <- predict(modelo_0_train, newdata = test)
pred_m1 <- predict(modelo_1_train, newdata = test)
y_real  <- test[[${JSON.stringify(ctx.yCol)}]]

rmse <- function(y, yhat) sqrt(mean((y - yhat)^2, na.rm = TRUE))
mae  <- function(y, yhat) mean(abs(y - yhat), na.rm = TRUE)
mape <- function(y, yhat) mean(abs((y - yhat) / y), na.rm = TRUE) * 100

c(RMSE_M0 = rmse(y_real, pred_m0), RMSE_M1 = rmse(y_real, pred_m1))
c(MAE_M0  = mae(y_real, pred_m0),  MAE_M1  = mae(y_real, pred_m1))`;

    case 11:
      return `# Paso 11: Selección automática de variables (Stepwise y Best Subsets)
modelo_full <- lm(${yR} ~ ${xAllTerms}, data = datos)
modelo_step <- step(modelo_full, direction = "both")
summary(modelo_step)

# Búsqueda exhaustiva de mejores subconjuntos
subconjuntos <- leaps::regsubsets(${yR} ~ ${xAllTerms}, data = datos, nvmax = ${Math.max(1, ctx.allNumericXCols.length)})
res_sub <- summary(subconjuntos)
data.frame(AdjR2 = res_sub$adjr2, Cp = res_sub$cp, BIC = res_sub$bic)`;

    case 12:
      return `# Paso 12: Comparación de modelos candidatos
modelos <- list(Modelo_0 = modelo_0, Modelo_1 = modelo_1, Stepwise = modelo_step)
sapply(modelos, function(m) c(R2 = summary(m)$r.squared,
                              R2_adj = summary(m)$adj.r.squared,
                              AIC = AIC(m),
                              BIC = BIC(m)))`;

    case 13: {
      const colsAssign = activeVars
        .map((v) => `  ${quoteRVar(v)} = ${(ctx.simValues[v] ?? 0).toFixed(2)}`)
        .join(',\n');
      return `# Paso 13: Simulador de escenarios con el modelo ganador
modelo_ganador <- lm(${yR} ~ ${activeTerms}, data = datos)
nuevo_escenario <- data.frame(
${colsAssign},
  check.names = FALSE
)

predict(modelo_ganador, newdata = nuevo_escenario, interval = "prediction", level = 0.95)`;
    }

    case 14:
      return `# Paso 14: Resumen de elasticidades e impacto operativo
coef(modelo_ganador)
confint(modelo_ganador)`;

    case 15:
    default:
      return `# Paso 15: Script completo reproducible y exportación de predicciones
modelo_final <- lm(${yR} ~ ${activeTerms}, data = train)
datos$Prediccion <- predict(modelo_final, newdata = datos)
datos$Residuo    <- datos[[${JSON.stringify(ctx.yCol)}]] - datos$Prediccion
write.csv(datos, "predicciones_ventas.csv", row.names = FALSE)`;
  }
}

export function buildFullRScript(ctx: RScriptContext): string {
  const parts: string[] = [
    '# ============================================================================',
    '# Simulador de Pronóstico de Ventas - Script R Reproducible (Metodología CRISP-DM)',
    '# ============================================================================',
    '',
  ];
  for (let s = 1; s <= 15; s++) {
    parts.push(getRCodeForStep(s, ctx));
    parts.push('');
  }
  return parts.join('\n');
}
