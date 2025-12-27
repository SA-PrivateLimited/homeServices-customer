/**
 * Text formatting utilities for displaying AI responses
 */

/**
 * Clean up markdown and formatting from AI responses
 */
export const cleanMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Remove markdown headers
  let cleaned = text.replace(/^###+\s+/gm, '');
  cleaned = cleaned.replace(/^##+\s+/gm, '');
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  
  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`(.*?)`/g, '$1');
  
  // Remove markdown links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
};

/**
 * Format consultation information for display
 */
export const formatConsultationInfo = (consultation: any): string => {
  const parts: string[] = [];
  
  if (consultation.doctorName) {
    parts.push(`Doctor: ${consultation.doctorName}`);
  }
  
  if (consultation.doctorSpecialization) {
    parts.push(`Specialization: ${consultation.doctorSpecialization}`);
  }
  
  if (consultation.scheduledTime) {
    const date = consultation.scheduledTime instanceof Date 
      ? consultation.scheduledTime 
      : new Date(consultation.scheduledTime);
    parts.push(`Scheduled: ${date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`);
  }
  
  if (consultation.status) {
    parts.push(`Status: ${consultation.status}`);
  }
  
  if (consultation.consultationFee) {
    parts.push(`Fee: ₹${consultation.consultationFee}`);
  }
  
  return parts.join(' • ');
};

