# Security Audit Exception

`npm audit --audit-level=high` currently reports one high-severity dependency: `xlsx@0.18.5`.

The upstream package has advisories for prototype pollution and regular-expression denial of service, and npm reports no compatible upstream fix. Excel upload is required, so the package is retained temporarily rather than removing functionality or replacing it without compatibility evidence.

Mitigations in the affected parser surface:

- XLSX/XLS buffers are rejected above 50 MiB.
- Worksheets are rejected above 100,000 rows.
- Parsed values are normalized through the existing transaction validation pipeline.
- Excel parsing is isolated to `src/lib/dataset_parser.ts`.
- Excel compatibility coverage remains in `src/test/upload.test.ts`.
- CI accepts only this documented `xlsx` exception through `npm run security:audit`; any other vulnerability fails CI.

This is an accepted release blocker for a fully clean audit. Reassess replacement with a maintained parser such as ExcelJS after equivalent XLSX/XLS compatibility and resource-limit tests are added.
