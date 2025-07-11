import PDFDocument from 'pdfkit';

export function addFooterPageNumber(
	doc: InstanceType<typeof PDFDocument>,
	primaryText: string
): void {
	// 3) now stamp page numbers on every page
	const range = doc.bufferedPageRange(); // { start: 0, count: N }
	const total = range.count;
	const footerFontSize = 7;
	const footerMargin = 20;
	for (let i = 0; i < total; i++) {
		doc.switchToPage(i);
		const text = `${primaryText} | Page ${i + 1} / ${total}`;
		const w = doc.widthOfString(text);
		const x = doc.page.width / 2 - w / 2; // center the text
		const y = doc.page.height - footerMargin - 5;
		doc
			.fontSize(footerFontSize)
			.fillColor('black')
			.text(text, x, y, { align: 'center', lineBreak: false });
	}
	// 4) go back to the last page so that any post‐footer work (if any) ends up there
	doc.switchToPage(total - 1);
}
