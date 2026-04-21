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

// Weight per role — determines pyramid position when roles differ in importance
export const ROLE_WEIGHTS: Record<string, number> = {
  "مؤسس":                      1000,
  "رئيس":                       800,
  "نائب الرئيس":                600,
  "مدير عام":                   400,
  "مسؤول إداري":                350,
  "مقدّم":                      200,
  "معدّ":                       150,
  "محرر":                       130,
  "صحفي":                       110,
  "مراسل":                       90,
  "مهندس معلوماتية":             80,
  "مصوّر":                       60,
  "مونتير":                      50,
  "مصمّم":                       40,
  "مسؤول التواصل الاجتماعي":     30,
};

export function staffScore(roles: string[]): number {
  return roles.reduce((sum, r) => sum + (ROLE_WEIGHTS[r] ?? 0), 0);
}
