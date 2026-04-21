export const STAFF_ROLES = [
  // Leadership
  "مؤسس",
  "رئيس",
  "نائب الرئيس",
  // Editorial & Content
  "مقدّم",
  "معدّ",
  "محرر",
  "صحفي",
  "مراسل",
  // Technical
  "مهندس معلوماتية",
  "مصوّر",
  "مونتير",
  "مصمّم",
  // Admin & Marketing
  "مدير عام",
  "مسؤول التواصل الاجتماعي",
  "مسؤول إداري",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
