import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { getEducationForCondition, shareContent, type EducationMaterial } from "@/lib/education";
import { useI18n } from "@/lib/i18n";

export function EducationPanel({ condition }: { condition: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string | null>(null);
  const materials = getEducationForCondition(condition);

  if (materials.length === 0) return null;

  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold">{t("educationLibrary")}</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{t("educationLibraryDesc")}</p>
      <div className="space-y-2">
        {materials.map((m) => (
          <div key={m.id} className="rounded-xl border">
            <button
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              className="flex w-full items-center justify-between p-3 text-left text-sm font-medium"
            >
              {m.title}
              {expanded === m.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {expanded === m.id && (
              <div className="border-t px-3 pb-3 pt-2">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {m.content.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-2 text-xs leading-relaxed">{para}</p>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => shareContent(m.title, m.content)}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {t("share")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
