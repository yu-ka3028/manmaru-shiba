"use client"

import { useState } from "react"
import { toast, Toaster } from "sonner"
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
  const [peeHours, setPeeHours] = useState(MOCK_SETTINGS.peeAlertHours)
  const [poopHours, setPoopHours] = useState(MOCK_SETTINGS.poopAlertHours)

  const handleSave = () => {
    toast.success("設定を保存しました")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <Toaster position="top-center" />
      <div className="mx-auto max-w-md px-5 pt-12 pb-16">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
              <ShibaFace className="h-14 w-14 text-card" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            まんまる<span className="text-primary">しば</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">アラート設定</p>
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
