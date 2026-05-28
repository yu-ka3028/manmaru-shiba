"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLiff } from "@/hooks/use-liff"
import { ShibaHeader, FamilyCircle } from "@/components/shiba-header"
import { StatusSummary, createDefaultStatusItems } from "@/components/status-summary"
import { TimelineItem, type ActivityType } from "@/components/timeline-card"
import { Plus, PencilLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PawPrint } from "@/components/shiba-icons"
import { api } from "@/lib/api"

interface CareRecord {
  id: number
  care_type: string
  recorded_at: string
  user_name: string
}

interface TimelineEntry {
  id: string
  type: ActivityType
  title: string
  subtitle?: string
  person: string
  time: string
}

const CARE_TYPE_MAP: Record<string, { type: ActivityType; title: string; subtitle?: string }> = {
  pee:        { type: "pee",  title: "おしっこ" },
  poop:       { type: "poop", title: "うんち" },
  meal:       { type: "food", title: "ごはん" },
  walk_short: { type: "walk", title: "散歩", subtitle: "ショートコース" },
  walk_long:  { type: "walk", title: "散歩", subtitle: "ロングコース" },
}

function toTimelineEntry(record: CareRecord): TimelineEntry {
  const config = CARE_TYPE_MAP[record.care_type] ?? { type: "pee" as ActivityType, title: record.care_type }
  const time = new Date(record.recorded_at).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return {
    id: String(record.id),
    type: config.type,
    title: config.title,
    subtitle: config.subtitle,
    person: record.user_name,
    time,
  }
}

export default function ShibaCareTimeline() {
  const router = useRouter()
  const { isLoading: liffLoading, isInClient, accessToken, error: liffError } = useLiff()
  const statusItems = createDefaultStatusItems()

  const [records, setRecords] = useState<TimelineEntry[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dogName, setDogName] = useState<string>("")

  useEffect(() => {
    if (!accessToken) return

    const fetchRecords = async () => {
      setIsLoadingRecords(true)
      setFetchError(null)
      try {
        const { token, dogs } = await api.auth.line(accessToken)
        if (dogs.length === 0) {
          setFetchError("犬が登録されていません")
          return
        }
        const dog = dogs[0]
        setDogName(dog.name)
        const data = await api.careRecords.index(token, dog.id)
        setRecords(data.map(toTimelineEntry))
      } catch (e: unknown) {
        setFetchError(e instanceof Error ? e.message : "データの取得に失敗しました")
      } finally {
        setIsLoadingRecords(false)
      }
    }

    fetchRecords()
  }, [accessToken])

  if (liffLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (liffError || !isInClient) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex items-center justify-center px-8">
        <div className="text-center space-y-2">
          <p className="font-semibold text-foreground">LINEアプリで開いてください</p>
          <p className="text-sm text-muted-foreground">
            このページはLINEアプリ内専用です。
          </p>
        </div>
      </div>
    )
  }

  const handleEdit = (id: string) => {
    console.log("Edit entry:", id)
  }

  const handleDelete = (id: string) => {
    console.log("Delete entry:", id)
  }

  const handleSettings = () => {
    router.push("/settings")
  }

  const handleAddEntry = () => {
    console.log("Add new entry")
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <div className="mx-auto max-w-md px-5 pb-28">
        {/* Header - サービス名と概要 */}
        <ShibaHeader onSettingsClick={handleSettings} />

        {/* 犬+家族の輪とサマリーを横並び */}
        <section aria-label="ステータス" className="flex items-center gap-4 mt-2">
          {/* 左: 柴犬と家族の輪 */}
          <div className="shrink-0">
            <FamilyCircle
              dogName={dogName || "コタロウ"}
              familyMembers={["お母さん", "お父さん", "お姉ちゃん"]}
            />
          </div>

          {/* 右: サマリー 2x2 */}
          <div className="flex-1 min-w-0">
            <StatusSummary items={statusItems} />
          </div>
        </section>

        {/* Timeline */}
        <section aria-label="タイムライン" className="mt-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <PencilLine className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-primary tracking-wide">
              今日の記録
            </h2>
          </div>

          {isLoadingRecords && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-3xl bg-secondary/50 animate-pulse"
                />
              ))}
            </div>
          )}

          {!isLoadingRecords && fetchError && (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-destructive">{fetchError}</p>
              <p className="text-xs text-muted-foreground">再読み込みしてください</p>
            </div>
          )}

          {!isLoadingRecords && !fetchError && records.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-foreground">まだ記録がありません</p>
              <p className="text-xs text-muted-foreground">下のボタンから記録を追加しましょう</p>
            </div>
          )}

          {!isLoadingRecords && !fetchError && records.length > 0 && (
            <div className="relative pl-1 overflow-visible">
              {records.map((entry, index) => (
                <TimelineItem
                  key={entry.id}
                  type={entry.type}
                  title={entry.title}
                  subtitle={entry.subtitle}
                  person={entry.person}
                  time={entry.time}
                  isLatest={index === 0}
                  onEdit={() => handleEdit(entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Button - まんまる肉球 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <Button
          size="lg"
          className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-110 active:scale-95"
          onClick={handleAddEntry}
          aria-label="記録を追加"
        >
          <PawPrint className="absolute h-12 w-12 opacity-15" />
          <Plus className="h-7 w-7 relative z-10" strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  )
}
