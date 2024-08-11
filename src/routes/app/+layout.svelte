<script>
	import '../../app.css';
	import { AppBar, AppLayout, Button, NavItem, Settings, ThemeInit, ThemeSwitch } from 'svelte-ux';
	import CROPWATCH_LOGO from '$lib/images/UI/logo.svg';
	import UserHeaderWidget from '$lib/components/ui/Header/UserHeaderWidget.svelte';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import AlertMenu from '$lib/components/ui/Header/AlertMenu.svelte';
	import NavMenu from '$lib/components/ui/SideNav/NavMenu.svelte';

</script>

<ThemeInit />
<Settings
  components={{
    Button: { classes: "border-2 font-bold" },
    Menu: { classes: "shadow-xl border-gray-500" },
    MenuItem: { classes: "font-bold" },
  }}
/>

<AppLayout areas="'header header' 'aside main'" class="h-full [&>header]:fixed [&>header]:top-0 [&>header]:h-[var(--headerHeight)] [&>header]:transition-all [&>header]:w-full [&>main]:md:ml-[var(--drawerWidth)] [&>main]:mt-[var(--headerHeight)] [&>main]:transition-[margin] [&>main]:duration-500 [:where(&_[id])]:scroll-m-[var(--headerHeight)]">
	<svelte:fragment slot="nav">
		<!-- Nav menu -->
		<NavMenu />
	</svelte:fragment>

	<AppBar title="CropWatch" class="bg-primary text-primary-content flex" head={true}>
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

	<main class="h-full bg-">
		<Back>Back</Back>
		<slot />
	</main>
</AppLayout>
