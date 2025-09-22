# DataRowItem Drag and Drop Implementation

This implementation adds drag and drop functionality to reorder DataRowItem components using the colored status bar as a drag handle.

## Features

- **Drag Handle**: The colored status bar (red/green/blue div) on the left side serves as the drag handle
- **Visual Feedback**: Items show visual feedback during drag operations (opacity changes, drop target highlighting)
- **Smooth Animations**: Transitions and hover effects for better UX
- **Immediate Updates**: Order changes are applied immediately upon drop

## Usage

### 1. Basic Setup

Import the required utilities and components:

```typescript
import DataRowItem from '$lib/components/UI/dashboard/DataRowItem.svelte';
import { createDragState, createDragHandlers, type DragState } from '$lib/utilities/dragAndDrop';
```

### 2. Component State

Set up the drag state and handlers:

```typescript
// Your device data array
let devices = $state([/* your devices */]);

// Drag state
let dragState: DragState = $state(createDragState());

function updateDragState(newState: Partial<DragState>) {
  dragState = { ...dragState, ...newState };
}

// Handle reordering
function handleDeviceReorder(newDevices: DeviceType[]) {
  devices = newDevices;
  // Optional: persist order to backend
}

// Create drag handlers
let dragHandlers = $derived(createDragHandlers(
  devices,
  handleDeviceReorder,
  dragState,
  updateDragState
));
```

### 3. Template Usage

Use DataRowItem with drag props:

```svelte
{#each devices as device, index (device.dev_eui)}
  <DataRowItem
    {device}
    isActive={/* your active status logic */}
    dragEnabled={true}
    dragIndex={index}
    isDragging={dragState.draggedIndex === index}
    isDropTarget={dragState.dropTargetIndex === index}
    onDragStart={dragHandlers.handleDragStart}
    onDragEnd={dragHandlers.handleDragEnd}
    onDragOver={dragHandlers.handleDragOver}
    onDrop={dragHandlers.handleDrop}
  />
{/each}
```

### 4. Container Components

#### DeviceCards.svelte

For list view with individual device cards:

```svelte
<DeviceCards
  {devices}
  viewType="list"
  enableDragAndDrop={true}
  onDevicesReorder={(newDevices) => {
    // Handle reordering
    devices = newDevices;
  }}
/>
```

#### AllDevices.svelte  

For grouped devices by location:

```svelte
<AllDevices
  {locations}
  {deviceActiveStatus}
  enableDragAndDrop={true}
  onDeviceReorder={(locationId, newDevices) => {
    // Handle reordering within location
    const location = locations.find(l => l.location_id === locationId);
    if (location) {
      location.cw_devices = newDevices;
    }
  }}
/>
```

## Props Reference

### DataRowItem Drag Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dragEnabled` | `boolean` | `false` | Enable/disable drag functionality |
| `dragIndex` | `number` | `undefined` | Index of item in the array |
| `isDragging` | `boolean` | `false` | Whether this item is being dragged |
| `isDropTarget` | `boolean` | `false` | Whether this item is a drop target |
| `onDragStart` | `function` | `undefined` | Drag start handler |
| `onDragEnd` | `function` | `undefined` | Drag end handler |
| `onDragOver` | `function` | `undefined` | Drag over handler |
| `onDrop` | `function` | `undefined` | Drop handler |

## Visual States

### Drag Handle
- **Normal**: Colored status bar with normal opacity
- **Hover**: Increased opacity and slight scale on hover (when drag enabled)
- **Dragging**: Grabbing cursor, scale animation

### Item States
- **Dragging**: 50% opacity
- **Drop Target**: Blue ring border and light blue background
- **Normal**: Default appearance

## Demo

See `src/lib/components/demo/DragDropDemo.svelte` for a working example.

## Technical Details

### Drag Data
- Uses `device.dev_eui` as the drag data identifier
- Effect allowed: `move`

### Event Handling
- Prevents default browser drag behavior
- Manages drag state through centralized handlers
- Updates arrays using immutable patterns

### Browser Compatibility
- Uses standard HTML5 Drag and Drop API
- Works in all modern browsers
- Fallback cursor states for better UX

## Customization

### Styling
The drag handle styling can be customized by modifying the classes in DataRowItem.svelte:

```svelte
<div
  class="absolute top-0 bottom-0 left-0 my-1 w-1.5 rounded-full opacity-70 transition-all duration-200"
  class:cursor-grab={dragEnabled}
  class:hover:scale-125={dragEnabled}
  <!-- Add your custom classes -->
>
```

### Persistence
Implement order persistence by adding backend calls in your reorder handlers:

```typescript
async function handleDeviceReorder(newDevices) {
  devices = newDevices;
  
  // Save order to backend
  await fetch('/api/devices/reorder', {
    method: 'POST',
    body: JSON.stringify({
      deviceOrder: newDevices.map(d => d.dev_eui)
    })
  });
}
```

## Troubleshooting

### Common Issues

1. **Drag not working**: Ensure `dragEnabled={true}` is set
2. **Visual feedback missing**: Check that drag state props are properly passed
3. **Order not updating**: Verify the reorder handler is updating the source array
4. **Performance issues**: Use proper key attributes in `{#each}` blocks

### Debug Tips

- Check browser console for drag event logs
- Verify drag state object updates
- Ensure unique keys for each item
- Test with browser dev tools drag simulation