// utility/registrationSteps.ts

export const REGISTRATION_STEPS = [
  'PersonalInfo',
  'Specialization',
  'Practice',
  'ConsultationPreferences',
  'FinancialSetupScreen',
  'KYCDetailsScreen',
  'ConfirmationScreen',
] as const;

export const TOTAL_STEPS = REGISTRATION_STEPS.length;

// Helper function to get the current step index (1-based) for a given screen
export const getCurrentStepIndex = (screenName: string): number => {
  const index = REGISTRATION_STEPS.indexOf(screenName as typeof REGISTRATION_STEPS[number]);
  return index >= 0 ? index + 1 : 1; // Return 1-based index, default to 1 if not found
};

// Helper function to get progress percentage
export const getProgressPercentage = (currentStep: number): number => {
  return (currentStep / TOTAL_STEPS) * 100;
};

// Helper function to get the next step
export const getNextStep = (currentScreen: string): string => {
  const currentIndex = REGISTRATION_STEPS.indexOf(currentScreen as typeof REGISTRATION_STEPS[number]);
  if (currentIndex >= 0 && currentIndex < TOTAL_STEPS - 1) {
    return REGISTRATION_STEPS[currentIndex + 1];
  }
  return currentScreen; // Return current screen if no next step
};