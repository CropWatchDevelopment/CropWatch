<script lang="ts">
	import moment from 'moment';
</script>

<!-- Main Container -->
<div class="flex w-full text-center justify-center">
	<div class="flex justify-center px-6 py-1 rounded-b-lg bg-[#22402B] shadow-lg">
		<p class="text-surface-100 text-sm">{moment().format('YYYY MMM DD dd').toString()}</p>
	</div>
</div>
