"use client"

import { useLanguage } from "@/contexts/language-context"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function DifficultySelect() {
  const { t } = useLanguage()

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-300">{t("difficulty.label")}</Label>
      <RadioGroup defaultValue="medium" name="difficulty" className="flex space-x-2">
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="easy" id="easy" className="text-zinc-300" />
          <Label htmlFor="easy" className="text-sm text-zinc-300">
            {t("difficulty.easy")}
          </Label>
        </div>
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="medium" id="medium" className="text-zinc-300" />
          <Label htmlFor="medium" className="text-sm text-zinc-300">
            {t("difficulty.medium")}
          </Label>
        </div>
        <div className="flex items-center space-x-1">
          <RadioGroupItem value="hard" id="hard" className="text-zinc-300" />
          <Label htmlFor="hard" className="text-sm text-zinc-300">
            {t("difficulty.hard")}
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}
