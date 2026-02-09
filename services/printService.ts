import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PrintOptions {
    fileName?: string;
    title?: string;
    companyName?: string;
}

export const generatePDF = async (elementId: string, options: PrintOptions = {}) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(options.fileName || 'document.pdf');
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        return false;
    }
};

export const printDiv = (elementId: string) => {
    const content = document.getElementById(elementId);
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Print</title>');
    // Copy all styles to the new window
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
        printWindow.document.write(style.outerHTML);
    });
    printWindow.document.write('</head><body>');
    printWindow.document.write(content.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};
