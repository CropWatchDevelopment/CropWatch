import { describe, expect, it } from 'vitest';
import { checkDeleteConfirmation, devEuiConfirmed } from './delete-confirmation';

function formWith(fields: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		formData.set(key, value);
	}
	return formData;
}

describe('devEuiConfirmed', () => {
	it('accepts the exact DevEUI, ignoring case and surrounding whitespace', () => {
		expect(devEuiConfirmed('2CF7F1C0617000CC', ' 2cf7f1c0617000cc ')).toBe(true);
	});

	it('rejects partial, longer, or different values', () => {
		expect(devEuiConfirmed('2CF7F1C0617000CC', '2CF7F1C0617000C')).toBe(false);
		expect(devEuiConfirmed('2CF7F1C0617000CC', '2CF7F1C0617000CC0')).toBe(false);
		expect(devEuiConfirmed('2CF7F1C0617000CC', '114993489252000024')).toBe(false);
	});

	it('can never confirm an empty DevEUI', () => {
		expect(devEuiConfirmed('', '')).toBe(false);
		expect(devEuiConfirmed('  ', '  ')).toBe(false);
	});
});

describe('checkDeleteConfirmation', () => {
	const devEui = '114993489252000024';

	it('passes only with the typed DevEUI and the acknowledgement', () => {
		expect(
			checkDeleteConfirmation(devEui, formWith({ confirmDevEui: devEui, acknowledged: 'yes' }))
		).toBeNull();
	});

	it('rejects a missing or wrong DevEUI even when acknowledged', () => {
		expect(checkDeleteConfirmation(devEui, formWith({ acknowledged: 'yes' }))).toBe(
			'devEuiMismatch'
		);
		expect(
			checkDeleteConfirmation(
				devEui,
				formWith({ confirmDevEui: '1149934892520000', acknowledged: 'yes' })
			)
		).toBe('devEuiMismatch');
	});

	it('rejects a correct DevEUI without the acknowledgement', () => {
		expect(checkDeleteConfirmation(devEui, formWith({ confirmDevEui: devEui }))).toBe(
			'notAcknowledged'
		);
		expect(
			checkDeleteConfirmation(devEui, formWith({ confirmDevEui: devEui, acknowledged: 'on' }))
		).toBe('notAcknowledged');
	});
});
