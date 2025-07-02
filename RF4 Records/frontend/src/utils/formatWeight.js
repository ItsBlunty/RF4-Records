/**
 * Format weight for display based on the original formats:
 * - "341 g" for weights under 1000g
 * - "9.747 kg" for weights 1-1000 kg  
 * - "1 079.839 kg" for weights over 1000 kg (with space as thousand separator)
 */
export const formatWeight = (weightInGrams) => {
  if (!weightInGrams || weightInGrams <= 0) {
    return '-';
  }

  // If less than 1000g, display in grams
  if (weightInGrams < 1000) {
    return `${weightInGrams} g`;
  }

  // Convert to kg
  const weightInKg = weightInGrams / 1000;

  // Helper function to remove trailing zeros from decimal
  const formatKgValue = (kg) => {
    return kg % 1 === 0 ? kg.toString() : parseFloat(kg.toFixed(3)).toString();
  };

  // If less than 1000 kg, display normally
  if (weightInKg < 1000) {
    return `${formatKgValue(weightInKg)} kg`;
  }

  // For 1000+ kg, use space as thousand separator
  const formattedKg = formatKgValue(weightInKg);
  const [integerPart, decimalPart] = formattedKg.split('.');
  
  // Add space every 3 digits from the right
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return decimalPart ? `${formattedInteger}.${decimalPart} kg` : `${formattedInteger} kg`;
}; 