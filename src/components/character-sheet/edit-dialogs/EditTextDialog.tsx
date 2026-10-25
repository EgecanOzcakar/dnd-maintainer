import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { ModalFooter } from './ModalFooter';
import { useDirtyClose } from './useDirtyClose';

export function EditTextDialog({
  title,
  field,
  value,
  onSave,
  onClose,
  saving,
}: {
  title: string;
  field: string;
  value: string;
  onSave: (updates: Record<string, string>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [text, setText] = useState(value);
  const { requestClose, prompt } = useDirtyClose(text !== value, onClose);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} autoFocus />
        {prompt ?? <ModalFooter onSave={() => onSave({ [field]: text })} onCancel={requestClose} saving={saving} />}
      </DialogContent>
    </Dialog>
  );
}
