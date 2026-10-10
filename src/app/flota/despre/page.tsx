import { Card, PageHead } from "@/components/flota/ui";
import { t, type MsgKey } from "@/lib/flota/i18n";
import { getLocale } from "@/lib/flota/i18n/server";

export default function Despre() {
  const loc = getLocale();
  const rows = [1, 2, 3, 4].map((i) => [`sources.r${i}`, `sources.r${i}d`, `sources.r${i}r`] as MsgKey[]);
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHead title={t(loc, "sources.title")} subtitle={t(loc, "sources.intro")} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800"><th className="py-2 pr-2">{t(loc, "sources.what")}</th><th className="pr-2">{t(loc, "sources.demo")}</th><th>{t(loc, "sources.real")}</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r[0]} className="border-b border-slate-100 dark:border-slate-800/60 align-top"><td className="py-2.5 pr-2 font-semibold">{t(loc, r[0])}</td><td className="pr-2">{t(loc, r[1])}</td><td>{t(loc, r[2])}</td></tr>)}</tbody>
        </table>
      </Card>
      <Card>
        <h2 className="font-semibold mb-2">{t(loc, "pricing.start")} · {t(loc, "pricing.pro")}</h2>
        <ul className="text-sm space-y-1 list-disc pl-5"><li>{t(loc, "pricing.startDesc")}</li><li>{t(loc, "pricing.proDesc")}</li></ul>
        <p className="text-xs text-slate-500 mt-3">{t(loc, "sources.hw")}</p>
        <p className="text-xs text-slate-500 mt-1">{t(loc, "sources.osm")}</p>
      </Card>
    </div>
  );
}
