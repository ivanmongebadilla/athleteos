import type { Locale } from "@/lib/i18n/messages";
const en = {
  title: "Progress", overview: "Overview", library: "Library", views: "Progress views", streak: "Day streak", sessions: "Sessions this month", prs: "PRs this month",
  consistency: "Training consistency", recent: "Recent PRs", movement: "Movement progress", benchmarks: "Benchmark WODs", manage: "Manage exercise library & records",
  movementLabel: "Movement", reps: "Repetitions", rep: "rep", best: "Best", versus: "vs last month", noPrevious: "No previous-month comparison yet", workout: "Workout", trend: "Trend", latest: "Latest",
  chartHint: "Best successful load per training day. Repetition counts are compared separately; the monthly comparison uses each month’s best load.", chartHistory: "View movement history", date: "Date", load: "Load",
  emptyMovement: "Your next best starts here", emptyMovementBody: "Log successful weighted sets or add a historical PR in Library to see your movement progress.",
  emptyPrs: "Your personal records will appear here as you log successful lifts, improve a benchmark time, or add historical PRs.",
  emptyBenchmarks: "No benchmark results yet", benchmarkHelp: "Name a session or start its WOD instructions with a benchmark name, such as Fran or Grace, then log a For Time result. Trends keep prescriptions and RX/scaled results separate.",
  onePoint: "Log another training day to see a trend.", noComparison: "First result", scaled: "Scaled", rest: "No logged training", activity: "logged sessions", days: "days trained", last56: "of the last 56 days", basis: "Training dates are used for consistency. Session totals count completed sessions; streaks include partially logged days. PRs compare the same movement and repetition count.",
  units: "Loads shown in your profile’s preferred units.",
};
const es: Record<keyof typeof en, string> = {
  title: "Progreso", overview: "Resumen", library: "Biblioteca", views: "Vistas del progreso", streak: "Días de racha", sessions: "Sesiones este mes", prs: "Récords este mes",
  consistency: "Constancia de entrenamiento", recent: "Récords recientes", movement: "Progreso por movimiento", benchmarks: "WODs de referencia", manage: "Gestionar biblioteca de ejercicios y récords",
  movementLabel: "Movimiento", reps: "Repeticiones", rep: "rep", best: "Mejor", versus: "vs. el mes pasado", noPrevious: "Aún no hay comparación con el mes pasado", workout: "Entrenamiento", trend: "Tendencia", latest: "Último",
  chartHint: "Mejor carga lograda por día de entrenamiento. Las repeticiones se comparan por separado; la comparación mensual usa la mejor carga de cada mes.", chartHistory: "Ver historial del movimiento", date: "Fecha", load: "Carga",
  emptyMovement: "Tu próximo logro empieza aquí", emptyMovementBody: "Registra series con carga logradas o añade un récord histórico en Biblioteca para ver tu progreso.",
  emptyPrs: "Tus récords aparecerán aquí al registrar levantamientos logrados, mejorar un tiempo de referencia o añadir récords históricos.",
  emptyBenchmarks: "Aún no hay resultados de referencia", benchmarkHelp: "Nombra una sesión o comienza las instrucciones del WOD con un nombre de referencia, como Fran o Grace, y registra un resultado Por tiempo. Las tendencias separan las prescripciones y los resultados RX y escalados.",
  onePoint: "Registra otro día de entrenamiento para ver una tendencia.", noComparison: "Primer resultado", scaled: "Escalado", rest: "Sin entrenamiento registrado", activity: "sesiones registradas", days: "días entrenados", last56: "de los últimos 56 días", basis: "La constancia usa las fechas de entrenamiento. El total cuenta sesiones completadas; la racha incluye días con registros parciales. Los récords comparan el mismo movimiento y número de repeticiones.",
  units: "Las cargas se muestran en las unidades preferidas de tu perfil.",
};
export function progressMessages(locale: Locale) { return locale === "es" ? es : en; }
