"use client"

import { useCallback, useEffect, useState } from "react"
import liff from "@line/liff"

interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

interface UseLiffResult {
  profile: LiffProfile | null
  accessToken: string | null
  isLoading: boolean
  isInClient: boolean
  isFriend: boolean | null
  error: string | null
  recheckFriendship: () => Promise<void>
}

export function useLiff(): UseLiffResult {
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInClient, setIsInClient] = useState(false)
  const [isFriend, setIsFriend] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setProfile({ userId: "development-local-user", displayName: "ローカル確認ユーザー" })
      setAccessToken("development-local-access-token")
      setIsLoading(false)
      setIsInClient(true)
      setIsFriend(true)
      return
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      setError("LIFF ID が設定されていません")
      setIsLoading(false)
      return
    }

    liff
      .init({ liffId })
      .then(async () => {
        const inClient = liff.isInClient()
        setIsInClient(inClient)
        if (!inClient) return
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }
        setAccessToken(liff.getAccessToken())

        const [p, friendship] = await Promise.all([
          liff.getProfile(),
          liff.getFriendship().catch(() => ({ friendFlag: true })),
        ])
        setProfile(p)
        setIsFriend(friendship.friendFlag)
      })
      .catch((e: Error) => {
        setError(e.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const recheckFriendship = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      setIsFriend(true)
      return
    }

    try {
      const { friendFlag } = await liff.getFriendship()
      setIsFriend(friendFlag)
    } catch {
      setIsFriend(true)
    }
  }, [])

  return { profile, accessToken, isLoading, isInClient, isFriend, error, recheckFriendship }
}
