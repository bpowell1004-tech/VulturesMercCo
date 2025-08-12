// Pricing and cost calculation logic for Vultures Mercenary Company
// Base prices for each mission type in caps
const basePrices = {
  escort: 500,
  recon: 700,
  raid: 1200,
  extraction: 1500,
  bounty: 1000,
  settlement: 1000,
  training: 600,
  custom: 1000
};

// Multipliers for the service tier values
const valueMultipliers = {
  low: 1,
  medium: 1.5,
  high: 2,
  ultra: 2.5
};

// Multipliers based on the number of operators
const operatorsMultipliers = {
  1: 1,
  2: 1.5,
  3: 2,
  4: 2.5
};

/**
 * Update the cost estimate for a given mission type.
 * @param {string} key The mission key (escort, recon, raid, etc.)
 */
function updateCost(key) {
  const base = basePrices[key];
  if (!base) return;
  // Retrieve the selected value tier
  const valueInput = document.querySelector(
    `input[name="value_${key}"]:checked`
  );
  const valueFactor = valueInput ? valueMultipliers[valueInput.value] : 1;
  // Retrieve the mission duration
  const durationInput = document.querySelector(
    `input[name="duration_${key}"]:checked`
  );
  const duration = durationInput ? parseInt(durationInput.value, 10) : 1;
  // Retrieve number of operators
  const operatorsInput = document.querySelector(
    `input[name="operators_${key}"]:checked`
  );
  const operatorsFactor = operatorsInput
    ? operatorsMultipliers[operatorsInput.value]
    : 1;
  // Calculate total and deposit
  const total = Math.round(base * valueFactor * duration * operatorsFactor);
  const deposit = Math.round(total / 2);
  const costElement = document.getElementById(`${key}-cost`);
  if (costElement) {
    costElement.textContent = `Total Cost: ${total} caps — Deposit: ${deposit} caps`;
  }
}

/**
 * Initialize cost calculations and attach change listeners to the form inputs.
 */
function initCostCalculations() {
  // List of mission keys corresponding to each form
  const forms = [
    'escort',
    'recon',
    'raid',
    'extraction',
    'bounty',
    'settlement',
    'training',
    'custom'
  ];
  forms.forEach((key) => {
    // Update on page load
    updateCost(key);
    // Attach listeners to all relevant radio inputs
    const valueRadios = document.querySelectorAll(
      `input[name="value_${key}"]`
    );
    const durationRadios = document.querySelectorAll(
      `input[name="duration_${key}"]`
    );
    const operatorsRadios = document.querySelectorAll(
      `input[name="operators_${key}"]`
    );
    valueRadios.forEach((radio) => {
      radio.addEventListener('change', () => updateCost(key));
    });
    durationRadios.forEach((radio) => {
      radio.addEventListener('change', () => updateCost(key));
    });
    operatorsRadios.forEach((radio) => {
      radio.addEventListener('change', () => updateCost(key));
    });
  });
}

// Run initialization after DOM is fully loaded
document.addEventListener('DOMContentLoaded', initCostCalculations);