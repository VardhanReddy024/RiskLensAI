import { Transaction, RawCSVRow, RiskTier } from '../types';
import { getRiskTier } from './utils';

export interface CSVParseResult {
  transactions: Transaction[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
}

export function parseCSVText(csvText: string): CSVParseResult {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      transactions: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: ['The uploaded CSV file is empty or does not contain a header row.']
    };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
  
  // Find column indices with flexible name matching
  const idIdx = headers.findIndex(h => h.includes('transaction') || h === 'id' || h === 'tx_id');
  const custIdx = headers.findIndex(h => h.includes('customer') || h.includes('user') || h === 'cust_id');
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('price') || h.includes('total'));
  const merchantIdx = headers.findIndex(h => h.includes('merchant') || h.includes('vendor') || h.includes('store'));
  const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('date'));
  const locIdx = headers.findIndex(h => h.includes('loc') || h.includes('city') || h.includes('country'));
  const deviceIdx = headers.findIndex(h => h.includes('device') || h.includes('user_agent') || h.includes('os'));
  const ipIdx = headers.findIndex(h => h.includes('ip') || h.includes('address'));
  const paymentIdx = headers.findIndex(h => h.includes('payment') || h.includes('card') || h.includes('method'));

  const transactions: Transaction[] = [];
  const errors: string[] = [];
  let validRows = 0;
  let invalidRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const rowLine = lines[i].trim();
    if (!rowLine) continue;

    try {
      const cols = parseCSVLine(rowLine);
      const rawId = idIdx !== -1 && cols[idIdx] ? cols[idIdx].trim() : `TXN-CSV-${1000 + i}`;
      const rawCust = custIdx !== -1 && cols[custIdx] ? cols[custIdx].trim() : `CUST-${2000 + (i % 25)}`;
      
      const rawAmountStr = amountIdx !== -1 && cols[amountIdx] ? cols[amountIdx].replace(/[$,\s]/g, '') : '100.00';
      const parsedAmount = parseFloat(rawAmountStr) || 100.00;
      
      const rawMerchant = merchantIdx !== -1 && cols[merchantIdx] ? cols[merchantIdx].trim() : 'Global Merchant Corp';
      const rawTime = timeIdx !== -1 && cols[timeIdx] ? cols[timeIdx].trim() : new Date().toISOString();
      const rawLoc = locIdx !== -1 && cols[locIdx] ? cols[locIdx].trim() : 'San Francisco, US';
      const rawDevice = deviceIdx !== -1 && cols[deviceIdx] ? cols[deviceIdx].trim() : 'Chrome / Windows 11';
      const rawIp = ipIdx !== -1 && cols[ipIdx] ? cols[ipIdx].trim() : `192.168.1.${(i * 7) % 250}`;
      const rawPayment = paymentIdx !== -1 && cols[paymentIdx] ? cols[paymentIdx].trim() : 'Credit Card';

      // Parse location parts
      const locParts = rawLoc.split(/[,/]/).map(s => s.trim());
      const city = locParts[0] || 'Unknown';
      const country = locParts[1] || 'United States';

      // Infer risk factors
      const isHighAmount = parsedAmount > 2500;
      const isCryptoOrBullion = /crypto|coin|bullion|gold|wire|exchange/i.test(rawMerchant);
      const isProxyOrVpn = /proxy|vpn|tor|datacenter|185\.|197\./i.test(rawIp) || /proxy|vpn/i.test(rawDevice);
      const isEmulator = /emulator|headless|bot|vm|bluestacks/i.test(rawDevice);
      
      let baseRisk = 5;
      const flagReasons: string[] = [];
      const tags: string[] = [];

      if (isHighAmount) {
        baseRisk += 25;
        flagReasons.push(`High transaction amount ($${parsedAmount.toFixed(2)})`);
        tags.push('High Ticket');
      }
      if (isCryptoOrBullion) {
        baseRisk += 30;
        flagReasons.push(`High risk merchant category: ${rawMerchant}`);
        tags.push('High Risk Merchant');
      }
      if (isProxyOrVpn) {
        baseRisk += 25;
        flagReasons.push(`Suspicious IP routing or proxy detected (${rawIp})`);
        tags.push('Proxy Detected');
      }
      if (isEmulator) {
        baseRisk += 30;
        flagReasons.push(`Automated bot / emulator fingerprint detected (${rawDevice})`);
        tags.push('Emulator Device');
      }

      const riskScore = Math.min(99, Math.max(1, baseRisk + (i % 7)));
      const fraudProbability = parseFloat((riskScore / 100).toFixed(2));
      const riskTier: RiskTier = getRiskTier(riskScore);
      const status = riskScore >= 60 ? 'flagged' : (riskScore >= 30 ? 'pending' : 'approved');

      // Category detection
      let merchantCategory: any = 'Retail';
      if (/electronics|apple|bestbuy|camera|tv/i.test(rawMerchant)) merchantCategory = 'Electronics';
      else if (/crypto|coin|binance|kraken/i.test(rawMerchant)) merchantCategory = 'Crypto Exchange';
      else if (/wire|bank|rail|transfer/i.test(rawMerchant)) merchantCategory = 'Wire Transfer';
      else if (/luxury|nordstrom|gucci|rolex|bullion/i.test(rawMerchant)) merchantCategory = 'Luxury Goods';
      else if (/food|grocery|wholefoods|walmart/i.test(rawMerchant)) merchantCategory = 'Grocery';

      const transaction: Transaction = {
        id: rawId,
        customerId: rawCust,
        customerName: `Client ${rawCust.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`,
        customerEmail: `${rawCust.toLowerCase().replace(/[^a-z0-9]/g, '')}@enterprise.org`,
        customerTenureMonths: 12 + (i * 3) % 48,
        amount: parsedAmount,
        currency: 'USD',
        merchant: rawMerchant,
        merchantCategory,
        timestamp: isValidDate(rawTime) ? new Date(rawTime).toISOString() : new Date().toISOString(),
        location: {
          city,
          country,
          lat: 37.7749 + (i * 0.1),
          lon: -122.4194 + (i * 0.1),
          distanceFromHomeKm: isProxyOrVpn ? 4800 : 15,
        },
        device: {
          id: `DEV-${1000 + i}`,
          type: isEmulator ? 'Bot/Emulator' : (rawDevice.toLowerCase().includes('phone') || rawDevice.toLowerCase().includes('ios') || rawDevice.toLowerCase().includes('android') ? 'Mobile' : 'Desktop'),
          os: rawDevice,
          browser: rawDevice.includes('/') ? rawDevice.split('/')[0].trim() : 'Chrome 122',
          fingerprintScore: isEmulator ? 20 : (isProxyOrVpn ? 55 : 95),
          isKnownCustomerDevice: !isEmulator && !isProxyOrVpn,
        },
        ipAddress: {
          ip: rawIp,
          country,
          city,
          isVpn: isProxyOrVpn,
          isTor: /tor/i.test(rawIp) || /185\.220/i.test(rawIp),
          isProxy: isProxyOrVpn,
          proxyRiskScore: isProxyOrVpn ? 88 : 12,
        },
        paymentMethod: {
          type: rawPayment.includes('Wire') ? 'Wire Transfer' : (rawPayment.includes('Debit') ? 'Debit Card' : 'Credit Card'),
          last4: `${1000 + (i * 47) % 8999}`,
          issuer: 'Tier 1 Bank Issuer',
          cardCountry: country,
          is3DSecure: !isHighAmount && !isEmulator,
        },
        riskScore,
        fraudProbability,
        confidenceScore: 0.94,
        riskTier,
        status,
        estimatedLossPrevented: riskScore >= 60 ? parsedAmount : 0,
        tags,
        flagReasons,
      };

      transactions.push(transaction);
      validRows++;
    } catch (err: any) {
      invalidRows++;
      errors.push(`Row ${i + 1}: ${err?.message || 'Invalid row format'}`);
    }
  }

  return {
    transactions,
    totalRows: lines.length - 1,
    validRows,
    invalidRows,
    errors: errors.slice(0, 5) // keep first 5 errors to avoid UI clutter
  };
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

