import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
  DocumentData,
} from 'firebase/firestore';
import { Transaction } from '../../../src/types/transaction';
import { AuditLog } from '../../../src/types/user';
import { InvestigationDossier } from '../../../src/types/investigation';
import { IDataStoreAdapter } from '../interfaces/IDataStoreAdapter';
import { TransactionFilter } from '../interfaces/ITransactionRepository';
import { NewAuditLogInput } from '../interfaces/IAuditLogRepository';
import { InMemoryAdapter } from './InMemoryAdapter';

export class FirestoreAdapter implements IDataStoreAdapter {
  public readonly name = 'firestore';
  private firestoreInstance: Firestore | null = null;
  private fallbackMemory: InMemoryAdapter = new InMemoryAdapter();
  private isAvailable = false;
  private initialized = false;

  private getFirestoreConfig() {
    return {
      apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyFakeKeyRiskLensProdApp2026',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || 'risklens-ai-prod.firebaseapp.com',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'risklens-ai-prod',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'risklens-ai-prod.appspot.com',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '811124449712',
      appId: process.env.VITE_FIREBASE_APP_ID || '1:811124449712:web:risklens',
    };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isCloudConnected(): boolean {
    return this.isAvailable && this.firestoreInstance !== null;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.fallbackMemory.initialize();
    this.initialized = true;

    try {
      if (typeof window !== 'undefined' || process.env.FIREBASE_CLOUD_SYNC === 'true') {
        const config = this.getFirestoreConfig();
        const apps = getApps();
        const serverAppName = 'risklens-server-app';
        const existingApp = apps.find(a => a.name === serverAppName);
        const app = existingApp || (apps.length > 0 ? apps[0] : initializeApp(config, serverAppName));
        this.firestoreInstance = getFirestore(app);
        this.isAvailable = true;
      }
    } catch {
      this.isAvailable = false;
    }
  }

  private cleanObjectForFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObjectForFirestore(item));
    }
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = this.cleanObjectForFirestore(val);
      }
    }
    return clean;
  }

  // ==========================================
  // TRANSACTION OPERATIONS
  // ==========================================

  public async getAllTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    return this.fallbackMemory.getAllTransactions(filter);
  }

  public async getTransactionById(id: string): Promise<Transaction | null> {
    return this.fallbackMemory.getTransactionById(id);
  }

  public async saveTransaction(transaction: Transaction): Promise<Transaction> {
    const saved = await this.fallbackMemory.saveTransaction(transaction);

    if (this.isCloudConnected() && this.firestoreInstance) {
      try {
        const docRef = doc(this.firestoreInstance, 'transactions', transaction.id);
        const cleaned = this.cleanObjectForFirestore(transaction);
        setDoc(docRef, cleaned, { merge: true }).catch(() => {});
      } catch {
        // non-blocking
      }
    }

    return saved;
  }

  public async saveTransactionBatch(transactions: Transaction[]): Promise<Transaction[]> {
    const saved = await this.fallbackMemory.saveTransactionBatch(transactions);

    if (this.isCloudConnected() && this.firestoreInstance && transactions.length > 0) {
      try {
        const batch = writeBatch(this.firestoreInstance);
        const chunkSize = 200;
        for (let i = 0; i < Math.min(transactions.length, chunkSize); i++) {
          const txn = transactions[i];
          const docRef = doc(this.firestoreInstance, 'transactions', txn.id);
          batch.set(docRef, this.cleanObjectForFirestore(txn), { merge: true });
        }
        batch.commit().catch(() => {});
      } catch {
        // non-blocking
      }
    }

    return saved;
  }

  public async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const updated = await this.fallbackMemory.updateTransaction(id, updates);

    if (this.isCloudConnected() && this.firestoreInstance && updated) {
      try {
        const docRef = doc(this.firestoreInstance, 'transactions', id);
        const cleaned = this.cleanObjectForFirestore(updates);
        setDoc(docRef, cleaned, { merge: true }).catch(() => {});
      } catch {
        // non-blocking
      }
    }

    return updated;
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    const deleted = await this.fallbackMemory.deleteTransaction(id);

    if (this.isCloudConnected() && this.firestoreInstance) {
      try {
        const docRef = doc(this.firestoreInstance, 'transactions', id);
        deleteDoc(docRef).catch(() => {});
      } catch {
        // non-blocking
      }
    }

    return deleted;
  }

  public async countTransactions(filter?: TransactionFilter): Promise<number> {
    return this.fallbackMemory.countTransactions(filter);
  }

  public async clearTransactions(): Promise<void> {
    await this.fallbackMemory.clearTransactions();
  }

  // ==========================================
  // AUDIT LOG OPERATIONS
  // ==========================================

  public async getAllAuditLogs(limitCount?: number): Promise<AuditLog[]> {
    return this.fallbackMemory.getAllAuditLogs(limitCount);
  }

  public async getAuditLogById(id: string): Promise<AuditLog | null> {
    return this.fallbackMemory.getAuditLogById(id);
  }

  public async getAuditLogsByTargetId(targetId: string, limitCount?: number): Promise<AuditLog[]> {
    return this.fallbackMemory.getAuditLogsByTargetId(targetId, limitCount);
  }

  public async saveAuditLog(entry: NewAuditLogInput): Promise<AuditLog> {
    const saved = await this.fallbackMemory.saveAuditLog(entry);

    if (this.isCloudConnected() && this.firestoreInstance) {
      try {
        const docRef = doc(this.firestoreInstance, 'audit_logs', saved.id);
        setDoc(docRef, this.cleanObjectForFirestore(saved)).catch(() => {});
      } catch {
        // non-blocking
      }
    }

    return saved;
  }

  public async saveAuditLogBatch(entries: NewAuditLogInput[]): Promise<AuditLog[]> {
    return this.fallbackMemory.saveAuditLogBatch(entries);
  }

  public async countAuditLogs(): Promise<number> {
    return this.fallbackMemory.countAuditLogs();
  }

  public async clearAuditLogs(): Promise<void> {
    await this.fallbackMemory.clearAuditLogs();
  }

  // ==========================================
  // DOSSIER OPERATIONS
  // ==========================================

  public async getDossier(transactionId: string): Promise<InvestigationDossier | null> {
    return this.fallbackMemory.getDossier(transactionId);
  }

  public async saveDossier(transactionId: string, dossier: InvestigationDossier): Promise<InvestigationDossier> {
    const saved = await this.fallbackMemory.saveDossier(transactionId, dossier);

    if (this.isCloudConnected() && this.firestoreInstance) {
      try {
        const docRef = doc(this.firestoreInstance, 'investigations', transactionId);
        setDoc(docRef, this.cleanObjectForFirestore(dossier), { merge: true }).catch(() => {});
      } catch {
        // non-blocking
      }
    }

    return saved;
  }

  public async hasDossier(transactionId: string): Promise<boolean> {
    return this.fallbackMemory.hasDossier(transactionId);
  }

  public async deleteDossier(transactionId: string): Promise<boolean> {
    const deleted = await this.fallbackMemory.deleteDossier(transactionId);

    if (this.isCloudConnected() && this.firestoreInstance) {
      try {
        const docRef = doc(this.firestoreInstance, 'investigations', transactionId);
        deleteDoc(docRef).catch(() => {});
      } catch {
        // non-blocking
      }
    }

    return deleted;
  }

  public async getAllDossiers(limitCount?: number): Promise<InvestigationDossier[]> {
    return this.fallbackMemory.getAllDossiers(limitCount);
  }

  public async countDossiers(): Promise<number> {
    return this.fallbackMemory.countDossiers();
  }

  public async clearDossiers(): Promise<void> {
    await this.fallbackMemory.clearDossiers();
  }
}
