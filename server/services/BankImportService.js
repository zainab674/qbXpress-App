const xlsx = require('xlsx');
const { parse } = require('csv-parse/sync');
const crypto = require('crypto');

class BankImportService {
    parseFile(buffer, filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'csv') {
            return this.parseCSV(buffer);
        } else if (ext === 'xlsx' || ext === 'xls') {
            return this.parseExcel(buffer);
        }
        throw new Error('Unsupported file format');
    }

    parseCSV(buffer) {
        const content = buffer.toString();
        // Try different delimiters if needed, but comma is standard
        return parse(content, {
            columns: false,
            skip_empty_lines: true,
            relax_column_count: true
        });
    }

    parseExcel(buffer) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Return array of arrays
    }

    mapTransactions(data, options, userId, companyId, bankAccountId) {
        const { mapping, hasHeader, amountColumns, dateFormat } = options;
        const rows = hasHeader ? data.slice(1) : data;

        const mapped = rows.map((row, index) => {
            if (!row || row.length === 0) return null;

            const tx = {
                id: `import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                userId,
                companyId,
                bankAccountId,
                status: 'FOR_REVIEW'
            };

            // Date Parsing
            const dateIdx = mapping.date;
            if (dateIdx !== undefined && row[dateIdx]) {
                tx.date = this.parseDate(row[dateIdx], dateFormat);
            } else {
                tx.date = new Date().toISOString().split('T')[0]; // Fallback to today
            }

            // Description
            const descIdx = mapping.description;
            if (descIdx !== undefined && row[descIdx]) {
                tx.description = String(row[descIdx]).trim();
                tx.originalDescription = String(row[descIdx]).trim();
            } else {
                tx.description = 'Unlabeled Transaction';
                tx.originalDescription = 'Unlabeled Transaction';
            }

            let amount = 0;
            if (amountColumns === 'one') {
                const amtIdx = mapping.amount;
                amount = amtIdx !== undefined ? parseFloat(row[amtIdx]) || 0 : 0;
            } else {
                const debitIdx = mapping.debit;
                const creditIdx = mapping.credit;
                const debit = debitIdx !== undefined ? parseFloat(row[debitIdx]) || 0 : 0;
                const credit = creditIdx !== undefined ? parseFloat(row[creditIdx]) || 0 : 0;
                amount = credit - debit;
            }

            tx.amount = amount;
            tx.type = amount >= 0 ? 'CREDIT' : 'DEBIT';

            // Optional fields
            const chequeIdx = mapping.chequeNumber;
            if (chequeIdx !== undefined && row[chequeIdx]) {
                tx.refNo = String(row[chequeIdx]);
            }

            // Calculate checksum for duplicate detection
            const hashData = `${tx.date}|${tx.description}|${tx.amount}|${bankAccountId}`;
            tx.checksum = crypto.createHash('md5').update(hashData).digest('hex');

            return tx;
        }).filter(t => t !== null);

        return mapped;
    }

    parseDate(dateStr, format) {
        if (!dateStr) return '';
        const str = String(dateStr).trim();
        try {
            // Split by common separators: - / .
            const parts = str.split(/[-/.]/);
            if (parts.length !== 3) return str;

            let day, month, year;
            switch (format) {
                case 'DD/MM/YYYY':
                case 'DD.MM.YYYY':
                    [day, month, year] = parts;
                    break;
                case 'MM/DD/YYYY':
                    [month, day, year] = parts;
                    break;
                case 'YYYY/MM/DD':
                case 'YYYY-MM-DD':
                    [year, month, day] = parts;
                    break;
                default:
                    return str;
            }

            // Basic validation and normalization
            if (year.length === 2) year = '20' + year; // Handle YY format

            let d = parseInt(day, 10);
            let m = parseInt(month, 10);
            let y = parseInt(year, 10);

            // AUTO-FIX: If month is > 12 and day is <= 12, they are likely swapped
            if (m > 12 && d <= 12) {
                [m, d] = [d, m];
            }

            // Final sanity check: if month is still > 12, it's invalid
            if (m > 12 || m < 1) {
                console.warn(`[BankImportService] Invalid month ${m} in date ${str}. Falling back to today.`);
                return new Date().toISOString().split('T')[0];
            }

            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } catch (e) {
            return str;
        }
    }
}

module.exports = new BankImportService();
