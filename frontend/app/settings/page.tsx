"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLiff } from "@/hooks/use-liff"
import { toast, Toaster } from "sonner"
import { ArrowLeft } from "lucide-react"
import { ShibaFace } from "@/components/shiba-icons"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MOCK_SETTINGS = {
  peeAlertHours: "4",
  poopAlertHours: "4",
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1))

export default function SettingsPage() {
  const router = useRouter()
  const { isLoading, isInClient, error } = useLiff()
  const [peeHours, setPeeHours] = useState(MOCK_SETTINGS.peeAlertHours)
  const [poopHours, setPoopHours] = useState(MOCK_SETTINGS.poopAlertHours)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error || !isInClient) {
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

  const handleSave = () => {
    toast.success("設定を保存しました")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-md px-5 pb-16">
        {/* ヘッダー */}
        <header className="relative pt-6 pb-4 text-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            onClick={() => router.push("/timeline")}
            aria-label="タイムラインに戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            まんまる<span className="text-primary">しば</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">アラート設定</p>
        </header>

        {/* 柴犬アイコン */}
        <div className="flex justify-center mt-6 mb-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
            <ShibaFace className="h-14 w-14 text-card" />
          </div>
        </div>

        {/* 設定フォーム */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">おしっこアラート</label>
            <Select value={peeHours} onValueChange={setPeeHours}>
              <SelectTrigger className="w-full h-12 rounded-xl border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}時間
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">うんちアラート</label>
            <Select value={poopHours} onValueChange={setPoopHours}>
              <SelectTrigger className="w-full h-12 rounded-xl border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}時間
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSave}
            className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            保存する
          </Button>
        </div>
      </div>
    </div>
  )
}
