// Renders the report HTML to PDF with the Chromium that @playwright/test already installed,
// so the plugin adds no dependency. Run from frontend/ClientApp so the package resolves.
// Usage: node <plugin>/scripts/html-to-pdf.mjs <report.html> <report.pdf>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [htmlPath, pdfPath] = process.argv.slice(2);
if (!htmlPath || !pdfPath) {
    console.error('Usage: node html-to-pdf.mjs <report.html> <report.pdf>');
    process.exit(1);
}

const requireFromProject = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = requireFromProject('@playwright/test');

const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: 'networkidle' });
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    console.log(`PDF written: ${path.resolve(pdfPath)}`);
} finally {
    await browser.close();
}
