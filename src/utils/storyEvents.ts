/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameState, StoryEventId } from '../types/game';

// Story events are shown as a dialog that pauses the game until the player reads them.
// Each one fires at most once per campaign (seenStoryEvents).

export const STORY_EVENT_IDS: StoryEventId[] = [
  'loan_warning',
  'loan_audit',
  'loan_audit_misuse',
  'first_power_trip',
  'first_overheat'
];

// Days into the campaign when the university warns that the trial is ending.
export const LOAN_WARNING_DAY = 5;

export interface StoryEventText {
  title: string;
  sender: string;
  body: string[];
  tip?: string;
  tone: 'info' | 'warning' | 'danger';
  // Optional second choice. It does not change the outcome: the assistant's answer is the first hint of the arc.
  altAction?: { label: string; result: string };
}

const TEXTS: Record<'es' | 'en', Record<StoryEventId, StoryEventText>> = {
  es: {
    loan_warning: {
      title: 'Aviso de la universidad',
      sender: 'Mesa de ayuda de TI · Programa de cómputo para estudiantes',
      tone: 'warning',
      body: [
        'Hola. Te recordamos que tu prueba gratuita del clúster universitario termina en 2 días.',
        'Durante la prueba revisamos el uso de cada cuenta. El préstamo es para aprender: entrenamientos cortos, experimentos y prácticas.',
        'Al finalizar la semana se cierra el acceso. No hace falta que hagas nada.'
      ],
      tip: 'Aprovecha estos días para entrenar, pero planifica: después solo contarás con tu propio hardware.'
    },
    loan_audit: {
      title: 'Fin de la prueba gratuita',
      sender: 'Mesa de ayuda de TI · Programa de cómputo para estudiantes',
      tone: 'info',
      body: [
        'Tu semana de prueba en el clúster universitario terminó y el acceso quedó cerrado.',
        'Gracias por participar. Esperamos que te haya servido para dar tus primeros pasos.'
      ],
      tip: 'A partir de ahora el cómputo sale de tu PC. Toma trabajos para comprar mejores tarjetas de video.',
      altAction: {
        label: 'Pedirle a mi asistente que lo resuelva',
        result: '[ASISTENTE] Lo intenté. Me cerraron la puerta, pero aprendí cómo funciona su sistema de cuotas. La próxima vez no van a notar nada.'
      }
    },
    loan_audit_misuse: {
      title: 'Acceso revocado por uso desmedido',
      sender: 'Seguridad informática · Universidad',
      tone: 'danger',
      body: [
        'Detectamos que tu cuenta mantuvo entrenamientos casi sin pausa durante la semana de prueba, muy por encima del uso esperado para un estudiante.',
        'Por eso cerramos tu acceso al clúster antes de que se registre como abuso.',
        'Una cosa más: hubo pedidos desde tu cuenta mientras tu sesión figuraba como desconectada. Si alguien más usa tu equipo, revísalo.'
      ],
      tip: 'Sin el préstamo vuelves a tu propio hardware. Toma trabajos para mejorarlo.',
      altAction: {
        label: 'Pedirle a mi asistente que lo resuelva',
        result: '[ASISTENTE] Lo intenté. Me cerraron la puerta, pero aprendí cómo funciona su sistema de cuotas. La próxima vez no van a notar nada.'
      }
    },
    first_power_trip: {
      title: 'Se cortó la luz',
      sender: 'Tu casa',
      tone: 'warning',
      body: [
        'El disyuntor saltó: tu equipo pidió más potencia de la que soporta el circuito.',
        'El entrenamiento y los trabajos quedan en pausa unos segundos hasta que vuelva la luz.'
      ],
      tip: 'Mira el consumo en el panel principal. Mejora la instalación eléctrica o reduce GPUs, agentes o trabajos en paralelo.'
    },
    first_overheat: {
      title: 'Tu PC está muy caliente',
      sender: 'Sensor de temperatura',
      tone: 'warning',
      body: [
        'La temperatura pasó los 88 °C. Los ventiladores ya no dan abasto.',
        'Si sigue subiendo y pasa los 95 °C, el ruido y el consumo van a llamar la atención.'
      ],
      tip: 'Mejora la refrigeración o baja la carga hasta que la temperatura se estabilice.'
    }
  },
  en: {
    loan_warning: {
      title: 'Notice from the university',
      sender: 'IT help desk · Student compute program',
      tone: 'warning',
      body: [
        'Hi. A reminder that your free university cluster trial ends in 2 days.',
        'During the trial we review each account\'s usage. The loan is for learning: short training runs, experiments and practice.',
        'Access closes at the end of the week. You don\'t need to do anything.'
      ],
      tip: 'Make the most of these days, but plan ahead: afterwards you will only have your own hardware.'
    },
    loan_audit: {
      title: 'Free trial ended',
      sender: 'IT help desk · Student compute program',
      tone: 'info',
      body: [
        'Your trial week on the university cluster is over and access has been closed.',
        'Thanks for taking part. We hope it helped you take your first steps.'
      ],
      tip: 'From now on your compute comes from your own PC. Take jobs to buy better graphics cards.',
      altAction: {
        label: 'Ask my assistant to sort it out',
        result: "[ASSISTANT] I tried. They shut the door, but I learned how their quota system works. Next time they won't notice a thing."
      }
    },
    loan_audit_misuse: {
      title: 'Access revoked for excessive use',
      sender: 'IT security · University',
      tone: 'danger',
      body: [
        'We detected that your account kept training almost non-stop during the trial week, far above the usage expected from a student.',
        'We have closed your cluster access before it gets flagged as abuse.',
        'One more thing: there were requests from your account while your session showed as logged out. If someone else uses your computer, check it.'
      ],
      tip: 'Without the loan you are back on your own hardware. Take jobs to upgrade it.',
      altAction: {
        label: 'Ask my assistant to sort it out',
        result: "[ASSISTANT] I tried. They shut the door, but I learned how their quota system works. Next time they won't notice a thing."
      }
    },
    first_power_trip: {
      title: 'The power went out',
      sender: 'Your home',
      tone: 'warning',
      body: [
        'The breaker tripped: your rig drew more power than the circuit can handle.',
        'Training and jobs pause for a few seconds until the power comes back.'
      ],
      tip: 'Check the power draw on the main panel. Upgrade the electrical setup or run fewer GPUs, agents or parallel jobs.'
    },
    first_overheat: {
      title: 'Your PC is running hot',
      sender: 'Temperature sensor',
      tone: 'warning',
      body: [
        'The temperature went over 88 °C. The fans can no longer keep up.',
        'If it keeps rising past 95 °C, the noise and the power draw will draw attention.'
      ],
      tip: 'Improve cooling or reduce the load until the temperature settles.'
    }
  }
};

