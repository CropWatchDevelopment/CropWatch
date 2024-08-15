<script>
	import '../../app.css';
	import {
		AppBar,
		AppLayout,
		Button,
		createLocaleSettings,
		settings,
		Settings,
		ThemeInit,
	} from 'svelte-ux';
	import CROPWATCH_LOGO from '$lib/images/UI/logo.svg';
	import UserHeaderWidget from '$lib/components/ui/Header/UserHeaderWidget.svelte';
	import Back from '$lib/components/ui/Back.svelte';
	import AlertMenu from '$lib/components/ui/Header/AlertMenu.svelte';
	import NavMenu from '$lib/components/ui/SideNav/NavMenu.svelte';

	const s = settings({
		localeFormats: {
			ja: createLocaleSettings({
				locale: 'ja',

				formats: {
					dates: {
						baseParsing: 'yyyy/mm/dd',
						ordinalSuffixes: {
							one: 'ー'
						}
					},

					numbers: {
						defaults: {
							currency: 'JPY'
						}
					}
				},

				dictionary: {
					Ok: 'Valider',
					Cancel: 'Annuler',

					Date: {
						Start: 'Début',
						End: 'Fin',

						Day: '日',
						DayTime: 'Jour & Heure',
						Time: '時間',
						Week: '週',
						Month: 'Mois',
						Quarter: 'Trimestre',
						CalendarYear: 'Année',
						FiscalYearOct: 'Année fiscale (octobre)',
						BiWeek: 'Bi-hebdomadaire',

						PeriodDay: {
							Current: "Aujourd'hui",
							Last: 'Hier',
							LastX: 'Les {0} derniers jours'
						}

						//...
					}
				}
			}),
		}
	});
	s.forceLocale = 'ja';
	
</script>

<ThemeInit />
<Settings
	components={{
		Button: { classes: 'border-2 font-bold' },
		Menu: { classes: 'shadow-xl border-gray-500' },
		MenuItem: { classes: 'font-bold' }
	}}
/>

<AppLayout
	areas="'header header' 'aside main'"
	class="h-full [&>header]:fixed [&>header]:top-0 [&>header]:h-[var(--headerHeight)] [&>header]:w-full [&>header]:transition-all [&>main]:mt-[var(--headerHeight)] [&>main]:transition-[margin] [&>main]:duration-500 [&>main]:md:ml-[var(--drawerWidth)] [:where(&_[id])]:scroll-m-[var(--headerHeight)]"
>
	<svelte:fragment slot="nav">
		<!-- Nav menu -->
		<NavMenu />
	</svelte:fragment>

	<AppBar title="CropWatch" class="flex bg-primary text-primary-content" head={true}>
		<svelte:fragment slot="menuIcon" let:toggleMenu let:isMenuOpen>
			<Button on:click={toggleMenu} variant="none">
				<img src={CROPWATCH_LOGO} alt="CropWatch" class="h-8" />
			</Button>
		</svelte:fragment>
		<div slot="actions" class="flex">
			<AlertMenu />
			<UserHeaderWidget />
		</div>
	</AppBar>

	<main class="bg- h-full">
		<Back>Back</Back>
		<slot />
	</main>
</AppLayout>
