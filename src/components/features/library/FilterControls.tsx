'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function FilterControls() {
  const {
    filterTheme,
    filterTags,
    availableThemes,
    availableTags,
    setFilterTheme,
    addFilterTag,
    removeFilterTag,
    resetFilters,
  } = useStore((state) => ({
    filterTheme: state.library.filterTheme,
    filterTags: state.library.filterTags,
    availableThemes: state.library.availableThemes,
    availableTags: state.library.availableTags,
    setFilterTheme: state.library.setFilterTheme,
    addFilterTag: state.library.addFilterTag,
    removeFilterTag: state.library.removeFilterTag,
    resetFilters: state.library.resetFilters,
  }));

  const handleTagChange = (tag: string, checked: boolean | 'indeterminate') => {
    if (checked === true) {
      addFilterTag(tag);
    } else {
      removeFilterTag(tag);
    }
  };

  const handleThemeChange = (theme: string) => {
      setFilterTheme(theme === "all-themes" ? null : theme);
  };

  const hasActiveFilters = filterTheme || filterTags.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-medium">絞り込み</CardTitle>
         {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-auto px-2 py-1">
                  フィルターをリセット
              </Button>
         )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Theme Filter */}
        <div>
          <Label htmlFor="themeFilter" className="mb-2 block text-sm font-medium">テーマ / 科目</Label>
          <Select value={filterTheme ?? "all-themes"} onValueChange={handleThemeChange}>
             <SelectTrigger id="themeFilter">
                <SelectValue placeholder="テーマを選択" />
             </SelectTrigger>
             <SelectContent>
                <SelectItem value="all-themes">すべてのテーマ</SelectItem>
                {availableThemes.map((theme) => (
                     <SelectItem key={theme} value={theme}>
                         {theme}
                     </SelectItem>
                ))}
             </SelectContent>
          </Select>
        </div>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <div>
            <Label className="mb-2 block text-sm font-medium">タグ</Label>
            <ScrollArea className="h-40 rounded-md border p-3"> {/* Adjust height */}
              <div className="space-y-2">
                {availableTags.sort().map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={filterTags.includes(tag)}
                      onCheckedChange={(checked) => handleTagChange(tag, checked)}
                    />
                    <Label htmlFor={`tag-${tag}`} className="text-sm font-normal cursor-pointer">
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
