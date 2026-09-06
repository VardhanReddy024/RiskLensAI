import * as XLSX from 'xlsx';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_WORKSHEET_ROWS = 100_000;
import { Transaction, RiskTier, LocationInfo, DeviceInfo, IPInfo, PaymentMethodInfo } from '../types';
import { evaluateTransactionWithML } from './ml_engine';
import { getRiskTier } from './utils';

export interface DatasetParseResult {
  transactions: Transaction[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  transactionsImported: number;
  errors: string[];
}

/**
 * Normalizes column header keys by removing spaces, underscores, hyphens, and converting to lowercase
 */
function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\.\/]+/g, '');
}

/**
 * Cleans and parses numeric amounts, detecting INR/currency symbols if present
 */
export function parseAmountAndCurrency(
  rawAmount: any,
  explicitCurrency?: any
): { amount: number; currency: string; isValid: boolean; error?: string } {
  let currency = 'USD';

  if (explicitCurrency && typeof explicitCurrency === 'string' && explicitCurrency.trim()) {
    currency = explicitCurrency.trim().toUpperCase();
  }

  if (rawAmount === null || rawAmount === undefined || rawAmount === '') {
    return { amount: 0, currency, isValid: false, error: 'Amount is required and cannot be empty' };
  }

  if (typeof rawAmount === 'number') {
    if (isNaN(rawAmount) || !isFinite(rawAmount)) {
      return { amount: 0, currency, isValid: false, error: 'Amount must be a finite number' };
    }
    if (rawAmount < 0) {
      return { amount: rawAmount, currency, isValid: false, error: 'Amount cannot be negative' };
    }
    return { amount: rawAmount, currency, isValid: true };
  }

  const str = String(rawAmount).trim();

  // Detect currency from amount string if not explicitly given
  if (!explicitCurrency) {
    if (/₹|inr|rs\.?|rupees/i.test(str)) {
      currency = 'INR';
    } else if (/€|eur/i.test(str)) {
      currency = 'EUR';
    } else if (/£|gbp/i.test(str)) {
      currency = 'GBP';
    } else if (/ca\$|cad/i.test(str)) {
      currency = 'CAD';
    } else if (/au\$|aud/i.test(str)) {
      currency = 'AUD';
    } else if (/sg\$|sgd/i.test(str)) {
      currency = 'SGD';
    } else if (/aed/i.test(str)) {
      currency = 'AED';
    } else if (/\$|usd/i.test(str)) {
      currency = 'USD';
    }
  }

  // Strip currency symbols, currency codes, letters, and comma separators
  // Handles values like "₹ 15,000.50", "USD $1,450.00", "Rs. 25000", "15000", "Rs 8990"
  const cleanedStr = str
    .replace(/[₹$€£,]/g, '')
    .replace(/rs\.?|rupees|inr|usd|eur|gbp|cad|aud|sgd|aed/gi, '')
    .replace(/[^\d\.-]/g, '')
    .trim();

  if (!cleanedStr) {
    return { amount: 0, currency, isValid: false, error: `Invalid amount format: "${str}"` };
  }

  const parsed = parseFloat(cleanedStr);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { amount: 0, currency, isValid: false, error: `Invalid amount format: "${str}"` };
  }

  if (parsed < 0) {
    return { amount: parsed, currency, isValid: false, error: `Amount cannot be negative: "${str}"` };
  }

  return { amount: parsed, currency, isValid: true };
}

/**
 * Finds the value of a column from a row object using multiple possible header name variants
 */
function getRowField(row: Record<string, any>, normalizedKeyMap: Map<string, string>, possibleNames: string[]): any {
  for (const name of possibleNames) {
    const norm = normalizeHeaderKey(name);
    const actualKey = normalizedKeyMap.get(norm);
    if (actualKey !== undefined && row[actualKey] !== undefined && row[actualKey] !== null && String(row[actualKey]).trim() !== '') {
      return row[actualKey];
    }
  }
  return undefined;
}

