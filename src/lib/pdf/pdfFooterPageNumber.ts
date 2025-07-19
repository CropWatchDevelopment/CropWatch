import PDFDocument from 'pdfkit';

const footerFontSize = 7;
const footerMargin = 20;

export function addFooterPageNumber(
	doc: InstanceType<typeof PDFDocument>,
	primaryText: string
): void {
	// 3) now stamp page numbers on every page
	const range = doc.bufferedPageRange(); // { start: 0, count: N }
	const total = range.count;
	const options = {
		width: doc.page.width - 20 - 20,
		height: footerFontSize + 2,
		lineBreak: false
	};

	for (let i = 0; i < total; i++) {
		doc.switchToPage(i);

		const x = 20;
		const y = doc.page.height - footerMargin - 5;

		doc
			.fontSize(footerFontSize)
			.fillColor('black')
			.text(primaryText, x, y, { ...options, align: 'left' })
			.text(`Page ${i + 1} / ${total}`, x, y, { ...options, align: 'right' });
	}

	// 4) go back to the last page so that any post‐footer work (if any) ends up there
	doc.switchToPage(total - 1);
}
