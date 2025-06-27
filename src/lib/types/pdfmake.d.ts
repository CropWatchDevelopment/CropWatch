declare module 'pdfmake/build/pdfmake' {
	interface TDocumentDefinitions {
		content: any[];
		styles?: Record<string, any>;
		defaultStyle?: Record<string, any>;
		[key: string]: any;
	}

	interface TFontDictionary {
		[fontName: string]: {
			normal?: string;
			bold?: string;
			italics?: string;
			bolditalics?: string;
		};
	}

	interface PdfDocument {
		getBuffer(callback: (buffer: Uint8Array) => void): void;
		download(filename: string): void;
	}

	const pdfMake: {
		vfs: Record<string, string>;
		fonts: TFontDictionary;
		createPdf(documentDefinition: TDocumentDefinitions): PdfDocument;
	};

	export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
	const pdfMake: {
		vfs: Record<string, string>;
	};
	export default { pdfMake };
}
