/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Remove Date objects from doctor object to make it serializable for navigation
 * Converts Date objects to ISO strings or removes them if already strings/null/undefined
 */
export const serializeDoctorForNavigation = (doctor: any): any => {
  const cleanDate = (date: any): string | undefined => {
    if (!date) return undefined;
    if (date instanceof Date) return date.toISOString();
    if (typeof date === 'string') return date; // Already a string, keep it
    if (date.toDate && typeof date.toDate === 'function') {
      // Handle Firestore Timestamp
      return date.toDate().toISOString();
    }
    return undefined;
  };

  return {
    ...doctor,
    approvedAt: cleanDate(doctor.approvedAt),
    createdAt: cleanDate(doctor.createdAt),
    updatedAt: cleanDate(doctor.updatedAt),
  };
};
