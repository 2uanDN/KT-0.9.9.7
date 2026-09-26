import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseEditorLayout } from './BaseEditorLayout';
import { BodyEditor } from './BodyEditor';
import { InsertSheet } from '../sheets/InsertSheet';
import { itemService } from '../../services/ItemService';
import type { NoteItem, EmbedRef, ItemType } from '../../types/item';
import type { CommonEditorMeta } from './types';

export interface NoteEditorFormProps {
  initialItem?: NoteItem;
  isEditing?: boolean;
  commonMeta: CommonEditorMeta;
  onCommonMetaChange: (updates: Partial<CommonEditorMeta>) => void;
  onTypeChange?: (type: ItemType) => void;
}

export const NoteEditorForm: React.FC<NoteEditorFormProps> = ({
  initialItem,
  isEditing = false,
  commonMeta,
  onCommonMetaChange,
  onTypeChange,
}) => {
  const navigate = useNavigate();

  // Note-specific state
  const [noteBody, setNoteBody] = useState(initialItem?.body || '');
  const [embeds, setEmbeds] = useState<EmbedRef[]>(initialItem?.embeds || []);
  const [showInsertSheet, setShowInsertSheet] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isDirty = Boolean(
    commonMeta.title !== (initialItem?.title || '') ||
    noteBody !== (initialItem?.body || '') ||
    commonMeta.tags.join(',') !== (initialItem?.tags || []).join(',') ||
    commonMeta.collections.join(',') !== (initialItem?.collections || []).join(',') ||
    commonMeta.isPinned !== (initialItem?.isPinned || false) ||
    commonMeta.keepLong !== (initialItem ? initialItem.status === 'saved' : true) ||
    embeds.length !== (initialItem?.embeds?.length || 0)
  );

  const canSubmit = !isSubmitting && Boolean(noteBody.trim() || commonMeta.title.trim());

  const handleInsertWikiLink = (target: string, alias?: string) => {
    const linkSyntax = alias ? `[[${target}|${alias}]]` : `[[${target}]]`;
    setNoteBody((prev) => prev + `\n${linkSyntax}\n`);
  };

  const handleInsertEmbed = (embed: EmbedRef) => {
    setEmbeds((prev) => [...prev, embed]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (isEditing && initialItem) {
        const baseUpdates = {
          title: commonMeta.title.trim() || undefined,
          tags: commonMeta.tags,
          collections: commonMeta.collections,
          isPinned: commonMeta.isPinned,
          status: commonMeta.keepLong ? ('saved' as const) : ('inbox' as const),
          savedAt: commonMeta.keepLong ? initialItem.savedAt || Date.now() : null,
        };

        await itemService.updateItem(initialItem.id, {
          ...baseUpdates,
          body: noteBody,
          embeds,
        });

        navigate(`/items/${initialItem.id}`, { replace: true });
      } else {
        await itemService.createItem(
          {
            type: 'note',
            title: commonMeta.title.trim() || undefined,
            tags: commonMeta.tags,
            collections: commonMeta.collections,
            isPinned: commonMeta.isPinned,
            body: noteBody,
            embeds,
          },
          commonMeta.keepLong
        );

        const destination = commonMeta.keepLong ? '/' : '/inbox';
        navigate(destination, { replace: true });
      }
    } catch (err: unknown) {
      console.error('Failed to save note item:', err);
      setFormError((err as Error)?.message || 'Không thể lưu ghi chú. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  return (
    <BaseEditorLayout
      title={isEditing ? 'Chỉnh sửa tri thức' : 'Lưu tri thức mới'}
      selectedType="note"
      isEditing={isEditing}
      onTypeChange={onTypeChange}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
      formError={formError}
      tags={commonMeta.tags}
      onTagsChange={(tags) => onCommonMetaChange({ tags })}
      collections={commonMeta.collections}
      onCollectionsChange={(collections) => onCommonMetaChange({ collections })}
      isPinned={commonMeta.isPinned}
      onPinChange={(isPinned) => onCommonMetaChange({ isPinned })}
      keepLong={commonMeta.keepLong}
      onKeepLongChange={(keepLong) => onCommonMetaChange({ keepLong })}
    >
      <div className="space-y-3">
        <div>
          <label className="type-label-code-bold text-[#3D4A5C] mb-1 block">
            Tiêu đề (Tùy chọn — tự động lấy từ dòng đầu)
          </label>
          <input
            type="text"
            value={commonMeta.title}
            onChange={(e) => onCommonMetaChange({ title: e.target.value })}
            placeholder="Nhập tiêu đề hoặc để trống..."
            className="w-full px-3 py-2 border border-[#3D4A5C] rounded-lg text-sm bg-[#FFFFFF] text-[#1B1B1B] placeholder-[#75777D] shadow-hard-xs focus:ring-2 focus:ring-[#3D4A5C] focus:outline-none"
          />
        </div>

        <div>
          <label className="type-label-code-bold text-[#3D4A5C] mb-1 block">
            Nội dung Ghi chú
          </label>
          <BodyEditor
            value={noteBody}
            onChange={setNoteBody}
            onOpenInsertSheet={() => setShowInsertSheet(true)}
          />
        </div>
      </div>

      <InsertSheet
        isOpen={showInsertSheet}
        onClose={() => setShowInsertSheet(false)}
        onInsertWikiLink={handleInsertWikiLink}
        onInsertEmbed={handleInsertEmbed}
        currentNoteId={initialItem?.id}
      />
    </BaseEditorLayout>
  );
};
