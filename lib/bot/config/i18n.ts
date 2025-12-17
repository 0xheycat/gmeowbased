/**
 * @file lib/bot/config/i18n.ts
 * @description Multi-language support for bot responses (8 languages)
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * 
 * FEATURES:
 *   - 8 supported languages (en, es, fr, de, zh, ja, ko, pt)
 *   - Automatic language detection from cast text
 *   - Pattern-based language matching (regex + common words)
 *   - Localized response templates for all intents
 *   - Fallback to English for unsupported languages
 * 
 * REFERENCE DOCUMENTATION:
 *   - Auto-reply: lib/bot/core/auto-reply.ts
 *   - Farcaster instructions: farcaster.instructions.md
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - All translations must be culturally appropriate
 *   - NO EMOJIS in translations (breaks some clients)
 *   - Maintain consistent tone across languages
 * 
 * TODO:
 *   - [ ] Add more languages (ar, hi, ru, etc.)
 *   - [ ] Add language preference persistence per user
 *   - [ ] Add translation quality scoring
 *   - [ ] Add professional translation review
 *   - [ ] Add language-specific formatting rules
 *   - [ ] Add RTL language support
 * 
 * CRITICAL:
 *   - Language detection must be fast (<10ms)
 *   - Fallback to English if detection confidence low
 *   - Translations must preserve intent meaning
 *   - No machine translation without human review
 *   - Character encoding must support all languages
 * 
 * SUGGESTIONS:
 *   - Add language analytics (usage by language)
 *   - Cache detected language per user (5min TTL)
 *   - Add language override command for users
 *   - Provide translation contribution system
 *   - Add language-specific error messages
 * 
 * AVOID:
 *   - Using machine translations without review
 *   - Adding languages without native speaker validation
 *   - Hardcoding strings in code (use translation keys)
 *   - Mixing languages in single response
 *   - Using informal language without context
 */

// Multi-language support for bot responses
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'pt'

type LanguagePattern = {
  code: SupportedLanguage
  patterns: RegExp[]
  commonWords: string[]
}

