'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ExerciseSlotInput, { Slot } from './ExerciseSlotInput';

export default function SortableExerciseSlot({
  index,
  slot,
  onChange,
  onRemove,
  removable,
}: {
  index: number;
  slot: Slot;
  onChange: (patch: Partial<Slot>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseSlotInput
        index={index}
        slot={slot}
        onChange={onChange}
        onRemove={onRemove}
        removable={removable}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}
