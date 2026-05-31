"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLiff } from "@/hooks/use-liff"
import { ShibaHeader, FamilyCircle } from "@/components/shiba-header"
import { StatusSummary } from "@/components/status-summary"
import { TimelineItem, type ActivityType } from "@/components/timeline-card"
import { Plus, PencilLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { PawPrint } from "@/components/shiba-icons"
import { api } from "@/lib/api"
import { Droplets, Music, UtensilsCrossed } from "lucide-react"

interface CareRecord {
  id: number
  care_type: string
  recorded_at: string
  user_name: string
}

interface TimelineEntry {
  id: string
  care_type: string
  recorded_at: string
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

const CARE_TYPE_LABELS: Record<string, string> = {
  pee: "おしっこ",
  poop: "うんち",
  meal: "ごはん",
  walk_short: "散歩（ショート）",
  walk_long: "散歩（ロング）",
}

function toDatetimeLocalValue(isoOrLocal: string): string {
  const d = new Date(isoOrLocal)
  if (isNaN(d.getTime())) return isoOrLocal
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toTimelineEntry(record: CareRecord): TimelineEntry {
  const config = CARE_TYPE_MAP[record.care_type] ?? { type: "pee" as ActivityType, title: record.care_type }
  const time = new Date(record.recorded_at).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return {
    id: String(record.id),
    care_type: record.care_type,
    recorded_at: record.recorded_at,
    type: config.type,
    title: config.title,
    subtitle: config.subtitle,
    person: record.user_name,
    time,
  }
}

function buildStatusItems(records: TimelineEntry[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const formatElapsed = (recorded_at: string) => {
    const diff = Math.floor((now.getTime() - new Date(recorded_at).getTime()) / 60000)
    if (diff < 60) return `${diff}分前`
    return `${Math.floor(diff / 60)}時間前`
  }

  const latest = (type: string) => records.find((r) => r.care_type === type)

  const pee = latest("pee")
  const poop = latest("poop")
  const meal = latest("meal")
  const todayWalks = records.filter(
    (r) => (r.care_type === "walk_short" || r.care_type === "walk_long") &&
      new Date(r.recorded_at) >= todayStart
  ).length

  const poopElapsedMin = poop
    ? Math.floor((now.getTime() - new Date(poop.recorded_at).getTime()) / 60000)
    : Infinity

  return [
    {
      icon: <Droplets className="h-4 w-4" />,
      label: "おしっこ",
      value: pee ? formatElapsed(pee.recorded_at) : "なし",
      isWarning: false,
    },
    {
      icon: <Music className="h-4 w-4" />,
      label: "うんち",
      value: poop ? formatElapsed(poop.recorded_at) : "なし",
      isWarning: poopElapsedMin > 240,
    },
    {
      icon: <PawPrint className="h-4 w-4" />,
      label: "散歩",
      value: todayWalks > 0 ? `今日${todayWalks}回` : "なし",
      isWarning: false,
    },
    {
      icon: <UtensilsCrossed className="h-4 w-4" />,
      label: "ごはん",
      value: meal
        ? new Date(meal.recorded_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
        : "なし",
      isWarning: false,
    },
  ]
}

export default function ShibaCareTimeline() {
  const router = useRouter()
  const { isLoading: liffLoading, isInClient, accessToken, error: liffError } = useLiff()

  const [records, setRecords] = useState<TimelineEntry[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dogName, setDogName] = useState<string>("")
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; care_type: string; recorded_at: string } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    const fetchRecords = async () => {
      setIsLoadingRecords(true)
      setFetchError(null)
      try {
        const { token, dogs } = await api.auth.line(accessToken)
        setAuthToken(token)
        if (dogs.length === 0) {
          router.replace("/setup")
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
    const record = records.find((r) => r.id === id)
    if (record) setEditTarget({ id, care_type: record.care_type, recorded_at: record.recorded_at })
  }

  const handleUpdate = async () => {
    if (!editTarget || !authToken) return
    setIsUpdating(true)
    try {
      const updated = await api.careRecords.update(authToken, Number(editTarget.id), {
        care_type: editTarget.care_type,
        recorded_at: new Date(editTarget.recorded_at).toISOString(),
      })
      setRecords((prev) =>
        prev
          .map((r) => (r.id === editTarget.id ? toTimelineEntry(updated) : r))
          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
      )
      setEditTarget(null)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId || !authToken) return
    setIsDeleting(true)
    try {
      await api.careRecords.destroy(authToken, Number(deleteTargetId))
      setRecords((prev) => prev.filter((r) => r.id !== deleteTargetId))
      setDeleteTargetId(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSettings = () => {
    window.location.href = "/settings"
  }

  const handleAddEntry = () => {
    console.log("Add new entry")
  }

  return (
    <>
    <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>記録を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "削除中..." : "削除する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>記録を編集</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">記録日時</p>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={editTarget ? toDatetimeLocalValue(editTarget.recorded_at) : ""}
              onChange={(e) =>
                setEditTarget((prev) =>
                  prev ? { ...prev, recorded_at: e.target.value } : prev
                )
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">ケアの種類</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CARE_TYPE_LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  variant={editTarget?.care_type === key ? "default" : "outline"}
                  className="h-12 rounded-2xl"
                  onClick={() => setEditTarget((prev) => prev ? { ...prev, care_type: key } : prev)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={isUpdating}>
            キャンセル
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "保存中..." : "保存する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
            <StatusSummary items={buildStatusItems(records)} />
          </div>
        </section>

        {/* Timeline */}
        <section aria-label="タイムライン" className="mt-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <PencilLine className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-primary tracking-wide">
              最近の{dogName}
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
                  onDelete={() => setDeleteTargetId(entry.id)}
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
    </>
  )
}
