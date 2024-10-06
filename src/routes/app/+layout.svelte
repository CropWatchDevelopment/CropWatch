<script lang="ts">
	import '../../app.css';
	import {
		AppBar,
		AppLayout,
		Button,
		createLocaleSettings,
		Icon,
		settings,
		Settings,
		ThemeInit,
		Notification
	} from 'svelte-ux';
	import CROPWATCH_LOGO from '$lib/images/UI/logo.svg';
	import UserHeaderWidget from '$lib/components/ui/Header/UserHeaderWidget.svelte';
	import Back from '$lib/components/ui/Back.svelte';
	import AlertMenu from '$lib/components/ui/Header/AlertMenu.svelte';
	import NavMenu from '$lib/components/ui/SideNav/NavMenu.svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { notificationStore, type UINotification } from '$lib/stores/notificationStore';
	import { mdiAlertCircle, mdiInformation } from '@mdi/js';

	export let data;

	let { supabase, session } = data;
	$: ({ supabase, session } = data);

	let notification: UINotification;

	$: notificationStore.subscribe((value) => {
		notification = value;
	});

	supabase
		.channel('cw_rules')
		.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'todos' }, (payload) => {
			notificationStore.NotificationTimedOpen({
				title: 'New Alert',
				description: `${payload.new.name} has been triggered`,
				icon: mdiAlertCircle,
				duration: 5000,
				buttonText: 'View'
			});
		})
		.subscribe();

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
							few: '三',
							other: ''
						}
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
							Current: '今日',
							Last: '昨日',
							LastX: '{0}日前'
						}
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

<AppLayout areas="'header header' 'aside main'">
	<svelte:fragment slot="nav">
		<NavMenu />
	</svelte:fragment>

	<AppBar class="flex bg-primary text-primary-content" head={true}>
		<a href="/app/dashboard" slot="title" class="ml-2">CropWatch</a>
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

	<div class="absolute right-6 top-6 z-50">
		<!-- open={notification.open} -->
		<Notification actions="below" closeIcon open={notification.open}>
			<div slot="icon" class="self-start">
				{#if notification.icon}
					<Icon data={notification.icon} class={notification.iconColor} />
				{:else}
					<Icon data={mdiInformation} />
				{/if}
			</div>
			<div slot="title">{notification.title}</div>
			<div slot="description">
				{notification.description}
			</div>
			<div slot="actions">
				<Button color="primary">{notification.buttonText}</Button>
			</div>
		</Notification>
	</div>

	<main class="bg- h-full">
		<Back>{$_('app.back')}</Back>
		<slot />
	</main>
</AppLayout>
