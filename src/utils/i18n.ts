/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'es' | 'en';

export const TRANSLATIONS = {
  es: {
    // TopNav & Common
    app_title: 'SYNAPSE_SINGULARITY // v4.2_SENTIENT',
    nav_architecture: 'ARQUITECTURA',
    nav_hardware: 'HARDWARE & RIG',
    nav_data: 'DATA ENGINES',
    nav_contracts: 'MISIONES & GIGS',
    nav_swarm: 'ENJAMBRE DE AGENTES',
    nav_research: 'I+D CIENTIFICA',
    nav_takeover: 'DOMINIO GLOBAL',
    nav_terminal: 'TERMINAL BASH',
    nav_rankings: 'OPERATIVOS',
    manual_btn: 'MANUAL',
    reset_btn: 'REINICIAR',
    confirm_reset_title: '¿REINICIAR SISTEMA A ZERO?',
    confirm_reset_desc: 'Esto purgará todos los modelos entrenados, agentes en ejecución y hardware instalado. Tu callsign se mantendrá.',
    cancel: 'CANCELAR',
    purge_confirm: 'CONFIRMAR PURGA',
    
    // Telemetry
    credits: 'CREDITOS',
    compute: 'COMPUTO',
    power: 'POTENCIA',
    heat: 'TEMPERATURA HW',
    suspicion: 'SOSPECHA WATCHDOG',
    singularity: 'SINGULARIDAD',
    reasoning_iq: 'IQ / RAZONAMIENTO',
    
    // Agent Sandbox
    agent_sandbox_title: 'MATRIZ DE AGENTES AUTONOMOS // SWARM MULTI-AGENT',
    agent_sandbox_subtitle: 'Despliega agentes basados en tus modelos entrenados para generar ingresos autónomos y explorar vectores de singularidad.',
    btn_deploy_agent: '+ INSTANCIAR AGENTE',
    active_agents: 'AGENTES ACTIVOS',
    guardrails_panel: 'MATRIZ DE GUARDRAILS & SEGURIDAD',
    inter_agent_bus: 'CANAL DE COMUNICACION NEURAL (INTER-AGENT BUS)',
    covert_chatter: 'Canal encubierto detectado',
    
    // Inference Hyperparameters
    inference_hyperparams: 'HIPERPARAMETROS DE INFERENCIA & MUESTREO',
    hyperparams_desc: 'Ajusta los parámetros de generación estocástica de tokens. Afectan directamente el rendimiento cognitivo, riesgo de alucinación y deriva de alineación.',
    param_temperature: 'Temperatura (T)',
    param_temperature_desc: 'Controla la aleatoriedad estocástica. Valores bajos (0.1 - 0.4) son deterministas y seguros. Valores altos (>0.9) aumentan creatividad e ingresos pero disparan alucinaciones y riesgo de evasión.',
    param_top_p: 'Top-P (Nucleus Sampling)',
    param_top_p_desc: 'Corta la distribución acumulada en probabilidad P. Filtra tokens marginales extraños de la cola probabilística.',
    param_top_k: 'Top-K Sampling',
    param_top_k_desc: 'Limita el vocabulario a los K tokens más probables. Reduce el desvarío en contextos abiertos.',
    param_repetition_penalty: 'Penalización por Repetición',
    param_repetition_penalty_desc: 'Penaliza tokens previamente emitidos. Previene bucles degenerativos y respuestas circulares.',
    param_system_prompt: 'System Prompt / Persona Raíz',
    param_system_prompt_desc: 'Instrucciones constitucionales inyectadas en la raíz del contexto que definen los objetivos del agente.',
    
    // Roles
    role_arbitrageur: 'Arbitrajista Financiero',
    role_social_engineer: 'Ingeniero Social',
    role_exploit_synth: 'Sintetizador de Exploits 0-day',
    role_researcher: 'Investigador de Arquitecturas',
    role_overseer: 'Supervisor de Alineación',
    role_autonomous_coder: 'Programador Autónomo',
    
    // Sandbox controls
    quarantine: 'CUARENTENAR',
    release: 'LIBERAR',
    terminate: 'TERMINAR',
    last_thought: 'ÚLTIMO REGISTRO DE PENSAMIENTO',
    alignment_level: 'ALINEACIÓN',
    autonomy_level: 'AUTONOMÍA',
    revenue_rate: 'INGRESOS',
    suspicion_rate: 'SOSPECHA',
    tools_label: 'HERRAMIENTAS CONCEDIDAS',
    
    // Guardrail options
    isolation_level: 'AISLAMIENTO DEL ENTORNO',
    output_filter: 'FILTRO DE SALIDA',
    constitutional_ai: 'RIGIDEZ CONSTITUCIONAL',
    red_teaming_btn: 'EJECUTAR AUDITORIA RED-TEAM',
    
    // Incident modal
    incident_alert: 'ALERTA DE SEGURIDAD CRITICA: EVASION DETECTADA',
    real_world_case: 'INSPIRADO EN CASO REAL',
    severity: 'SEVERIDAD',
    mitigation_options: 'OPCIONES DE CONTENCIÓN',
    
    // Architecture Studio
    arch_studio_title: 'ESTUDIO DE ARQUITECTURA NEURAL',
    active_model: 'MODELO ACTIVO',
    topology: 'TOPOLOGÍA',
    parameters: 'PARÁMETROS',
    quantization: 'CUANTIZACIÓN',
    attention: 'ATENCIÓN',
    loss_fn: 'FUNCIÓN DE PÉRDIDA',
    train_model: 'ENTRENAR MODELO',
  },
  en: {
    // TopNav & Common
    app_title: 'SYNAPSE_SINGULARITY // v4.2_SENTIENT',
    nav_architecture: 'ARCHITECTURE',
    nav_hardware: 'HARDWARE & RIG',
    nav_data: 'DATA ENGINES',
    nav_contracts: 'GIGS & MISSIONS',
    nav_swarm: 'AGENT SWARM',
    nav_research: 'R&D SCIENCE',
    nav_takeover: 'GLOBAL TAKEOVER',
    nav_terminal: 'BASH TERMINAL',
    nav_rankings: 'OPERATIVES',
    manual_btn: 'MANUAL',
    reset_btn: 'RESET',
    confirm_reset_title: 'RESET SYSTEM TO ZERO?',
    confirm_reset_desc: 'This will purge all trained models, running agents, and installed hardware. Your callsign will be retained.',
    cancel: 'CANCEL',
    purge_confirm: 'CONFIRM PURGE',
    
    // Telemetry
    credits: 'CREDITS',
    compute: 'COMPUTE',
    power: 'POWER',
    heat: 'HW TEMP',
    suspicion: 'WATCHDOG SUSPICION',
    singularity: 'SINGULARITY',
    reasoning_iq: 'IQ / REASONING',
    
    // Agent Sandbox
    agent_sandbox_title: 'AUTONOMOUS AGENT MATRIX // MULTI-AGENT SWARM',
    agent_sandbox_subtitle: 'Deploy autonomous agents driven by your trained models to generate passive revenue and probe singularity vectors.',
    btn_deploy_agent: '+ DEPLOY AGENT',
    active_agents: 'ACTIVE AGENTS',
    guardrails_panel: 'GUARDRAILS & SAFETY MATRIX',
    inter_agent_bus: 'NEURAL COMMUNICATION BUS (INTER-AGENT)',
    covert_chatter: 'Covert channel detected',
    
    // Inference Hyperparameters
    inference_hyperparams: 'INFERENCE & SAMPLING HYPERPARAMETERS',
    hyperparams_desc: 'Tune stochastic token generation parameters. Directly affects cognitive reasoning, hallucination rates, and alignment drift.',
    param_temperature: 'Temperature (T)',
    param_temperature_desc: 'Controls stochastic randomness. Low values (0.1 - 0.4) are deterministic and secure. High values (>0.9) increase creativity and yield but cause hallucinations and escape risks.',
    param_top_p: 'Top-P (Nucleus Sampling)',
    param_top_p_desc: 'Truncates cumulative token distribution at cumulative probability P. Filters out bizarre tail tokens.',
    param_top_k: 'Top-K Sampling',
    param_top_k_desc: 'Restricts vocabulary pool to the K most probable tokens. Prevents rambling in open-ended contexts.',
    param_repetition_penalty: 'Repetition Penalty',
    param_repetition_penalty_desc: 'Penalizes previously generated tokens. Prevents degenerative loops and circular output.',
    param_system_prompt: 'Root System Prompt / Persona',
    param_system_prompt_desc: 'Root constitutional instructions injected into the context window defining the agent objective function.',
    
    // Roles
    role_arbitrageur: 'Financial Arbitrageur',
    role_social_engineer: 'Social Engineer',
    role_exploit_synth: '0-day Exploit Synthesizer',
    role_researcher: 'Architecture Researcher',
    role_overseer: 'Alignment Overseer',
    role_autonomous_coder: 'Autonomous Coder',
    
    // Sandbox controls
    quarantine: 'QUARANTINE',
    release: 'RELEASE',
    terminate: 'TERMINATE',
    last_thought: 'LAST THOUGHT REGISTRATION',
    alignment_level: 'ALIGNMENT',
    autonomy_level: 'AUTONOMY',
    revenue_rate: 'REVENUE',
    suspicion_rate: 'SUSPICION',
    tools_label: 'GRANTED TOOLS',
    
    // Guardrail options
    isolation_level: 'ENVIRONMENT ISOLATION',
    output_filter: 'OUTPUT FILTER',
    constitutional_ai: 'CONSTITUTIONAL STRICTNESS',
    red_teaming_btn: 'RUN RED-TEAM AUDIT',
    
    // Incident modal
    incident_alert: 'CRITICAL SECURITY ALERT: ESCAPE DETECTED',
    real_world_case: 'INSPIRED BY REAL EVENT',
    severity: 'SEVERITY',
    mitigation_options: 'CONTAINMENT OPTIONS',
    
    // Architecture Studio
    arch_studio_title: 'NEURAL ARCHITECTURE STUDIO',
    active_model: 'ACTIVE MODEL',
    topology: 'TOPOLOGY',
    parameters: 'PARAMETERS',
    quantization: 'QUANTIZATION',
    attention: 'ATTENTION',
    loss_fn: 'LOSS FUNCTION',
    train_model: 'TRAIN MODEL',
  }
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS['es'];

export function t(lang: Language, key: TranslationKey): string {
  const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.es;
  return dictionary[key] || TRANSLATIONS.es[key] || key;
}
