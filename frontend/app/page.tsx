import { redirect } from "next/navigation"

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const liffState = params["liff.state"]
  // LIFF URL形式で開いた場合、liff.stateにパス(/join?token=xxx等)が入ってくる
  if (typeof liffState === "string" && liffState.startsWith("/")) {
    redirect(liffState)
  }
  redirect("/timeline")
}
