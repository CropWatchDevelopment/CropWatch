<script lang="ts">
	import {
		mdiCalendarCheck,
		mdiCheck,
		mdiCheckCircleOutline,
		mdiCheckboxMarkedCircle,
		mdiCloseCircle,
		mdiDotsVertical,
		mdiHandFrontLeft,
		mdiHandFrontRight,
		mdiPercentBox,
		mdiStar,
		mdiViewDashboard
	} from '@mdi/js';
	import {
		Avatar,
		Button,
		ButtonGroup,
		Card,
		Header,
		Icon,
		Menu,
		Progress,
		Toggle
	} from 'svelte-ux';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import { Arc, Chart, Group, LinearGradient, Svg, Text } from 'layerchart';
	import Grid from 'gridjs-svelte';
	import { onMount } from 'svelte';
	import Feedback from '$lib/components/feedbackDialog/Feedback.svelte';

	let dominant_hand: 'left' | 'right' = 'right';
	const changeHand = (hand: 'left' | 'right') => {
		dominant_hand = hand;
		localStorage.setItem('dominant_hand', dominant_hand);
	};

	const data = [
		{ name: 'John', email: 'john@example.com' },
		{ name: 'Mark', email: 'mark@gmail.com' }
	];

	onMount(() => {
		dominant_hand = localStorage.getItem('dominant_hand') ?? 'right';
	});
</script>

<h1
    class="flex items-center text-2xl font-bold border-b mb-4 w-full text-white relative"
    style="left:-8px; top:-8px; background-image:url({backgroundImg}); width:100vw; height: 120px;"
>
    <div class="flex items-center space-x-2 ml-2"> <!-- Adjust space-x-2 as needed -->
        <Icon data={mdiViewDashboard} />
        <span>Dashboard</span>
    </div>
</h1>


<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
	<CWStatCard title="Attention Required" value={0} notation="" counterStartTime={null}>
		<div slot="headerMore">
			<Feedback />
		</div>
	</CWStatCard>
	<CWStatCard title="Remaining Daily Tasks" value={2} notation=" Tasks" counterStartTime={null}
		><div slot="headerMore">
			<Feedback />
		</div>
	</CWStatCard>
	<CWStatCard counterStartTime={null}
		><div slot="headerMore">
			<Feedback />
		</div>
	</CWStatCard>
</div>

<div class="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
	<Card class="grid md:col-span-8">
		<Header
			title="Quick Task View"
			class="w-full col-span-12"
			subheading="Subheading"
			slot="header"
		>
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiCalendarCheck} />
				</Avatar>
			</div>
			<div slot="actions">
				<Toggle let:on={open} let:toggle>
					<Button on:click={toggle}>
						<Icon data={mdiDotsVertical} />
						<Menu {open} on:close={toggle}>
							<Feedback />
						</Menu>
					</Button>
				</Toggle>
			</div>
		</Header>
		<div class="flex flex-row col-span-12 md:hidden border-b">
			<Button
				classes={{ root: 'ml-1 w-1/2' }}
				color={dominant_hand == 'left' ? 'success' : 'danger'}
				variant={dominant_hand == 'left' ? 'fill-light' : 'default'}
				on:click={() => changeHand('left')}
				icon={mdiHandFrontLeft}
			>
				Left Hand
			</Button>
			<span class="flex-1" />
			<Button
				classes={{ root: 'w-1/2' }}
				color={dominant_hand == 'right' ? 'success' : 'danger'}
				variant={dominant_hand == 'right' ? 'fill-light' : 'default'}
				on:click={() => changeHand('right')}
				icon={mdiHandFrontRight}>Right Hand</Button
			>
		</div>
		<div class="col-span-12">
			<div class="flex flex-row">
				<Icon data={mdiPercentBox} /> Complete:
				<Progress value={0.33} class="translate-y-1/2 m-1 [--color:theme(colors.warning)]" />
			</div>
			<ol class="grid col-span-5 p-2">
				<li class="border-b mb-1">
					<span class="float-{dominant_hand == 'left' ? 'right' : 'left'}">
						<Icon class="text-success-500" data={mdiCheckCircleOutline} />
						YES
					</span>
					<Button variant="fill-outline" classes={{ root: `float-${dominant_hand}` }}
						>Watered Plants</Button
					>
				</li>

				<li class="border-b mb-1">
					<span class="float-{dominant_hand == 'left' ? 'right' : 'left'}">
						<Icon class="text-danger-500" data={mdiCloseCircle} />
						No
					</span>
					<Button variant="fill-outline" classes={{ root: `float-${dominant_hand}` }}
						>Opened Roof Plants</Button
					>
				</li>

				<li class="border-b mb-1">
					<span class="float-{dominant_hand == 'left' ? 'right' : 'left'}">
						<Icon class="text-danger-500" data={mdiCloseCircle} />
						No
					</span>
					<Button variant="fill-outline" classes={{ root: `float-${dominant_hand}` }}
						>Check weeds</Button
					>
				</li>
			</ol>
		</div>
	</Card>

	<Card class="w-full md:col-span-4">
		<div class="h-[220px]">
			<Chart>
				<Svg>
					<Group center>
						<Group y={16}>
							<LinearGradient class="from-secondary to-primary" let:url>
								<Arc
									value={60}
									range={[-120, 120]}
									outerRadius={60}
									innerRadius={50}
									cornerRadius={5}
									spring
									let:value
									fill={url}
									track={{ class: 'fill-none stroke-surface-content/10' }}
								>
									<Text
										value={Math.round(value) + '%'}
										textAnchor="middle"
										verticalAnchor="middle"
										class="text-3xl tabular-nums"
									/>
								</Arc>
							</LinearGradient>
						</Group>
					</Group>
				</Svg>
			</Chart>
		</div>
	</Card>
</div>

<Card class="mt-10">
	<Grid {data} fixedHeader={true} search={true} sort={true} />
</Card>

<style global>
	@import 'https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css';
</style>
