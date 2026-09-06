import React from 'react';
import { InvestigationDossier } from '../../types';
import { EnterpriseReportModal } from './EnterpriseReportModal';

interface ExportDossierModalProps {
  dossier: InvestigationDossier;
  onClose: () => void;
}

export function ExportDossierModal({ dossier, onClose }: ExportDossierModalProps) {
  return <EnterpriseReportModal dossier={dossier} onClose={onClose} />;
}

