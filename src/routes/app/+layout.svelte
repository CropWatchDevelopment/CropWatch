<script>
	import '../../app.css';
	import {
		AppBar,
		AppLayout,
		Button,
		createLocaleSettings,
		settings,
		Settings,
		ThemeInit
	} from 'svelte-ux';
	import CROPWATCH_LOGO from '$lib/images/UI/logo.svg';
	import UserHeaderWidget from '$lib/components/ui/Header/UserHeaderWidget.svelte';
	import Back from '$lib/components/ui/Back.svelte';
	import AlertMenu from '$lib/components/ui/Header/AlertMenu.svelte';
	import NavMenu from '$lib/components/ui/SideNav/NavMenu.svelte';
	import { _, isLoading } from 'svelte-i18n';

	const s = settings({
		components: {
			Radio: {
				classes: {
					label: 'text-secondary-900'
				}
			}
		},
		localeFormats: {
			ja: createLocaleSettings({
				locale: 'ja',

				formats: {
					dates: {
						baseParsing: 'yyyy/mm/dd',
						ordinalSuffixes: {
							one: 'ー',
							two: '二',
						},
						
					},
					numbers: {
						defaults: {
							currency: 'JPY'
						}
					}
				},

				dictionary: {
					Ok: 'OK',
					Cancel: 'キャンセル',

					Date: {
						Start: '開始',
						End: '終了',

						Day: '日',
						DayTime: '日時',
						Time: '時間',
						Week: '週',
						Month: '月',
						Quarter: '四半期',
						CalendarYear: 'カレンダー年',
						FiscalYearOct: '会計年度',
						BiWeek: '2週間',

						PeriodDay: {
							Current: "今日",
							Last: '昨日',
							LastX: '{0}日前',
						}

						//...
					}
				}
			})
		}
	});
	s.locale.set('ja');
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
		<Back>{$_('app.back')}</Back>
		<slot />
	</main>
</AppLayout>
