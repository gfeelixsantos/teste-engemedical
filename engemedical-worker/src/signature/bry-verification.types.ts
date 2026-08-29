export type BryVerificationGeneralStatus =
  | 'VALID'
  | 'VALID_WITH_ALERT'
  | 'INVALID'
  | 'INVALID_WITH_INTEGRITY_ERROR';

export interface BryVerificationCertificateStatus {
  status?: string;
  [key: string]: unknown;
}

export interface BryVerificationChainStatus {
  status?: string;
  certificateStatusList?: BryVerificationCertificateStatus[];
  [key: string]: unknown;
}

export interface BryVerificationSignatureStatus {
  fileName?: string;
  verificationReference?: string;
  signingTime?: string;
  signatureAlgorithm?: string;
  hashAlgorithm?: string;
  chainStatus?: BryVerificationChainStatus;
  [key: string]: unknown;
}

export interface BryVerificationResponse {
  nonce?: string | number;
  generalStatus: BryVerificationGeneralStatus;
  signatureFormat?: string;
  signatureStatus?: BryVerificationSignatureStatus;
  signatures?: Array<{
    signatureStatus?: string;
    verificationReference?: string;
    signingTime?: string;
    algorithm?: string;
    hashAlgorithm?: string;
    signatureFormat?: string;
  }>;
  [key: string]: unknown;
}
