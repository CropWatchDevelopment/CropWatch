<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Leaflet from '$lib/components/leaflet/Leaflet.svelte';
	import {
		mdiArrowDown,
		mdiArrowLeft,
		mdiChevronLeft,
		mdiDotsVertical,
		mdiExclamation,
		mdiExpandAll,
		mdiExpansionCard,
		mdiEye,
		mdiFilter,
		mdiFloppy,
		mdiMagnify,
		mdiPencil
	} from '@mdi/js';
	import { scaleBand } from 'd3-scale';
	import { Axis, Bars, Chart, Svg } from 'layerchart';
	import {
		Button,
		Card,
		Checkbox,
		DateField,
		Header,
		Icon,
		ListItem,
		PeriodType,
		Switch,
		TextField,
		Toggle,
		Tooltip,
		formatDate
	} from 'svelte-ux';

	const bounds = [35.692714959692054, 139.62132090488151];

	interface IData {
		date: Date;
		value: number;
		baseline: number;
	}

	let data: IData[] = [];
	let installDate: Date = new Date();

	for (let i = 0; i < 160; i++) {
		data.push({
			date: new Date(Date.now() + 24 * 60 * 60 * i),
			value: Math.floor(Math.random() * (80 - 3 + 1)) + 30,
			baseline: Math.floor(Math.random() * (5 - 5 + 1)) + 2
		});
	}
	data = data;
</script>

<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">
	<Button variant="outline" icon={mdiChevronLeft} size="lg" on:click={() => goto(`/app/locations/${$page.params.location_id}`)} />
	<p class="my-auto">Water Sensor</p>
</h1>

<div class="grid grid-flow-col grid-cols-5 py-4 gap-4">
	<Card class="py-3 text-center text-base text-black-500 font-extrabold cursor-pointer"
		>合計使用量</Card
	>
	<Card class="py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
		>分析</Card
	>
	<Card class="py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
		>デバイス</Card
	>
	<Card class="py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
		>通知</Card
	>
	<Card class="py-3 text-center text-sm hover:text-base text-gray-500 font-medium cursor-pointer"
		>設定</Card
	>
</div>

<div class="grid grid-flow-col grid-cols-4 gap-4">
	<Card class="py-9 text-center">
		<p class="text-xl">
			<b>203.11 m³</b>
		</p>
		<small>週別使用量</small>
	</Card>

	<Card class="py-9 text-center">
		<p class="text-xl">
			<b>79713.91 m³</b>
		</p>
		<small>月別使用量</small>
	</Card>

	<Card class="py-9 text-center">
		<p class="text-xl">
			<b>23.7 °C</b>
		</p>
		<small>温度</small>
	</Card>

	<Card class="py-9 text-center">
		<p class="text-xl">
			<b>96 %</b>
		</p>
		<small>バッテリーレベル</small>
	</Card>
</div>

<div class="grid grid-flow-col grid-cols-4 mt-4 gap-4">
	<Card class="col-span-3">
		<Header title="使用量チャート" slot="header" />
		<div slot="contents">
			<div class="h-[300px] p-4 border rounded">
				<Chart
					{data}
					x="date"
					xScale={scaleBand().padding(0.4)}
					y="value"
					yDomain={[0, null]}
					yNice
					padding={{ left: 16, bottom: 24 }}
				>
					<Svg>
						<Axis placement="left" grid rule />
						<Axis placement="bottom" format={(d) => formatDate(d, PeriodType.Day, 'short')} rule />
						<Bars radius={4} strokeWidth={1} class="fill-accent-500" />
					</Svg>
				</Chart>
			</div>
		</div>
		<div slot="actions">
			<p>本日の使用量: xyz</p>
		</div>
	</Card>

	<Card class="col-span-1">
		<Header title="警報" slot="header">
			<div slot="actions">
				<Button icon={mdiExpandAll} class="w-12 h-12" />
				<Button icon={mdiMagnify} class="w-12 h-12" />
				<Button icon={mdiFilter} class="w-12 h-12" />
				<Button icon={mdiDotsVertical} class="w-12 h-12" />
			</div>
		</Header>
		<div slot="contents">
			<div class="border border-b w-full border-t-0 flex flex-row mb-4">
				<Checkbox>作成された時間</Checkbox>
				<Icon data={mdiArrowDown} size={15} classes={{ root: 'ml-2' }} />
			</div>

			<ol>
				<ListItem
					title="使用量が多すぎます"
					subheading="2024-01-24 13:46"
					icon={mdiExclamation}
					avatar={{ class: 'bg-gray-400 text-red/90' }}
					classes={{ root: 'bg-red-100 mb-2' }}
				>
					<div slot="actions">
						<Button icon={mdiEye} />
					</div>
				</ListItem>
				<ListItem
					title="水が使用されていません"
					subheading="2024-01-24 13:46"
					icon={mdiExclamation}
					avatar={{ class: 'bg-gray-400 text-red/90' }}
					classes={{ root: 'bg-red-100 mb-2' }}
				>
					<div slot="actions">
						<Button icon={mdiEye} />
					</div>
				</ListItem>
				<ListItem
					title="凍結注意"
					subheading="2024-01-24 13:46"
					icon={mdiExclamation}
					avatar={{ class: 'bg-gray-400 text-red/90' }}
					classes={{ root: 'bg-red-100 mb-2' }}
				>
					<div slot="actions">
						<Button icon={mdiEye} />
					</div>
				</ListItem>
			</ol>
		</div>
	</Card>
