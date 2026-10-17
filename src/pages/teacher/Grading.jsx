import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTitle from "../../components/ui/PageTitle";
import Segmented from "../../components/ui/Segmented";
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
      <div className="mx-auto max-w-lg space-y-4 px-4 pt-5">
        <PageTitle title={t("teacher.nav.exams")} />
        <Segmented
          value={tab}
          onChange={(next) => setParams(next === "daily" ? { tab: "daily" } : {}, { replace: true })}
          options={[
            { value: "exams", label: t("teacher.grading.examsTab") },
            { value: "daily", label: t("teacher.grading.dailyTab") },
          ]}
          ariaLabel={t("teacher.nav.exams")}
        />
      </div>
      {tab === "daily" ? <DailyGrades /> : <Exams />}
    </>
  );
}
