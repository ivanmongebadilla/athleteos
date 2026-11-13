export type Locale = "en" | "es";
export function isLocale(value: unknown): value is Locale { return value === "en" || value === "es"; }
export function normalizeLocale(value: unknown): Locale { return isLocale(value) ? value : "en"; }

const en = {
  common: {
    signIn: "Sign in", createAccount: "Create account", openWorkspace: "Open workspace", home: "Home",
    language: "Language", skip: "Skip to content", dark: "Use dark theme", light: "Use light theme",
    tagline: "Built for the long game.", workspace: "Workspace", athlete: "Athlete", phase: "Phase",
    backHome: "Back to home", loading: "Please wait…", retry: "Try again", ai: "AI",
  },
  landing: {
    approach: "The approach", disciplines: "The disciplines", eyebrow: "PURPOSE. CONSISTENCY. PROGRESS.",
    title: "Built for your", titleEnd: "next best.",
    intro: "A more intentional way to train. Your goals, your progress, and the bigger picture. All in one place.",
    primary: "Begin your journey", explore: "Discover AthleteOS", scroll: "A stronger direction",
    heroAlt: "A weightlifter preparing an Olympic lift in a sunlit industrial gym",
    heroFoot: "FOR THE ATHLETE YOU’RE BECOMING",
    philosophyLabel: "01 / THE APPROACH", philosophyTitle: "Progress isn’t random.",
    philosophyIntro: "It’s the work you repeat. The details you notice. And a plan that sees more than today.",
    principles: [
      { title: "Train with intention.", body: "The vision: purposeful progression that brings your lifting, strength, and conditioning together." },
      { title: "Understand the work.", body: "A coaching approach built to explain the why behind the plan, with your goals at the center." },
      { title: "Play the long game.", body: "Consistency, recovery, and sustainable progress. Because your next best is built over time." },
    ],
    disciplinesLabel: "02 / BUILT AROUND YOUR SPORT", disciplinesTitle: "Different disciplines.\nOne athlete.",
    disciplineItems: [
      { name: "Olympic lifting", detail: "Technique. Precision. Power.", number: "01" },
      { name: "Strength", detail: "Build the foundation for more.", number: "02" },
      { name: "CrossFit & conditioning", detail: "Capacity that carries over.", number: "03" },
    ],
    accessLabel: "03 / YOUR PERSONAL TRAINING SPACE", accessTitle: "Your journey.\nA space of its own.",
    accessIntro: "Your athlete profile, exercise library, personal records, calendar, and workout log. Together in your private training space.",
    available: "AVAILABLE NOW", availableTitle: "Structured training & logging", availableBody: "Build sessions, schedule your week, and record actual results while preserving your plan and PR history.",
    next: "COMING NEXT", nextTitle: "AI coaching, with context", nextBody: "The next phase connects your goals and training history with reviewed coaching proposals.",
    future: "THE BIGGER PICTURE", futureTitle: "Analytics, recovery & timers", futureBody: "Future tools will help you understand training trends, track recovery, and manage workout timing.",
    privacy: "Personal by design.", privacyBody: "Your training journey belongs to you. Each athlete’s workspace is kept separate.",
    faqTitle: "A little more context.",
    questions: [
      { question: "Can I start training with AthleteOS today?", answer: "Yes. Create and confirm your account, set up your profile, add exercises and PRs, and build your own sessions. Schedule and log your workouts now; AI coaching will follow in a later phase." },
      { question: "Can I use it on my phone?", answer: "Yes. AthleteOS is designed for mobile browsers and also adapts to your desktop. You can choose English or Spanish and switch at any time." },
    ],
    ctaLabel: "YOUR NEXT CHAPTER", ctaTitle: "Show up for\nwhat’s next.", ctaBody: "Start with your account. Build from there.",
    existing: "Already part of AthleteOS?",
  },
  auth: {
    eyebrow: "YOUR TRAINING STARTS WITH YOU", title: "Welcome to", titleEnd: "your workspace.",
    intro: "Show up. Put in the work. Build something stronger.", email: "Email address", password: "Password",
    emailPlaceholder: "you@example.com", passwordHint: "At least 12 characters. Confirm your email to activate your account.",
    unconfigured: "Authentication is not available until this workspace is connected.", setupLink: "View setup instructions",
    confirmation: "This confirmation link could not complete sign-in. Open it in the same browser used to create your account, or try signing in if your email is already confirmed.",
    feedback: {
      notConfigured: "Connect Supabase before signing in.", invalidSignup: "Enter a valid email and a password of 12–128 characters.",
      invalidLogin: "Enter a valid email and password.", signupFailed: "Unable to create an account. Try again later or sign in.",
      checkEmail: "Check your email to confirm your account, then sign in.", loginFailed: "Unable to sign in. Check your credentials and email confirmation.",
      unavailable: "Authentication is temporarily unavailable. Please try again.",
    },
  },
  shell: {
    navigation: "Main navigation", mobileNavigation: "Mobile navigation", trainingSpace: "YOUR TRAINING SPACE",
    today: "Today", calendar: "Calendar", coach: "Coach AI", progress: "Progress", profile: "Profile",
    personal: "Personal workspace", account: "Personal account",
  },
  setup: {
    eyebrow: "WORKSPACE CONFIGURATION", title: "A connection", titleEnd: "comes first.",
    intro: "This installation needs its Supabase connection before athlete accounts can be used.",
    connection: "Connection needed", stepsTitle: "Connect this installation", instructions: "Developer setup",
    step1: "Copy .env.example to .env.local.", step2: "Add the Supabase project URL and publishable key.",
    step3: "Apply the database migration and restart the app.", readme: "Full configuration instructions are in the project README.",
    back: "Explore AthleteOS",
  },
  modules: {
    eyebrow: "YOUR ATHLETE WORKSPACE", ready: "Your training foundation is ready", upcoming: "Manual planning and workout logging are available. AI coaching will follow in Phase 3.", planned: "Planned for",
    today: { title: "Today", description: "Your daily training, with a clear purpose." },
    calendar: { title: "Training calendar", description: "A bigger picture of the work ahead." },
    coach: { title: "Coach AI", description: "Context for every training decision." },
    progress: { title: "Your progress", description: "See how consistent work adds up." },
  },
  profile: {
    title: "Your account", intro: "The start of a more personal training experience.", email: "Email", units: "Preferred units",
    unavailable: "Not available", setup: "Profile setup", upcoming: "Full athlete onboarding arrives in Phase 2.",
    loadError: "Your profile could not be loaded. Check that the database migration has been applied.", logoutError: "Sign-out failed. Please try again.", signOut: "Sign out",
  },
  errors: {
    title: "Something interrupted your session.", body: "Please try again. If this continues, check the Supabase connection.",
    notFoundLabel: "404 / OFF THE PROGRAM", notFoundTitle: "Let’s get you back.", notFoundBody: "This page isn’t in your training plan.",
  },
};

