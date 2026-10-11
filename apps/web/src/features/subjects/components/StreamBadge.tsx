import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeTone } from "@/components/ui";
import type { Stream } from "../api/useSubjects";

const STREAM_TONE: Record<Stream, BadgeTone> = {
  Natural: "success",
  Social: "warning",
  Common: "info",
};

export const StreamBadge = memo(function StreamBadge({ stream }: { stream: Stream }) {
  const { t } = useTranslation("subjects");
  return <Badge tone={STREAM_TONE[stream]}>{t(`streams.${stream}`)}</Badge>;
});