const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    code: 'es',
    patterns: [/\b(hola|gracias|por favor|buenos días|buenas|qué|cómo|mi|mis|estadísticas|puntos)\b/i],
    commonWords: ['hola', 'gracias', 'mi', 'que', 'como', 'estadisticas'],
  },
  {
    code: 'fr',
    patterns: [/\b(bonjour|merci|s'il vous plaît|salut|quoi|comment|mes|statistiques|points)\b/i],
    commonWords: ['bonjour', 'merci', 'mes', 'quoi', 'comment', 'statistiques'],
  },
  {
    code: 'de',
    patterns: [/\b(hallo|danke|bitte|guten morgen|was|wie|meine|statistiken|punkte)\b/i],
    commonWords: ['hallo', 'danke', 'meine', 'was', 'wie', 'statistiken'],
  },
  {
    code: 'zh',
    patterns: [/(你好|谢谢|早上好|什么|怎么|我的|统计|积分|排名)/],
    commonWords: ['你好', '我的', '统计', '积分'],
  },
  {
    code: 'ja',
    patterns: [/(こんにちは|ありがとう|おはよう|何|どう|私の|統計|ポイント|ランク)/],
    commonWords: ['こんにちは', '私の', '統計'],
  },
  {
    code: 'ko',
    patterns: [/(안녕|감사|좋은 아침|무엇|어떻게|내|통계|포인트|순위)/],
    commonWords: ['안녕', '내', '통계'],
  },
  {
    code: 'pt',
    patterns: [/\b(olá|obrigado|por favor|bom dia|o que|como|meu|minhas|estatísticas|pontos)\b/i],
    commonWords: ['ola', 'obrigado', 'meu', 'que', 'como', 'estatisticas'],
  },
]

export function detectLanguage(text: string): SupportedLanguage {
  const lower = text.toLowerCase()
  
  // Check each language pattern
  for (const lang of LANGUAGE_PATTERNS) {
    for (const pattern of lang.patterns) {
      if (pattern.test(text)) {
        return lang.code
      }
    }
    
    // Check for common words (at least 2 matches)
    const matches = lang.commonWords.filter(word => lower.includes(word))
    if (matches.length >= 2) {
      return lang.code
    }
  }
  
  // Default to English
  return 'en'
}

type Translations = {
  greeting: string
  linkWallet: string
  syncingStats: string
  needHigherScore: string
  level: string
  points: string
  streak: string
  days: string
  lastGM: string
  profile: string
  tips: string
  received: string
  allTime: string
  leaderboard: string
  noStreak: string
  startStreak: string
  quests: string
  completed: string
  rank: string
  checkProfile: string
  helpIntro: string
  commands: string
  rateLimitExceeded: string
  tryAgainIn: string
  minutes: string
  contextualGreeting: string
}

const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    greeting: 'gm',
    linkWallet: 'Link an ETH wallet in Warpcast settings so I can track your quests, streaks, tips & XP. Connect at gmeowhq.art/profile then ping me again!',
    syncingStats: 'Syncing your stats now (this takes ~1 min). Check gmeowhq.art/profile for live data, or ask me again shortly!',
    needHigherScore: 'To interact, you\'ll need a Neynar score of 0.3+. Build your score by casting & engaging on Farcaster.',
    level: 'Level',
    points: 'pts',
    streak: 'Streak',
    days: 'd',
    lastGM: 'Last GM',
    profile: 'Profile',
    tips: 'Tips',
    received: 'received',
    allTime: 'All-time',
    leaderboard: 'Leaderboard',
    noStreak: 'No streak detected yet, but your ledger shows',
    startStreak: 'Log a GM to ignite it',
    quests: 'Quests',
    completed: 'completed',
    rank: 'Rank',
    checkProfile: 'Check your profile',
    helpIntro: 'Ask things like',
    commands: 'Commands',
    rateLimitExceeded: 'Slow down there! You\'ve reached the limit of 5 requests per minute.',
    tryAgainIn: 'Try again in',
    minutes: 'minutes',
    contextualGreeting: 'Welcome back! I see you asked about',
  },
  es: {
    greeting: 'gm',
    linkWallet: '¡Vincula una wallet ETH en la configuración de Warpcast para que pueda rastrear tus quests, rachas, tips y XP! Conéctate en gmeowhq.art/profile y contáctame de nuevo.',
    syncingStats: 'Sincronizando tus estadísticas ahora (~1 min). ¡Verifica gmeowhq.art/profile para datos en vivo, o pregúntame de nuevo en breve!',
    needHigherScore: 'Para interactuar, necesitarás un Neynar score de 0.3+. Aumenta tu puntuación casteando e interactuando en Farcaster.',
    level: 'Nivel',
    points: 'pts',
    streak: 'Racha',
    days: 'd',
    lastGM: 'Último GM',
    profile: 'Perfil',
    tips: 'Tips',
    received: 'recibidos',
    allTime: 'Total',
    leaderboard: 'Clasificación',
    noStreak: 'Aún no hay racha, pero tu registro muestra',
    startStreak: 'Registra un GM para iniciarla',
    quests: 'Quests',
    completed: 'completados',
    rank: 'Rango',
    checkProfile: 'Revisa tu perfil',
    helpIntro: 'Pregunta cosas como',
    commands: 'Comandos',
    rateLimitExceeded: '¡Más despacio! Has alcanzado el límite de 5 solicitudes por minuto.',
    tryAgainIn: 'Inténtalo de nuevo en',
    minutes: 'minutos',
    contextualGreeting: '¡Bienvenido de vuelta! Veo que preguntaste sobre',
  },
  fr: {
    greeting: 'gm',
    linkWallet: 'Liez un wallet ETH dans les paramètres Warpcast pour que je puisse suivre vos quêtes, séries, tips et XP. Connectez-vous sur gmeowhq.art/profile puis contactez-moi à nouveau!',
    syncingStats: 'Synchronisation de vos stats en cours (~1 min). Consultez gmeowhq.art/profile pour les données en direct, ou redemandez-moi sous peu!',
    needHigherScore: 'Pour interagir, vous aurez besoin d\'un score Neynar de 0,3+. Augmentez votre score en castant et en vous engageant sur Farcaster.',
    level: 'Niveau',
    points: 'pts',
    streak: 'Série',
    days: 'j',
    lastGM: 'Dernier GM',
    profile: 'Profil',
    tips: 'Tips',
    received: 'reçus',
    allTime: 'Total',
    leaderboard: 'Classement',
    noStreak: 'Aucune série détectée, mais votre registre montre',
    startStreak: 'Enregistrez un GM pour la lancer',
    quests: 'Quêtes',
    completed: 'complétées',
    rank: 'Rang',
    checkProfile: 'Consultez votre profil',
    helpIntro: 'Demandez des choses comme',
    commands: 'Commandes',
    rateLimitExceeded: 'Ralentissez! Vous avez atteint la limite de 5 requêtes par minute.',
    tryAgainIn: 'Réessayez dans',
    minutes: 'minutes',
    contextualGreeting: 'Bon retour! Je vois que vous avez demandé',
  },
  de: {
    greeting: 'gm',
    linkWallet: 'Verknüpfen Sie eine ETH-Wallet in den Warpcast-Einstellungen, damit ich Ihre Quests, Streaks, Tips und XP verfolgen kann. Verbinden Sie sich unter gmeowhq.art/profile und kontaktieren Sie mich erneut!',
    syncingStats: 'Synchronisiere Ihre Stats jetzt (~1 Min). Überprüfen Sie gmeowhq.art/profile für Live-Daten oder fragen Sie mich in Kürze erneut!',
    needHigherScore: 'Um zu interagieren, benötigen Sie einen Neynar-Score von 0,3+. Erhöhen Sie Ihren Score durch Casten und Engagement auf Farcaster.',
    level: 'Level',
    points: 'Pkt',
    streak: 'Serie',
    days: 'T',
    lastGM: 'Letztes GM',
    profile: 'Profil',
    tips: 'Tips',
    received: 'erhalten',
    allTime: 'Gesamt',
    leaderboard: 'Bestenliste',
    noStreak: 'Noch keine Serie, aber Ihr Register zeigt',
    startStreak: 'Loggen Sie ein GM, um es zu starten',
    quests: 'Quests',
    completed: 'abgeschlossen',
    rank: 'Rang',
    checkProfile: 'Überprüfen Sie Ihr Profil',
    helpIntro: 'Fragen Sie Dinge wie',
    commands: 'Befehle',
    rateLimitExceeded: 'Langsamer! Sie haben das Limit von 5 Anfragen pro Minute erreicht.',
    tryAgainIn: 'Versuchen Sie es erneut in',
    minutes: 'Minuten',
    contextualGreeting: 'Willkommen zurück! Ich sehe, Sie haben gefragt nach',
  },
  zh: {
    greeting: '早安',
    linkWallet: '在 Warpcast 设置中链接 ETH 钱包，以便我可以追踪您的任务、连胜、打赏和经验值。在 gmeowhq.art/profile 连接，然后再联系我！',
    syncingStats: '正在同步您的统计数据（约1分钟）。查看 gmeowhq.art/profile 获取实时数据，或稍后再问我！',
    needHigherScore: '要互动，您需要 Neynar 分数达到 0.3+。通过在 Farcaster 上发帖和互动来提高分数。',
    level: '等级',
    points: '分',
    streak: '连胜',
    days: '天',
    lastGM: '上次 GM',
    profile: '个人资料',
    tips: '打赏',
    received: '已收到',
    allTime: '总计',
    leaderboard: '排行榜',
    noStreak: '尚未检测到连胜，但您的记录显示',
    startStreak: '记录一次 GM 来启动它',
    quests: '任务',
    completed: '已完成',
    rank: '排名',
    checkProfile: '查看您的个人资料',
    helpIntro: '问一些像这样的问题',
    commands: '命令',
    rateLimitExceeded: '慢一点！您已达到每分钟5次请求的限制。',
    tryAgainIn: '请在以下时间后重试',
    minutes: '分钟',
    contextualGreeting: '欢迎回来！我看到您询问了',
  },
  ja: {
    greeting: 'おはよう',
    linkWallet: 'Warpcast設定でETHウォレットをリンクして、クエスト、ストリーク、チップ、XPを追跡できるようにしてください。gmeowhq.art/profileで接続してから、もう一度連絡してください！',
    syncingStats: '統計を同期中です（約1分）。gmeowhq.art/profileでリアルタイムデータを確認するか、しばらくしてからもう一度お尋ねください！',
    needHigherScore: 'やり取りするには、Neynarスコア0.3+が必要です。Farcasterでキャストしたり交流したりしてスコアを上げてください。',
    level: 'レベル',
    points: 'ポイント',
    streak: 'ストリーク',
    days: '日',
    lastGM: '最後のGM',
    profile: 'プロフィール',
    tips: 'チップ',
    received: '受信済み',
    allTime: '合計',
    leaderboard: 'ランキング',
    noStreak: 'ストリークはまだ検出されていませんが、記録には',
    startStreak: 'GMを記録して開始する',
    quests: 'クエスト',
    completed: '完了',
    rank: 'ランク',
    checkProfile: 'プロフィールを確認',
    helpIntro: '次のようなことを尋ねる',
    commands: 'コマンド',
    rateLimitExceeded: 'ゆっくりして！1分あたり5リクエストの制限に達しました。',
    tryAgainIn: '次の時間後に再試行',
    minutes: '分',
    contextualGreeting: 'お帰りなさい！あなたが尋ねたのは',
  },
  ko: {
    greeting: '굿모닝',
    linkWallet: 'Warpcast 설정에서 ETH 지갑을 연결하여 퀘스트, 연속 기록, 팁 및 XP를 추적할 수 있도록 하세요. gmeowhq.art/profile에서 연결한 후 다시 연락하세요!',
    syncingStats: '통계를 동기화하는 중입니다(약 1분). gmeowhq.art/profile에서 실시간 데이터를 확인하거나 잠시 후 다시 물어보세요!',
    needHigherScore: '상호 작용하려면 Neynar 점수가 0.3+ 필요합니다. Farcaster에서 캐스팅하고 참여하여 점수를 높이세요.',
    level: '레벨',
    points: '포인트',
    streak: '연속',
    days: '일',
    lastGM: '마지막 GM',
    profile: '프로필',
    tips: '팁',
    received: '받음',
    allTime: '전체',
    leaderboard: '순위표',
    noStreak: '아직 연속 기록이 없지만 기록은',
    startStreak: 'GM을 기록하여 시작',
    quests: '퀘스트',
    completed: '완료',
    rank: '순위',
    checkProfile: '프로필 확인',
    helpIntro: '다음과 같이 질문하세요',
    commands: '명령',
    rateLimitExceeded: '천천히! 분당 5개 요청 제한에 도달했습니다.',
    tryAgainIn: '다음 시간 후에 다시 시도',
    minutes: '분',
    contextualGreeting: '다시 오신 것을 환영합니다! 당신이 물어본 것은',
  },
  pt: {
    greeting: 'bom dia',
    linkWallet: 'Vincule uma carteira ETH nas configurações do Warpcast para que eu possa rastrear suas quests, sequências, tips e XP. Conecte-se em gmeowhq.art/profile e entre em contato novamente!',
    syncingStats: 'Sincronizando suas estatísticas agora (~1 min). Verifique gmeowhq.art/profile para dados ao vivo ou pergunte-me novamente em breve!',
    needHigherScore: 'Para interagir, você precisará de uma pontuação Neynar de 0,3+. Aumente sua pontuação postando e se envolvendo no Farcaster.',
    level: 'Nível',
    points: 'pts',
    streak: 'Sequência',
    days: 'd',
    lastGM: 'Último GM',
    profile: 'Perfil',
    tips: 'Tips',
    received: 'recebidos',
    allTime: 'Total',
    leaderboard: 'Classificação',
    noStreak: 'Nenhuma sequência detectada ainda, mas seu registro mostra',
    startStreak: 'Registre um GM para iniciá-la',
    quests: 'Quests',
    completed: 'concluídos',
    rank: 'Classificação',
    checkProfile: 'Verifique seu perfil',
    helpIntro: 'Pergunte coisas como',
    commands: 'Comandos',
    rateLimitExceeded: 'Mais devagar! Você atingiu o limite de 5 solicitações por minuto.',
    tryAgainIn: 'Tente novamente em',
    minutes: 'minutos',
    contextualGreeting: 'Bem-vindo de volta! Vejo que você perguntou sobre',
  },
}

export function getTranslations(lang: SupportedLanguage): Translations {
  return TRANSLATIONS[lang] || TRANSLATIONS.en
}

export function formatLocalizedMessage(
  template: string,
  values: Record<string, string | number>,
  lang: SupportedLanguage = 'en'
): string {
  let result = template
  
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value))
  }
  
  return result
}
