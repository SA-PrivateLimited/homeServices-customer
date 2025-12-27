import storage from '@react-native-firebase/storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import type {Prescription} from '../types/consultation';

/**
 * Prescription Service
 * Handles prescription viewing, downloading, and sharing
 */

/**
 * Download prescription from Firebase Storage to local device
 */
export const downloadPrescription = async (
  prescriptionUrl: string,
  prescriptionId: string,
): Promise<string> => {
  try {

    const filename = `prescription_${prescriptionId}_${Date.now()}.pdf`;
    const localPath = `${RNFS.DownloadDirectoryPath}/${filename}`;

    // Download file from URL
    const downloadResult = await RNFS.downloadFile({
      fromUrl: prescriptionUrl,
      toFile: localPath,
    }).promise;

    if (downloadResult.statusCode !== 200) {
      throw new Error('Download failed');
    }

    return localPath;
  } catch (error) {
    throw new Error('Failed to download prescription. Please try again.');
  }
};

/**
 * Share prescription via native share sheet
 */
export const sharePrescription = async (
  prescription: Prescription,
): Promise<void> => {
  try {

    if (!prescription.prescriptionImageUrl) {
      throw new Error('No prescription file available to share');
    }

    // Download prescription first if needed
    const localPath = await downloadPrescription(
      prescription.prescriptionImageUrl,
      prescription.id,
    );

    // Format prescription details
    const message = `
Prescription from Dr. ${prescription.doctorName}
Date: ${prescription.createdAt?.toLocaleDateString()}

Diagnosis: ${prescription.diagnosis}

Medications:
${prescription.medications
  .map(
    (med, index) =>
      `${index + 1}. ${med.name} - ${med.dosage}
   Frequency: ${med.frequency}
   Duration: ${med.duration}
   Instructions: ${med.instructions}`,
  )
  .join('\n\n')}

Advice: ${prescription.advice}
${
  prescription.followUpDate
    ? `\nFollow-up Date: ${prescription.followUpDate.toLocaleDateString()}`
    : ''
}
    `.trim();

    await Share.open({
      title: 'Share Prescription',
      message,
      url: `file://${localPath}`,
      type: 'application/pdf',
    });

  } catch (error: any) {
    if (error?.message === 'User did not share') {
      // User cancelled, don't show error
      return;
    }
    throw new Error('Failed to share prescription.');
  }
};

/**
 * Get prescription file size
 */
export const getPrescriptionFileSize = async (
  prescriptionUrl: string,
): Promise<number> => {
  try {
    const reference = storage().refFromURL(prescriptionUrl);
    const metadata = await reference.getMetadata();
    return metadata.size || 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Check if prescription is already downloaded
 */
export const isPrescriptionDownloaded = async (
  prescriptionId: string,
): Promise<boolean> => {
  try {
    const files = await RNFS.readDir(RNFS.DownloadDirectoryPath);
    return files.some(file =>
      file.name.includes(`prescription_${prescriptionId}`),
    );
  } catch (error) {
    return false;
  }
};

/**
 * Get local prescription path if downloaded
 */
export const getLocalPrescriptionPath = async (
  prescriptionId: string,
): Promise<string | null> => {
  try {
    const files = await RNFS.readDir(RNFS.DownloadDirectoryPath);
    const prescriptionFile = files.find(file =>
      file.name.includes(`prescription_${prescriptionId}`),
    );
    return prescriptionFile ? prescriptionFile.path : null;
  } catch (error) {
    return null;
  }
};

/**
 * Delete downloaded prescription from local storage
 */
export const deleteLocalPrescription = async (
  prescriptionId: string,
): Promise<void> => {
  try {
    const localPath = await getLocalPrescriptionPath(prescriptionId);
    if (localPath) {
      await RNFS.unlink(localPath);
    }
  } catch (error) {
    // Non-critical error, don't throw
  }
};

export default {
  downloadPrescription,
  sharePrescription,
  getPrescriptionFileSize,
  isPrescriptionDownloaded,
  getLocalPrescriptionPath,
  deleteLocalPrescription,
};
