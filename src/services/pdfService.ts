import RNHTMLtoPDF from 'react-native-html-to-pdf';
import type {Consultation} from '../types/consultation';

export class PDFService {
  /**
   * Format date for display
   */
  private static formatDate(date: Date | any): string {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * Format time for display
   */
  private static formatTime(date: Date | any): string {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid time';
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid time';
    }
  }

  /**
   * Format date and time together
   */
  private static formatDateTime(date: Date | any): string {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * Get status display text
   */
  private static getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Get status color
   */
  private static getStatusColor(status: string): string {
    switch (status) {
      case 'scheduled':
        return '#10B981'; // Green
      case 'in-progress':
      case 'ongoing':
        return '#3B82F6'; // Blue
      case 'completed':
        return '#6B7280'; // Gray
      case 'cancelled':
        return '#EF4444'; // Red
      default:
        return '#6B7280';
    }
  }

  /**
   * Generate HTML content for PDF
   */
  private static generateHTMLContent(consultation: Consultation): string {
    const statusColor = this.getStatusColor(consultation.status);
    const statusLabel = this.getStatusLabel(consultation.status);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            padding: 40px;
            background: #ffffff;
          }

          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3B82F6;
          }

          .header h1 {
            color: #1f2937;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .header .subtitle {
            color: #6B7280;
            font-size: 14px;
          }

          .status-badge {
            display: inline-block;
            padding: 8px 20px;
            background-color: ${statusColor}20;
            color: ${statusColor};
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin: 20px 0;
            border: 2px solid ${statusColor};
          }

