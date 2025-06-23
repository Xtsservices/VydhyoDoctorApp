// Define or import PLACEHOLDER_IMAGE before using it
export const PLACEHOLDER_IMAGE = { uri: 'placeholder.png' };

export type PersonalInfo = {
  firstName: string;
  lastName: string;
  medicalRegNumber: string;
  email: string;
  gender: string;
  dateOfBirth: Date | undefined;
  spokenLanguages: string[];
  profilePhoto: { uri: string } | typeof PLACEHOLDER_IMAGE;
  appLanguage: string;
  relationship: string;
  bloodGroup: string;
  maritalStatus: string;
};