"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { ShibaFace } from "@/components/shiba-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const setupSchema = z.object({
  groupName: z.string().min(1, "グループ名を入力してください"),
  dogName: z.string().min(1, "犬の名前を入力してください"),
  dogBirthday: z.date({ required_error: "誕生日を選択してください" }),
})

type SetupFormValues = z.infer<typeof setupSchema>

export default function SetupPage() {
  const router = useRouter()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
  })

  const selectedDate = watch("dogBirthday")

  const onSubmit = async (_data: SetupFormValues) => {
    // モック段階：APIは呼ばずそのままリダイレクト
    router.push("/timeline")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30">
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
          <p className="text-sm text-muted-foreground mt-1">はじめましょう！</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* グループ名 */}
          <div className="space-y-1.5">
            <Label htmlFor="groupName" className="text-sm font-semibold text-foreground">
              グループ名
              <span className="text-destructive ml-1">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">例：田中家</p>
            <Input
              id="groupName"
              placeholder="グループ名を入力"
              className={cn(
                "bg-card border-border focus-visible:ring-primary/40",
                errors.groupName && "border-destructive focus-visible:ring-destructive/40"
              )}
              {...register("groupName")}
            />
            {errors.groupName && (
              <p className="text-xs text-destructive mt-1">{errors.groupName.message}</p>
            )}
          </div>

          {/* 犬の名前 */}
          <div className="space-y-1.5">
            <Label htmlFor="dogName" className="text-sm font-semibold text-foreground">
              犬の名前
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="dogName"
              placeholder="犬の名前を入力"
              className={cn(
                "bg-card border-border focus-visible:ring-primary/40",
                errors.dogName && "border-destructive focus-visible:ring-destructive/40"
              )}
              {...register("dogName")}
            />
            {errors.dogName && (
              <p className="text-xs text-destructive mt-1">{errors.dogName.message}</p>
            )}
          </div>

          {/* 誕生日 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">
              誕生日
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-card border-border hover:bg-secondary/60",
                    !selectedDate && "text-muted-foreground",
                    errors.dogBirthday && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                  {selectedDate
                    ? format(selectedDate, "yyyy年M月d日", { locale: ja })
                    : "誕生日を選択"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setValue("dogBirthday", date as Date, { shouldValidate: true })
                    setCalendarOpen(false)
                  }}
                  captionLayout="dropdown"
                  defaultMonth={new Date(2020, 0)}
                  startMonth={new Date(2000, 0)}
                  endMonth={new Date()}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            {errors.dogBirthday && (
              <p className="text-xs text-destructive mt-1">{errors.dogBirthday.message}</p>
            )}
          </div>

          {/* 送信ボタン */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 mt-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            {isSubmitting ? "登録中..." : "はじめる"}
          </Button>
        </form>
      </div>
    </div>
  )
}
