// Define or import PLACEHOLDER_IMAGE before using it
export const PLACEHOLDER_IMAGE = { uri: 'placeholder.png' };

export type  PersonalInfo ={
  fullName: string;
  medicalRegNumber: string;
  email: string;
  gender: string;
  dateOfBirth: Date | undefined;
  languages: string[];
  profilePhoto: { uri: string } | typeof PLACEHOLDER_IMAGE;
}