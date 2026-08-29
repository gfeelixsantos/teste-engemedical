import { getExamsCatalog, type ExamToogle } from './exames-catalog-cache';

export type { ExamToogle };

export async function fetchExamesGrouped(): Promise<Record<string, ExamToogle[]>> {
  return getExamsCatalog();
}
