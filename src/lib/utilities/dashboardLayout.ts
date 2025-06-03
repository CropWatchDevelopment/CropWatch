/**
 * Dashboard layout utility functions
 */

/**
 * Gets the CSS class for the container based on the view type
 * @param viewType - The view type (grid, mozaic, list)
 * @returns CSS class string
 */
export function getContainerClass(viewType: string): string {
  switch (viewType) {
    case 'grid':
      return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
    case 'mozaic':
      return 'columns-[20rem] gap-4 space-y-4';
    case 'list':
      return 'flex flex-col gap-4';
    default:
      return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
  }
}

/**
 * Handles keyboard navigation for location selection
 * @param e - Keyboard event
 * @param location - The location
 * @param selectCallback - Function to handle location selection
 */
export function handleKeyDown(
  e: KeyboardEvent, 
  location: any, 
  selectCallback: (location: any) => void
): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectCallback(location);
  }
}
