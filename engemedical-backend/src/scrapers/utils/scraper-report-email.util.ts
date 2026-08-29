import type { ScrapeReport } from '../scraper.service';

type ScraperReportEmailViewOptions = {
  maxSuccessExamples?: number;
  maxFailureExamples?: number;
  maxTopCompanies?: number;
};

export function buildScraperReportEmailView(
  report: ScrapeReport,
  options: ScraperReportEmailViewOptions = {},
) {
  const maxSuccessExamples = options.maxSuccessExamples ?? 20;
  const maxFailureExamples = options.maxFailureExamples ?? 10;
  const maxTopCompanies = options.maxTopCompanies ?? 10;

  const successDetails = report.details.filter((detail) => detail.status === 'SUCCESS');
  const failureDetails = report.details.filter((detail) => detail.status === 'FAILED');

  const providerSummaries = [...new Set(report.details.map((detail) => detail.provider))]
    .map((provider) => {
      const providerDetails = report.details.filter(
        (detail) => detail.provider === provider,
      );
      const providerSuccesses = providerDetails.filter(
        (detail) => detail.status === 'SUCCESS',
      );
      const providerFailures = providerDetails.filter(
        (detail) => detail.status === 'FAILED',
      );

      return {
        provider,
        successCount: providerSuccesses.length,
        failedCount: providerFailures.length,
        matchedExamsTotal: providerSuccesses.reduce(
          (total, detail) => total + detail.matchedExams.length,
          0,
        ),
      };
    })
    .sort((left, right) => {
      if (right.successCount !== left.successCount) {
        return right.successCount - left.successCount;
      }
      if (right.matchedExamsTotal !== left.matchedExamsTotal) {
        return right.matchedExamsTotal - left.matchedExamsTotal;
      }
      return left.provider.localeCompare(right.provider);
    });

  const topCompanies = [...new Set(successDetails.map((detail) => detail.company))]
    .map((company) => {
      const companyDetails = successDetails.filter((detail) => detail.company === company);
      return {
        company,
        successCount: companyDetails.length,
        matchedExamsTotal: companyDetails.reduce(
          (total, detail) => total + detail.matchedExams.length,
          0,
        ),
      };
    })
    .sort((left, right) => {
      if (right.successCount !== left.successCount) {
        return right.successCount - left.successCount;
      }
      if (right.matchedExamsTotal !== left.matchedExamsTotal) {
        return right.matchedExamsTotal - left.matchedExamsTotal;
      }
      return left.company.localeCompare(right.company);
    })
    .slice(0, maxTopCompanies);

  return {
    providerSummaries,
    topCompanies,
    successExamples: successDetails.slice(0, maxSuccessExamples),
    failureExamples: failureDetails.slice(0, maxFailureExamples),
    omittedSuccessCount: Math.max(successDetails.length - maxSuccessExamples, 0),
    omittedFailureCount: Math.max(failureDetails.length - maxFailureExamples, 0),
  };
}
