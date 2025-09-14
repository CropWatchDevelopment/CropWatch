/**
 * Drag and Drop utilities for reordering lists
 */

export interface DragState {
	draggedIndex: number | null;
	draggedItem: any | null;
	dropTargetIndex: number | null;
}

export function createDragState(): DragState {
	return {
		draggedIndex: null,
		draggedItem: null,
		dropTargetIndex: null
	};
}

export function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
	if (fromIndex === toIndex) return array;

	const newArray = [...array];
	const item = newArray[fromIndex];

	// Remove the item from its current position
	newArray.splice(fromIndex, 1);

	// Insert the item at the new position
	newArray.splice(toIndex, 0, item);

	return newArray;
}

export function createDragHandlers<T>(
	items: T[],
	onReorder: (newItems: T[]) => void,
	dragState: DragState,
	updateDragState: (newState: Partial<DragState>) => void
) {
	return {
		handleDragStart: (event: DragEvent, index: number) => {
			console.log('Drag start:', index, items[index]);
			updateDragState({
				draggedIndex: index,
				draggedItem: items[index],
				dropTargetIndex: null
			});
		},

		handleDragEnd: (event: DragEvent) => {
			const { draggedIndex, dropTargetIndex } = dragState;
			console.log('Drag end:', { draggedIndex, dropTargetIndex });

			if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
				console.log('Reordering from', draggedIndex, 'to', dropTargetIndex);
				const reorderedItems = reorderArray(items, draggedIndex, dropTargetIndex);
				onReorder(reorderedItems);
			}

			updateDragState({
				draggedIndex: null,
				draggedItem: null,
				dropTargetIndex: null
			});
		},

		handleDragOver: (event: DragEvent, index: number) => {
			event.preventDefault();
			console.log('Drag over:', index);
			updateDragState({
				dropTargetIndex: index
			});
		},

		handleDrop: (event: DragEvent, index: number) => {
			event.preventDefault();
			console.log('Drop on:', index);
			updateDragState({
				dropTargetIndex: index
			});
		}
	};
}
