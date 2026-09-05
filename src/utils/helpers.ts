/**
 * Remove Date objects from provider/doctor object so it is serializable for navigation.
 */

export const serializeDoctorForNavigation = (doctor: any): any => {
  const cleanDate = (date: any): string | undefined => {
    if (!date) return undefined;
    if (date instanceof Date) return date.toISOString();
    if (typeof date === 'string') return date;
    if (date.toDate && typeof date.toDate === 'function') {
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
