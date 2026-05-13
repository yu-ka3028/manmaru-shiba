"use client"

import { Droplets, UtensilsCrossed, Music } from "lucide-react"
import { PawPrint } from "@/components/shiba-icons"

interface StatusItem {
  icon: React.ReactNode
  label: string
  value: string
  isWarning?: boolean
}

interface StatusSummaryProps {
  items: StatusItem[]
}

// 2x2グリッドのコンパクトなサマリー
export function StatusSummary({ items }: StatusSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-all ${
            item.isWarning
              ? "bg-warning/25 ring-2 ring-warning/40"
              : "bg-card shadow-sm shadow-primary/5"
          }`}
        >
          {/* まんまるアイコン */}
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
              item.isWarning 
                ? "bg-warning/80 text-card shadow-sm shadow-warning/20" 
                : "bg-gradient-to-br from-primary/15 to-accent/10 text-primary"
            }`}
          >
            {item.icon}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-muted-foreground leading-tight">{item.label}</span>
            <span
              className={`text-sm font-bold leading-tight ${
                item.isWarning ? "text-warning-foreground" : "text-foreground"
              }`}
            >
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function createDefaultStatusItems(): StatusItem[] {
  return [
    {
      icon: <Droplets className="h-4 w-4" />,
      label: "おしっこ",
      value: "2時間前",
      isWarning: false,
    },
    {
      icon: <Music className="h-4 w-4" />,
      label: "うんち",
      value: "5時間前",
      isWarning: true,
    },
    {
      icon: <PawPrint className="h-4 w-4" />,
      label: "散歩",
      value: "今日2回",
      isWarning: false,
    },
    {
      icon: <UtensilsCrossed className="h-4 w-4" />,
      label: "ごはん",
      value: "12:00",
      isWarning: false,
    },
  ]
}
