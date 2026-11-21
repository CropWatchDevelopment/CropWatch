import { describe, expect, it } from 'vitest';
import { naturalSort } from './natural-sort';

// TWIN SPEC — the same cases as api `src/v1/common/natural-sort.spec.ts`.

const SORTED_JA = [
	'1号舎',
	'4. 冷蔵庫',
	'4号舎 ',
	'４号舎',
	'⑥ハウス',
	'６ハウス',
	'⑧ハウス',
	'10ハウス',
	'⑳ハウス',
	'apple',
	'Banana',
	'CW-AIR-2',
	'CW-AIR-12',
	'あおば',
	'アオバ',
	'センサー１',
	'センサー2',
	'センサー３',
	'センサー10',
	'温室',
	'五反田1',
	'五反田2',
	'五反田10',
	'冷凍コンテナ①',
	'冷凍コンテナ②',
	'冷凍コンテナ⑪',
	''
];

/** A fixed shuffle, so the expected order never depends on the input order. */
const SHUFFLED = SORTED_JA.map((name, i) => ({ name, rank: (i * 17) % 27 }))
	.sort((a, b) => a.rank - b.rank)
	.map(({ name }) => name);

const sortNames = (names: readonly string[], options?: Parameters<typeof naturalSort>[2]) =>
	naturalSort(names, (name) => name, options);

describe('naturalSort', () => {
	it('puts numbers first by value (full-width and circled too), then Latin, kana, kanji', () => {
		expect(SHUFFLED).not.toEqual(SORTED_JA);
		expect(sortNames(SHUFFLED)).toEqual(SORTED_JA);
	});

	it('keeps kanji numerals as text', () => {
		expect(sortNames(['二号舎', '10号舎', '一号舎', '2号舎'])).toEqual([
			'2号舎',
			'10号舎',
			'一号舎',
			'二号舎'
		]);
	});

	it('orders kanji by the locale: Japanese reading order, or Unicode order in English', () => {
		const kanji = ['冷凍', '温室', '五反田'];
		expect(sortNames(kanji)).toEqual(['温室', '五反田', '冷凍']);
		expect(sortNames(kanji, { locale: 'ja' })).toEqual(['温室', '五反田', '冷凍']);
		expect(sortNames(kanji, { locale: 'en' })).toEqual(['五反田', '冷凍', '温室']);
	});

	it('reads the locale from an Accept-Language header', () => {
		const kanji = ['温室', '五反田'];
		expect(sortNames(kanji, { locale: 'en-US,en;q=0.9,ja;q=0.8' })).toEqual(['五反田', '温室']);
		expect(sortNames(kanji, { locale: 'ja,en-US;q=0.9' })).toEqual(['温室', '五反田']);
		expect(sortNames(kanji, { locale: 'fr-FR' })).toEqual(['温室', '五反田']);
		expect(sortNames(kanji, { locale: null })).toEqual(['温室', '五反田']);
	});

	it('sorts descending as the exact reverse', () => {
		expect(sortNames(SHUFFLED, { direction: 'desc' })).toEqual([...SORTED_JA].reverse());
	});

	it('sorts objects by the given name, keeping the input order for equal names', () => {
		const rows = [
			{ id: 'c', name: 'センサー１' },
			{ id: 'a', name: null },
			{ id: 'b', name: 'センサー１' },
			{ id: 'd', name: 'センサー0' }
		];
		expect(naturalSort(rows, (row) => row.name).map((row) => row.id)).toEqual(['d', 'c', 'b', 'a']);
		expect(rows.map((row) => row.id)).toEqual(['c', 'a', 'b', 'd']);
	});
});