function isValidDate(d: string): boolean {
  const parsed = Date.parse(d);
  return !isNaN(parsed);
}

export function parseCsvToTransactions(csvText: string): Transaction[] {
  const result = parseCSVText(csvText);
  return result.transactions;
}

export function generateSampleCsv(scenario: 'high_risk' | 'ecommerce' | 'mixed' = 'mixed'): string {
  if (scenario === 'high_risk') {
    const headers = ['Transaction ID', 'Customer ID', 'Amount', 'Merchant', 'Timestamp', 'Location', 'Device', 'IP Address', 'Payment Method'];
    const rows = [
      ['TXN-WIRE-901', 'CUST-8812', '45000.00', 'CryptoBit Global Gateway', new Date().toISOString(), 'Lagos, Nigeria', 'Emulator / Bluestacks VM', '197.210.226.45 (Tor)', 'Wire Transfer'],
      ['TXN-WIRE-902', 'CUST-3910', '18500.00', 'Swiss Bullion Direct AG', new Date().toISOString(), 'Bucharest, Romania', 'Linux Headless VM', '185.220.101.5 (Tor)', 'Wire Transfer'],
      ['TXN-WIRE-903', 'CUST-7721', '32000.00', 'Binance P2P Settlement', new Date().toISOString(), 'Singapore, SG', 'Headless Chrome / Ubuntu', '185.220.101.20', 'Wire Transfer'],
      ['TXN-WIRE-904', 'CUST-1049', '14000.00', 'Kraken OTC Liquidity', new Date().toISOString(), 'Moscow, Russia', 'Tor Browser / Linux', '185.220.102.88', 'Wire Transfer'],
    ];
    return [headers.join(','), ...rows.map(r => r.map(val => val.includes(',') ? `"${val}"` : val).join(','))].join('\n');
  } else if (scenario === 'ecommerce') {
    const headers = ['Transaction ID', 'Customer ID', 'Amount', 'Merchant', 'Timestamp', 'Location', 'Device', 'IP Address', 'Payment Method'];
    const rows = [
      ['TXN-ECOMM-401', 'CUST-1122', '3499.00', 'Apple Store Regent St', new Date().toISOString(), 'London, UK', 'Mobile Safari / iOS 18', '82.165.197.12', 'Credit Card'],
      ['TXN-ECOMM-402', 'CUST-1122', '2899.00', 'BestBuy Online USA', new Date().toISOString(), 'San Francisco, US', 'Headless Python Agent', '192.241.220.10', 'Credit Card'],
      ['TXN-ECOMM-403', 'CUST-1122', '1450.00', 'Nordstrom Online', new Date().toISOString(), 'Chicago, US', 'Selenium WebDriver', '198.51.100.4', 'Credit Card'],
    ];
    return [headers.join(','), ...rows.map(r => r.map(val => val.includes(',') ? `"${val}"` : val).join(','))].join('\n');
  }
  return generateSampleCSVString();
}

