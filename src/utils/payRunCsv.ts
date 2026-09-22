import { buildCsvLines, downloadCsvFile } from './csvDownload';
import { parseMoney } from './payrollPackage';
import { payRunEmployeeName, type PayRunDetail } from '../types/payRun';

export function payRunCsvFilename(runNumber: string): string {
  const slug = runNumber.trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'pay-run';
  return `pay-run-${slug}.csv`;
}

export function buildPayRunCsv(run: PayRunDetail): string {
  const header = [
    ['Pay run', run.run_number],
    ['Period', `${run.period_start} – ${run.period_end}`],
    ['Pay date', run.pay_date],
    ['Status', run.status],
    [],
    ['Totals'],
    ['Gross', parseMoney(run.total_gross).toFixed(2)],
    ['PAYE', parseMoney(run.total_paye).toFixed(2)],
    ['UIF employee', parseMoney(run.total_uif_employee).toFixed(2)],
    ['UIF employer', parseMoney(run.total_uif_employer).toFixed(2)],
    ['SDL', parseMoney(run.total_sdl).toFixed(2)],
    ['Net', parseMoney(run.total_net).toFixed(2)],
    [],
  ];
  const employees = buildCsvLines(
    ['Employee', 'Gross', 'PAYE', 'UIF employee', 'UIF employer', 'SDL', 'Net'],
    run.lines.map((line) => [
      payRunEmployeeName(line),
      parseMoney(line.gross).toFixed(2),
      parseMoney(line.paye).toFixed(2),
      parseMoney(line.uif_employee).toFixed(2),
      parseMoney(line.uif_employer).toFixed(2),
      parseMoney(line.sdl).toFixed(2),
      parseMoney(line.net).toFixed(2),
    ]),
  );
  const items = buildCsvLines(
    ['Employee', 'Code', 'Name', 'Direction', 'Amount'],
    run.lines.flatMap((line) =>
      line.items.map((item) => [
        payRunEmployeeName(line),
        item.code,
        item.name,
        item.direction,
        parseMoney(item.amount).toFixed(2),
      ]),
    ),
  );
  const meta = header.map((row) => row.join(',')).join('\r\n');
  return `${meta}\r\nEmployees\r\n${employees}\r\n\r\nLine items\r\n${items}\r\n`;
}

export function downloadPayRunCsv(run: PayRunDetail): void {
  downloadCsvFile(payRunCsvFilename(run.run_number), buildPayRunCsv(run));
}