</div>

<div class="grid grid-flow-col grid-cols-9 mt-4 gap-4">
	<Card class="col-span-3">
		<Header title="マップ" slot="header" class="border-b" />
		<div slot="contents" class="flex flex-col gap-3 pb-3">
			<Leaflet view={bounds} zoom={20}></Leaflet>
		</div>
	</Card>

	<Toggle let:on={open} let:toggle>
		<Card class="col-span-2">
			<Header title="メーター設置場所" slot="header" class="border-b">
				<div slot="actions">
					<Tooltip title={open ? `保存` : `編集`}>
						<Button icon={open ? mdiFloppy : mdiPencil} on:click={toggle} class="w-12 h-12" />
					</Tooltip>
				</div>
			</Header>
			<div slot="contents" class="flex flex-col gap-3 pb-3">
				{#if !open}
					<p>住所:</p>
					<p>所有者:</p>
					<p class="border-b">所有者Email:</p>
					<p>使用者:</p>
					<p>使用者Email:</p>
				{:else}
					<TextField label="住所" />
					<TextField label="所有者" />
					<TextField label="所有者Email" />
					<TextField label="使用者" />
					<TextField label="使用者Email" />
				{/if}
			</div>
		</Card>
	</Toggle>

	<Toggle let:on={open} let:toggle>
		<Card class="col-span-2">
			<Header title="メーター詳細" slot="header" class="border-b">
				<div slot="actions">
					<Tooltip title={open ? `保存` : `編集`}>
						<Button icon={open ? mdiFloppy : mdiPencil} on:click={toggle} class="w-12 h-12" />
					</Tooltip>
				</div>
			</Header>
			<div slot="contents" class="flex flex-col gap-3 pb-3">
				{#if !open}
					<p>ラベル:</p>
					<p>状態:</p>
					<p class="border-b">名前:</p>
					<p>設置日:</p>
				{:else}
					<TextField label="ラベル" />
					<label for="status" class="flex gap-2 items-center text-sm">
						状態
						<Switch name="status" value={true} id="status" />
					</label>
					<TextField label="名前" />
					<DateField
						label="設置日"
						value={installDate}
						on:change={(e) => (installDate = e.detail.value)}
						picker
						clearable
					/>
				{/if}
			</div>
		</Card>
	</Toggle>

	<Card class="col-span-2">
		<Header title="写真" slot="header" class="border-b">
			<div slot="actions">
				<Button icon={mdiPencil} class="w-12 h-12" />
			</div>
		</Header>
		<div slot="contents" class="flex flex-col gap-3 pb-3">
			<img
				alt="Pulse Meter"
				src="https://cdn11.bigcommerce.com/s-iaojjj3/images/stencil/1280x1280/products/209/1041/Neptune_T-10-angle__80463.1497552311.jpg?c=2"
			/>
		</div>
	</Card>
</div>
