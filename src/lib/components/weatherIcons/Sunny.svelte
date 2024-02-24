<script lang="ts">
	export let cloud1: boolean = false;
	export let cloud2: boolean = false;
</script>

<div class="container">
	{#if cloud1}
		<div class="cloud front">
			<span class="left-front"></span>
			<span class="right-front"></span>
		</div>
	{/if}
	<span class="sun sunshine"></span>
	<span class="sun"></span>
	{#if cloud2}
		<div class="cloud back">
			<span class="left-back"></span>
			<span class="right-back"></span>
		</div>
	{/if}
</div>

<style>
	.container {
		width: 111px;
		height: 30px;
		margin: 100px auto;
		padding: 15px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.cloud {
		width: 250px;
	}
	.front {
		padding-top: 45px;
		margin-left: 25px;
		display: inline;
		position: absolute;
		z-index: 11;
		animation: clouds 8s infinite;
		animation-timing-function: ease-in-out;
	}
	.back {
		margin-top: -30px;
		margin-left: 150px;
		z-index: 12;
		animation: clouds 12s infinite;
		animation-timing-function: ease-in-out;
	}
	.right-front {
		width: 22.5px;
		height: 22.5px;
		border-radius: 50% 50% 50% 0%;
		background-color: #4c9beb;
		display: inline-block;
		margin-left: -10px;
		z-index: 5;
	}
	.left-front {
		width: 32.5px;
		height: 32.5px;
		border-radius: 50% 50% 0% 50%;
		background-color: #4c9beb;
		display: inline-block;
		z-index: 5;
        margin-left: 35px;
        
	}
	.right-back {
		width: 25px;
		height: 25px;
		border-radius: 50% 50% 50% 0%;
		background-color: #4c9beb;
		display: inline-block;
		margin-left: -10px;
		z-index: 5;
	}
	.left-back {
		width: 15px;
		height: 15px;
		border-radius: 50% 50% 0% 50%;
		background-color: #4c9beb;
		display: inline-block;
		z-index: 5;
        margin-left: -10px;
	}
	.sun {
		width: 60px;
		height: 60px;
		background: -webkit-linear-gradient(to right, #fcbb04, #fffc00);
		background: linear-gradient(to right, #fcbb04, #fffc00);
		border-radius: 60px;
		display: inline;
		position: absolute;
	}
	.sunshine {
		animation: sunshines 2s infinite;
	}
	@keyframes sunshines {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(1.4);
			opacity: 0;
		}
	}
	@keyframes clouds {
		0% {
			transform: translateX(15px);
		}
		50% {
			transform: translateX(0px);
		}
		100% {
			transform: translateX(15px);
		}
	}
</style>
