'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { AlertCircle, CheckCircle, FileText, LinkIcon, Type, UploadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export function InputArea() {
  const { inputType, inputValue, setInputType, setInputValue } = useStore((state) => ({
    inputType: state.generate.inputType,
    inputValue: state.generate.inputValue,
    setInputType: state.generate.setInputType,
    setInputValue: state.generate.setInputValue,
  }));
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setFileError(null); // Clear previous errors
      setFileName(null);

       if (rejectedFiles.length > 0) {
           const firstError = rejectedFiles[0].errors[0];
           let errorMessage = 'ファイルのアップロードに失敗しました。';
           if (firstError.code === 'file-too-large') {
               errorMessage = `ファイルサイズが大きすぎます。最大サイズは${MAX_FILE_SIZE_MB}MBです。`;
           } else if (firstError.code === 'file-invalid-type') {
                errorMessage = '無効なファイルタイプです。TXT, MD, PDF, JPG, PNG, または WEBP をアップロードしてください。';
           } else {
               errorMessage = firstError.message || 'ファイルのアップロードに失敗しました。';
           }
           setFileError(errorMessage);
           toast({ variant: 'destructive', title: 'ファイルエラー', description: errorMessage });
           setInputValue(null); // Clear input value on error
           return;
       }


      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setInputType('file');
        setInputValue(file);
        setFileName(file.name);
         toast({ title: 'ファイル受理', description: `${file.name} の処理準備ができました。` });
      }
    },
    [setInputType, setInputValue, toast] // Removed fileError from dependencies as it causes loop. Error is set inside.
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES.reduce((acc, mime) => ({ ...acc, [mime]: [] }), {}), // Format for react-dropzone
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
  });

  const handleTabChange = (value: string) => {
     const newType = value as 'file' | 'url' | 'text';
     setInputType(newType);
     // Reset input value when changing tabs unless switching back to 'file' and a file is selected
     if (newType !== 'file' || !fileName) {
         setInputValue(null);
         setFileName(null);
         setFileError(null);
     } else if (newType === 'file' && !(inputValue instanceof File)) {
        // If switching back to file tab but inputValue isn't a File, reset
         setInputValue(null);
         setFileName(null);
         setFileError(null);
     }
  };

   const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
   };

   const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
       setInputValue(e.target.value);
   };

  return (
    <Tabs defaultValue="text" onValueChange={handleTabChange} value={inputType ?? 'text'}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="file"><UploadCloud className="mr-1 h-4 w-4"/>ファイル</TabsTrigger>
        <TabsTrigger value="url"><LinkIcon className="mr-1 h-4 w-4"/>URL</TabsTrigger>
        <TabsTrigger value="text"><Type className="mr-1 h-4 w-4"/>テキスト</TabsTrigger>
      </TabsList>
      <TabsContent value="file" className="mt-4">
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-input'
          } ${fileError ? 'border-destructive' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
             {fileName ? (
                <>
                 <CheckCircle className="w-10 h-10 mb-3 text-green-500" />
                 <p className="mb-2 text-sm font-semibold">{fileName}</p>
                 <p className="text-xs text-muted-foreground">クリックまたはドラッグしてファイルを置き換え</p>
                 </>
             ) : fileError ? (
                  <>
                    <AlertCircle className="w-10 h-10 mb-3 text-destructive" />
                    <p className="mb-2 text-sm text-destructive">{fileError}</p>
                    <p className="text-xs text-muted-foreground">クリックまたはドラッグしてファイルをアップロード</p>
                   </>
             ) : isDragActive ? (
                  <>
                    <UploadCloud className="w-10 h-10 mb-3 text-primary" />
                    <p className="mb-2 text-sm text-primary">ここにファイルをドロップ...</p>
                   </>
             ) : (
                  <>
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">クリックしてアップロード</span> またはドラッグ＆ドロップ
                    </p>
                    <p className="text-xs text-muted-foreground">TXT, MD, PDF, JPG, PNG, WEBP (最大 {MAX_FILE_SIZE_MB}MB)</p>
                  </>
             )}

          </div>
        </div>
      </TabsContent>
      <TabsContent value="url" className="mt-4 space-y-2">
         <p className="text-sm text-muted-foreground">公開URL（例：ブログ記事、ニュース記事）を入力してください。</p>
        <Input
          type="url"
          placeholder="https://example.com/article"
          value={typeof inputValue === 'string' && inputType === 'url' ? inputValue : ''}
          onChange={handleUrlChange}
        />
      </TabsContent>
      <TabsContent value="text" className="mt-4 space-y-2">
         <p className="text-sm text-muted-foreground">ここにテキストコンテンツを貼り付けてください。</p>
        <Textarea
          placeholder="メモ、講義の書き起こしなどを入力または貼り付け"
          rows={8}
          value={typeof inputValue === 'string' && inputType === 'text' ? inputValue : ''}
          onChange={handleTextChange}
        />
      </TabsContent>
    </Tabs>
  );
}
