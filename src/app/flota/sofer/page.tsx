import DriverApp from "@/components/flota/DriverApp";
import { getLocale } from "@/lib/flota/i18n/server";
export default function Sofer() {
  return <DriverApp locale={getLocale()} />;
}
