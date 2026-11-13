import type { Locale } from "@/lib/i18n/messages";
function formatTotal(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
const en = {
  everyMinutes: "Every (min)",
  emomSummary: (seconds: number, rounds: number) => `Every ${formatTotal(seconds)} × ${rounds} rounds · ${formatTotal(seconds * rounds)} total`,
  publishSession: "Publish session", saveDraft: "Save draft", savePublish: "Save & publish",
  publishHint: "Ready to train. Saving enables result logging for this session. Only you can see it.",
  publishRestHint: "Saving confirms this rest day on your calendar. Only you can see it.",
  draftHint: "Save your plan to finish later. Publish it when ready to log results. Only you can see it.",
  blockOptions: "Block options", durationMinutes: "Duration (min)", totalMinutes: "Total time (optional, min)", roundCount: "Number of rounds",
  workSeconds: "Work (sec)", restSeconds: "Rest (sec)",
  tabataSummary: (rounds: number, work: number, rest: number) => `${rounds} rounds · ${work}s work / ${rest}s rest (${formatTotal(rounds * (work + rest))} total)`,
  collapse: "Collapse section", expand: "Expand section",
  details: "Session details", blocks: "TODAY’S BLOCKS", addBlock: "ADD A BLOCK", wod: "WOD", movement: "Movement", addMovement: "Add movement", prescription: "Sets × reps", detail: "Details / load", capMinutes: "Time cap (min)", blockHint: "Add blocks independently. A session can be just a WOD, just strength, or any combination.", emptyTitle: "Build your training day", emptyBody: "Choose a block above to get started. Add only what you need for this session.", noBlocks: "No blocks added yet", preview: "Preview", save: "Save session", close: "Close preview", more: "More options", advanced: "Individual sets & options", selectExercise: "Choose a movement", notesPlaceholder: "e.g. 95 / 65 lb, strict, or movement cues", scheme: "Instructions / rep scheme", schemePlaceholder: "e.g. 21-15-9, movement order, or coaching cues", loading: "Loading method", weight: "Weight", percent: "% PR", bodyweight: "No prescribed load", optional: "Optional", restHint: "A recovery day needs no workout blocks.", removeBlock: "Remove block", blockType: "Block type", extraBlock: "Other block", overview: "SESSION OVERVIEW", movements: "movements", noMovements: "Instructions only", configured: "Customized", unsaved: "Preview · not saved", noLoad: "Load not prescribed", requiredBlock: "Add at least one workout block, or choose a rest day.",
};
const es: typeof en = {
  everyMinutes: "Cada (min)",
  emomSummary: (seconds: number, rounds: number) => `Cada ${formatTotal(seconds)} × ${rounds} rondas · ${formatTotal(seconds * rounds)} en total`,
  publishSession: "Publicar sesión", saveDraft: "Guardar borrador", savePublish: "Guardar y publicar",
  publishHint: "Lista para entrenar. Al guardar podrás registrar los resultados de esta sesión. Solo tú puedes verla.",
  publishRestHint: "Al guardar confirmas este día de descanso en tu calendario. Solo tú puedes verlo.",
  draftHint: "Guarda tu plan para terminarlo después. Publícalo cuando quieras registrar resultados. Solo tú puedes verlo.",
  blockOptions: "Opciones del bloque", durationMinutes: "Duración (min)", totalMinutes: "Tiempo total (opcional, min)", roundCount: "Número de rondas",
  workSeconds: "Trabajo (seg)", restSeconds: "Descanso (seg)",
  tabataSummary: (rounds: number, work: number, rest: number) => `${rounds} rondas · ${work}s de trabajo / ${rest}s de descanso (${formatTotal(rounds * (work + rest))} en total)`,
  collapse: "Contraer sección", expand: "Expandir sección",
  details: "Detalles de la sesión", blocks: "BLOQUES DE HOY", addBlock: "AGREGAR BLOQUE", wod: "WOD", movement: "Movimiento", addMovement: "Añadir movimiento", prescription: "Series × reps", detail: "Detalle / carga", capMinutes: "Tiempo límite (min)", blockHint: "Cada bloque se agrega por separado. Una sesión puede tener solo WOD, solo fuerza o cualquier combinación.", emptyTitle: "Diseña tu día de entrenamiento", emptyBody: "Elige un bloque arriba para comenzar. Añade solo lo que necesitas para esta sesión.", noBlocks: "Todavía no hay bloques", preview: "Vista previa", save: "Guardar sesión", close: "Cerrar vista previa", more: "Más opciones", advanced: "Series individuales y opciones", selectExercise: "Elige un movimiento", notesPlaceholder: "Ej. 95 / 65 lb, estrictas o indicaciones técnicas", scheme: "Instrucciones / esquema de repeticiones", schemePlaceholder: "Ej. 21-15-9, orden de movimientos o indicaciones", loading: "Tipo de carga", weight: "Peso", percent: "% del récord", bodyweight: "Sin carga prescrita", optional: "Opcional", restHint: "Un día de recuperación no necesita bloques de entrenamiento.", removeBlock: "Eliminar bloque", blockType: "Tipo de bloque", extraBlock: "Otro bloque", overview: "RESUMEN DE LA SESIÓN", movements: "movimientos", noMovements: "Solo instrucciones", configured: "Personalizado", unsaved: "Vista previa · sin guardar", noLoad: "Carga sin prescribir", requiredBlock: "Añade al menos un bloque o selecciona un día de descanso.",
};
export function editorMessages(locale: Locale) { return locale === "es" ? es : en; }
