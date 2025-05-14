
'use client';

import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; // Not used currently, but keep for potential future use
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  availableTags?: string[]; // For suggestions
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "タグを追加...",
  className,
  availableTags = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInputValue = e.target.value;
    setInputValue(newInputValue);
    if (newInputValue.trim() !== '' && availableTags.length > 0) {
      setPopoverOpen(true);
    } else {
      setPopoverOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
      setPopoverOpen(false); // Close popover on add
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
      setPopoverOpen(false);
    } else if (e.key === 'Escape') {
      setPopoverOpen(false);
    }
  };

  const addTag = (tagToAdd?: string) => {
    const newTag = (tagToAdd || inputValue).trim();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
    setPopoverOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const filteredSuggestions = availableTags.filter(
    (tag) =>
      tag.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(tag) // Don't suggest already added tags
  );
  
  useEffect(() => {
    if (inputValue.trim() === '' && popoverOpen) {
      setPopoverOpen(false);
    }
  }, [inputValue, popoverOpen]);


  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <div className={cn("flex flex-wrap items-center gap-2 rounded-md border border-input p-2 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring", className)}>
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={`${tag}を削除`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.trim() !== '' && filteredSuggestions.length > 0) {
                setPopoverOpen(true);
              }
            }}
            placeholder={value.length > 0 ? "" : placeholder} // Hide placeholder if tags exist for cleaner look
            className="h-auto flex-1 border-none p-0 shadow-none focus-visible:ring-0"
          />
        </PopoverAnchor>
      </div>
      {availableTags.length > 0 && ( // Only render PopoverContent if there are suggestions to show
        <PopoverContent 
            className="w-[--radix-popover-trigger-width] p-0" 
            onOpenAutoFocus={(e) => e.preventDefault()} // Prevent auto-focusing the popover content/input
        >
          <Command>
            {/* Optional: Add CommandInput here if you want search within suggestions, but might be redundant with main input */}
            {/* <CommandInput placeholder="タグを検索..." /> */}
            <CommandList>
              <CommandEmpty>{inputValue.trim() === '' ? "入力を開始して候補を表示" : "一致するタグがありません。"}</CommandEmpty>
              <CommandGroup>
                {filteredSuggestions.map((tag) => (
                  <CommandItem
                    key={tag}
                    value={tag}
                    onSelect={() => {
                      addTag(tag);
                    }}
                  >
                    {tag}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
