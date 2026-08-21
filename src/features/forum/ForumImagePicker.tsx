import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FORUM_IMAGE_ACCEPT, FORUM_IMAGE_BUDGET_LABEL } from '@/services/content/forum';

interface ForumImagePickerProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ForumImagePicker({
  id,
  file,
  onChange,
  disabled,
  compact,
}: ForumImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface-1 p-3',
        compact && 'p-2.5'
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={FORUM_IMAGE_ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onChange(event.currentTarget.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-meta font-medium text-foreground">Fotoğraf</p>
          <p className="truncate text-meta text-faint">
            {file
              ? file.name
              : `En fazla 1 görsel; ${FORUM_IMAGE_BUDGET_LABEL} içine optimize edilir.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {file && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Kaldır
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {file ? 'Değiştir' : 'Fotoğraf ekle'}
          </Button>
        </div>
      </div>
    </div>
  );
}