          .section {
            margin-bottom: 30px;
            background: #F9FAFB;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #3B82F6;
          }

          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
          }

          .section-title::before {
            content: '•';
            color: #3B82F6;
            font-size: 24px;
            margin-right: 10px;
          }

          .info-row {
            display: flex;
            margin-bottom: 12px;
            padding: 10px;
            background: white;
            border-radius: 8px;
          }

          .info-label {
            font-weight: 600;
            color: #6B7280;
            min-width: 150px;
            font-size: 14px;
          }

          .info-value {
            color: #1f2937;
            flex: 1;
            font-size: 14px;
          }

          .text-block {
            background: white;
            padding: 15px;
            border-radius: 8px;
            color: #1f2937;
            font-size: 14px;
            line-height: 1.8;
            white-space: pre-wrap;
            word-wrap: break-word;
          }

          .text-block.empty {
            color: #9CA3AF;
            font-style: italic;
          }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 12px;
          }

          .meet-link {
            background: #EFF6FF;
            border: 2px solid #3B82F6;
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
            word-break: break-all;
          }

          .meet-link a {
            color: #3B82F6;
            text-decoration: none;
            font-weight: 600;
          }

          .cancellation-box {
            background: #FEF2F2;
            border-left: 4px solid #EF4444;
            padding: 15px;
            border-radius: 8px;
            color: #991B1B;
            margin-top: 10px;
          }

          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Consultation Details</h1>
          <p class="subtitle">HomeServices Healthcare Platform</p>
          <div class="status-badge">${statusLabel}</div>
        </div>

        <!-- Patient Information -->
        <div class="section">
          <div class="section-title">Patient Information</div>
          <div class="info-row">
            <div class="info-label">Patient Name:</div>
            <div class="info-value">${consultation.patientName || 'Not available'}</div>
          </div>
          ${consultation.patientAge ? `
          <div class="info-row">
            <div class="info-label">Age:</div>
            <div class="info-value">${consultation.patientAge} years old</div>
          </div>
          ` : ''}
          ${consultation.patientPhone ? `
          <div class="info-row">
            <div class="info-label">Phone:</div>
            <div class="info-value">${consultation.patientPhone}</div>
          </div>
          ` : ''}
        </div>

        <!-- Doctor Information -->
        <div class="section">
          <div class="section-title">Doctor Information</div>
          <div class="info-row">
            <div class="info-label">Doctor Name:</div>
            <div class="info-value">Dr. ${consultation.doctorName || 'Not available'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Specialization:</div>
            <div class="info-value">${consultation.doctorSpecialization || 'Not specified'}</div>
          </div>
        </div>

        <!-- Appointment Details -->
        <div class="section">
          <div class="section-title">Appointment Details</div>
          <div class="info-row">
            <div class="info-label">Date:</div>
            <div class="info-value">${this.formatDate(consultation.scheduledTime)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Time:</div>
            <div class="info-value">${this.formatTime(consultation.scheduledTime)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Duration:</div>
            <div class="info-value">${consultation.duration || 30} minutes</div>
          </div>
          <div class="info-row">
            <div class="info-label">Consultation Fee:</div>
            <div class="info-value">₹${consultation.consultationFee || 0}</div>
          </div>
        </div>

        ${consultation.googleMeetLink ? `
        <!-- Video Consultation Link -->
        <div class="section">
          <div class="section-title">Video Consultation Link</div>
          <div class="meet-link">
            <a href="${consultation.googleMeetLink}">${consultation.googleMeetLink}</a>
          </div>
        </div>
        ` : ''}

        <!-- Symptoms -->
        <div class="section">
          <div class="section-title">Symptoms</div>
          <div class="text-block${!consultation.symptoms || !consultation.symptoms.trim() ? ' empty' : ''}">
            ${consultation.symptoms && consultation.symptoms.trim() ? consultation.symptoms : 'No symptoms provided'}
          </div>
        </div>

        ${consultation.notes && consultation.notes.trim() ? `
        <!-- Patient Notes -->
        <div class="section">
          <div class="section-title">Patient Notes</div>
          <div class="text-block">
            ${consultation.notes}
          </div>
        </div>
        ` : ''}

        <!-- Diagnosis -->
        <div class="section">
          <div class="section-title">Diagnosis</div>
          <div class="text-block${!consultation.diagnosis || !consultation.diagnosis.trim() ? ' empty' : ''}">
            ${consultation.diagnosis && consultation.diagnosis.trim() ? consultation.diagnosis : 'Not provided yet'}
          </div>
        </div>

        <!-- Prescription -->
        <div class="section">
          <div class="section-title">Prescription</div>
          <div class="text-block${!consultation.prescription || !consultation.prescription.trim() ? ' empty' : ''}">
            ${consultation.prescription && consultation.prescription.trim() ? consultation.prescription : 'Not provided yet'}
          </div>
        </div>

        <!-- Doctor's Notes -->
        <div class="section">
          <div class="section-title">Doctor's Notes</div>
          <div class="text-block${!consultation.doctorNotes || !consultation.doctorNotes.trim() ? ' empty' : ''}">
            ${consultation.doctorNotes && consultation.doctorNotes.trim() ? consultation.doctorNotes : 'No notes added yet'}
          </div>
        </div>

        ${consultation.cancellationReason && consultation.cancellationReason.trim() ? `
        <!-- Cancellation Reason -->
        <div class="section">
          <div class="section-title">Cancellation Reason</div>
          <div class="cancellation-box">
            ${consultation.cancellationReason}
          </div>
        </div>
        ` : ''}

        <!-- Consultation ID -->
        <div class="section">
          <div class="section-title">Consultation ID</div>
          <div class="text-block">
            ${consultation.id}
          </div>
        </div>

        <!-- Timestamps -->
        <div class="section">
          <div class="section-title">Timestamps</div>
          ${consultation.createdAt ? `
          <div class="info-row">
            <div class="info-label">Created:</div>
            <div class="info-value">${this.formatDateTime(consultation.createdAt)}</div>
          </div>
          ` : ''}
          ${consultation.updatedAt ? `
          <div class="info-row">
            <div class="info-label">Last Updated:</div>
            <div class="info-value">${this.formatDateTime(consultation.updatedAt)}</div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}</p>
          <p style="margin-top: 5px;">HomeServices - Your Healthcare Companion</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate PDF from consultation data
   */
  static async generateConsultationPDF(consultation: Consultation): Promise<string> {
    try {
      const htmlContent = this.generateHTMLContent(consultation);
      const fileName = `Consultation_${consultation.patientName || 'Patient'}_${Date.now()}`;

      const options = {
        html: htmlContent,
        fileName: fileName,
        directory: 'Documents',
      };

      const file = await RNHTMLtoPDF.convert(options);
      return file.filePath || '';
    } catch (error) {
      throw new Error('Failed to generate PDF');
    }
  }
}