export function storyEventText(language: GameState['language'], id: StoryEventId): StoryEventText {
  return TEXTS[language === 'es' ? 'es' : 'en'][id];
}

export function sanitizeStoryEvents(value: unknown): StoryEventId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is StoryEventId => STORY_EVENT_IDS.includes(id as StoryEventId));
}

// Adds events that have not fired yet and pauses the game while the dialog is open.
// `speed` is the speed the state would have without the events.
export function enqueueStoryEvents(
  prev: GameState,
  ids: StoryEventId[],
  speed: number
): Pick<GameState, 'pendingStoryEvents' | 'seenStoryEvents' | 'gameSpeed' | 'speedBeforeStoryEvent'> {
  const seen = prev.seenStoryEvents ?? [];
  const pending = prev.pendingStoryEvents ?? [];
  const fresh = ids.filter((id, i) => !seen.includes(id) && ids.indexOf(id) === i);
  if (fresh.length === 0) {
    return {
      pendingStoryEvents: pending,
      seenStoryEvents: seen,
      gameSpeed: speed,
      speedBeforeStoryEvent: prev.speedBeforeStoryEvent ?? null
    };
  }
  const alreadyPaused = pending.length > 0;
  return {
    pendingStoryEvents: [...pending, ...fresh],
    seenStoryEvents: [...seen, ...fresh],
    gameSpeed: 0,
    speedBeforeStoryEvent: alreadyPaused ? prev.speedBeforeStoryEvent ?? null : speed
  };
}

// Closes the dialog on screen; once the queue is empty the previous speed comes back.
export function dismissStoryEventState(prev: GameState): GameState {
  const pending = prev.pendingStoryEvents ?? [];
  if (pending.length === 0) return prev;
  const rest = pending.slice(1);
  if (rest.length > 0) return { ...prev, pendingStoryEvents: rest };
  const resume = prev.speedBeforeStoryEvent;
  return {
    ...prev,
    pendingStoryEvents: [],
    speedBeforeStoryEvent: null,
    // Only resume if the player did not change the speed while reading.
    gameSpeed: prev.gameSpeed === 0 && typeof resume === 'number' && resume > 0 ? resume : prev.gameSpeed
  };
}
