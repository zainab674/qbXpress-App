/**
 * reportExportService — converts report data from reportService into Excel buffers.
 * PDF export is handled client-side (jsPDF + html2canvas already wired in ReportView.tsx).
 * Server-side PDF is used only for scheduled email delivery (uses basic html-in-text format).
 */
const XLSX = require('xlsx');

/**
 * Flatten a reportService result (sections array) into a 2D array of rows.
 * The result shape is: { sections: [{ title, isHeading, rows?, value, extraValue, ... }] }
 */
function flattenReportData(reportData) {
    const rows = [];
    if (!reportData || !reportData.sections) return rows;

    for (const section of reportData.sections) {
        if (section.isHeading) {
            rows.push([section.title || '']);
            rows.push([]); // blank separator
            continue;
        }
        if (section.isGrandTotal || section.isSubtotal) {
            const label = section.title || 'TOTAL';
            rows.push([label, formatNum(section.value), formatNum(section.extraValue), formatNum(section.extraValue2)]);
            rows.push([]);
            continue;
        }
        // Regular data row — extract common fields
        const indent = section.indent ? '  '.repeat(Math.max(0, section.indent - 1)) : '';
        rows.push([
            indent + (section.title || section.name || ''),
            section.date || '',
            section.refNo || '',
            formatNum(section.value),
            formatNum(section.extraValue),
            formatNum(section.extraValue2),
            section.memo || '',
        ]);
    }
    return rows;
}

function formatNum(val) {
    if (val === undefined || val === null) return '';
    if (typeof val === 'number') return val;
    return val;
}

/**
 * Export report data to an XLSX buffer.
 * @param {object} reportData  - The object returned by reportService.get* methods
 * @param {string} reportType  - Used as the sheet name
 * @returns {Buffer}
 */
function exportToExcel(reportData, reportType) {
    const wb = XLSX.utils.book_new();
    const rows = flattenReportData(reportData);

    if (rows.length === 0) {
        rows.push(['No data available']);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto column widths (rough estimate)
    ws['!cols'] = [
        { wch: 40 }, { wch: 14 }, { wch: 16 },
        { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
    ];

    const sheetName = (reportType || 'Report').substring(0, 31); // Excel sheet name max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Very simple plain-text "PDF" for scheduled email attachments (no heavy dep).
 * Returns a Buffer containing UTF-8 text that can be attached as .txt if pdfkit is unavailable.
 */
function exportToText(reportData, reportType) {
    const lines = [`Report: ${reportType}`, `Generated: ${new Date().toISOString()}`, '', ''];
    if (reportData && reportData.sections) {
        for (const s of reportData.sections) {
            const indent = s.indent ? '  '.repeat(Math.max(0, s.indent - 1)) : '';
            const title = indent + (s.title || s.name || '');
            const val = s.value != null ? `  $${Number(s.value).toFixed(2)}` : '';
            lines.push(`${title}${val}`);
        }
    }
    return Buffer.from(lines.join('\n'), 'utf8');
}

module.exports = { exportToExcel, exportToText };
