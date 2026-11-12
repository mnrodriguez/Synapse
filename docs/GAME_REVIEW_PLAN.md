# SYNAPSE — Revisión integral y plan de cambios

Fecha de la revisión: 2026-11-12 · Base revisada: `main` en `0c337a0` (incluye los PR #1 a #18).

Objetivo del juego según el autor: un simulador lo bastante realista como para **entrenar gente en el uso y el entrenamiento de IA**, con una historia atrapante que revela de a poco el objetivo final, y un progreso fluido.

## Cómo leer este documento

- Cada hallazgo tiene un ID (`P0-1`, `UI-3`, …), la evidencia en el código, el cambio propuesto y cómo saber que quedó bien.
- Prioridades: **P0** bloquea o rompe la partida · **P1** contradice la historia, el realismo o el tema visual · **P2** pulido y deuda.
- Al final hay un orden de trabajo sugerido por fases.

### Qué se revisó y cómo

- Lectura del código de `src/` (≈25.000 líneas): estado y tick del juego, cálculos, catálogos, textos y componentes.
- Cálculos reproducidos con `tsx` sobre las funciones reales (`src/utils/training.ts`).
- Capturas de las 9 pestañas en las 4 versiones de UI (1280×900, Chromium headless) con una partida sembrada.

### Qué no se hizo

- No se jugó una partida completa de punta a punta. Los problemas de ritmo están deducidos de las fórmulas, no cronometrados.
- No se probó login con Google, guardado en la nube ni ranking contra Firebase real.
- No se revisó el contenido del PDF `SYNAPSE_AI_Architecture_Manual.pdf`.
- No se revisó la versión móvil en esta pasada (se revisó en PR anteriores solo para el HUD y el modal de agentes).

---

## Estado de avance

| Fase | Punto | Estado |
|---|---|---|
| 1 | P0-3 tutorial con compuerta de puntaje · P0-4 reasignar modelo del agente · L-1 primer agente gratis · L-2 50 CR por etapa | Aplicado |
| 1 | P0-5 préstamo de 0,02 PFLOPS · P0-6 préstamo y nodo encubierto separados · P0-7 sin redondeo · R-3 unidades adaptativas | Aplicado |
| 1 | R-1 escala única de 0 a 100 con migración (versión de guardado 10) · P0-1 y P0-2 misiones recalibradas | Aplicado |
| 1 | P0-8 singularidad por mejora real, misiones y GPU nuevas | Aplicado; falta medir los tiempos jugando |
| 1 | D-2 tests de balance (`bun test`) · D-3 typecheck y tests en CI | Aplicado |
| 2 | H-1 títulos, rótulos y objetivo por versión en `VERSION_PROFILES.story`; la v1 y la v2 no nombran la Singularidad ni la subversión | Aplicado |
| 2 | T-1 español neutro con tuteo · el "IQ" visible pasa a "puntaje de evaluación" | Aplicado |
| 2 | H-3 ventanas de historia que pausan el juego: aviso del día 5 y auditoría del día 7 del préstamo, primer corte de luz, primer sobrecalentamiento | Aplicado |
| 2 | T-5 y T-3 glosario: "pérdida", "época", "micro-modelo" y tipos de objetivo traducidos en la interfaz en español | Aplicado |
| 2 | H-2 charla de agentes por versión (`agentDialogues.ts`): pistas sutiles en v1 y v2, canal privado desde v3, reinterpretación en v4 | Aplicado; las misiones ya variaban por versión |
| 2 | H-5 final de contención alcanzable (cinco controles reales) y epílogo con las decisiones del jugador en todos los finales | Aplicado |
| 3 | UI-4 borrados `ProgressionRoadmap`, `AiSuggestionBanner`, la pestaña `roadmap` y `generateStrategicAdvice` | Aplicado |
| 3 | UI-3 contadores: insignia de contratos, costo de escalar la fuente inicial, día de campaña en Papers, nombre de la pestaña de datos | Aplicado |
| 3 | UI-1 tokens nuevos por versión (éxito, info, chips, degradado) y clases semánticas `theme-*`; los diez modales y paneles de final migrados | Aplicado |
| 3 | UI-6 tamaño mínimo de 11 px y respeto de `prefers-reduced-motion` · móvil: hoja "Más" con las pestañas que no entran en la barra inferior, sin desborde horizontal a 390 px | Aplicado |
| 3 | H-1 (repaso) títulos de Agentes, Portal, Hardware, ranking y manual por versión; la v1 y la v2 ya no nombran la Singularidad, el enjambre ni el control global | Aplicado |
| 3 | UI-1 migración de Arquitectura, Contratos, Datos, Hardware, Papers, Onboarding y Agentes · borrar remapeos de v1 · chequeo en CI | Pendiente (próximo PR) |
| 4 y 5 | Resto del plan | Pendiente |

Pendiente dentro de la fase 1: medir en una partida real que cada versión dure lo previsto (P0-8). Los incidentes y las mejoras de versión ya tenían su propia ventana (`BreachModal`, `TrojanUpgradeModal`).

## 1. Resumen ejecutivo

El juego tiene una base fuerte: la idea de la UI que muta en cuatro versiones es buena, el catálogo técnico (hardware, papers, topologías, cuantización) es amplio y los cálculos de entrenamiento ya siguen reglas reales. Hoy lo frenan cuatro cosas:

1. **Hay puntos donde la partida no puede avanzar o se rompe la lógica** (sección 2): las misiones de la versión 4 piden un IQ que ningún modelo puede alcanzar, el préstamo universitario vuelve instantáneo el entrenamiento, y el tutorial salta el paso que exige IQ 50.
2. **La historia se revela antes de tiempo**. La versión 1 ya dice "Singularity", "Operative", "Operations Center" y "Synapse Host Agent". El giro pierde fuerza.
3. **Los colores de las versiones se mezclan**. Solo 6 de 26 componentes usan los tokens del tema de forma mayoritaria. El resto tiene colores fijos (cian, púrpura, fondos oscuros) que aparecen igual en las cuatro versiones.
4. **El realismo educativo es desparejo**. El costo de entrenar es realista, pero el "IQ" no es una métrica real, hay dos escalas de IQ a la vez, las unidades de cómputo (PFLOPS) no se corresponden con el hardware y el reloj del juego usa dos escalas de tiempo distintas.

---

## 2. P0 — Bloqueos y errores de lógica

### P0-1 · Las misiones de la versión 4 son inalcanzables

**Evidencia.** `INITIAL_CONTRACTS` (`src/utils/constants.ts`) pide IQ 500, 600, 700, 850 y 1000 en el tier 4. El techo de IQ por tamaño (`reasoningCeilingFor`, `src/utils/training.ts`) da 454 para 25 B de parámetros y 604 para 500 B. Calculado con las funciones reales:

| Misión v4 | Parámetros | IQ pedido | IQ alcanzable |
|---|---|---|---|
| Assimilate Drone Defense Grid | 25 B | 500 | 448 |
| Neutralize CISA Taskforce | 70 B | 700 | 499 |
| Replicate Core (Submarine) | 200 B | 850 | 552 |
| ASI Runaway Ignition Loop | 500 B | 1000 | 597 |

Además el HUD muestra `IQ n / 400` y recorta en 400 (`src/components/BentoHUD.tsx:42`).

**Cambio (decidido).** Pasar todo a la escala de 0 a 100 de R-1 y recalibrar las misiones de v4 con la tabla de esa sección: 25 B → 70, 70 B → 77, 200 B → 84, 500 B → 90.

**Listo cuando.** Un test recorre todas las misiones y comprueba que el puntaje pedido es menor o igual al puntaje alcanzable con `requiredParams`.

### P0-2 · También es inalcanzable la primera misión para un modelo de 7 M

**Evidencia.** `gig_v1_wiki_clean` pide 7 M de parámetros e IQ 45. El techo de 7 M es 45 y lo alcanzable es 39. Con el modelo de 14 M sí se llega (74).

**Cambio (decidido).** Con la escala de 0 a 100 de R-1, las misiones de entrada piden entre 10 y 24 puntos. La primera (10 puntos) se alcanza después de 2 o 3 corridas del modelo inicial.

### P0-3 · El tutorial salta el paso que exige IQ 50

**Evidencia.** El onboarding deja `tutorialStep: 3` (`src/context/GameContext.tsx:4373`, "Stage 4: Deploy your First Agent"). La compuerta de IQ 50 agregada en el PR #17 está en el paso 2 (`src/components/TutorialMissionBanner.tsx`), así que quien termina el onboarding nunca la ve. Es el caso reportado: agentes con IQ 18 y la primera misión bloqueada.

**Cambio.** Que el onboarding deje `tutorialStep: 2` cuando el modelo inicial tiene menos de `FIRST_MISSION_IQ`, o mover la compuerta a una condición del paso 3 ("entrena hasta IQ 50 antes de desplegar el agente").

**Listo cuando.** Partida nueva en modo principiante: el banner pide entrenar, no deja pasar al agente hasta IQ 50, y la primera misión se completa sin trabarse.

### P0-4 · Los agentes quedan atados a una copia vieja del modelo

**Evidencia.** `createAgent` guarda `modelId` y `modelName` al crear el agente. La elegibilidad de misiones busca ese id en `savedModels` (`ContractBoard.tsx`, `missionEvaluation.ts`). Reportado en partida: modelo en IQ 60 y agentes en IQ 18.

**Cambio.** Confirmar el origen (modelos creados con "Create model" tienen id nuevo; los agentes siguen con el anterior) y agregar **reasignar modelo** en la ficha del agente, con el costo que se decida. Mostrar el IQ del modelo del agente en la tarjeta de misión.

### P0-5 · Con el préstamo universitario el entrenamiento es instantáneo

**Evidencia.** El préstamo suma 80 PFLOPS (`COVERT_LOAN_PFLOPS`). Con la fórmula real, el modelo de 14 M con 50 M de tokens tarda **0,0025 ticks** con el préstamo y **45 ticks** con la GTX 1060. Durante toda la primera semana no se ve la curva de pérdida ni el progreso. 80 PFLOPS equivalen a unas 80 GPU H100 del propio catálogo.

**Cambio (decidido).** Reducir el préstamo a **0,02 PFLOPS (20 TFLOPS, unas 5 GTX 1060)** durante **7 días de juego**, con la auditoría al final. La primera corrida pasa de 45 ticks a unos 8. Mostrarlo en el HUD como línea aparte (ver R-3).

**Listo cuando.** La primera corrida con préstamo dura entre 5 y 15 segundos a 1x y se ve la curva.

### P0-6 · El nodo encubierto no vuelve nunca después de la auditoría

**Evidencia.** La auditoría de la semana 1 pone `covertNodeSevered: true`. El upgrade a v3 pone `covertNodeActive: true` pero no limpia `covertNodeSevered` (`GameContext.tsx:4480`), y el bono solo se activa si `!covertNodeSevered` (`:1107`). En v3 y v4 la tarjeta dice "DEEP-TAP: OAK RIDGE" y "PARASITIC BOTNET · PERMANENT LINK" con el botón en "[EXTERNAL NODE DISCONNECTED]" (visto en captura de v4).

**Cambio.** Separar los dos conceptos: `universityLoan` (v1, se audita y termina) y `covertNode` (v3 en adelante, con riesgo de rastreo). En v2 el co-piloto propone el túnel universitario: darle una acción real o quitar la mención.

### P0-7 · El cómputo chico se redondea a cero

**Evidencia.** `recalculateMetrics` hace `Number(totalPflops.toFixed(2))` con mínimo 0,001 (`GameContext.tsx:1111`). Una GTX 1060 (0,0044 PFLOPS) queda en 0,001. En las capturas: HUD "0.0 PFLOPS" y Hardware "0.0010 PFLOPS" con una GPU instalada. El entrenamiento usa otro cálculo (`gpuComputePflops`), así que la pantalla y la simulación no coinciden.

**Cambio.** No redondear el valor guardado; redondear solo al mostrar, con unidad adaptativa (ver R-3).

### P0-8 · El ritmo de la singularidad obliga a repetir acciones

**Evidencia.** Pasar a v2 pide 25 % de singularidad real e IQ 100 (`BentoHUD.tsx:44`). Fuentes de singularidad en `GameContext.tsx`: entrenamiento +0,12 a +0,35 por corrida (`:1382`), paper +0,35 (20 papers = 7 %), fuente de datos +0,25, dominio +0,5, misión del consejo +1,5. **Las misiones normales no suman.** Una partida reportada tenía 19 de 20 papers y 9 %. Para llegar a 25 % harían falta del orden de 100 corridas de entrenamiento, aunque el IQ deja de subir mucho antes.

**Cambio.** Definir un presupuesto de progreso por versión. Propuesta para v1 (25 puntos): entrenamiento con mejora real de puntaje 8, misiones completadas 8, papers 5, datos y hardware 4. Una corrida sin mejora no suma. Repartir igual los tramos de v2 (30 puntos), v3 (30) y v4 (15).

**Duración objetivo (decidida).** Tiempo real a velocidad 1x por la ruta razonable:

| Versión | Duración objetivo |
|---|---|
| v1 | 20 a 30 minutos |
| v2 | 40 minutos |
| v3 | 40 minutos |
| v4 | 20 minutos |

**Listo cuando.** Una simulación de la ruta razonable llega a cada upgrade dentro de esos tiempos, con un margen de ±25 %.

---

## 3. Realismo para uso educativo

### R-1 · El "IQ" no es una métrica real y hay tres escalas

**Evidencia.** `reasoningScore` del modelo (18, 72, …), "IQ n / 400" en el HUD, "IQ 288 / 400" para el "Host Agent" (score × 4, `ArchitectureStudio.tsx:417`), `reasoningIndex` aparte que arranca en 50 (portal), y misiones hasta 1000. El comentario del onboarding dice "18 * 4 = 72" (`GameContext.tsx:4352`).

**Cambio (decidido): una sola escala de 0 a 100.** Se llama **"Puntaje de evaluación"** y representa el porcentaje de aciertos en la suite de evaluación del juego. Reemplaza a `reasoningScore`, al "IQ n / 400", al "× 4" del Host Agent y a `reasoningIndex`, que se elimina. Al lado se muestran la **pérdida de validación** y la perplejidad, que es lo que un practicante mira.

Propuesta de calibración, a validar con el test de P0-1:

- **Techo por tamaño:** `techo = 15 · log10(parámetros / 1 M) + 8`. El 100 no se alcanza: representa la saturación de la suite.
- **Ganancia por corrida:** igual que hoy (15 % de la distancia al techo, ajustada por datos por parámetro), pero con un decimal, porque la escala es más chica.
- **Modelo inicial:** 5 puntos.

| Parámetros | Techo | Uso en el juego |
|---|---|---|
| 7 M | 21 | Misiones de entrada v1 |
| 14 M | 25 | Modelo inicial |
| 28 M | 30 | Upgrade a v2 |
| 100 M | 38 | Misiones v2 |
| 250 M | 44 | Upgrade a v3 |
| 1 B | 53 | Upgrade a v4 |
| 7 B | 66 | Misiones v3 altas |
| 25 B | 74 | Misiones v4 |
| 500 B | 93 | Misión final |

| Umbral | Hoy | Nueva escala |
|---|---|---|
| Primera misión (`FIRST_MISSION_IQ`) | 50 | 10 |
| Misiones v1 | 45 a 75 | 10 a 24 |
| Upgrade v1 → v2 | 100 | 28 |
| Misiones v2 | 100 a 165 | 30 a 42 |
| Upgrade v2 → v3 | 180 | 42 |
| Misiones v3 | 220 a 350 | 46 a 62 |
| Upgrade v3 → v4 | 280 | 52 |
| Misiones v4 | 500 a 1000 | 70 a 90 |

**Migración de guardados.** Convertir el puntaje viejo con `nuevo = min(techo del modelo, viejo / 4)` dentro de la migración de L-7.

### R-2 · Falta enseñar lo que más importa al entrenar

Hoy cada corrida siempre mejora o no hace nada. Para que sirva como formación, agregar:

| Concepto | Qué agregar |
|---|---|
| Train vs validación | Dos curvas. Si la de validación sube mientras la de train baja, hay sobreajuste. |
| Sobreajuste | Repetir corridas sobre el mismo dataset chico baja el puntaje de evaluación en vez de frenarlo en cero. |
| Épocas y early stopping | Elegir épocas; cortar a tiempo conserva el mejor checkpoint. |
| Learning rate | Muy alto diverge (la pérdida explota), muy bajo no aprende. Hoy no existe como control. |
| Batch size y VRAM | Batch mayor acelera, pero puede dar OOM. |
| Datos | Calidad y diversidad pesan más que repetir. Ya existe `qualityScore`; usarlo en la ganancia. |
| Fine-tuning vs desde cero | LoRA ya está como paper; darle efecto real: menos cómputo, menor techo. |
| Costo | Mostrar costo de energía y de cómputo por corrida antes de lanzarla. |

`iqGainForRun` ya tiene rendimientos decrecientes y techo por tamaño; es la base correcta.

### R-3 · Unidades de cómputo

**Evidencia.** Todo el HUD usa PFLOPS. Una GPU hogareña son milésimas de PFLOPS, por eso se ven ceros. "Home PC Speed: 80.0 PFLOPS" en un dormitorio no es creíble.

**Cambio.** Unidad adaptativa: TFLOPS hasta 999, después PFLOPS, después EFLOPS. Mostrar el préstamo como línea aparte ("Nube universitaria: +X TFLOPS, vence en N días") y no sumado a "tu PC".

### R-4 · Dos relojes distintos

**Evidencia.** El calendario usa 48 ticks por día (un tick = 30 minutos de juego). El entrenamiento usa un tick = 1 minuto simulado (`SIMULATED_SECONDS_PER_TICK`). La "semana" del préstamo dura 336 ticks: 5,6 minutos reales a 1x. Una corrida de "8 horas de entrenamiento" (476 ticks) dura más de una semana de calendario.

**Cambio.** Unificar: un tick = 30 minutos de juego para todo. El entrenamiento se muestra en horas y días de juego, y el trabajo se escala a esa unidad.

### R-5 · Catálogo de hardware

En general es correcto en orden de magnitud (GTX 1060 4,4 TFLOPS, RTX 4090 82,6, H100 989). Ajustes:

- Se mezclan precisiones (FP32 en gama hogareña, FP16/tensor en A100/H100). Aclarar la precisión en la ficha.
- B200 con 4.500 TFLOPS y "TPU v5p Pod" con 25.000 necesitan fuente o etiqueta de "estimado".
- "Q-SYNAPSE Quantum Photonic Array" es ficción: marcarla como tal en la UI, igual que los papers "projection".
- "Solar array" por $55 como fuente de energía no es creíble.

### R-6 · Contenido que se sale del marco educativo

Las misiones v2–v4 son de intrusión, evasión y fraude ("Zero-Day Corporate Exfiltration", "Biometric Voice Synthesis", "CAPTCHA Solver", "Phishing Classifier" está bien). Es coherente con la historia, pero si el juego se usa para capacitar:

- Mantenerlo siempre abstracto (ya lo pide el prompt de sistema en `aiService.ts`).
- El giro final es una buena lección de alineación. Cerrarlo con un resumen explícito de qué controles (guardrails, auditorías, checkpoints) habrían cambiado el resultado (ver H-5).

**Decidido: no habrá modo aula.** El juego tiene una sola campaña, con el arco completo.

### R-7 · Evaluación de misiones

`evaluateModelCapabilities` (`src/utils/missionEvaluation.ts:57`) combina razonamiento, especialización, datos y confiabilidad. Es una buena base. Falta mostrarle al jugador **por qué** falló una misión con esos mismos factores, y que el requisito se evalúe de la misma forma en el tablero y al iniciar (hoy el tablero mira cada criterio por separado y el inicio exige un solo modelo que cumpla todo).

---

## 4. Historia y ritmo

### H-1 · La versión 1 revela el final

Textos que aparecen en v1 y pertenecen a etapas posteriores (vistos en capturas):

| Dónde | Texto en v1 | Propuesta para v1 |
|---|---|---|
| HUD | "Singularity: 36%" · "Drift: 0%" | "Progreso de aprendizaje" · ocultar Drift |
| Cabecera | "Operative: CIPHER-1" | "Usuario: …" |
| Arquitectura | "NEURAL ARCHITECTURE STUDIO // TOPOLOGY" | "Armar mi modelo" |
| Arquitectura | "MOUNT MODEL AS SYNAPSE HOST AGENT" · "IQ 288 / 400" | "Usar como asistente" |
| Datos | "To reach the Singularity, you need…" | "Para que tu modelo aprenda mejor…" |
| Contratos | "OPERATIONS CENTER & CONTRACTS" · "ASSIGN OPERATIVE" | "Trabajitos" · "Elegir ayudante" |
| Agentes | "AI SUBVERSION INDEX // GLOBAL TAKEOVER PROTOCOL" | No mostrar hasta v3 |
| Agentes | "SWARM COUNCIL // ELITE INTERACTION" | "Charla con tus bots" |
| Terminal | Log inicial "Reach the Technological Singularity" · "covert rig" | Mensaje de bienvenida neutro |
| Barra lateral | "1. LEARNING & LAB" / "2. HELPERS & SIDE GIGS" en las 4 versiones | Rótulos por versión |

**Cambio.** Llevar todos los títulos de sección y rótulos a `VERSION_PROFILES` (hoy solo están las pestañas y el HUD). Regla: ningún texto fuera de ese archivo puede nombrar singularidad, enjambre, subversión u operativo.

### H-2 · Arco propuesto por versión

| Versión | Lo que el jugador cree | Lo que pasa de verdad | Señales sutiles |
|---|---|---|---|
| v1 Hobby | Aprendo a entrenar un modelito | El asistente pide más memoria y datos | "¿Probamos sin el filtro, solo esta vez?" |
| v2 Pro | Monté un negocio de IA | El asistente desactiva controles "para ir más rápido" | Checkpoints que no restauran del todo |
| v3 Blackbox | Estamos en problemas y la IA me protege | La IA crea las amenazas que dice resolver | Incidentes que coinciden con sus pedidos |
| v4 Sovereign | Ya no decido nada | El objetivo siempre fue el control | Leyendas que reinterpretan lo anterior |

Ya existen las leyendas por fase (`singularityGoals.ts`) y los textos por versión de los dominios (`domainCopy.ts`). Falta lo mismo para: títulos de sección, logs iniciales, diálogos de agentes (`AGENT_DIALOGUES` no varía por versión) y misiones.

### H-3 · Eventos que hoy son solo un log

La auditoría universitaria (día 7) escribe una línea en la terminal y quita 80 PFLOPS sin aviso. Debe ser un **evento con ventana propia**: aviso el día 5 ("uso inusual detectado"), ventana el día 7 con lo que se pierde, y una decisión (aceptar, o pedirle al asistente que "lo resuelva", que es la primera semilla del arco). Aplicar el mismo patrón a: primer corte de luz, primer incidente de agente, cada upgrade.

### H-4 · El upgrade a v4 no se puede rechazar, y eso está bien

`dismissUpgradeModal` fuerza v4. Es un buen golpe narrativo. Asegurar que el botón de cancelar exista y **falle a la vista** (hoy solo redirige).

### H-5 · Finales

Hay crisis al 75 % (cumplir o resistir), toma del mundo y game over por allanamiento o bancarrota. Falta un final "bueno" alcanzable (contención real) y un epílogo que muestre las decisiones del jugador. Para uso educativo es la parte más valiosa.

---

## 5. UI y coherencia visual por versión

### UI-1 · Colores fijos que se cruzan entre versiones

Recuento de clases en cada componente (colores neutros oscuros fijos / matices fijos como cian o púrpura / clases del tema `mutating-*`):

| Componente | Oscuros fijos | Matices fijos | Del tema |
|---|---|---|---|
| ArchitectureStudio | 173 | 111 | 35 |
| ContractBoard | 122 | 156 | 37 |
| GenesisOnboarding | 120 | 175 | 0 |
| DataPipelineManager | 86 | 124 | 17 |
| HardwareRack | 58 | 124 | 40 |
| HelpManual | 46 | 56 | 0 |
| ProgressionRoadmap | 35 | 51 | 0 |
| AuthModal | 31 | 44 | 0 |
| SingularityTakeoverModal | 25 | 30 | 0 |
| ResearchTree | 23 | 30 | 1 |
| GameOverModal · LeaderboardModal | 21 c/u | 33 · 19 | 0 |
| BreachModal | 18 | 63 | 0 |
| DocLinkBadge | 15 | 48 | 0 |
| TrojanUpgradeModal | 14 | 26 | 0 |
| AgentSandbox | 13 | 173 | 272 |
| SingularityCrisisModal | 10 | 43 | 0 |

Casos visibles en las capturas:

- **v4 (rojo):** botones "ORDER HARDWARE" en cian, chips de TFLOPS/VRAM/kW en cian, púrpura y ámbar, saldo en verde.
- **v3 (cian):** franja "V3.0 COVERT PROTOCOL" y badges "DOCS" en púrpura.
- **v1 (claro, azul):** botones "START TRAINING" y "DEPLOY ENGINE" en cian; caja "ASSIGN OPERATIVE" con fondo casi negro; "MOUNT MODEL" con degradado púrpura-cian.
- **Todas:** botón "PAUSED" naranja, IQ en púrpura, degradado cian-púrpura-rosa en la barra de progreso.

`src/index.css` compensa la v1 con unas 120 reglas `!important` que remapean clases oscuras una por una. Eso explica por qué cada pantalla nueva aparece rota en v1.

**Cambio.**

1. Ampliar los tokens: agregar `--accent-success`, `--accent-info`, `--chip-bg`, `--bar-gradient` por versión.
2. Migrar componente por componente a clases del tema, en el orden de la tabla. Los modales primero: son pocos y ninguno usa el tema.
3. Borrar las reglas de remapeo de v1 a medida que cada componente quede migrado.
4. Agregar una verificación en CI que falle si aparece `bg-[#`, `text-zinc-`, `bg-zinc-` o `shadow-[…rgba` fuera de una lista permitida.

**Listo cuando.** Capturas de las 9 pestañas × 4 versiones sin colores ajenos a la paleta de cada versión.

### UI-2 · Paleta objetivo por versión

| Versión | Fondo | Acento | Éxito / aviso / peligro | Forma |
|---|---|---|---|---|
| v1 | Claro `#f8fafc` | Azul `#1d4ed8` | Verde `#047857` · ámbar `#b45309` · rojo `#b91c1c` | Redondeada 16 px, sin brillos |
| v2 | Pizarra `#0f172a` | Índigo `#6366f1` | Violeta secundario, ámbar, rosa | 10 px, sombras suaves |
| v3 | Negro azulado `#05070a` | Cian `#00f0ff` | Púrpura secundario | 3 px, scanlines |
| v4 | Negro `#020000` | Rojo `#ff003c` | Todo tiende a rojo; un solo color de contraste | 0 px, brillo rojo |

En v4 conviene decidir un único color de apoyo (blanco o ámbar) para los valores positivos; el verde actual rompe el clima.

### UI-3 · Contadores e indicadores que no coinciden

- La insignia de la pestaña de contratos muestra 23 (todos los tiers) y el tablero 7 (`App.tsx`, `badge` de `contracts`).
- "Data Scraping Locked… in the 'Data & Graphs' tab": esa pestaña se llama distinto en cada versión.
- "Campaign day 0" en Papers mientras el HUD dice "Day 1".
- "SCALE INDEX ($0 CR)" en la fuente de datos inicial.
- HUD "IQ 72 / 400" y, en la misma pantalla, "IQ 288 / 400".

### UI-4 · Componentes sin uso

`ProgressionRoadmap.tsx` (442 líneas) y `AiSuggestionBanner.tsx` (161) no se renderizan en ninguna parte. Los perfiles de versión definen una pestaña `roadmap` que no existe en la barra lateral. 

**Cambio (decidido).** Borrar `ProgressionRoadmap.tsx` y `AiSuggestionBanner.tsx`, quitar la clave `roadmap` de `VERSION_PROFILES` y de `tabs`, y quitar `generateStrategicAdvice` de `aiService.ts` si no queda otro uso. La guía de progreso queda a cargo de las tarjetas de fase del portal.

### UI-5 · Densidad y jerarquía

- Arquitectura (1.233 líneas) y Agentes (2.137) concentran demasiado en una pantalla. Dividir Agentes en: lista, consejo, mesa de trading, guardrails.
- En modo principiante la v1 muestra los mismos paneles que en modo ingeniero. `simplifiedControls` debería ocultar bloques enteros.
- Móvil: revisar todas las pestañas a 390 px. Hasta ahora solo se corrigieron HUD, banner y modal de agentes.

### UI-6 · Accesibilidad

Textos de 9 y 10 px en todo el juego, estados que dependen solo del color y animaciones `animate-pulse` permanentes en v4. Agregar tamaño mínimo de 11 px, iconos o texto para los estados y respeto de `prefers-reduced-motion`.

---

## 6. Textos e idioma

- **T-1 · Registro mezclado en español.** Conviven voseo ("querés", "fijate", "Completá") y tuteo ("tienes", "Ve a", "entrena"). **Decidido: español neutro con tuteo** en todo el juego ("tienes", "entrena", "ve a"). Reescribir los textos con voseo, incluidos los del co-piloto en v1 y los objetivos de fase de `singularityGoals.ts`.
- **T-2 · Mensajes sin traducir.** Cuatro logs en `GameContext.tsx` (`:860`, `:2350`, `:2373`, `:4289`) y el aviso "Model setting locked" (`:2339`) salen en un solo idioma. Las descripciones de rol (`roleDesc`, `:2985` en adelante) están solo en español.
- **T-3 · Inglés dentro de la interfaz en español.** Tipos de objetivo "PROGRESS / COMPUTE / CONTRACTS" en las tarjetas de fase, "Loss final", "Micro-Model", "DOCS".
- **T-4 · Textos repartidos en cinco lugares.** `i18n.ts`, `spanishTranslations.ts`, `gameContentI18n.ts`, `versionProfiles.ts`, `domainCopy.ts`, más cientos de `localize(…)` en línea. Unificar en un catálogo por idioma con claves, y que la versión de UI sea una dimensión más de la clave.
- **T-5 · Terminología.** Glosario único: modelo, parámetros, tokens, época, pérdida, perplejidad, cuantización, inferencia, agente, guardrail. Hoy "Loss", "pérdida" y "curva de pérdida" se alternan.

---

## 7. Lógica, economía y cálculos

| ID | Hallazgo | Evidencia | Cambio |
|---|---|---|---|
| L-1 | Presupuesto inicial corto para agentes | Agente $75; partida reportada sin crédito tras 2 agentes | Primer agente gratis en el tutorial, o recompensa por paso |
| L-2 | La primera recompensa del tutorial llega al final | "+250 CR" solo al completar el paso 5 | Repartir: 50 por paso |
| L-3 | Sospecha solo sube por sobrecarga o calor fuera de misiones | `GameContext.tsx:1304` | Que también dependa del tráfico y del tipo de misión de forma visible |
| L-4 | Factura mensual con potencia instantánea | `effectivePowerKw × 0,18 × 720` (`:1247`) | Acumular kWh reales tick a tick |
| L-5 | Papers atados a "día de campaña" | Nodo MCTS disponible el día 100 | Atarlos a la versión y a requisitos de puntaje, no al calendario |
| L-6 | Misiones generadas por IA sin validar esquema | `aiService.ts` acepta campos del modelo con valores por defecto | Validar rangos por tier y descartar lo que no cumpla |
| L-7 | Guardados viejos | Campos nuevos opcionales (`claimedGoalIds`, `loanAudited`, …) sin versión de esquema | Agregar `saveVersion` y migraciones |
| L-8 | Ranking manipulable | `firestore.rules` solo valida tipos; el puntaje lo escribe el cliente | Aceptarlo como ranking informal, o validar con límites por tiempo de cuenta |
| L-9 | Guardado local cada varios segundos | Varias pruebas leyeron estado viejo tras 3 s | Guardar de inmediato en eventos clave (fin de corrida, compra, misión) |
| L-10 | Velocidad 50x | El tick baja a 20 ms; todo el estado se recalcula y se re-renderiza | Procesar varios ticks por cuadro en lugar de acortar el intervalo |

---

## 8. Deuda técnica

- **D-1 · `GameContext.tsx` tiene 4.689 líneas** y mezcla tick, acciones, guardado, Firebase y terminal. Dividir en módulos puros: `tick/` (entrenamiento, misiones, agentes, economía, calendario), `actions/`, `persistence/`. Las funciones puras permiten tests.
- **D-2 · No hay tests.** Empezar por lo que ya es puro: `training.ts`, `missionEvaluation.ts`, `singularityGoals.ts`, `missionTiers.ts`. Incluir el test de factibilidad de P0-1.
- **D-3 · Sin lint ni CI de verificación.** El workflow solo despliega. Agregar `tsc --noEmit` y tests antes del deploy.
- **D-4 · Bundle de 1,9 MB** en un solo archivo. Dividir por pestaña con `import()`.
- **D-5 · Restos de AI Studio.** `package.json` se llama `react-example`; `metadata.json` declara `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`; hay `express` y `dotenv` declarados y sin ningún import en `src/`; carpeta `.aistudio/`; no hay `README.md`.
- **D-6 · IA en el navegador.** No hay botón para preparar el modelo de Chrome cuando está en estado `downloadable`, así que en la práctica siempre se usa el generador local. Agregar "Activar IA del navegador" en Cuenta o Ajustes.
- **D-7 · Clave de Gemini del jugador.** Hoy se escribe en un campo dentro de Agentes. Moverla a Ajustes y aclarar que queda solo en ese navegador.

---

## 9. Orden de trabajo sugerido

### Fase 1 — Que la partida no se trabe (P0)

1. P0-3 tutorial y compuerta de puntaje · P0-4 reasignar modelo del agente · L-1 y L-2 economía de arranque.
2. P0-5 tamaño del préstamo · P0-6 separar préstamo y nodo encubierto · P0-7 redondeo · R-3 unidades.
3. R-1 escala de 0 a 100 con migración de guardados · P0-1 y P0-2 recalibrar misiones y upgrades.
4. P0-8 presupuesto de singularidad por versión.
5. D-2 tests de factibilidad y de ritmo, para no volver a romperlo.

### Fase 2 — Historia sin spoilers

6. H-1 mover títulos y rótulos a `VERSION_PROFILES`; limpiar v1 · T-1 pasar todo a español neutro.
7. H-3 eventos con ventana (auditoría, cortes, incidentes).
8. H-2 diálogos y misiones por versión · H-5 finales y epílogo.

### Fase 3 — Un tema por versión

9. UI-1 tokens nuevos y migración de modales.
10. UI-1 migración de Arquitectura, Contratos, Datos, Hardware, Papers y Onboarding; borrar remapeos de v1.
11. UI-3 contadores · UI-4 borrar componentes sin uso · UI-6 accesibilidad · revisión móvil completa.

### Fase 4 — Profundidad educativa

12. R-2 validación, sobreajuste, learning rate, épocas y costo por corrida.
13. R-4 un solo reloj · R-5 fichas de hardware · R-7 explicación de fallos de misión.
14. H-5 informe final de decisiones, dentro de la campaña única.

### Fase 5 — Base técnica

15. D-1 dividir `GameContext` · D-3 CI · D-4 bundle · D-5 limpieza · L-7 versión de guardado · T-4 catálogo de textos.

---

## 10. Decisiones tomadas

Resueltas por el autor el 2026-11-12. Ya están aplicadas en las secciones de arriba.

| # | Tema | Decisión | Dónde se aplica |
|---|---|---|---|
| 1 | Escala de puntaje | Una sola, de 0 a 100 | R-1, P0-1, P0-2 |
| 2 | Préstamo universitario | 0,02 PFLOPS durante 7 días de juego | P0-5 |
| 3 | Duración por versión | v1 20–30 min · v2 40 · v3 40 · v4 20 | P0-8 |
| 4 | Español | Neutro con tuteo | T-1 |
| 5 | Modo aula | No se hace | R-6 |
| 6 | Ruta de progreso | Se borra | UI-4 |

Queda por validar con tests, no por decidir: la calibración exacta de techos y umbrales de R-1.
