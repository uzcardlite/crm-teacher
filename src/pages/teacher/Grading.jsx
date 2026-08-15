import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Tabs from "../../components/ui/Tabs";
import DailyGrades from "./DailyGrades";
import Exams from "./Exams";

// "Baholar" — one bottom-nav entry holding both grading tools, switched by a
// top tab: exam grades and daily grades. The tab lives in the URL (?tab=daily)
// so it survives refresh and back-navigation.
export default function Grading() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "daily" ? "daily" : "exams";

  return (
    <>
      <div className="mx-auto max-w-lg px-4 pt-4">
        <Tabs
          value={tab}
          onChange={(next) =>
            setParams(next === "daily" ? { tab: "daily" } : {}, { replace: true })
          }
          tabs={[
            { key: "exams", label: t("teacher.grading.examsTab") },
            { key: "daily", label: t("teacher.grading.dailyTab") },
          ]}
        />
      </div>
      {tab === "daily" ? <DailyGrades /> : <Exams />}
    </>
  );
}
