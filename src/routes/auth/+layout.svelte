<script lang="ts">
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

	let { children } = $props();

	type ParticleSize = 'sm' | 'md' | 'lg';

	interface SceneParticle {
		id: string;
		sizeClass: string;
		style: string;
	}

	const PARTICLE_COUNT = 28;

	function createSeededRandom(seed: number): () => number {
		let state = seed >>> 0;

		return () => {
			state = (state * 1664525 + 1013904223) >>> 0;
			return state / 0x100000000;
		};
	}

	function resolveParticleSize(value: number): ParticleSize {
		if (value > 0.78) return 'lg';
		if (value > 0.38) return 'md';
		return 'sm';
	}

	function createSceneParticles(count: number): SceneParticle[] {
		const random = createSeededRandom(0xc0ffee);

		return Array.from({ length: count }, (_, index) => {
			const size = resolveParticleSize(random());
			const left = 4 + random() * 92;
			const driftX = (random() - 0.5) * 18;
			const duration = 18 + random() * 18;
			const delay = -random() * duration;
			const shimmerDuration = 4.5 + random() * 3.5;
			const shimmerDelay = -random() * shimmerDuration;
			const opacity = 0.24 + random() * 0.48;

			return {
				id: `particle-${index}`,
				sizeClass: `bg-dot--${size}`,
				style: [
					`left:${left.toFixed(2)}%`,
					`--bg-dot-rise-x:${driftX.toFixed(2)}vw`,
					`--bg-dot-duration:${duration.toFixed(2)}s`,
					`--bg-dot-delay:${delay.toFixed(2)}s`,
					`--bg-dot-shimmer-duration:${shimmerDuration.toFixed(2)}s`,
					`--bg-dot-shimmer-delay:${shimmerDelay.toFixed(2)}s`,
					`--bg-dot-opacity:${opacity.toFixed(2)}`,
					'animation-name:bg-rise,bg-shimmer !important',
					`animation-duration:${duration.toFixed(2)}s,${shimmerDuration.toFixed(2)}s !important`,
					'animation-timing-function:linear,ease-in-out !important',
					'animation-iteration-count:infinite,infinite !important',
					`animation-delay:${delay.toFixed(2)}s,${shimmerDelay.toFixed(2)}s !important`
				].join(';')
			};
		});
	}

	const particles = createSceneParticles(PARTICLE_COUNT);
</script>

<section class="auth-scene p-0 md:p-8">
	<div class="auth-locale-switcher">
		<LanguageSwitcher compact />
	</div>
	<div class="scene-gradient"></div>
	<div class="scene-vignette"></div>
	<div class="particle-layer" aria-hidden="true">
		{#each particles as particle (particle.id)}
			<span class={`bg-dot ${particle.sizeClass}`} style={particle.style}></span>
		{/each}
	</div>

	<div class="relative z-2 w-full md:max-w-md auth-content">
		{@render children()}
	</div>
</section>

<style>
	.auth-scene {
		position: relative;
		display: flex;
		min-height: 100vh;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		/* padding: 2rem 1rem; */
		background: #0a1331;
	}

	.scene-gradient,
	.scene-vignette {
		pointer-events: none;
		position: absolute;
		inset: 0;
	}

	.scene-gradient {
		background:
			radial-gradient(85% 75% at 12% 90%, rgb(26 134 153 / 44%) 0%, transparent 58%),
			radial-gradient(75% 72% at 86% 4%, rgb(106 90 202 / 36%) 0%, transparent 56%),
			radial-gradient(60% 52% at 50% 56%, rgb(65 116 196 / 24%) 0%, transparent 62%),
			linear-gradient(158deg, #1a2a57 0%, #0d1a42 40%, #0a1331 100%);
	}

	.scene-vignette {
		background: radial-gradient(ellipse at center, rgb(11 20 48 / 0%) 36%, rgb(7 12 28 / 70%) 100%);
	}

	.particle-layer {
		pointer-events: none;
		position: absolute;
		inset: 0;
		overflow: hidden;
		z-index: 1;
	}

	.bg-dot {
		position: absolute;
		display: block;
		bottom: -12vh;
		height: 0.28rem;
		width: 0.28rem;
		border-radius: 9999px;
		transform-origin: center;
		will-change: transform, opacity;
		background: radial-gradient(
			circle at 35% 35%,
			rgb(255 255 255 / 98%) 0%,
			rgb(236 244 255 / 88%) 38%,
			rgb(255 255 255 / 0%) 100%
		);
		box-shadow:
			0 0 10px rgb(255 255 255 / 28%),
			0 0 20px rgb(112 189 255 / 16%);
		opacity: var(--bg-dot-opacity, 0.6);
	}

	.bg-dot--sm {
		height: 0.18rem;
		width: 0.18rem;
	}

	.bg-dot--md {
		height: 0.28rem;
		width: 0.28rem;
	}

	.bg-dot--lg {
		height: 0.42rem;
		width: 0.42rem;
	}

	.auth-content {
		position: relative;
		z-index: 2;
		width: min(100%, 35rem);
	}

	.auth-locale-switcher {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 3;
	}

	@keyframes -global-bg-rise {
		0% {
			transform: translate3d(0, 0, 0) scale(0.35);
			opacity: 0;
		}
		12% {
			opacity: var(--bg-dot-opacity, 0.6);
		}
		55% {
			transform: translate3d(calc(var(--bg-dot-rise-x, 0vw) * 0.55), -58vh, 0) scale(0.92);
			opacity: calc(var(--bg-dot-opacity, 0.6) * 0.92);
		}
		100% {
			transform: translate3d(var(--bg-dot-rise-x, 0vw), -120vh, 0) scale(1.08);
			opacity: 0;
		}
	}

	@keyframes -global-bg-shimmer {
		0%,
		100% {
			opacity: calc(var(--bg-dot-opacity, 0.6) * 0.72);
		}
		52% {
			opacity: var(--bg-dot-opacity, 0.6);
		}
	}
</style>
