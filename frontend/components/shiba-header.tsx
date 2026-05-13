"use client"

import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShibaFace } from "@/components/shiba-icons"

interface ShibaHeaderProps {
  dogName?: string
  familyMembers?: string[]
  onSettingsClick?: () => void
}

// 家族メンバーの色
const memberColors = [
  "bg-rose-300",
  "bg-sky-300", 
  "bg-amber-300",
  "bg-emerald-300",
]

export function ShibaHeader({ 
  dogName = "コタロウ", 
  familyMembers = ["お母さん", "お父さん", "お姉ちゃん"],
  onSettingsClick 
}: ShibaHeaderProps) {
  return (
    <header className="relative pt-6 pb-4">
      {/* 設定ボタン */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        onClick={onSettingsClick}
        aria-label="設定"
      >
        <Settings className="h-5 w-5" />
      </Button>

      {/* アプリ名 */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          まんまる<span className="text-primary">しば</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">みんなでお世話、みんなでつながる</p>
      </div>
    </header>
  )
}

// 柴犬と家族の輪のコンポーネント（サマリーと横並びにする用）
interface FamilyCircleProps {
  dogName?: string
  familyMembers?: string[]
}

export function FamilyCircle({ 
  dogName = "コタロウ", 
  familyMembers = ["お母さん", "お父さん", "お姉ちゃん"] 
}: FamilyCircleProps) {
  return (
    <div className="flex flex-col items-center">
      {/* 柴犬を中心に家族が輪になる */}
      <div className="relative h-28 w-28">
        {/* 家族メンバーの輪 */}
        {familyMembers.map((member, index) => {
          const angle = (index * (360 / familyMembers.length) - 90) * (Math.PI / 180)
          const radius = 44
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          
          return (
            <div
              key={member}
              className={`absolute flex h-8 w-8 items-center justify-center rounded-full ${memberColors[index % memberColors.length]} text-[10px] font-bold text-white shadow-md border-2 border-card`}
              style={{
                left: `calc(50% + ${x}px - 16px)`,
                top: `calc(50% + ${y}px - 16px)`,
              }}
              title={member}
            >
              {member.charAt(0)}
            </div>
          )
        })}
        
        {/* 中心の柴犬 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent p-1.5 shadow-lg shadow-primary/20">
          <ShibaFace className="h-11 w-11 text-card" />
          {/* ハイライト */}
          <div className="absolute top-1.5 left-2.5 h-2.5 w-2.5 rounded-full bg-white/40" />
        </div>
      </div>

      {/* 犬の名前 */}
      <span className="mt-2 text-sm font-bold text-foreground">{dogName}</span>
    </div>
  )
}

export { memberColors }
