
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  allowCustomValue?: boolean
  customValueText?: (inputValue: string) => string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "選択...",
  searchPlaceholder = "検索...",
  emptyText = "見つかりません。",
  className,
  allowCustomValue = true, // Default to allowing custom values
  customValueText = (inputValue) => `「${inputValue}」を追加`,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("") // For typing new values

  const handleSelect = (currentValue: string) => {
    const option = options.find(
      (opt) => opt.value.toLowerCase() === currentValue.toLowerCase()
    )
    if (option) {
      onChange(option.value)
      setInputValue("")
    } else if (allowCustomValue) {
      onChange(currentValue) // Use the typed value directly
      setInputValue("")
    }
    setOpen(false)
  }

  const currentOption = options.find((option) => option.value.toLowerCase() === value?.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className, !value && "text-muted-foreground")}
        >
          {currentOption ? currentOption.label : (value || placeholder)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
          filter={(optionValue, search) => {
            const option = options.find(opt => opt.value === optionValue)
            if (option?.label.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustomValue && inputValue.trim() !== "" ? (
                <CommandItem
                  value={inputValue}
                  onSelect={() => handleSelect(inputValue)}
                  className="cursor-pointer"
                >
                  {customValueText(inputValue)}
                </CommandItem>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    handleSelect(option.value)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
               {allowCustomValue && inputValue.trim() !== "" && !options.some(opt => opt.value.toLowerCase() === inputValue.toLowerCase()) && (
                 <CommandItem
                    value={inputValue}
                    onSelect={() => handleSelect(inputValue)}
                    className="cursor-pointer"
                  >
                  <Check className={cn("mr-2 h-4 w-4", "opacity-0")} /> {/* New item, so not checked initially */}
                   {customValueText(inputValue)}
                  </CommandItem>
               )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