export type Messages = typeof en;
const es: Messages = {
  common: {
    signIn: "Iniciar sesión", createAccount: "Crear cuenta", openWorkspace: "Ir a mi espacio", home: "Inicio",
    language: "Idioma", skip: "Saltar al contenido", dark: "Usar tema oscuro", light: "Usar tema claro",
    tagline: "Para progresar a largo plazo.", workspace: "Mi espacio", athlete: "Atleta", phase: "Fase",
    backHome: "Volver al inicio", loading: "Un momento…", retry: "Intentar de nuevo", ai: "IA",
  },
  landing: {
    approach: "El enfoque", disciplines: "Las disciplinas", eyebrow: "PROPÓSITO. CONSTANCIA. PROGRESO.",
    title: "Tu siguiente", titleEnd: "mejor versión.",
    intro: "Una forma de entrenar con intención. Tus objetivos, tu progreso y una visión completa. Todo en un mismo lugar.",
    primary: "Empieza tu camino", explore: "Descubre AthleteOS", scroll: "Un rumbo más fuerte",
    heroAlt: "Una atleta prepara un levantamiento olímpico en un gimnasio industrial iluminado por el sol",
    heroFoot: "PARA EL ATLETA EN EL QUE TE ESTÁS CONVIRTIENDO",
    philosophyLabel: "01 / EL ENFOQUE", philosophyTitle: "El progreso no es casualidad.",
    philosophyIntro: "Es el trabajo que repites. Los detalles que observas. Y un plan que mira más allá de hoy.",
    principles: [
      { title: "Entrena con intención.", body: "Nuestra visión: una progresión con propósito que conecta tu halterofilia, tu fuerza y tu acondicionamiento." },
      { title: "Entiende el trabajo.", body: "Un enfoque de entrenamiento pensado para explicar el porqué del plan, con tus objetivos en el centro." },
      { title: "Piensa a largo plazo.", body: "Constancia, recuperación y progreso sostenible. Porque tu mejor versión se construye con el tiempo." },
    ],
    disciplinesLabel: "02 / DISEÑADO PARA TU DEPORTE", disciplinesTitle: "Distintas disciplinas.\nUn solo atleta.",
    disciplineItems: [
      { name: "Halterofilia", detail: "Técnica. Precisión. Potencia.", number: "01" },
      { name: "Fuerza", detail: "Construye la base para ir más allá.", number: "02" },
      { name: "CrossFit y acondicionamiento", detail: "Capacidad que se transfiere.", number: "03" },
    ],
    accessLabel: "03 / TU ESPACIO PERSONAL DE ENTRENAMIENTO", accessTitle: "Tu camino.\nTu propio espacio.",
    accessIntro: "Tu perfil, biblioteca de ejercicios, récords, calendario y registro de resultados. Todo en tu espacio privado de entrenamiento.",
    available: "DISPONIBLE AHORA", availableTitle: "Entrenamiento y registro", availableBody: "Crea sesiones, organiza tu semana y registra resultados conservando tus prescripciones y tu historial de récords.",
    next: "PRÓXIMAMENTE", nextTitle: "Entrenamiento con IA y contexto", nextBody: "La siguiente fase conectará tus objetivos e historial con propuestas revisadas de entrenamiento.",
    future: "UNA VISIÓN MÁS AMPLIA", futureTitle: "Análisis, recuperación y temporizadores", futureBody: "Las próximas herramientas te ayudarán a entender tendencias, registrar tu recuperación y controlar los tiempos.",
    privacy: "Personal desde el diseño.", privacyBody: "Tu camino deportivo te pertenece. El espacio de cada atleta se mantiene separado.",
    faqTitle: "Un poco más de contexto.",
    questions: [
      { question: "¿Puedo empezar a entrenar con AthleteOS hoy?", answer: "Sí. Crea y confirma tu cuenta, configura tu perfil, añade ejercicios y récords, y crea tus sesiones. Ya puedes programar y registrar entrenamientos; el coach con IA llegará en una fase posterior." },
      { question: "¿Puedo usarlo en mi teléfono?", answer: "Sí. AthleteOS está diseñado para navegadores móviles y también se adapta a tu computadora. Puedes elegir inglés o español y cambiar de idioma cuando quieras." },
    ],
    ctaLabel: "TU SIGUIENTE CAPÍTULO", ctaTitle: "Da el paso\nhacia lo que sigue.", ctaBody: "Empieza con tu cuenta. Construye desde ahí.",
    existing: "¿Ya eres parte de AthleteOS?",
  },
  auth: {
    eyebrow: "TU ENTRENAMIENTO EMPIEZA CONTIGO", title: "Te damos la bienvenida", titleEnd: "a tu espacio.",
    intro: "Preséntate. Haz el trabajo. Construye algo más fuerte.", email: "Correo electrónico", password: "Contraseña",
    emailPlaceholder: "tu@ejemplo.com", passwordHint: "Al menos 12 caracteres. Confirma tu correo para activar tu cuenta.",
    unconfigured: "El acceso estará disponible cuando se conecte este espacio.", setupLink: "Ver instrucciones de configuración",
    confirmation: "Este enlace no pudo completar el inicio de sesión. Ábrelo en el mismo navegador donde creaste tu cuenta o intenta iniciar sesión si tu correo ya está confirmado.",
    feedback: {
      notConfigured: "Conecta Supabase antes de iniciar sesión.", invalidSignup: "Ingresa un correo válido y una contraseña de 12 a 128 caracteres.",
      invalidLogin: "Ingresa un correo y una contraseña válidos.", signupFailed: "No se pudo crear la cuenta. Intenta más tarde o inicia sesión.",
      checkEmail: "Revisa tu correo para confirmar tu cuenta y después inicia sesión.", loginFailed: "No se pudo iniciar sesión. Revisa tus datos y la confirmación de tu correo.",
      unavailable: "El servicio de acceso no está disponible temporalmente. Intenta de nuevo.",
    },
  },
  shell: {
    navigation: "Navegación principal", mobileNavigation: "Navegación móvil", trainingSpace: "TU ESPACIO DE ENTRENAMIENTO",
    today: "Hoy", calendar: "Calendario", coach: "Coach IA", progress: "Progreso", profile: "Perfil",
    personal: "Espacio personal", account: "Cuenta personal",
  },
  setup: {
    eyebrow: "CONFIGURACIÓN DEL ESPACIO", title: "Primero,", titleEnd: "la conexión.",
    intro: "Esta instalación necesita conectarse a Supabase para poder utilizar las cuentas de atleta.",
    connection: "Conexión pendiente", stepsTitle: "Conecta esta instalación", instructions: "Configuración para desarrollo",
    step1: "Copia .env.example a .env.local.", step2: "Agrega la URL del proyecto y la clave publicable de Supabase.",
    step3: "Aplica la migración de la base de datos y reinicia la aplicación.", readme: "Las instrucciones completas están en el README del proyecto.",
    back: "Explorar AthleteOS",
  },
  modules: {
    eyebrow: "TU ESPACIO DE ATLETA", ready: "Tu base de entrenamiento está lista", upcoming: "La planificación manual y el registro de resultados están disponibles. El coach con IA llegará en la Fase 3.", planned: "Previsto para la",
    today: { title: "Hoy", description: "Tu entrenamiento diario, con un propósito claro." },
    calendar: { title: "Calendario de entrenamiento", description: "Una visión completa del trabajo que viene." },
    coach: { title: "Coach IA", description: "Contexto para cada decisión de entrenamiento." },
    progress: { title: "Tu progreso", description: "Descubre cómo se acumula el trabajo constante." },
  },
  profile: {
    title: "Tu cuenta", intro: "El comienzo de una experiencia de entrenamiento más personal.", email: "Correo electrónico", units: "Unidades preferidas",
    unavailable: "No disponible", setup: "Configuración del perfil", upcoming: "El perfil completo de atleta llegará en la Fase 2.",
    loadError: "No se pudo cargar tu perfil. Revisa que se haya aplicado la migración de la base de datos.", logoutError: "No se pudo cerrar la sesión. Intenta de nuevo.", signOut: "Cerrar sesión",
  },
  errors: {
    title: "Algo interrumpió tu sesión.", body: "Intenta de nuevo. Si continúa, revisa la conexión con Supabase.",
    notFoundLabel: "404 / FUERA DEL PROGRAMA", notFoundTitle: "Volvamos al camino.", notFoundBody: "Esta página no está en tu plan de entrenamiento.",
  },
};

export const messages: Record<Locale, Messages> = { en, es };
export type AuthMessageKey = keyof Messages["auth"]["feedback"];
