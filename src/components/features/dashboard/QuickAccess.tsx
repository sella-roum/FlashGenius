import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Boxes, PlusSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function QuickAccess() {
  return (
    <Card>
        <CardContent className="pt-6">
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button asChild variant="outline" size="lg" className="justify-start gap-3 h-auto py-4">
                    <Link href="/generate">
                        <PlusSquare className="h-5 w-5" />
                         <div>
                             <p className="font-semibold">新しいセットを生成</p>
                             <p className="text-sm text-muted-foreground text-left">テキスト、URL、ファイルからカードを作成</p>
                         </div>
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="justify-start gap-3 h-auto py-4">
                    <Link href="/library">
                        <Boxes className="h-5 w-5" />
                         <div>
                             <p className="font-semibold">ライブラリを見る</p>
                             <p className="text-sm text-muted-foreground text-left">カードセットの表示と管理</p>
                         </div>
                    </Link>
                </Button>
             </div>
        </CardContent>
    </Card>
  );
}
