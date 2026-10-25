interface CategorizedGuest { category: string | string[] | null; }
export function guestCategories(guest: CategorizedGuest): string[] {
  return Array.isArray(guest.category) ? guest.category : guest.category ? [guest.category] : [];
}
export function filterGuestCategory<T extends CategorizedGuest>(programs: T[], guests: T[], category: string | null): T[] {
  return category ? [...programs, ...guests].filter(guest => guestCategories(guest).includes(category)) : [...programs, ...guests];
}
