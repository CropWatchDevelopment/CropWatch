<script lang="ts">
	import moment from 'moment';
</script>

<!-- Main Container -->
<div class="flex w-screen text-center absolute top-0 left-28">
	<div class="flex justify-center px-6 py-1 rounded-b-lg bg-[#22402B] shadow-lg">
		<p class="text-surface-100 text-sm">{moment().format('YYYY MMM DD dd').toString()}</p>
	</div>
</div>
