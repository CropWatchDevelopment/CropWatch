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
         text-white bg-sky-500 hover:bg-sky-600
         focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2
         dark:bg-sky-400 dark:hover:bg-sky-300 dark:text-gray-900 dark:focus-visible:ring-sky-300
         transition-colors duration-200"
  aria-label="View details"
>
  {text}
  <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d={iconPath} />
  </svg>
</button>
