import { InvestigationDossier } from '../../../src/types/investigation';
import { IDossierRepository } from '../interfaces/IDossierRepository';
import { IDataStoreAdapter } from '../interfaces/IDataStoreAdapter';

export class DossierRepository implements IDossierRepository {
  private adapter: IDataStoreAdapter;

  constructor(adapter: IDataStoreAdapter) {
    this.adapter = adapter;
  }

  public setAdapter(adapter: IDataStoreAdapter): void {
    this.adapter = adapter;
  }

  public async get(transactionId: string): Promise<InvestigationDossier | null> {
    if (!transactionId) return null;
    return this.adapter.getDossier(transactionId.trim());
  }

  public async save(transactionId: string, dossier: InvestigationDossier): Promise<InvestigationDossier> {
    if (!transactionId || !dossier) {
      throw new Error('Cannot save dossier without a valid transactionId and dossier body');
    }
    return this.adapter.saveDossier(transactionId.trim(), dossier);
  }

  public async has(transactionId: string): Promise<boolean> {
    if (!transactionId) return false;
    return this.adapter.hasDossier(transactionId.trim());
  }

  public async delete(transactionId: string): Promise<boolean> {
    if (!transactionId) return false;
    return this.adapter.deleteDossier(transactionId.trim());
  }

  public async getAll(limitCount?: number): Promise<InvestigationDossier[]> {
    return this.adapter.getAllDossiers(limitCount);
  }

  public async count(): Promise<number> {
    return this.adapter.countDossiers();
  }

  public async clearAll(): Promise<void> {
    await this.adapter.clearDossiers();
  }
}
