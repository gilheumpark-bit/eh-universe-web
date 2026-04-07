import { redirect } from "next/navigation";

/** 레거시 URL — 문체는 소설 스튜디오 `/studio?tab=style` 에서만 진입 */
export default function StyleStudioLegacyRedirect() {
  redirect("/studio?tab=style");
}
