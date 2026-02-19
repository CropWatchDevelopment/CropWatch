<script lang="ts">
	let { children } = $props();
</script>

<main class="auth-scene">
	<div class="scene-gradient"></div>
	<div class="scene-vignette"></div>
	<div class="particle-layer" aria-hidden="true">
		<span class="bg-dot bg-dot--lg bg-dot-a" style="left: 8%; top: 16%;"></span>
		<span class="bg-dot bg-dot--sm bg-dot-b" style="left: 16%; top: 58%;"></span>
		<span class="bg-dot bg-dot--md bg-dot-c" style="left: 26%; top: 34%;"></span>
		<span class="bg-dot bg-dot--sm bg-dot-d" style="left: 34%; top: 74%;"></span>
		<span class="bg-dot bg-dot--lg bg-dot-e" style="left: 43%; top: 24%;"></span>
		<span class="bg-dot bg-dot--md bg-dot-a" style="left: 55%; top: 64%;"></span>
		<span class="bg-dot bg-dot--sm bg-dot-c" style="left: 63%; top: 38%;"></span>
		<span class="bg-dot bg-dot--md bg-dot-d" style="left: 72%; top: 20%;"></span>
		<span class="bg-dot bg-dot--sm bg-dot-b" style="left: 81%; top: 56%;"></span>
		<span class="bg-dot bg-dot--lg bg-dot-e" style="left: 90%; top: 30%;"></span>
		<span class="bg-dot bg-dot--sm bg-dot-a" style="left: 22%; top: 86%;"></span>
		<span class="bg-dot bg-dot--md bg-dot-b" style="left: 76%; top: 82%;"></span>
	</div>
	<div class="scene-spark scene-spark--one"></div>

	<div class="auth-content">
		{@render children()}
	</div>
</main>

<style>
	.auth-scene {
		position: relative;
		display: flex;
		min-height: 100vh;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		padding: 2rem 1rem;
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
		background: radial-gradient(
			ellipse at center,
			rgb(11 20 48 / 0%) 36%,
			rgb(7 12 28 / 70%) 100%
		);
	}

	.particle-layer {
		pointer-events: none;
		position: absolute;
		inset: 0;
		overflow: hidden;
		z-index: 1;
	}

	.scene-spark {
		pointer-events: none;
		position: absolute;
		z-index: 1;
		height: 0.22rem;
		width: 0.22rem;
		border-radius: 9999px;
		background: rgb(72 220 170 / 90%);
		box-shadow:
			0 0 10px rgb(72 220 170 / 80%),
			0 0 20px rgb(72 220 170 / 40%);
		opacity: 0.75;
		animation: spark-drift 40s ease-in-out infinite !important;
	}

	.scene-spark--one {
		left: 16%;
		top: 40%;
	}

	.bg-dot {
		position: absolute;
		display: block;
		height: 0.33rem;
		width: 0.33rem;
		border-radius: 9999px;
		will-change: transform;
		background: radial-gradient(
			circle at 35% 35%,
			rgb(214 243 255 / 96%) 0%,
			rgb(122 212 255 / 68%) 45%,
			rgb(72 220 170 / 0%) 100%
		);
		box-shadow:
			0 0 9px rgb(122 212 255 / 54%),
			0 0 18px rgb(72 220 170 / 32%);
		opacity: 0.72;
	}

	.bg-dot--sm {
		height: 0.2rem;
		width: 0.2rem;
		opacity: 0.56;
	}

	.bg-dot--md {
		height: 0.28rem;
		width: 0.28rem;
		opacity: 0.62;
	}

	.bg-dot--lg {
		height: 0.42rem;
		width: 0.42rem;
		opacity: 0.83;
	}

	.bg-dot-a {
		animation: bg-drift-a 96s ease-in-out infinite !important;
	}

	.bg-dot-b {
		animation: bg-drift-b 114s ease-in-out infinite !important;
	}

	.bg-dot-c {
		animation: bg-drift-c 103s ease-in-out infinite !important;
	}

	.bg-dot-d {
		animation: bg-drift-d 122s ease-in-out infinite !important;
	}

	.bg-dot-e {
		animation: bg-drift-e 108s ease-in-out infinite !important;
	}

	.auth-content {
		position: relative;
		z-index: 2;
		width: min(100%, 24rem);
	}

	@keyframes bg-drift-a {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		18% {
			transform: translate3d(12vw, -10vh, 0);
		}
		37% {
			transform: translate3d(-19vw, 11vh, 0);
		}
		62% {
			transform: translate3d(21vw, -14vh, 0);
		}
		83% {
			transform: translate3d(-10vw, 17vh, 0);
		}
	}

	@keyframes bg-drift-b {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		14% {
			transform: translate3d(-15vw, 14vh, 0);
		}
		32% {
			transform: translate3d(18vw, -12vh, 0);
		}
		57% {
			transform: translate3d(-21vw, -8vh, 0);
		}
		78% {
			transform: translate3d(14vw, 18vh, 0);
		}
	}

	@keyframes bg-drift-c {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		20% {
			transform: translate3d(20vw, 9vh, 0);
		}
		46% {
			transform: translate3d(-16vw, -15vh, 0);
		}
		71% {
			transform: translate3d(9vw, 21vh, 0);
		}
	}

	@keyframes bg-drift-d {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		22% {
			transform: translate3d(-22vw, -9vh, 0);
		}
		44% {
			transform: translate3d(11vw, 18vh, 0);
		}
		69% {
			transform: translate3d(24vw, -14vh, 0);
		}
		86% {
			transform: translate3d(-13vw, 8vh, 0);
		}
	}

	@keyframes bg-drift-e {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		16% {
			transform: translate3d(17vw, -16vh, 0);
		}
		33% {
			transform: translate3d(-12vw, 14vh, 0);
		}
		58% {
			transform: translate3d(-24vw, -7vh, 0);
		}
		81% {
			transform: translate3d(19vw, 19vh, 0);
		}
	}

	@keyframes spark-drift {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
			opacity: 0.7;
		}
		50% {
			transform: translate3d(2vw, -2vh, 0);
			opacity: 1;
		}
	}
</style>
