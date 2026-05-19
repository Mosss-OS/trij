import { Cloud, CloudOff } from "lucide-react";
import { getCloudQuota } from "@/lib/gemma";
import { useI18n } from "@/lib/i18n";

interface Props {
  active: boolean;
}

export function CloudInferenceIndicator({ active }: Props) {
  const { t } = useI18n();
  if (!active) return null;

  const quota = getCloudQuota();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
      <Cloud className="h-4 w-4 flex-shrink-0" />
      <span>{t("runningCloud")}</span>
      <span className="ml-auto font-mono text-[10px] opacity-70">
        {t("cloudQuota").replace("{used}", String(quota.used)).replace("{max}", String(quota.max))}
      </span>
    </div>
  );
}
