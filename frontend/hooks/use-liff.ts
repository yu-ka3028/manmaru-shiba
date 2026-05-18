"use client"

import { useEffect, useState } from "react"
import liff from "@line/liff"

interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

interface UseLiffResult {
  profile: LiffProfile | null
  isLoading: boolean
  isInClient: boolean
  error: string | null
}

export function useLiff(): UseLiffResult {
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInClient, setIsInClient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      setError("LIFF ID が設定されていません")
      setIsLoading(false)
      return
    }

    liff
      .init({ liffId })
      .then(() => {
        const inClient = liff.isInClient()
        setIsInClient(inClient)
        if (!inClient) return // 外部ブラウザはフォールバック表示のみ
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }
        return liff.getProfile()
      })
      .then((p) => {
        if (p) setProfile(p)
      })
      .catch((e: Error) => {
        setError(e.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return { profile, isLoading, isInClient, error }
}
