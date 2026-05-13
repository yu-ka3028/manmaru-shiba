"use client"

import { Pencil, Trash2, UtensilsCrossed, Droplets, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CurlyTail, PawPrint } from "@/components/shiba-icons"

export type ActivityType = "walk" | "food" | "pee" | "poop"

interface TimelineItemProps {
  type: ActivityType
  title: string
  subtitle?: string
  person: string
  time: string
  isLatest?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

// 家族メンバーの色マッピング
const personColors: Record<string, string> = {
  "お母さん": "bg-rose-300",
  "お父さん": "bg-sky-300",
  "お姉ちゃん": "bg-amber-300",
  "お兄ちゃん": "bg-emerald-300",
}

const activityConfig: Record<ActivityType, { icon: React.ReactNode; bgClass: string }> = {
  walk: { 
    icon: <PawPrint className="h-4 w-4" />, 
    bgClass: "bg-gradient-to-br from-primary to-primary/80" 
  },
  food: { 
    icon: <UtensilsCrossed className="h-4 w-4" />, 
    bgClass: "bg-gradient-to-br from-accent to-accent/80" 
  },
  pee: { 
    icon: <Droplets className="h-4 w-4" />, 
    bgClass: "bg-gradient-to-br from-chart-3 to-chart-3/80" 
  },
  poop: { 
    icon: <Music className="h-4 w-4" />, 
    bgClass: "bg-gradient-to-br from-chart-5 to-chart-5/80" 
  },
}

export function TimelineItem({
  type,
  title,
  subtitle,
  person,
  time,
  isLatest = false,
  onEdit,
  onDelete,
}: TimelineItemProps) {
  const config = activityConfig[type]
  const personColor = personColors[person] || "bg-gray-300"
  
  return (
    <div className="relative flex gap-4 pb-7 last:pb-0 overflow-visible">
      {/* 最新エントリにはカード外（右上）に振り尻尾を表示 */}
      {isLatest && (
        <div className="absolute -top-4 right-0 z-20 translate-x-3">
          <CurlyTail className="h-11 w-11 text-primary drop-shadow-sm" animated />
        </div>
      )}
      
      {/* 縦線 - やわらかい点線風 */}
      <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/15 to-transparent" />
      
      {/* まんまるマーカー */}
      <div className="relative z-10 flex flex-col items-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgClass} text-card shadow-md shadow-primary/15 transition-transform hover:scale-110`}>
          {config.icon}
        </div>
      </div>

      {/* コンテンツカード - ふんわり角丸 */}
      <Card className="flex-1 p-4 border-0 bg-card shadow-sm shadow-primary/5 rounded-3xl overflow-hidden">
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* 時間と担当者 */}
            <div className="flex items-center gap-2">
              <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{time}</span>
              {/* 担当者アバター - 家族の輪とリンク */}
              <div className="flex items-center gap-1.5">
                <div className={`h-6 w-6 rounded-full ${personColor} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                  {person.charAt(0)}
                </div>
                <span className="text-xs text-muted-foreground">{person}</span>
              </div>
            </div>
            {/* タイトル */}
            <h3 className="mt-2 text-lg font-bold text-foreground">{title}</h3>
            {/* サブタイトル */}
            {subtitle && (
              <span className="inline-block mt-1 bg-secondary/80 px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground">{subtitle}</span>
            )}
          </div>

          {/* アクションボタン - 丸く */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              onClick={onEdit}
              aria-label="編集"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
              onClick={onDelete}
              aria-label="削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
