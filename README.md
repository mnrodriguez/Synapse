# Synapse

Juego de simulación para aprender a entrenar y usar modelos de IA. Empiezas con una PC modesta y un modelo diminuto, y lo haces crecer con datos, cómputo y trabajos. La interfaz cambia en cuatro versiones, y con ellas la historia va revelando de a poco hacia dónde lleva todo.

Funciona en español e inglés, en navegador de escritorio y en el celular.

## Jugar

La versión publicada está en GitHub Pages: `https://mnrodriguez.github.io/Synapse/`.

No hace falta ninguna clave para jugar. Las funciones de IA usan, en orden: el modelo integrado de Chrome si está activo, la clave de Gemini propia del jugador si la carga (queda solo en su navegador, fuera de la partida guardada), o una respuesta local. Las dos primeras se configuran en **Cuenta → Asistente de IA**.

## Desarrollo

Requisitos: [Bun](https://bun.sh).

```bash
bun install
bun run dev      # servidor local en http://localhost:3000
bun run lint     # chequeo de tipos (tsc)
bun test         # tests de balance, guardado y tema
bun run build    # build de producción en dist/
```

El workflow `.github/workflows/pages.yml` corre el chequeo de tipos y los tests antes de publicar en GitHub Pages.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/components/` | Pestañas, paneles y ventanas de la interfaz |
| `src/context/GameContext.tsx` | Estado del juego, tick y acciones |
| `src/persistence/saveState.ts` | Estado inicial y migración de guardados (`SAVE_SCHEMA_VERSION`) |
| `src/utils/training.ts`, `trainingRun.ts` | Cómputo, puntaje de evaluación, épocas, sobreajuste y learning rate |
| `src/utils/missionEvaluation.ts`, `missionTiers.ts` | Requisitos y evaluación de misiones |
| `src/utils/versionProfiles.ts` | Textos y títulos de cada versión de la interfaz |
| `src/utils/storyEvents.ts`, `agentDialogues.ts`, `epilogue.ts` | Historia: eventos, diálogos y finales |
| `src/index.css` | Tema de cada versión (`--accent-*`, clases `theme-*`) |
| `tests/` | Tests con `bun test` |
| `docs/GAME_REVIEW_PLAN.md` | Plan de mejoras y su estado de avance |

Los componentes usan solo las clases del tema (`mutating-*`, `theme-*`). `tests/theme.test.ts` falla si aparece un color fijo de Tailwind, para que las cuatro versiones no se mezclen.
