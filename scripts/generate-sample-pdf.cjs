const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

(async () => {
  try {
    const outPath = path.join(process.cwd(), 'static/test-sample-report.pdf');
    const possibleFontPaths = [
      path.join(process.cwd(), 'static/fonts/NotoSansJP-Regular.ttf'),
      path.join(process.cwd(), 'static/fonts/NotoSansJP-Regular.otf'),
      path.join(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.ttf'),
      path.join(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.otf')
    ];

    let fontRegistered = false;
    let registeredFontPath = null;
    for (const fp of possibleFontPaths) {
      try {
        if (fs.existsSync(fp)) {
          registeredFontPath = fp;
          fontRegistered = true;
          break;
        }
      } catch (e) {
        // ignore
      }
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    if (fontRegistered) {
      try {
        doc.registerFont('NotoSansJP', registeredFontPath);
        doc.font('NotoSansJP');
      } catch (e) {
        console.warn('Failed to register font', registeredFontPath, e.message);
        doc.font('Helvetica');
      }
    } else {
      console.warn('No NotoSansJP font found, falling back to Helvetica');
      doc.font('Helvetica');
    }

    console.log('Using font:', fontRegistered ? 'NotoSansJP -> ' + registeredFontPath : 'Helvetica');

    const { top: marginTop, left: marginLeft } = doc.page.margins;
    const headerTitle = 'CropWatch Device Report';
    const displayStartLabel = '2025-08-01 00:00';
    const displayEndLabel = '2025-08-01 23:59';
    const timezoneParam = 'Asia/Tokyo';

    const headerX = marginLeft;
    const headerY = marginTop - 4;
    doc.fontSize(16).text(headerTitle, headerX, headerY, { align: 'left' });

    const metaY = headerY + 20;
    doc.fontSize(8).text(`Date range: ${displayStartLabel} - ${displayEndLabel} (${timezoneParam})`, headerX, metaY, {
      align: 'left'
    });

    // add a Japanese sample line to visually verify font
    doc.moveDown(2).fontSize(12).text('日本語のテキスト (sample Japanese text)');

    doc.end();

    stream.on('finish', () => {
      const size = fs.statSync(outPath).size;
      console.log('Wrote sample PDF to', outPath, 'size:', size);
    });
  } catch (err) {
    console.error('Error generating sample PDF', err);
    process.exit(1);
  }
})();
