/**
 * The one sort for user-facing names: devices, locations, location groups.
 *
 * TWIN FILE — keep identical to api `src/v1/common/natural-sort.ts`
 * (only formatting may differ). Both repos test it with the same cases.
 *
 * Order: names starting with a number first, compared by value (2 < 10),
 * including full-width digits (１２) and circled numbers (⑥ ⑪); then Latin
 * letters, then kana (hiragana and katakana together), then kanji (Japanese
 * JIS order, roughly by reading; English UI: Unicode order). Kanji numerals
 * (一, 二, 十) stay text: they are as often part of a word or a place name
 * (五反田) as a count. Empty names go last; equal names keep their input order.
 */

export interface NaturalSortOptions {
	/** 'ja', 'en' or a raw Accept-Language header: English → 'en', anything else → 'ja'. */
	locale?: string | null;
	direction?: 'asc' | 'desc';
}

type NaturalSortLocale = 'ja' | 'en';

const collators = new Map<NaturalSortLocale, Intl.Collator>();

function collatorFor(locale: string | null | undefined): Intl.Collator {
	const resolved: NaturalSortLocale = /^\s*en\b/i.test(locale ?? '') ? 'en' : 'ja';
	let collator = collators.get(resolved);
	if (!collator) {
		collator = new Intl.Collator(resolved, { numeric: true });
		collators.set(resolved, collator);
	}
	return collator;
}

/**
 * Returns a new array of `items` ordered by `getName` (see the file comment).
 * Feed rows in a fixed order (e.g. by id) to get a fully deterministic result.
 */
export function naturalSort<T>(
	items: readonly T[],
	getName: (item: T) => string | null | undefined,
	options: NaturalSortOptions = {}
): T[] {
	const collator = collatorFor(options.locale);
	const keyed = items.map((item) => {
		const name = getName(item) ?? '';
		// NFKC folds full-width digits and letters, circled numbers (⑥ → 6),
		// half-width kana and the ideographic space.
		const key = name.normalize('NFKC').replace(/\s+/gu, ' ').trim();
		return { item, name, key };
	});

	keyed.sort((a, b) => {
		if (!a.key !== !b.key) return a.key ? -1 : 1;
		return collator.compare(a.key, b.key) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	});

	const sorted = keyed.map(({ item }) => item);
	return options.direction === 'desc' ? sorted.reverse() : sorted;
}
