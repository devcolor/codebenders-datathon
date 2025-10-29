import { Info } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface InfoPopoverProps {
  title: string
  children: React.ReactNode
}

export function InfoPopover({ title, children }: InfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-6 w-6 ml-1"
          aria-label={`Information about ${title}`}
        >
          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            {children}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

