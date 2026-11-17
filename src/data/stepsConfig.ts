export interface StepDefinition {
  id: number;
  phase: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  whatItMeansTitle: string;
  whatItMeansBody: string;
  whatItMeansExample: string;
}

export const CRISP_STEPS: StepDefinition[] = [
  {
    id: 1,
    phase: '1. Comprensión del negocio',
    shortTitle: 'Pregunta de negocio',
    title: 'Paso 1. Pregunta de negocio y caso de estudio',
    subtitle: 'Define qué quieres pronosticar, para qué decisión operativa lo necesitas y por qué la intuición no basta.',
    whatItMeansTitle: '¿Por qué modelar en lugar de sumar 20% al año pasado?',
    whatItMeansBody:
      'Multiplicar las ventas anteriores por un porcentaje fijo asume que el precio, la competencia, el tráfico y las promociones nunca cambian. La regresión lineal mide cuánto aporta cada palanca real del negocio para tomar decisiones con respaldo numérico.',
    whatItMeansExample:
      'Si subes el precio de un bowl de $8,50 a $9,50, no venderás "un 20% más" solo porque el año pasado creciste; probablemente caerán las unidades vendidas y cambiarán las bebidas acompañantes.',
  },
  {
    id: 2,
    phase: '2. Comprensión de los datos',
    shortTitle: 'Cargar datos',
    title: 'Paso 2. Cargar datos, vista previa y tipos de variables',
    subtitle: 'Importa tu archivo CSV o Excel (XLSX) o trabaja con la base precargada de 186 días del restaurante.',
    whatItMeansTitle: '¿Qué revisamos en str() y valores faltantes (NA)?',
    whatItMeansBody:
      'Antes de calcular promedios o rectas, verificamos cuántas filas y columnas tenemos, qué columnas son números reales frente a fechas o texto, y si existen celdas vacías que puedan sesgar o impedir el cálculo.',
    whatItMeansExample:
      'Si una columna tiene texto como "Lunes" o símbolos de moneda mal escritos, el modelo no podrá multiplicarla hasta que se convierta o se excluya. Las celdas vacías (NA) se omiten de la fila al ajustar el modelo.',
  },
  {
    id: 3,
    phase: '3. Preparación de datos',
    shortTitle: 'Elegir variable Y',
    title: 'Paso 3. Elegir la variable dependiente (Y)',
    subtitle: 'Selecciona la métrica numérica continua que deseas explicar y pronosticar.',
    whatItMeansTitle: '¿Por qué Y debe ser numérica y continua?',
    whatItMeansBody:
      'La regresión lineal predice cantidades sin límites rígidos (ventas en unidades, ingresos en pesos o dólares). Si intentas predecir un "Sí/No" o "0/1", una recta puede arrojar valores imposibles como -0,3 o 1,4 y un R² engañoso.',
    whatItMeansExample:
      '"Bowls Vendidos" (ej. 135, 162, 190) sí sirve para regresión lineal. En cambio, "Dia Promo" (0 o 1) es una categoría binaria que requiere regresión logística.',
  },
  {
    id: 4,
    phase: '2. Comprensión de los datos',
    shortTitle: 'Descriptivo y rangos',
    title: 'Paso 4. Análisis descriptivo y reglas de negocio',
    subtitle: 'Revisa mínimos, máximos, promedios, medianas y dispersión para conocer los límites reales de tu operación.',
    whatItMeansTitle: '¿Para qué sirven summary() y describe()?',
    whatItMeansBody:
      'La media muestra el nivel típico; la mediana es el punto medio resistente a días extremos; la desviación estándar indica qué tanto fluctúa cada día; y el mínimo/máximo definen el "terreno conocido" donde el modelo tiene evidencia.',
    whatItMeansExample:
      'Si "Bowl Price" solo se observó entre $8,00 y $10,00 durante 186 días, esa es tu regla de negocio: predecir a $15,00 es adivinar fuera del rango observado.',
  },
  {
    id: 5,
    phase: '2. Comprensión de los datos',
    shortTitle: 'Correlaciones',
    title: 'Paso 5. Correlaciones y relación entre variables',
    subtitle: 'Explora cómo se mueve Y frente a cada X y detecta variables explicativas que se mueven juntas.',
    whatItMeansTitle: '¿Qué es la correlación (r) y la multicolinealidad?',
    whatItMeansBody:
      'La correlación r va de -1 a +1: cerca de +1 suben juntas; cerca de -1 una sube y la otra baja; cerca de 0 no hay relación lineal. Recuerda: correlación no implica causalidad. Si dos X tienen correlación alta entre sí, se llama multicolinealidad y dificulta separar el efecto individual de cada una.',
    whatItMeansExample:
      'Cuando baja el precio del bowl, más clientes compran almuerzo y también piden más gaseosas. Por eso "Bowl Price" y "Gaseosas" tienen correlación negativa entre sí.',
  },
  {
    id: 6,
    phase: '4. Modelado',
    shortTitle: 'Regresión simple',
    title: 'Paso 6. Regresión lineal simple (Modelo 0)',
    subtitle: 'Construye tu línea base usando una sola variable explicativa para entender la relación directa.',
    whatItMeansTitle: '¿Cómo se lee la ecuación Y = b₀ + b₁·X?',
    whatItMeansBody:
      'El intercepto (b₀) es el valor base teórico cuando X vale cero. La pendiente (b₁) indica cuánto cambia Y por cada unidad que aumenta X. El R² dice qué porcentaje de la variación diaria de Y explica esa sola variable.',
    whatItMeansExample:
      'Si la pendiente de "Bowl Price" es -25, significa que sin controlar por otras variables, cada dólar extra de precio se asocia con 25 bowls menos al día.',
  },
  {
    id: 7,
    phase: '4. Modelado',
    shortTitle: 'Regresión múltiple',
    title: 'Paso 7. Regresión lineal múltiple (Modelo 1)',
    subtitle: 'Combina varias variables a la vez para aislar el efecto limpio de cada palanca (ceteris paribus).',
    whatItMeansTitle: '¿Qué significan el p-value, R² ajustado, F, AIC y BIC?',
    whatItMeansBody:
      'Cada coeficiente mide el efecto de esa variable manteniendo constantes las demás. Si p < 0,05 (verde), hay evidencia estadística de que la variable aporta al modelo. El R² ajustado penaliza agregar variables inútiles. AIC y BIC comparan calidad vs. complejidad (menor es mejor).',
    whatItMeansExample:
      'Al incluir Gaseosas y Cervezas junto con el precio, ves el impacto limpio del precio: por ejemplo, cada dólar adicional en Bowl Price reduce las ventas en ~14 bowls manteniendo iguales las bebidas.',
  },
  {
    id: 8,
    phase: '5. Evaluación',
    shortTitle: 'Supuestos y diagnóstico',
    title: 'Paso 8. Supuestos del modelo y diagnóstico de residuos',
    subtitle: 'Verifica que el modelo no tenga sesgos sistemáticos, errores correlacionados o días atípicos que distorsionen la recta.',
    whatItMeansTitle: '¿Para qué revisamos los 4 gráficos de R y Durbin-Watson?',
    whatItMeansBody:
      '1) Residuos vs. Ajustados debe verse como una nube sin curvas (linealidad). 2) Q-Q Normal verifica si los errores siguen campana normal. 3) Escala-Localización revisa que el error sea parejo (homocedasticidad). 4) Apalancamiento y distancia de Cook detectan días influyentes. Durbin-Watson > 1,8 confirma que el error de hoy no depende del de ayer.',
    whatItMeansExample:
      'Además, necesitas al menos 10 a 15 datos por cada variable independiente para no sobreajustar. Con 186 días y 3 o 4 variables, superamos ampliamente ese mínimo.',
  },
  {
    id: 9,
    phase: '5. Evaluación',
    shortTitle: 'Entrenamiento y prueba',
    title: 'Paso 9. División entrenamiento/prueba e intervalos de confianza',
    subtitle: 'Separa una parte de los días para validar el modelo con datos que nunca vio y revisa el confint() al 95%.',
    whatItMeansTitle: '¿Por qué dividir con semilla y revisar si el intervalo incluye al cero?',
    whatItMeansBody:
      'La semilla garantiza que la partición aleatoria (ej. 80% entrenamiento / 20% prueba) sea exactamente repetible. Con confint() calculamos el rango probable del efecto real: si el intervalo del 95% NO contiene al 0, la variable sí influye de forma consistente.',
    whatItMeansExample:
      'Si el intervalo de "Bowl Price" va de -16,5 a -11,8, estamos 95% seguros de que subir $1 reduce las ventas; nunca pasa por 0. En cambio, un intervalo de -2,1 a +4,5 cruza el cero y no es concluyente.',
  },
  {
    id: 10,
    phase: '5. Evaluación',
    shortTitle: 'Validación en prueba',
    title: 'Paso 10. Predicción y validación fuera de muestra',
    subtitle: 'Mide el error real (RMSE, MAE y MAPE) al pronosticar sobre los días reservados en prueba.',
    whatItMeansTitle: '¿Por qué gana el modelo con menor RMSE en prueba?',
    whatItMeansBody:
      'Un modelo puede memorizar el pasado y sacar alto R² en entrenamiento, pero fallar en datos nuevos. RMSE mide el error típico en las mismas unidades que Y penalizando fallos grandes; MAE es el error promedio absoluto; MAPE es el porcentaje promedio de error.',
    whatItMeansExample:
      'Si el Modelo 1 tiene RMSE de 7,1 bowls en prueba frente a 11,4 bowls del Modelo 0, el Modelo 1 pronostica con mayor precisión en días que no había visto.',
  },
  {
    id: 11,
    phase: '4. Modelado',
    shortTitle: 'Selección de variables',
    title: 'Paso 11. Selección automática: Stepwise y Best Subsets',
    subtitle: 'Encuentra el equilibrio óptimo entre precisión y simplicidad eliminando variables que no aportan.',
    whatItMeansTitle: '¿En qué se diferencian step() y regsubsets()?',
    whatItMeansBody:
      'Stepwise ("both") prueba quitar o agregar variables paso a paso buscando bajar el AIC. Best Subsets evalúa todas las combinaciones posibles para 1, 2, 3... variables y compara R² ajustado (mayor mejor), Cp de Mallows (menor mejor) y BIC (menor mejor).',
    whatItMeansExample:
      'Si una variable como "Dia Promo" no aporta después de conocer el precio, Stepwise la retira y BIC premia el modelo más limpio y fácil de operar.',
  },
  {
    id: 12,
    phase: '5. Evaluación',
    shortTitle: 'Comparar modelos',
    title: 'Paso 12. Tabla comparativa y elección del modelo ganador',
    subtitle: 'Compara todos los modelos guardados lado a lado y selecciona cuál impulsará el simulador.',
    whatItMeansTitle: '¿Cómo elegir entre modelos parecidos?',
    whatItMeansBody:
      'Busca primero el menor RMSE en el conjunto de prueba (desempeño real). Ante empates técnicos, prefiere el modelo con menor BIC/AIC y menos variables (principio de parsimonia): es más estable y más barato de mantener.',
    whatItMeansExample:
      'Si el modelo Stepwise con 3 variables logra prácticamente el mismo RMSE en prueba que el completo de 4, pero con mejor BIC, es el ganador recomendado para el equipo comercial.',
  },
  {
    id: 13,
    phase: '6. Despliegue',
    shortTitle: 'Simulador de escenarios',
    title: 'Paso 13. Simulador de escenarios ("mover las palancas")',
    subtitle: 'Prueba cambios en precios y variables comerciales con alertas automáticas si sales del rango histórico.',
    whatItMeansTitle: '¿Qué es el intervalo ±2 SE, la extrapolación y la tabla de precios?',
    whatItMeansBody:
      'El simulador predice las ventas esperadas y muestra un rango probable (±2 errores estándar residuales). Si activas ampliar los controles fuera del mínimo y máximo observados, entras en extrapolación (riesgo alto). También puedes simular si las variables acompañantes se quedan fijas o se ajustan según su relación histórica.',
    whatItMeansExample:
      'Al bajar el precio del bowl de $9,50 a $8,50, aumentan los bowls y, si activas el ajuste automático, también suben las gaseosas asociadas. La tabla de precios te muestra en qué precio se maximiza el ingreso total (precio × cantidad).',
  },
  {
    id: 14,
    phase: '6. Despliegue',
    shortTitle: 'Recomendaciones',
    title: 'Paso 14. Recomendaciones operativas y próximos pasos',
    subtitle: 'Traduce las ecuaciones estadísticas en decisiones concretas de precios, compras, turnos y bodega.',
    whatItMeansTitle: '¿Cómo pasa un modelo estadístico a la operación diaria?',
    whatItMeansBody:
      'Un pronóstico solo genera valor cuando se conecta con decisiones reales: cuánto inventario pedir, cuántos cocineros programar en turno, qué nivel de stock de bebidas acompañantes mantener y qué nuevas variables conviene medir el próximo trimestre.',
    whatItMeansExample:
      'Usar la banda superior del pronóstico (+2 SE) para asegurar insumos críticos sin desabastecimiento, y planear la recolección de datos de día de la semana o precios de locales vecinos.',
  },
  {
    id: 15,
    phase: '6. Despliegue',
    shortTitle: 'Exportar',
    title: 'Paso 15. Exportar informe ejecutivo, datos y código R',
    subtitle: 'Descarga el reporte HTML listo para presentar, el CSV con predicciones y residuos, y el script completo de R.',
    whatItMeansTitle: '¿Qué incluye cada exportación?',
    whatItMeansBody:
      'El informe HTML reúne resumen ejecutivo, ecuaciones, tablas de evaluación, simulación de precios y recomendaciones en un único archivo autocontenido. El CSV entrega fila por fila el valor real, el pronóstico, el residuo y si perteneció a entrenamiento o prueba.',
    whatItMeansExample:
      'Puedes abrir el informe HTML en cualquier navegador e imprimirlo como PDF para la junta directiva, y enviar el script .R al equipo analítico para auditoría.',
  },
];
