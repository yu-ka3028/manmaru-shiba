"use client"

export const dynamic = "force-dynamic"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useLiff } from "@/hooks/use-liff"
import { ShibaFace } from "@/components/shiba-icons"
import { Button } from "@/components/ui/button"

const MOCK_GROUP_NAME = "田中家"

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-destructive font-semibold">招待リンクが無効です</p>
        <p className="text-sm text-muted-foreground">
          正しい招待URLからアクセスしてください。
        </p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-8">
      {/* グループ名 */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">招待されています</p>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          <span className="text-primary">{MOCK_GROUP_NAME}</span>に
          <br />
          参加しますか？
        </h2>
      </div>

      {/* ボタン群 */}
      <div className="space-y-3">
        <Button
          onClick={() => router.push("/timeline")}
          className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
        >
          参加する
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="w-full h-12 text-muted-foreground hover:text-foreground"
        >
          参加しない
        </Button>
      </div>
    </div>
  )
}

export default function JoinPage() {
  const { isLoading, isInClient, error } = useLiff()

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <div className="mx-auto max-w-md px-5 pt-12 pb-16">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
              <ShibaFace className="h-14 w-14 text-card" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            まんまる<span className="text-primary">しば</span>
          </h1>
        </div>

        <Suspense fallback={<p className="text-center text-muted-foreground text-sm">読み込み中...</p>}>
          <JoinContent />
        </Suspense>
      </div>
    </div>
  )
}
