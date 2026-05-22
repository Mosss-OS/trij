import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const shortcuts = useKeyboardShortcuts();
  const { t } = useI18n();

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggle-shortcuts", handleToggle);
    return () => window.removeEventListener("toggle-shortcuts", handleToggle);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t("keyboardShortcuts")}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("navigationShortcuts")}</h3>
            {shortcuts.slice(0, 5).map((shortcut) => (
              <div key={shortcut.key} className="flex items-center justify-between">
                <kbd className="rounded border bg-muted px-2 py-1 text-xs font-semibold">
                  {shortcut.key.toUpperCase()}
                </kbd>
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("formShortcuts")}</h3>
            <div className="flex items-center justify-between">
              <kbd className="rounded border bg-muted px-2 py-1 text-xs font-semibold">
                Ctrl + Enter
              </kbd>
              <span className="text-sm text-muted-foreground">{t("submitForm")}</span>
            </div>
            <div className="flex items-center justify-between">
              <kbd className="rounded border bg-muted px-2 py-1 text-xs font-semibold">
                Esc
              </kbd>
              <span className="text-sm text-muted-foreground">{t("cancelOrBack")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("helpShortcuts")}</h3>
            <div className="flex items-center justify-between">
              <kbd className="rounded border bg-muted px-2 py-1 text-xs font-semibold">
                ?
              </kbd>
              <span className="text-sm text-muted-foreground">{t("showShortcuts")}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
