import { Transaction } from '../types';
import { 
  parseCSVTextToResult, 
  parseExcelBufferToResult, 
  parseUploadedFile, 
  DatasetParseResult 
} from './dataset_parser';

export type CSVParseResult = DatasetParseResult;

export function parseCSVText(csvText: string): CSVParseResult {
  return parseCSVTextToResult(csvText);
}

export function parseCsvToTransactions(csvText: string): Transaction[] {
  const result = parseCSVTextToResult(csvText);
  return result.transactions;
}

export { parseExcelBufferToResult, parseUploadedFile };

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
