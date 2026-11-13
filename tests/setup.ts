// Tests read both languages synchronously: register the Spanish catalog that the game loads on demand.
import { registerCatalog } from '../src/i18n';
import { es } from '../src/i18n/es';

registerCatalog('es', es);
