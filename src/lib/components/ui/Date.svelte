<script lang="ts">
function formatDate() {
  const currentDate = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const year = currentDate.getFullYear();
  const month = months[currentDate.getMonth()];
  const day = currentDate.getDate();
  const dayOfWeek = days[currentDate.getDay()];

  return `${year} ${month} ${day} ${dayOfWeek}`;
}
</script>
<!-- Main Container -->
    <div class="text-center mx-auto flex absolute top-0 left-28">
        <div class="flex justify-center px-6 py-1 rounded-b-lg bg-[#22402B] shadow-lg">
            <p class="text-surface-100 text-sm">{formatDate()}</p>
        </div>
    </div>