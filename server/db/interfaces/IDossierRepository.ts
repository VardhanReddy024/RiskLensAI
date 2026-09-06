import { InvestigationDossier } from '../../../src/types/investigation';

export interface IDossierRepository {
  get(transactionId: string): Promise<InvestigationDossier | null>;
  save(transactionId: string, dossier: InvestigationDossier): Promise<InvestigationDossier>;
  has(transactionId: string): Promise<boolean>;
  delete(transactionId: string): Promise<boolean>;
  getAll(limitCount?: number): Promise<InvestigationDossier[]>;
  count(): Promise<number>;
  clearAll(): Promise<void>;
}
