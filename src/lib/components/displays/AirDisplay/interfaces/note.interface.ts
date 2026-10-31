export interface Note {
	id: string;
	created_at: string;
	created_by: string;
	/** A CropWatch staff member wrote it; the API leaves created_by empty for customers then. */
	createdByStaff?: boolean;
	title: string;
	note: string;
	includeInReport: boolean;
}
