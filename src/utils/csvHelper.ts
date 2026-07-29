import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { UserCredential, AuthResult } from '../types';

export type { UserCredential, AuthResult };

/**
 * Downloads a string as a file in the browser.
 */
export const downloadFile = (content: string | Blob | ArrayBuffer, fileName: string, contentType: string = 'text/csv;charset=utf-8;') => {
  const blob = content instanceof Blob
    ? content
    : content instanceof ArrayBuffer
      ? new Blob([content], { type: contentType })
      : new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates an input CSV template string.
 */
export const generateInputCSV = (users: string[], password: string): string => {
  let csv = 'email,password\n';
  users.forEach((email) => {
    // Escape commas or quotes if any, though emails/passwords normally don't have them
    csv += `"${email}","${password}"\n`;
  });
  return csv;
};

/**
 * Generates the results output CSV string.
 */
export const generateOutputCSV = (results: AuthResult[]): string => {
  let csv = 'Email,Status,HTTP Code,Latency (ms),Access Token,Refresh Token,Error Message,Timestamp\n';
  results.forEach((r) => {
    const escapedToken = r.accessToken ? `"${r.accessToken}"` : '';
    const escapedRefreshToken = r.refreshToken ? `"${r.refreshToken}"` : '';
    const escapedError = r.errorMessage ? `"${r.errorMessage.replace(/"/g, '""')}"` : '';
    csv += `"${r.email}","${r.status}",${r.statusCode || ''},${r.latencyMs || ''},${escapedToken},${escapedRefreshToken},${escapedError},"${r.timestamp}"\n`;
  });
  return csv;
};

/**
 * Exports results as an Excel (.xlsx) spreadsheet with styled formatting.
 */
export const generateExcel = (results: AuthResult[]): void => {
  // Build header row
  const headers = ['#', 'Email', 'Status', 'HTTP Code', 'Latency (ms)', 'Access Token', 'Refresh Token', 'Error Message', 'Timestamp'];

  // Build data rows
  const rows = results.map((r, idx) => [
    idx + 1,
    r.email,
    r.status,
    r.statusCode ?? '',
    r.latencyMs ?? '',
    r.accessToken ?? '',
    r.refreshToken ?? '',
    r.errorMessage ?? '',
    r.timestamp
  ]);

  // Create worksheet from array of arrays
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 32 },  // Email
    { wch: 10 },  // Status
    { wch: 10 },  // HTTP Code
    { wch: 12 },  // Latency
    { wch: 60 },  // Access Token
    { wch: 40 },  // Refresh Token
    { wch: 35 },  // Error Message
    { wch: 24 },  // Timestamp
  ];

  // Add a summary row at the bottom
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  const totalCount = results.length;
  const avgLatency = results.filter(r => r.latencyMs).reduce((a, r) => a + (r.latencyMs || 0), 0) / (results.filter(r => r.latencyMs).length || 1);

  const summaryStartRow = rows.length + 2; // +2 for header + 1 blank row
  XLSX.utils.sheet_add_aoa(ws, [
    [],
    ['Summary'],
    ['Total Users', totalCount],
    ['Successful', successCount],
    ['Failed', failedCount],
    ['Success Rate', `${totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0}%`],
    ['Avg Latency', `${Math.round(avgLatency)}ms`],
    ['Generated At', new Date().toLocaleString()],
  ], { origin: { r: summaryStartRow, c: 0 } });

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sign-In Results');

  // Write and download
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadFile(
    wbOut,
    `litz_chill_signin_results_${Date.now()}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
};

/**
 * Exports results as a professional PDF report.
 */
export const generatePDF = (results: AuthResult[]): void => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  const totalCount = results.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  // ── Title Section ──
  doc.setFillColor(15, 16, 26);
  doc.rect(0, 0, 297, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(99, 102, 241);
  doc.text('LitzChill Admin Hub', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(158, 162, 182);
  doc.text('Bulk Sign-In Results Report', 14, 26);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 140);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);

  // ── Summary Cards Row ──
  const cardY = 46;
  const cardH = 18;
  const cardW = 60;
  const cardGap = 10;

  // Total Users card
  doc.setFillColor(26, 28, 38);
  doc.roundedRect(14, cardY, cardW, cardH, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(158, 162, 182);
  doc.text('TOTAL USERS', 18, cardY + 6);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(244, 244, 247);
  doc.text(`${totalCount}`, 18, cardY + 14);

  // Success card
  doc.setFillColor(16, 185, 129, 15);
  doc.roundedRect(14 + cardW + cardGap, cardY, cardW, cardH, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text('SUCCESSFUL', 18 + cardW + cardGap, cardY + 6);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${successCount}`, 18 + cardW + cardGap, cardY + 14);

  // Failed card
  doc.setFillColor(244, 63, 94, 15);
  doc.roundedRect(14 + (cardW + cardGap) * 2, cardY, cardW, cardH, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(244, 63, 94);
  doc.text('FAILED', 18 + (cardW + cardGap) * 2, cardY + 6);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${failedCount}`, 18 + (cardW + cardGap) * 2, cardY + 14);

  // Success Rate card
  doc.setFillColor(99, 102, 241, 15);
  doc.roundedRect(14 + (cardW + cardGap) * 3, cardY, cardW, cardH, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(99, 102, 241);
  doc.text('SUCCESS RATE', 18 + (cardW + cardGap) * 3, cardY + 6);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${successRate}%`, 18 + (cardW + cardGap) * 3, cardY + 14);

  // ── Results Table ──
  const tableHeaders = ['#', 'Email', 'Status', 'Code', 'Latency', 'Access Token (truncated)', 'Error'];
  const tableRows = results.map((r, idx) => [
    String(idx + 1),
    r.email,
    r.status,
    String(r.statusCode ?? '-'),
    r.latencyMs ? `${r.latencyMs}ms` : '-',
    r.accessToken ? `${r.accessToken.substring(0, 40)}...` : '-',
    r.errorMessage ?? '-'
  ]);

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: cardY + cardH + 8,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [220, 220, 230],
      fillColor: [18, 19, 26],
      lineColor: [40, 42, 55],
      lineWidth: 0.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [30, 32, 48],
      textColor: [160, 165, 200],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [22, 24, 36],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 'auto', font: 'courier' },
      6: { cellWidth: 45 },
    },
    didParseCell: (data) => {
      // Color status cells
      if (data.column.index === 2 && data.section === 'body') {
        const val = data.cell.raw as string;
        if (val === 'SUCCESS') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'FAILED') {
          data.cell.styles.textColor = [244, 63, 94];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    doc.text(
      `LitzChill Admin Hub — Bulk Sign-In Report | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
    doc.text(
      `© ${new Date().getFullYear()} LitzChill Network Systems`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 8,
      { align: 'right' }
    );
  }

  // Save
  doc.save(`litz_chill_signin_report_${Date.now()}.pdf`);
};

/**
 * Parses an input CSV file into structured credentials.
 */
export const parseInputCSV = (csvText: string): UserCredential[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  const credentials: UserCredential[] = [];
  // Detect headers
  const headers = lines[0].toLowerCase().split(',');
  const emailIdx = headers.findIndex(h => h.trim().includes('email'));
  const passIdx = headers.findIndex(h => h.trim().includes('password') || h.trim().includes('pass'));
  
  const startIdx = emailIdx !== -1 ? 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple comma split (taking care of potential quotes)
    const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    
    let email = '';
    let password = '';
    
    if (emailIdx !== -1 && columns[emailIdx]) {
      email = columns[emailIdx];
    } else {
      email = columns[0] || '';
    }
    
    if (passIdx !== -1 && columns[passIdx]) {
      password = columns[passIdx];
    } else {
      password = columns[1] || '';
    }
    
    if (email && email.includes('@')) {
      credentials.push({ email, password });
    }
  }
  
  return credentials;
};
