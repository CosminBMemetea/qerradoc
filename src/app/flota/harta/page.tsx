import MapReplay from "@/components/flota/MapReplay";
import { PageHead } from "@/components/flota/ui";
import { DEMO_DAY } from "@/lib/flota/data";
import { fmtDate, t } from "@/lib/flota/i18n";
import { getLocale } from "@/lib/flota/i18n/server";
export default function Harta() {
  const loc = getLocale();
  return (
    <div>
      <PageHead title={t(loc, "map.title")} subtitle={t(loc, "map.subtitle", { day: fmtDate(loc, DEMO_DAY, true) })} />
      <MapReplay locale={loc} />
    </div>
  );
}