/**
 * Parses raw row records (from CSV or XLSX/XLS) into fully validated, ML-scored RiskLens transactions
 */
export function parseRawRecords(rows: Array<Record<string, any>>): DatasetParseResult {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: ['No data rows found in uploaded dataset.']
    };
  }

  const transactions: Transaction[] = [];
  const errors: string[] = [];
  let validRows = 0;
  let invalidRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNum = i + 1;

    if (!rawRow || typeof rawRow !== 'object' || Object.keys(rawRow).length === 0) {
      invalidRows++;
      errors.push(`Row ${rowNum}: Empty or invalid row record.`);
      continue;
    }

    // Build normalized map of column headers for this row
    const normalizedKeyMap = new Map<string, string>();
    for (const key of Object.keys(rawRow)) {
      normalizedKeyMap.set(normalizeHeaderKey(key), key);
    }

    // Extract ID (Preserve original if present!)
    const rawId = getRowField(rawRow, normalizedKeyMap, [
      'transactionId', 'transaction_id', 'tx_id', 'id', 'Transaction ID', 'Txn ID',
      'reference_id', 'order_id', 'payment_id', 'tran_id', 'txn_id'
    ]);

    // Extract Amount & Currency
    const rawAmount = getRowField(rawRow, normalizedKeyMap, [
      'amount', 'total', 'value', 'price', 'Amount', 'Total Amount', 'gross_amount', 'order_amount'
    ]);
    const rawCurrency = getRowField(rawRow, normalizedKeyMap, [
      'currency', 'Currency', 'curr', 'Currency Code', 'currency_code'
    ]);

    const { amount, currency, isValid: isAmountValid, error: amountError } = parseAmountAndCurrency(rawAmount, rawCurrency);

    if (!isAmountValid) {
      invalidRows++;
      errors.push(`Row ${rowNum}: ${amountError}`);
      continue;
    }

    // Extract Customer Info
    const rawCustId = getRowField(rawRow, normalizedKeyMap, [
      'customerId', 'customer_id', 'user_id', 'client_id', 'Customer ID', 'cust_id', 'account_id'
    ]);
    const rawCustName = getRowField(rawRow, normalizedKeyMap, [
      'customerName', 'customer_name', 'name', 'Customer Name', 'Client Name', 'customer'
    ]);
    const rawCustEmail = getRowField(rawRow, normalizedKeyMap, [
      'customerEmail', 'customer_email', 'email', 'Customer Email'
    ]);

    // Extract Merchant & Category
    const rawMerchant = getRowField(rawRow, normalizedKeyMap, [
      'merchant', 'merchant_name', 'vendor', 'store', 'Merchant', 'Merchant Name', 'receiver', 'payee'
    ]);
    const rawCategory = getRowField(rawRow, normalizedKeyMap, [
      'merchantCategory', 'merchant_category', 'category', 'Merchant Category', 'Sector', 'mcc', 'industry'
    ]);

    // Extract Timestamp
    const rawTimestamp = getRowField(rawRow, normalizedKeyMap, [
      'timestamp', 'time', 'date', 'created_at', 'Timestamp', 'Date', 'trans_date', 'tx_time', 'datetime'
    ]);

    // Extract Location
    const rawLocation = getRowField(rawRow, normalizedKeyMap, [
      'location', 'Location', 'city_country', 'geo'
    ]);
    const rawCity = getRowField(rawRow, normalizedKeyMap, ['city', 'City']);
    const rawCountry = getRowField(rawRow, normalizedKeyMap, ['country', 'Country']);

    // Extract Device
    const rawDevice = getRowField(rawRow, normalizedKeyMap, [
      'device', 'user_agent', 'device_id', 'os', 'Device', 'browser', 'device_type'
    ]);

    // Extract IP Address
    const rawIp = getRowField(rawRow, normalizedKeyMap, [
      'ipAddress', 'ip_address', 'ip', 'IP Address', 'IP', 'client_ip', 'ip_addr'
    ]);

    // Extract Payment Method
    const rawPayment = getRowField(rawRow, normalizedKeyMap, [
      'paymentMethod', 'payment_method', 'payment_type', 'card_type', 'Payment Method', 'method', 'payment_mode'
    ]);

    // Extract 3DS Flag
    const raw3DS = getRowField(rawRow, normalizedKeyMap, [
      'is3DSecure', '3ds', '3d_secure', 'secure_auth', 'is_3ds', '3dsecure'
    ]);

    // Construct transaction fields with high fidelity
    const finalId = rawId !== undefined && String(rawId).trim() !== ''
      ? String(rawId).trim()
      : `TXN-UPLOAD-${1000 + i}`;

    const finalCustId = rawCustId !== undefined && String(rawCustId).trim() !== ''
      ? String(rawCustId).trim()
      : `CUST-${2000 + (i % 50)}`;

    const finalCustName = rawCustName ? String(rawCustName).trim() : `Customer ${finalCustId.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || 'Client'}`;
    const finalCustEmail = rawCustEmail ? String(rawCustEmail).trim() : `${finalCustId.toLowerCase().replace(/[^a-z0-9]/g, '')}@enterprise.org`;

    const finalMerchant = rawMerchant ? String(rawMerchant).trim() : 'Commercial Merchant';

    // Merchant Category Detection
    let merchantCategory: Transaction['merchantCategory'] = 'Retail';
    const catStr = String(rawCategory || rawMerchant || '').toLowerCase();
    if (/electronics|apple|bestbuy|camera|tech|gadget|phone/i.test(catStr)) {
      merchantCategory = 'Electronics';
    } else if (/crypto|coin|binance|kraken|bit|wallet|blockchain/i.test(catStr)) {
      merchantCategory = 'Crypto Exchange';
    } else if (/wire|bank|rail|transfer|swift|neft|rtgs|ach/i.test(catStr)) {
      merchantCategory = 'Wire Transfer';
    } else if (/luxury|nordstrom|gucci|rolex|bullion|gold|jewelry/i.test(catStr)) {
      merchantCategory = 'Luxury Goods';
    } else if (/gaming|gambling|casino|bet|poker/i.test(catStr)) {
      merchantCategory = 'Gaming/Gambling';
    } else if (/food|grocery|wholefoods|walmart|supermarket|market/i.test(catStr)) {
      merchantCategory = 'Grocery';
    } else if (/travel|airline|hotel|flight|booking|expedia/i.test(catStr)) {
      merchantCategory = 'Travel';
    } else if (/software|saas|digital|app|cloud|subscription/i.test(catStr)) {
      merchantCategory = 'Digital Goods';
    }

    // Timestamp parsing
    let parsedTimestamp = new Date().toISOString();
    if (rawTimestamp) {
      const parsedDate = new Date(rawTimestamp);
      if (!isNaN(parsedDate.getTime())) {
        parsedTimestamp = parsedDate.toISOString();
      }
    }

    // Location parsing
    let city = 'San Francisco';
    let country = 'United States';
    if (rawLocation && typeof rawLocation === 'string') {
      const parts = rawLocation.split(/[,/]/).map(s => s.trim());
      if (parts[0]) city = parts[0];
      if (parts[1]) country = parts[1];
    }
    if (rawCity) city = String(rawCity).trim();
    if (rawCountry) country = String(rawCountry).trim();

    const isProxyOrTor = rawIp ? /tor|proxy|vpn|185\.220|197\.210|datacenter/i.test(String(rawIp)) : false;

    const location: LocationInfo = {
      city,
      country,
      lat: 37.7749 + (i * 0.05),
      lon: -122.4194 + (i * 0.05),
      distanceFromHomeKm: isProxyOrTor ? 4500 : 15,
    };

    // Device parsing
    const deviceStr = rawDevice ? String(rawDevice) : 'Chrome 122 / Windows 11';
    const isEmulator = /emulator|headless|bot|bluestacks|vm|selenium|python/i.test(deviceStr);
    const device: DeviceInfo = {
      id: `DEV-${1000 + i}`,
      type: isEmulator ? 'Bot/Emulator' : (/phone|ios|android|mobile/i.test(deviceStr) ? 'Mobile' : 'Desktop'),
      os: deviceStr,
      browser: deviceStr.includes('/') ? deviceStr.split('/')[0].trim() : 'Chrome 122',
      fingerprintScore: isEmulator ? 18 : (isProxyOrTor ? 50 : 92),
      isKnownCustomerDevice: !isEmulator && !isProxyOrTor,
    };

    // IP Address parsing
    const ipStr = rawIp ? String(rawIp).trim() : `192.168.1.${(i * 11) % 250}`;
    const isTor = /tor|185\.220/i.test(ipStr);
    const ipAddress: IPInfo = {
      ip: ipStr,
      country,
      city,
      isVpn: /vpn/i.test(ipStr) || isProxyOrTor,
      isTor,
      isProxy: isProxyOrTor,
      proxyRiskScore: isTor ? 98 : (isProxyOrTor ? 88 : 12),
    };

    // Payment Method parsing
    const payStr = rawPayment ? String(rawPayment).trim() : 'Credit Card';
    let paymentType: PaymentMethodInfo['type'] = 'Credit Card';
    if (/wire|swift|neft|rtgs/i.test(payStr)) paymentType = 'Wire Transfer';
    else if (/debit/i.test(payStr)) paymentType = 'Debit Card';
    else if (/ach|direct debit/i.test(payStr)) paymentType = 'ACH';
    else if (/crypto/i.test(payStr)) paymentType = 'Crypto-Fiat';
    else if (/wallet|apple pay|google pay|upi|paytm/i.test(payStr)) paymentType = 'Digital Wallet';

    let is3D = !isEmulator && !isTor;
    if (raw3DS !== undefined) {
      if (typeof raw3DS === 'boolean') is3D = raw3DS;
      else if (typeof raw3DS === 'string') is3D = /true|yes|1|verified/i.test(raw3DS.trim());
      else if (typeof raw3DS === 'number') is3D = raw3DS === 1;
    }

    const paymentMethod: PaymentMethodInfo = {
      type: paymentType,
      last4: `${1000 + (i * 37) % 8999}`,
      issuer: currency === 'INR' ? 'HDFC / ICICI Bank' : 'Tier 1 Bank Issuer',
      cardCountry: country,
      is3DSecure: is3D,
    };

    // Construct preliminary transaction object
    const draftTxn: Transaction = {
      id: finalId,
      customerId: finalCustId,
      customerName: finalCustName,
      customerEmail: finalCustEmail,
      customerTenureMonths: 12 + (i * 3) % 48,
      amount,
      currency,
      merchant: finalMerchant,
      merchantCategory,
      timestamp: parsedTimestamp,
      location,
      device,
      ipAddress,
      paymentMethod,
      riskScore: 0,
      fraudProbability: 0,
      confidenceScore: 0.95,
      riskTier: 'LOW',
      status: 'pending',
      tags: [],
      flagReasons: [],
    };

    // Run ML Engine on actual uploaded transaction
    const mlResult = evaluateTransactionWithML(draftTxn);
    const finalRiskScore = mlResult.riskScore;
    const finalRiskTier = mlResult.riskTier;
    const finalFraudProb = mlResult.fraudProbability;
    const finalConfScore = mlResult.confidenceScore;

    const finalStatus = finalRiskScore >= 60 ? 'flagged' : (finalRiskScore >= 30 ? 'pending' : 'approved');
    const estimatedLossPrevented = finalRiskScore >= 60 ? amount : 0;

    const tags = mlResult.shapFactors.filter(s => s.isSuspicious).map(s => s.displayName);
    const flagReasons = mlResult.shapFactors.filter(s => s.impactScore > 15).map(s => s.explanation);

    const completeTxn: Transaction = {
      ...draftTxn,
      riskScore: finalRiskScore,
      fraudProbability: finalFraudProb,
      confidenceScore: finalConfScore,
      riskTier: finalRiskTier,
      riskLevel: finalRiskTier,
      riskFactors: tags,
      riskDecision: finalRiskScore >= 75 ? 'REJECT' : (finalRiskScore >= 50 ? 'REVIEW' : 'ALLOW'),
      status: finalStatus,
      estimatedLossPrevented,
      tags: tags.length > 0 ? tags : ['Standard Verification'],
      flagReasons,
    };

    transactions.push(completeTxn);
    validRows++;
  }

  return {
    transactions,
    totalRows: rows.length,
    validRows,
    invalidRows,
    transactionsImported: validRows,
    errors: errors.slice(0, 10), // return top 10 errors
  };
}

