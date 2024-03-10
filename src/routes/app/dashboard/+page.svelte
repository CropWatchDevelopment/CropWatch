<script>
	import { mdiCheck, mdiStar, mdiViewDashboard } from '@mdi/js';
	import { Avatar, Card, Header, Icon } from 'svelte-ux';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import { Arc, Chart, Group, LinearGradient, Svg, Text } from 'layerchart';
</script>

<h1
	class="text-lg font-bold border-b mb-4 w-full text-white relative"
	style="left:-8px; top:-8px; background-image:url({backgroundImg}); height: 120px;"
>
	<Icon data={mdiViewDashboard} />
	Dashboard
</h1>

<div class="grid grid-flow-col grid-cols-1 md:grid-cols-3 gap-5">
	<CWStatCard counterStartTime={null} />
	<CWStatCard counterStartTime={null} />
	<CWStatCard counterStartTime={null} />
</div>

<div class="grid grid-flow-col grid-cols-1 md:grid-cols-12 gap-5 mt-5">
	<Card class="grid col-span-8">a</Card>

	<Card class="w-full col-span-4">
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
