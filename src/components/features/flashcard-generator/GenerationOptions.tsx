'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useStore } from '@/lib/store';
import type { GenerationOptions as GenOptionsType } from '@/types';

export function GenerationOptions() {
  const { options, setOptions } = useStore((state) => ({
    options: state.generate.generationOptions,
    setOptions: state.generate.setGenerationOptions,
  }));

   const handleOptionChange = <K extends keyof GenOptionsType>(
     key: K,
     value: GenOptionsType[K]
   ) => {
     setOptions({ [key]: value });
   };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cardType" className="mb-2 block">カードタイプ</Label>
        <RadioGroup
            id="cardType"
            value={options.cardType}
            onValueChange={(value) => handleOptionChange('cardType', value as GenOptionsType['cardType'])}
            className="flex space-x-4"
        >
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="term-definition" id="type-term"/>
                <Label htmlFor="type-term">用語/定義</Label>
            </div>
             <div className="flex items-center space-x-2">
                <RadioGroupItem value="qa" id="type-qa" />
                <Label htmlFor="type-qa">Q &amp; A</Label>
             </div>
             {/* Add more types as needed */}
              {/* <div className="flex items-center space-x-2">
                 <RadioGroupItem value="image-description" id="type-image" />
                 <Label htmlFor="type-image">画像説明</Label>
              </div> */}
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="language">言語</Label>
        <Select
            value={options.language}
            onValueChange={(value) => handleOptionChange('language', value)}
        >
          <SelectTrigger id="language">
            <SelectValue placeholder="言語を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">英語</SelectItem>
            <SelectItem value="Japanese">日本語</SelectItem>
            <SelectItem value="Spanish">スペイン語</SelectItem>
            <SelectItem value="French">フランス語</SelectItem>
            <SelectItem value="German">ドイツ語</SelectItem>
            {/* Add more languages */}
          </SelectContent>
        </Select>
      </div>

      {/* Add more options here (e.g., desired number of cards, difficulty) */}
      {/* Example:
      <div>
        <Label htmlFor="cardCount">おおよそのカード数</Label>
        <Input
          id="cardCount"
          type="number"
          min="5"
          max="100"
          placeholder="例: 20"
          // value={options.count || ''}
          // onChange={(e) => handleOptionChange('count', parseInt(e.target.value) || undefined)}
        />
      </div>
      */}
    </div>
  );
}
