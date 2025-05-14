<script lang="ts">
  let {
    text,
    href,
    iconPath,
    onClick
  } = $props<{
    text: string;
    href?: string;
    iconPath?: string;
    onClick?: () => void;
  }>();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = href;
    }
  };
</script>

<button
  type="button"
  onclick={handleClick}
  class="flex items-center justify-center gap-2 w-full px-3 py-1 rounded-md
         text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200
         focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:ring-offset-1
         dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-blue-300 dark:border-gray-600 dark:focus-visible:ring-blue-500
         transition-colors duration-200 text-sm font-medium"
  aria-label="View details"
>
  {text}
  <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d={iconPath} />
  </svg>
</button>
