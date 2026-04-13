"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GitBranch, Plus, Check, ChevronDown, X } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface BranchSelectorProps {
  currentBranch: string;
  branches: string[];
  onSwitchBranch: (branch: string) => void;
  onCreateBranch?: (name: string) => void;
  disabled?: boolean;
  language?: AppLanguage;
  className?: string;
}

// ============================================================
// PART 2 — Create Branch Modal
// ============================================================

interface CreateBranchModalProps {
  language: AppLanguage;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  language,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim().replace(/\s+/g, '-').toLowerCase();
    if (!trimmed) return;
    onConfirm(`universe/${trimmed}`);
  }, [name, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
      if (e.key === 'Escape') onCancel();
    },
    [handleSubmit, onCancel],
  );

  return (
    <div
      className="absolute left-0 top-full mt-1 w-56 bg-bg-secondary border border-border
        rounded-xl shadow-lg p-2 z-[var(--z-dropdown)]"
    >
      <div className="text-[10px] text-text-tertiary font-serif px-1 mb-1">
        {L4(language, {
          ko: '새 브랜치 (우주) 생성',
          en: 'Create new branch (universe)',
        })}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-text-tertiary font-mono shrink-0">
          universe/
        </span>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={L4(language, {
            ko: '이름 입력',
            en: 'Enter name',
          })}
          className="flex-1 min-w-0 bg-bg-tertiary/50 text-xs text-text-primary
            border border-border rounded-lg px-2 py-1 font-mono
            outline-none focus-visible:ring-2 ring-accent-blue
            placeholder:text-text-tertiary/50"
        />
      </div>
      <div className="flex items-center justify-end gap-1 mt-2">
        <button
          onClick={onCancel}
          className="px-2 py-1 text-[10px] text-text-tertiary
            hover:text-text-primary hover:bg-bg-tertiary rounded-lg
            transition-colors min-h-[28px]"
        >
          {L4(language, { ko: '취소', en: 'Cancel' })}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="px-2 py-1 text-[10px] text-accent-amber font-semibold
            hover:bg-accent-amber/10 rounded-lg transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed min-h-[28px]"
        >
          {L4(language, { ko: '생성', en: 'Create' })}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// PART 3 — BranchSelector Main Component
// ============================================================

const BranchSelector: React.FC<BranchSelectorProps> = ({
  currentBranch = 'main',
  branches,
  onSwitchBranch,
  onCreateBranch,
  disabled = false,
  language = 'KO',
  className = '',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Close dropdown on outside click */
  useEffect(() => {
    if (!dropdownOpen && !creating) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, creating]);

  const handleSelect = useCallback(
    (branch: string) => {
      if (branch !== currentBranch) {
        onSwitchBranch(branch);
      }
      setDropdownOpen(false);
    },
    [currentBranch, onSwitchBranch],
  );

  const handleCreateConfirm = useCallback(
    (name: string) => {
      onCreateBranch?.(name);
      setCreating(false);
      setDropdownOpen(false);
    },
    [onCreateBranch],
  );

  // Disabled state (no Git connection)
  if (disabled) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg
          bg-bg-tertiary/50 border border-border text-text-tertiary
          opacity-60 cursor-not-allowed ${className}`}
        title={L4(language, {
          ko: 'Git 연동 후 사용 가능',
          en: 'Available after Git connection',
        })}
      >
        <GitBranch className="w-3 h-3 shrink-0" />
        <span className="text-[11px] font-mono truncate max-w-[100px]">
          {currentBranch}
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg
          bg-bg-tertiary/50 border border-border text-text-primary
          hover:bg-bg-tertiary transition-colors cursor-pointer"
      >
        <GitBranch className="w-3 h-3 shrink-0 text-accent-amber" />
        <span className="text-[11px] font-mono truncate max-w-[100px]">
          {currentBranch}
        </span>
        <ChevronDown className={`w-3 h-3 shrink-0 text-text-tertiary
          transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
        />
        {onCreateBranch && (
          <button
            className="ml-auto w-5 h-5 flex items-center justify-center
              rounded hover:bg-accent-amber/10 transition-colors"
            title={L4(language, { ko: '새 브랜치', en: 'New branch' })}
            onClick={(e) => {
              e.stopPropagation();
              setCreating(true);
              setDropdownOpen(false);
            }}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* Dropdown list */}
      {dropdownOpen && (
        <div
          className="absolute left-0 top-full mt-1 w-48 bg-bg-secondary border border-border
            rounded-xl shadow-lg py-1 z-[var(--z-dropdown)] max-h-[200px] overflow-y-auto
            scrollbar-thin"
        >
          {branches.map((br) => (
            <button
              key={br}
              onClick={() => handleSelect(br)}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-left
                text-[11px] font-mono transition-colors min-h-[32px]
                ${br === currentBranch
                  ? 'text-accent-amber bg-accent-amber/5'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
            >
              <GitBranch className="w-3 h-3 shrink-0" />
              <span className="truncate">{br}</span>
              {br === currentBranch && (
                <Check className="w-3 h-3 ml-auto shrink-0 text-accent-amber" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create branch modal */}
      {creating && (
        <CreateBranchModal
          language={language}
          onConfirm={handleCreateConfirm}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
};

export default BranchSelector;