/**
 * Parses raw CSV text into a structured DatasetParseResult
 */
export function parseCSVTextToResult(csvText: string): DatasetParseResult {
  if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: ['The uploaded CSV file is empty or contains no content.']
    };
  }

  // Use SheetJS XLSX.read to robustly parse CSV strings with RFC-4180 compliance
  try {
    const workbook = XLSX.read(csvText, { type: 'string', raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        transactions: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        transactionsImported: 0,
        errors: ['No sheets found in CSV file.']
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rows.length > MAX_WORKSHEET_ROWS) {
      return {
        transactions: [],
        totalRows: rows.length,
        validRows: 0,
        invalidRows: rows.length,
        transactionsImported: 0,
        errors: [`The uploaded CSV exceeds the ${MAX_WORKSHEET_ROWS.toLocaleString()} row safety limit.`],
      };
    }

    if (rows.length === 0) {
      return {
        transactions: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        transactionsImported: 0,
        errors: ['The uploaded CSV file contains a header row but no transaction data.']
      };
    }

    return parseRawRecords(rows);
  } catch (err: any) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: [`Failed to parse CSV file: ${err?.message || 'Invalid format'}`]
    };
  }
}

/**
 * Parses XLSX or XLS binary buffer (ArrayBuffer or Uint8Array) into a DatasetParseResult
 */
