/**
 * Asset upload API (React Native) — presigned/local PUT, never base64 in API payloads.
 */

import {Platform} from 'react-native';
import {API_BASE_URL} from '../../config/api';
import {apiPost} from './apiClient';
import {getStoredJwt} from '../session';

export type AssetUploadPurpose =
  | 'service-request-photo'
  | 'provider-request-photo'
  | 'provider-request-document'
  | 'provider-document'
  | 'customer-profile'
  | 'provider-profile'
  | 'provider-showcase'
  | 'temp';

export interface AssetRef {
  key: string;
  url: string;
  contentType?: string;
  fileName?: string;
  size?: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
  storage?: 's3' | 'local';
  maxBytes?: number;
}

function guessContentType(uri: string, fallback = 'image/jpeg'): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.pdf')) return 'application/pdf';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  return fallback;
}

function fileNameFromUri(uri: string, fallback = 'photo.jpg'): string {
  const cleaned = uri.split('?')[0];
  const part = cleaned.split('/').pop();
  return part && part.includes('.') ? part : fallback;
}

export async function requestUploadUrl(input: {
  fileName: string;
  contentType: string;
  purpose: AssetUploadPurpose;
  requestId?: string;
  docKey?: string;
  fileSize?: number;
}): Promise<UploadUrlResponse> {
  return apiPost<UploadUrlResponse>('/assets/upload-url', input);
}

/**
 * Read a local image/document URI into an ArrayBuffer for PUT upload.
 */
async function readUriAsArrayBuffer(uri: string): Promise<{
  body: ArrayBuffer;
  size: number;
}> {
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  return {body: buffer, size: buffer.byteLength};
}

export async function putBinaryToUploadUrl(
  upload: UploadUrlResponse,
  body: ArrayBuffer | Blob,
): Promise<void> {
  const headers: Record<string, string> = {
    ...(upload.headers || {}),
  };
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/octet-stream';
  }

  const response = await fetch(upload.uploadUrl, {
    method: upload.method || 'PUT',
    headers,
    body: body as any,
  });

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? 'Upload expired or was denied. Please try again.'
        : `Upload failed (${response.status})`,
    );
  }
}

/**
 * Upload a local RN image/document URI to S3 (or local direct-upload fallback).
 */
export async function uploadAssetFromUri(
  uri: string,
  options: {
    purpose: AssetUploadPurpose;
    contentType?: string;
    fileName?: string;
    requestId?: string;
    docKey?: string;
  },
): Promise<AssetRef> {
  const contentType =
    options.contentType || guessContentType(uri, 'image/jpeg');
  const fileName = options.fileName || fileNameFromUri(uri);
  const {body, size} = await readUriAsArrayBuffer(uri);

  const session = await requestUploadUrl({
    fileName,
    contentType,
    purpose: options.purpose,
    requestId: options.requestId,
    docKey: options.docKey,
    fileSize: size,
  });

  // Android emulator: rewrite localhost direct-upload URLs to 10.0.2.2
  let uploadUrl = session.uploadUrl;
  if (
    Platform.OS === 'android' &&
    __DEV__ &&
    uploadUrl.includes('127.0.0.1')
  ) {
    uploadUrl = uploadUrl.replace('127.0.0.1', '10.0.2.2');
  }
  if (
    Platform.OS === 'android' &&
    __DEV__ &&
    uploadUrl.includes('localhost')
  ) {
    uploadUrl = uploadUrl.replace('localhost', '10.0.2.2');
  }

  await putBinaryToUploadUrl({...session, uploadUrl}, body);

  let publicUrl = session.url;
  if (
    Platform.OS === 'android' &&
    __DEV__ &&
    publicUrl.includes('127.0.0.1')
  ) {
    publicUrl = publicUrl.replace('127.0.0.1', '10.0.2.2');
  }

  return {
    key: session.key,
    url: publicUrl,
    contentType,
    fileName,
    size,
  };
}

export async function deleteAsset(ref: {
  key?: string;
  url?: string;
}): Promise<boolean> {
  try {
    const token = await getStoredJwt();
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      body: JSON.stringify({key: ref.key, url: ref.url}),
    });
    return response.ok;
  } catch {
    return false;
  }
}