export function generateSampleCSVString(): string {
  const headers = [
    'Transaction ID',
    'Customer ID',
    'Amount',
    'Merchant',
    'Timestamp',
    'Location',
    'Device',
    'IP Address',
    'Payment Method'
  ];

  const rows = [
    ['TXN-9021-01', 'CUST-8812', '14250.00', 'CryptoBit Global Gateway', '2026-03-01T14:32:00Z', 'Lagos, Nigeria', 'Emulator / Bluestacks VM', '197.210.226.45', 'Wire Transfer'],
    ['TXN-9021-02', 'CUST-3910', '3890.00', 'Apple Store Regent St', '2026-03-01T14:35:12Z', 'London, UK', 'Mobile Safari / iOS 18', '82.165.197.12', 'Credit Card'],
    ['TXN-9021-03', 'CUST-1049', '899.99', 'Nordstrom Online', '2026-03-01T14:40:00Z', 'San Francisco, US', 'Desktop Safari / macOS', '24.180.12.99', 'Credit Card'],
    ['TXN-9021-04', 'CUST-5512', '74.50', 'Whole Foods Market #102', '2026-03-01T14:42:30Z', 'Berkeley, US', 'Apple Pay / iOS 18', '172.56.21.8', 'Digital Wallet'],
    ['TXN-9021-05', 'CUST-7721', '49800.00', 'Swiss Bullion Direct AG', '2026-03-01T14:50:00Z', 'Bucharest, Romania', 'Firefox ESR / Linux Headless', '185.220.101.5 (Tor)', 'Wire Transfer'],
    ['TXN-9021-06', 'CUST-6623', '14.80', 'Starbucks Store #4912', '2026-03-01T14:55:10Z', 'Seattle, US', 'Starbucks App / iOS', '71.212.88.190', 'Credit Card']
  ];

  return [headers.join(','), ...rows.map(r => r.map(val => val.includes(',') ? `"${val}"` : val).join(','))].join('\n');
}
