import React, { useState, useEffect } from 'react';
import type { Item, ItemType, NoteItem, FileItem, LinkItem } from '../../types/item';
import { NoteEditorForm } from './NoteEditorForm';
import { FileEditorForm } from './FileEditorForm';
import { LinkEditorForm } from './LinkEditorForm';
import type { CommonEditorMeta } from './types';

export interface EditorFormProps {
  initialItem?: Item;
  isEditing?: boolean;
  defaultType?: ItemType;
}

export const EditorForm: React.FC<EditorFormProps> = ({
  initialItem,
  isEditing = false,
  defaultType = 'note',
}) => {
  const [type, setType] = useState<ItemType>(initialItem?.type || defaultType);

  useEffect(() => {
    if (!isEditing && defaultType && !initialItem) {
      setType(defaultType);
    }
  }, [defaultType, isEditing, initialItem]);

  const [commonMeta, setCommonMeta] = useState<CommonEditorMeta>(() => ({
    title: initialItem?.title || '',
    tags: Array.from(new Set(initialItem?.tags || [])),
    collections: Array.from(new Set(initialItem?.collections || [])),
    isPinned: initialItem?.isPinned || false,
    keepLong: initialItem ? initialItem.status === 'saved' : true,
  }));

  const handleCommonMetaChange = (updates: Partial<CommonEditorMeta>) => {
    setCommonMeta((prev) => ({ ...prev, ...updates }));
  };

  if (type === 'file') {
    return (
      <FileEditorForm
        initialItem={initialItem?.type === 'file' ? (initialItem as FileItem) : undefined}
        isEditing={isEditing}
        commonMeta={commonMeta}
        onCommonMetaChange={handleCommonMetaChange}
        onTypeChange={isEditing ? undefined : setType}
      />
    );
  }

  if (type === 'link') {
    return (
      <LinkEditorForm
        initialItem={initialItem?.type === 'link' ? (initialItem as LinkItem) : undefined}
        isEditing={isEditing}
        commonMeta={commonMeta}
        onCommonMetaChange={handleCommonMetaChange}
        onTypeChange={isEditing ? undefined : setType}
      />
    );
  }

  return (
    <NoteEditorForm
      initialItem={initialItem?.type === 'note' ? (initialItem as NoteItem) : undefined}
      isEditing={isEditing}
      commonMeta={commonMeta}
      onCommonMetaChange={handleCommonMetaChange}
      onTypeChange={isEditing ? undefined : setType}
    />
  );
};
