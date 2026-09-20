"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, Scissors } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLiff } from "@/hooks/use-liff"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ShibaHeader } from "@/components/shiba-header"

const GROOMING_TYPES = [
  ["nail_trim", "爪切り"],
  ["shampoo", "シャンプー"],
  ["brushing", "ブラッシング"],
  ["other", "その他"],
] as const

type GroomingRecord = { id: number; grooming_type: string; performed_at: string; user_name: string }

function localDateTime() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })
}

export default function GroomingClient() {
  const router = useRouter()
  const { isLoading: liffLoading, isInClient, accessToken, error: liffError } = useLiff()
  const [token, setToken] = useState<string | null>(null)
  const [dogId, setDogId] = useState<number | null>(null)
  const [dogName, setDogName] = useState("")
  const [records, setRecords] = useState<GroomingRecord[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [type, setType] = useState<string>(GROOMING_TYPES[0][0])
  const [performedAt, setPerformedAt] = useState(localDateTime)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    const load = async () => {
      setIsLoading(true)
      try {
        const auth = await api.auth.current(accessToken)
        if (auth.dogs.length === 0) return router.replace("/setup")
        const dog = auth.dogs[0]
        const data = await api.groomingRecords.index(auth.token, dog.id)
        setToken(auth.token)
        setDogId(dog.id)
        setDogName(dog.name)
        setRecords(data.records)
        setNextCursor(data.next_cursor)
      } catch (e) {
        setError(e instanceof Error ? e.message : "お手入れ記録の取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [accessToken, router])

  const loadMore = async () => {
    if (!token || !dogId || !nextCursor || isLoading) return
    setIsLoading(true)
    try {
      const data = await api.groomingRecords.index(token, dogId, nextCursor)
      setRecords((current) => [...current, ...data.records])
      setNextCursor(data.next_cursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : "記録の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  const save = async () => {
    if (!token || !dogId || isSaving || !performedAt) return
    setIsSaving(true)
    setError(null)
    try {
      const record = await api.groomingRecords.create(token, dogId, {
        grooming_type: type,
        performed_at: new Date(performedAt).toISOString(),
      })
      setRecords((current) => [record, ...current].sort((a, b) =>
        new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
      ))
      setPerformedAt(localDateTime())
    } catch (e) {
      setError(e instanceof Error ? e.message : "記録の登録に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  if (liffLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">読み込み中...</div>
  if (liffError || !isInClient) return <div className="flex min-h-screen items-center justify-center px-8 text-center"><p className="text-sm font-semibold">LINEアプリで開いてください</p></div>

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
      <div className="mx-auto max-w-md px-5 pb-12">
        <ShibaHeader onSettingsClick={() => router.push("/settings")} />
        <div className="mb-5 flex items-center gap-2">
          <Link href="/timeline" aria-label="タイムラインへ戻る"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
          <h1 className="text-lg font-bold">{dogName}のお手入れ</h1>
        </div>
        <section className="space-y-4 rounded-3xl bg-card p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {GROOMING_TYPES.map(([value, label]) => (
              <Button key={value} type="button" variant={type === value ? "default" : "outline"} className="rounded-2xl" onClick={() => setType(value)}>{label}</Button>
            ))}
          </div>
          <label className="block space-y-2 text-sm font-semibold">実施日時
            <input type="datetime-local" value={performedAt} max={localDateTime()} onChange={(e) => setPerformedAt(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 font-normal" />
          </label>
          <Button className="w-full rounded-2xl" onClick={save} disabled={isSaving || !performedAt}>{isSaving ? "登録中..." : "登録する"}</Button>
        </section>
        {error && <p className="mt-4 text-center text-sm font-semibold text-destructive">{error}</p>}
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary"><Scissors className="h-4 w-4" />お手入れ履歴</h2>
          {records.length === 0 && !isLoading && <p className="py-8 text-center text-sm text-muted-foreground">まだ記録がありません</p>}
          <div className="space-y-3">
            {records.map((record) => <div key={record.id} className="rounded-2xl bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="font-bold">{GROOMING_TYPES.find(([value]) => value === record.grooming_type)?.[1] ?? record.grooming_type}</span><span className="text-xs text-muted-foreground">{formatDate(record.performed_at)}</span></div><p className="mt-1 text-xs text-muted-foreground">記録者: {record.user_name}</p></div>)}
          </div>
          {nextCursor && <Button variant="outline" className="mt-4 w-full rounded-2xl" onClick={loadMore} disabled={isLoading}>{isLoading ? "読み込み中..." : <><ChevronDown className="mr-1 h-4 w-4" />もっと見る</>}</Button>}
        </section>
      </div>
    </main>
  )
}
