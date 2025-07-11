export interface TableCell {
	label: string;
	value?: number | string | Date;
	color?: string;
	bgColor?: string;
	fontSize?: number;
	width?: number;
}

export interface TableRow {
	header: TableCell;
	cells: TableCell[];
}
