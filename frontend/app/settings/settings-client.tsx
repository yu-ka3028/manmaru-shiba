"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLiff } from "@/hooks/use-liff"
import { toast, Toaster } from "sonner"
import { ArrowLeft, Copy, Check, Share2 } from "lucide-react"
import { ShibaFace } from "@/components/shiba-icons"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

const RAILS_API_URL = process.env.NEXT_PUBLIC_RAILS_API_URL ?? ""

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1))

export default function SettingsPage() {
  const router = useRouter()
  const { isLoading, isInClient, accessToken, error } = useLiff()
  const [jwtToken, setJwtToken] = useState<string | null>(null)
  const [dogId, setDogId] = useState<number | null>(null)
  const [peeHours, setPeeHours] = useState("4")
  const [poopHours, setPoopHours] = useState("4")
  const [inviteUrl, setInviteUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // LIFFロード完了後にJWT取得→アラート設定取得
  useEffect(() => {
    if (isLoading || !isInClient || !accessToken) return

    const init = async () => {
      setIsFetching(true)
      try {
        // LIFF accessToken → JWT
        const authRes = await fetch(`${RAILS_API_URL}/api/v1/auth/line`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken }),
        })
        if (!authRes.ok) throw new Error("認証に失敗しました")
        const authData = await authRes.json()

        const token: string = authData.token
        const firstDog = authData.dogs?.[0]
        if (!firstDog) throw new Error("犬の情報が見つかりません")

        if (authData.invite_token) {
          const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? ""
          setInviteUrl(`https://liff.line.me/${liffId}/join?token=${authData.invite_token}`)
        }

        setJwtToken(token)
        setDogId(firstDog.id)

        // アラート設定取得
        const settingsRes = await fetch(
          `${RAILS_API_URL}/api/v1/dogs/${firstDog.id}/alert_settings`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!settingsRes.ok) throw new Error("設定の取得に失敗しました")
        const settings: { care_type: string; interval_hours: number }[] = await settingsRes.json()

        settings.forEach((s) => {
          if (s.care_type === "pee") setPeeHours(String(s.interval_hours))
          if (s.care_type === "poop") setPoopHours(String(s.interval_hours))
        })
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "エラーが発生しました")
      } finally {
        setIsFetching(false)
      }
    }

    init()
  }, [isLoading, isInClient, accessToken])

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

  const handleSave = async () => {
    if (!jwtToken || !dogId) return
    setIsSaving(true)
    try {
      await Promise.all([
        fetch(`${RAILS_API_URL}/api/v1/dogs/${dogId}/alert_settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ care_type: "pee", interval_hours: Number(peeHours) }),
        }),
        fetch(`${RAILS_API_URL}/api/v1/dogs/${dogId}/alert_settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ care_type: "poop", interval_hours: Number(poopHours) }),
        }),
      ])
      toast.success("設定を保存しました")
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
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
            <Select value={peeHours} onValueChange={setPeeHours} disabled={isFetching}>
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
            <Select value={poopHours} onValueChange={setPoopHours} disabled={isFetching}>
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
            disabled={isFetching || isSaving || !jwtToken}
            className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            {isSaving ? "保存中..." : "保存する"}
          </Button>

          {inviteUrl && (
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm font-semibold text-foreground">家族を招待する</p>
              <p className="text-xs text-muted-foreground">
                このリンクを家族に送るとグループに参加できます。
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  className="bg-card border-border text-xs text-muted-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteUrl)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                onClick={() => {
                  const text = `まんまるしばに招待します！\n${inviteUrl}`
                  window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank")
                }}
                className="w-full h-12 bg-[#06C755] hover:bg-[#06C755]/90 text-white font-bold rounded-xl"
              >
                <Share2 className="mr-2 h-4 w-4" />
                LINEで送る
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
