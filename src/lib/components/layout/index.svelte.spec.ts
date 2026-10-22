import { describe, expect, it } from 'vitest';
import * as layout from './index';
import AppActionRow from './AppActionRow.svelte';
import AppFormStack from './AppFormStack.svelte';
import AppNotice from './AppNotice.svelte';
import AppPage from './AppPage.svelte';
import AppSection from './AppSection.svelte';

describe('$lib/components/layout', () => {
	it('exports the five layout components by name', () => {
		expect({ ...layout }).toEqual({ AppActionRow, AppFormStack, AppNotice, AppPage, AppSection });
	});
});
