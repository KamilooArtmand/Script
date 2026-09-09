export interface FontInfo {
  fileName: string;
  fileSize: number;
  family: string;
  style: string;
  rawVersion: string;
  normalizedVersion: string;
  sourceTable: string;
  isCustomUpload?: boolean;
}

export interface FolderSimulationItem {
  id: string;
  originalName: string;
  sampleFontName: string;
  rawVersion: string;
  existingVersion?: string;
  detectedVersion: string;
  newName: string;
  status: 'SUCCESS' | 'ALREADY_VERSIONED' | 'SKIPPED_NO_FONTS' | 'ERROR';
  statusExplanation: string;
}

export interface BugComparison {
  title: string;
  severity: 'Critical' | 'Major' | 'Improvement';
  oldApproach: string;
  oldFlaw: string;
  newSolution: string;
  technologies: string[];
}
