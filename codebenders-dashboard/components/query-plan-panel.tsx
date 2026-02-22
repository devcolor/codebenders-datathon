import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { QueryPlan } from "@/lib/types"

interface QueryPlanPanelProps {
  plan: QueryPlan
}

export function QueryPlanPanel({ plan }: QueryPlanPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Query Plan</CardTitle>
        <CardDescription>Analysis breakdown and execution details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Metric</div>
          <Badge variant="secondary" className="font-mono">
            {plan.metric}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Group By</div>
          <Badge variant="secondary" className="font-mono">
            {plan.groupBy || "none"}
          </Badge>
        </div>

        {plan.filters && Object.keys(plan.filters).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Filters</div>
            <div className="space-y-1">
              {Object.entries(plan.filters).map(([key, value]) => (
                <div key={key} className="text-sm text-muted-foreground">
                  <span className="font-mono">{key}</span>: {JSON.stringify(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {plan.timeHint && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Time Hint</div>
            <div className="text-sm text-muted-foreground">{plan.timeHint}</div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Visualization</div>
          <Badge variant="outline" className="capitalize">
            {plan.vizType}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">SQL (Reference)</div>
          <div className="rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
            {plan.sql}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
