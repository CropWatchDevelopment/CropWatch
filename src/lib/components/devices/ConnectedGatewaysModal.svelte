<script lang="ts">
	import type { DeviceGatewayWithDevice } from '$lib/models/DeviceGateway';

	let {
		open = $bindable(false),
		deviceLabel = '',
		gateways = [] as DeviceGatewayWithDevice[]
	} = $props();

	function close() {
		open = false;
	}
</script>

{#if open}
	<div class="modal-backdrop" role="presentation" onclick={close}></div>
	<div class="modal" role="dialog" aria-modal="true" aria-label={`Gateways for ${deviceLabel}`}>
		<header class="modal__header">
			<h2>Connected Gateways</h2>
			<button type="button" aria-label="Close" onclick={close}>&times;</button>
		</header>
		<div class="modal__body">
			<p class="modal__subtitle">{deviceLabel}</p>

			{#if gateways.length === 0}
				<p class="modal__empty">No gateways are currently linked to this device.</p>
			{:else}
				<ul>
					{#each gateways as gateway (gateway.id)}
						<li>
							<p class="gateway-name">{gateway.gateway?.gateway_name ?? gateway.gateway_id}</p>
							<p class="gateway-id">ID: {gateway.gateway?.gateway_id ?? gateway.gateway_id}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<footer class="modal__footer">
			<button type="button" class="close-button" onclick={close}>Close</button>
		</footer>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		z-index: 40;
	}

	.modal {
		position: fixed;
		z-index: 50;
		inset: 0;
		margin: auto;
		max-width: 28rem;
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgb(15 23 42 / 0.25);
		display: flex;
		flex-direction: column;
	}

	.modal__header,
	.modal__footer {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgb(226 232 240);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.modal__footer {
		border-bottom: none;
		border-top: 1px solid rgb(226 232 240);
	}

	.modal__body {
		padding: 1rem 1.25rem 1.5rem;
	}

	.modal__subtitle {
		margin: 0 0 1rem;
		color: rgb(100 116 139);
	}

	.modal__empty {
		margin: 0;
		color: rgb(100 116 139);
	}

	.modal__body ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.modal__body li {
		padding: 0.5rem 0;
		border-bottom: 1px solid rgb(226 232 240);
	}

	.modal__body li:last-child {
		border-bottom: none;
	}

	.gateway-name {
		margin: 0;
		font-weight: 600;
	}

	.gateway-id {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: rgb(100 116 139);
	}

	.close-button,
	.modal__header button {
		background: transparent;
		border: none;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.modal__header button {
		font-size: 1.25rem;
	}
</style>
