
/**
 * NotifierType model representing notification types from the cw_notifier_types table
 */
export interface NotifierType {
	/** Unique identifier */
	id: number;

	/** Identifier used by related rules */
	notifier_id: number;

	/** Human readable name */
	name: string;

	/** Timestamp when the type was created */
	created_at: string;
}

/**
 * Data required to insert a new notifier type
 */
export type NotifierTypeInsert = Omit<NotifierType, 'id' | 'created_at'>;

/**
 * Type for updating an existing notifier type
 */
export type NotifierTypeUpdate = Partial<Omit<NotifierType, 'id' | 'created_at'>>;
