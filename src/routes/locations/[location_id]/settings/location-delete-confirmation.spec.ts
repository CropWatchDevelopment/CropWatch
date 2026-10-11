import { describe, expect, it } from 'vitest';
import {
	checkLocationDeleteConfirmation,
	locationNameConfirmed
} from './location-delete-confirmation';

function formWith(fields: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		formData.set(key, value);
	}
	return formData;
}

describe('locationNameConfirmed', () => {
	it('accepts the name regardless of case, surrounding or repeated spaces', () => {
		expect(locationNameConfirmed('Greenhouse A', '  greenhouse   a ')).toBe(true);
	});

	it('folds full-width input from an IME onto the stored name', () => {
		expect(locationNameConfirmed('Farm 2', 'Ｆａｒｍ　２')).toBe(true);
		expect(locationNameConfirmed('宮崎ハウス', '宮崎ハウス')).toBe(true);
	});

	it('rejects partial or different names', () => {
		expect(locationNameConfirmed('Greenhouse A', 'Greenhouse')).toBe(false);
		expect(locationNameConfirmed('Greenhouse A', 'Greenhouse B')).toBe(false);
		expect(locationNameConfirmed('宮崎ハウス', '宮崎')).toBe(false);
	});

	it('can never confirm an empty name', () => {
		expect(locationNameConfirmed('', '')).toBe(false);
		expect(locationNameConfirmed('   ', ' ')).toBe(false);
	});
});

describe('checkLocationDeleteConfirmation', () => {
	const name = 'Greenhouse A';

	it('passes only with the typed name and the acknowledgement', () => {
		expect(
			checkLocationDeleteConfirmation(
				name,
				formWith({ confirmLocationName: 'greenhouse a', acknowledged: 'yes' })
			)
		).toBeNull();
	});

	it('rejects a missing or wrong name even when acknowledged', () => {
		expect(checkLocationDeleteConfirmation(name, formWith({ acknowledged: 'yes' }))).toBe(
			'nameMismatch'
		);
		expect(
			checkLocationDeleteConfirmation(
				name,
				formWith({ confirmLocationName: 'Greenhouse B', acknowledged: 'yes' })
			)
		).toBe('nameMismatch');
	});

	it('rejects the correct name without the acknowledgement', () => {
		expect(checkLocationDeleteConfirmation(name, formWith({ confirmLocationName: name }))).toBe(
			'notAcknowledged'
		);
	});
});