export function parseExcelBufferToResult(buffer: ArrayBuffer | Uint8Array): DatasetParseResult {
  if (!buffer || buffer.byteLength === 0) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: ['The uploaded Excel workbook is empty or corrupt.']
    };
  }

  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: [`The uploaded workbook exceeds the ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)} MB safety limit.`],
    };
  }

  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        transactions: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        transactionsImported: 0,
        errors: ['No readable worksheets found in uploaded Excel workbook.']
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rows.length > MAX_WORKSHEET_ROWS) {
      return {
        transactions: [],
        totalRows: rows.length,
        validRows: 0,
        invalidRows: rows.length,
        transactionsImported: 0,
        errors: [`The uploaded worksheet exceeds the ${MAX_WORKSHEET_ROWS.toLocaleString()} row safety limit.`],
      };
    }

    if (rows.length === 0) {
      return {
        transactions: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        transactionsImported: 0,
        errors: ['The uploaded Excel worksheet contains no data rows.']
      };
    }

    return parseRawRecords(rows);
  } catch (err: any) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: [`Failed to parse Excel workbook: ${err?.message || 'Invalid format'}`]
    };
  }
}

/**
 * Parses any File object (CSV, TSV, XLSX, XLS) by inspecting its extension / MIME type
 */
export async function parseUploadedFile(file: File): Promise<DatasetParseResult> {
  if (!file) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: ['No file provided.']
    };
  }

  if (file.size === 0) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: [`File "${file.name}" is empty (0 bytes).`]
    };
  }

  const name = file.name.toLowerCase();
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
  const isCsv = name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt');

  if (!isExcel && !isCsv) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      transactionsImported: 0,
      errors: [`Unsupported file format for "${file.name}". Please upload a .csv, .xlsx, or .xls file.`]
    };
  }

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    return parseExcelBufferToResult(arrayBuffer);
  } else {
    const text = await file.text();
    return parseCSVTextToResult(text);
  }
}
