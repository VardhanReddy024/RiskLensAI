export type RiskTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TransactionStatus = 'pending' | 'flagged' | 'approved' | 'held' | 'escalated' | 'rejected';

export interface DeviceInfo {
  id: string;
  type: 'Mobile' | 'Desktop' | 'Tablet' | 'Bot/Emulator';
  os: string;
  browser: string;
  fingerprintScore: number; // 0-100 (100 = verified genuine, <40 = suspicious)
  isKnownCustomerDevice: boolean;
}

export interface IPInfo {
  ip: string;
  country: string;
  city: string;
  isVpn: boolean;
  isTor: boolean;
  isProxy: boolean;
  proxyRiskScore: number; // 0-100
}

export interface LocationInfo {
  city: string;
  country: string;
  lat: number;
  lon: number;
  distanceFromHomeKm: number;
}

export interface PaymentMethodInfo {
  type: 'Credit Card' | 'Debit Card' | 'Wire Transfer' | 'ACH' | 'Crypto-Fiat' | 'Digital Wallet';
  last4: string;
  issuer: string;
  cardCountry: string;
  is3DSecure: boolean;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerTenureMonths?: number;
  amount: number;
  currency: string;
  merchant: string;
  merchantCategory: 'Electronics' | 'Luxury Goods' | 'Crypto Exchange' | 'Wire Transfer' | 'Gaming/Gambling' | 'Grocery' | 'Travel' | 'Retail' | 'Digital Goods';
  timestamp: string; // ISO 8601
  location: LocationInfo;
  device: DeviceInfo;
  ipAddress: IPInfo;
  paymentMethod: PaymentMethodInfo;
  
  // AI & Risk Metrics
  riskScore: number; // 0 - 100
  fraudProbability: number; // 0.00 - 1.00
  confidenceScore: number; // 0.00 - 1.00
  riskTier: RiskTier;
  status: TransactionStatus;
  
  // Financial loss metric
  estimatedLossPrevented?: number;
  
  // Tags & Quick flags
  tags: string[];
  flagReasons: string[];
  
  // Resolved info
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface RawCSVRow {
  'Transaction ID'?: string;
  'Customer ID'?: string;
  'Amount'?: string | number;
  'Merchant'?: string;
  'Timestamp'?: string;
  'Location'?: string;
  'Device'?: string;
  'IP Address'?: string;
  'Payment Method'?: string;
  [key: string]: any;
}
