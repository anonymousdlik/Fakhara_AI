export interface CarbonInputs {
  electricityKwh: number;
  fuelLiters: number;
  wasteKg: number;
  supplyChainSpendIdr?: number;
  vehicleCount?: number;
  deliveriesPerMonth?: number;
}

export interface CarbonBreakdown {
  energyEmissions: number;
  transportEmissions: number;
  wasteEmissions: number;
  supplyChainEmissions: number;
  totalEmissions: number;
}

const PLN_EMISSION_FACTOR = 0.000760;
const PETROL_EMISSION_FACTOR = 0.002370;
const WASTE_EMISSION_FACTOR = 0.000486;
const SUPPLY_CHAIN_FACTOR_PER_MILLION_IDR = 0.0015;
const DELIVERY_EMISSION_KG = 2.5;

export function calculateCarbonFootprint(
  inputs: CarbonInputs,
): CarbonBreakdown {
  const energyEmissions = inputs.electricityKwh * PLN_EMISSION_FACTOR;

  const fuelEmissions = inputs.fuelLiters * PETROL_EMISSION_FACTOR;
  const deliveryEmissions = inputs.deliveriesPerMonth
    ? (inputs.deliveriesPerMonth * DELIVERY_EMISSION_KG) / 1000
    : 0;
  const transportEmissions = fuelEmissions + deliveryEmissions;

  const wasteEmissions = inputs.wasteKg * WASTE_EMISSION_FACTOR;

  const supplyChainEmissions = inputs.supplyChainSpendIdr
    ? (inputs.supplyChainSpendIdr / 1_000_000) * SUPPLY_CHAIN_FACTOR_PER_MILLION_IDR
    : 0;

  const totalEmissions =
    energyEmissions + transportEmissions + wasteEmissions + supplyChainEmissions;

  return {
    energyEmissions: Number(energyEmissions.toFixed(4)),
    transportEmissions: Number(transportEmissions.toFixed(4)),
    wasteEmissions: Number(wasteEmissions.toFixed(4)),
    supplyChainEmissions: Number(supplyChainEmissions.toFixed(4)),
    totalEmissions: Number(totalEmissions.toFixed(4)),
  };
}
