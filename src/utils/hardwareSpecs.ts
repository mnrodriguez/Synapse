/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tr, type CatalogKey, type Language } from '../i18n';

// Where each hardware figure comes from. Home cards are rated in FP32, data-centre accelerators in the
// tensor precision their vendor quotes (dense, without sparsity). Comparing them directly overstates the
// gap, so the card says which precision it is and whether the number is a spec, an estimate or fiction.

export type SpecSource = 'spec' | 'estimate' | 'projection' | 'fiction';

export interface HardwareSpecNote {
  precision?: string;
  source: SpecSource;
}

export const HARDWARE_SPEC_NOTES: Record<string, HardwareSpecNote> = {
  gpu_gtx1060: { precision: 'FP32', source: 'spec' },
  gpu_rx580_dual: { precision: 'FP32', source: 'spec' },
  gpu_tesla_k80: { precision: 'FP32', source: 'spec' },
  gpu_coral_edge: { precision: 'INT8 + FP32', source: 'estimate' },
  gpu_rtx4090: { precision: 'FP32', source: 'spec' },
  gpu_a100_80gb: { precision: 'BF16 tensor', source: 'spec' },
  gpu_h100_sxm5: { precision: 'BF16 tensor', source: 'spec' },
  gpu_b200_blackwell: { precision: 'FP8 tensor', source: 'spec' },
  tpu_v5p_pod: { precision: 'BF16', source: 'estimate' },
  quantum_photonic_asic: { source: 'fiction' },
  cool_cryogenic_helium: { source: 'fiction' },
  power_smr_nuclear: { source: 'projection' },
  net_quantum_bus: { source: 'fiction' }
};

const SPEC_SOURCE_LABELS: Record<SpecSource, CatalogKey> = {
  spec: 'hardwareSpecs.source.spec',
  estimate: 'hardwareSpecs.source.estimate',
  projection: 'hardwareSpecs.source.projection',
  fiction: 'hardwareSpecs.source.fiction'
};

export function specSourceLabel(language: Language, source: SpecSource): string {
  return tr(language, SPEC_SOURCE_LABELS[source]);
}
