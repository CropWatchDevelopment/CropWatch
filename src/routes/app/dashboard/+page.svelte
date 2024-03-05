<script>
	import { mdiCheck, mdiViewDashboard } from '@mdi/js';
	import { Avatar, Card, Header, Icon } from 'svelte-ux';
</script>

<h1 class="text-lg font-bold border-b mb-4">
	<Icon data={mdiViewDashboard} />
	Dashboard
</h1>

<div class="grid grid-flow-col gap-2 mb-4">
	<Card>
		<Header title="Locations With Alerts" subheading="Required to view" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiCheck} />
				</Avatar>
			</div>
		</Header>
		<div slot="contents">
			<p class="text-5xl text-center">0</p>
		</div>
	</Card>

	<Card>
		<Header title="Sensors that require attention" subheading="Required to view" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiCheck} />
				</Avatar>
			</div>
		</Header>
		<div slot="contents">
			<p class="text-5xl text-center">0</p>
		</div>
	</Card>
</div>

<div class="grid grid-flow-col gap-4 mb-4">
	<Card>
		<Header title="Soil Too Dry/Wet" subheading="Required to view" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiCheck} />
				</Avatar>
			</div>
		</Header>
		<div slot="contents">
			<p class="text-5xl text-center">0</p>
		</div>
	</Card>

	<Card>
		<Header title="Soil too Hot/Cold" subheading="Required to view" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiCheck} />
				</Avatar>
			</div>
		</Header>
		<div slot="contents">
			<p class="text-5xl text-center">0</p>
		</div>
	</Card>

	<Card>
		<Header title="Soil Sensors require attention" subheading="Required to view" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiCheck} />
				</Avatar>
			</div>
		</Header>
		<div slot="contents">
			<p class="text-5xl text-center">0</p>
		</div>
	</Card>
</div>

<div class="grid grid-flow-col grid-cols-2 h-full">
	<Card>
		<Header title="Today's Schedule" subheading="Schedule" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiCheck} />
				</Avatar>
			</div>
		</Header>
		<div slot="contents">
			<p class="text-5xl text-center">0</p>
		</div>
	</Card>
</div>
