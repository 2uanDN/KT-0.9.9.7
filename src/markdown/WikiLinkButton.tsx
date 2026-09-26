/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { resolveWikiLink } from './wikilink-resolver';
import { toastStore } from '../store/toastStore';

export interface WikiLinkButtonProps {
  target: string;
  alias: string;
  onOpenItem: (id: string) => void;
}

export const WikiLinkButton: React.FC<WikiLinkButtonProps> = React.memo(({
  target,
  alias,
  onOpenItem,
}) => {
  const [isResolving, setIsResolving] = useState(false);

  const handleClick = async () => {
    if (isResolving) return;
    setIsResolving(true);

    try {
      const resolved = await resolveWikiLink(target);
      if (resolved) {
        onOpenItem(resolved.id);
      } else {
        toastStore.show(`Không tìm thấy mục tri thức: "${target}"`);
      }
    } catch (err) {
      console.error('Lỗi khi mở liên kết WikiLink:', err);
      toastStore.show(`Không thể mở mục: "${target}"`);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isResolving}
      aria-busy={isResolving}
      onClick={(e) => {
        e.stopPropagation();
        void handleClick();
      }}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FAF9F7] text-[#3D4A5C] hover:text-[#1B1B1B] hover:border-[#1B1B1B] rounded-xs text-[12px] font-mono font-bold transition cursor-pointer border border-[#3D4A5C] shadow-hard-xs press-xs ${
        isResolving ? 'opacity-70 cursor-wait' : ''
      }`}
      title={`Mở: ${target}`}
    >
      {isResolving ? (
        <span className="w-3 h-3 border-2 border-[#3D4A5C] border-t-transparent rounded-full animate-spin inline-block" />
      ) : (
        <span className="material-symbols-outlined text-[13px]">link</span>
      )}
      <span>{alias}</span>
    </button>
  );
});

WikiLinkButton.displayName = 'WikiLinkButton';
