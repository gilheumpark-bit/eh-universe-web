"use client";

// ============================================================
// 환불 정책 (claude3 _legal P1 필수 정책 페이지), KO/EN/JA/ZH
// 디지털 구독(Stripe). 한국 전자상거래법 청약철회 + 디지털 콘텐츠 예외 정합.
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { SUPPORT_EMAIL_DISPLAY, HAS_SUPPORT_EMAIL, supportMailtoHref } from "@/lib/public-contact";

const EFFECTIVE_DATE = "2026-06-15";

export default function RefundPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <LegalPageLayout
      title={{ ko: "환불 정책", en: "Refund Policy", ja: "返金ポリシー", zh: "退款政策" }}
      effectiveDate={EFFECTIVE_DATE}
      updatedAt={EFFECTIVE_DATE}
    >
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          1. {T({ ko: "개요", en: "Overview", ja: "概要", zh: "概述" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Loreguard의 유료 구독은 Stripe를 통해 결제됩니다. 본 정책은 대한민국 「전자상거래 등에서의 소비자보호에 관한 법률」(전자상거래법)을 기준으로 하며, 디지털 콘텐츠/서비스의 특성에 따른 예외를 포함합니다.",
            en: "Loreguard paid subscriptions are billed via Stripe. This policy follows the Republic of Korea's E-Commerce Act and includes exceptions specific to digital content/services.",
            ja: "Loreguardの有料サブスクリプションは Stripe で決済されます。本ポリシーは韓国の電子商取引法に準拠します。",
            zh: "Loreguard 付费订阅通过 Stripe 结算。本政策依据大韩民国《电子商务法》，并包含数字内容/服务的例外。",
          })}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "청약철회 (구매 후 7일)", en: "Withdrawal (7 Days)", ja: "申込撤回(7日)", zh: "撤销订购(7日)" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "결제일로부터 7일 이내에는 청약철회(전액 환불)가 가능합니다. 단, 전자상거래법 제17조 제2항에 따라 디지털 서비스(노아 제안·번역 등)를 이미 사용 개시한 경우, 사용 개시 사실을 사전 고지하였으므로 해당 사용분에 대한 청약철회가 제한될 수 있습니다.",
            en: "Within 7 days of payment you may withdraw for a full refund. However, under Article 17(2) of the E-Commerce Act, if you have already begun using the digital service (model-assisted output, translation, etc.) after prior notice, withdrawal for the used portion may be restricted.",
            ja: "決済日から7日以内は全額返金可能です。ただし、デジタルサービスの使用を開始した場合、当該使用分の撤回が制限される場合があります。",
            zh: "自付款之日起 7 日内可撤销并全额退款。但若已开始使用数字服务(Noa 建议、翻译等),所用部分的撤销可能受限。",
          })}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          3. {T({ ko: "구독 취소 · 갱신 중단", en: "Cancellation & Auto-Renewal", ja: "解約・自動更新停止", zh: "取消与自动续订" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "월/연 구독은 언제든 취소할 수 있으며, 취소 시 다음 결제 주기부터 갱신이 중단됩니다.", en: "Monthly/annual subscriptions can be canceled anytime; renewal stops from the next billing cycle.", ja: "サブスクはいつでも解約でき、次回更新が停止されます。", zh: "订阅可随时取消,下个计费周期起停止续订。" })}</li>
          <li>{T({ ko: "이미 결제된 현재 주기는 잔여 기간까지 이용 가능하며, 부분 환불은 위 청약철회 범위에서만 적용됩니다.", en: "The already-paid current period remains usable until it ends; partial refunds apply only within the withdrawal scope above.", ja: "支払済みの当期は期間満了まで利用可能で、部分返金は撤回範囲内のみ。", zh: "已支付的当期可用至期满,部分退款仅在上述撤销范围内适用。" })}</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          4. {T({ ko: "환불 불가 항목", en: "Non-Refundable", ja: "返金対象外", zh: "不可退款项" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "이미 소비된 모델 사용량(토큰·요청 횟수) 및 제공 완료된 디지털 산출물.", en: "Model usage already consumed (tokens, requests) and digital deliverables already provided.", ja: "消費済みのモデル使用量・提供済みの成果物。", zh: "已消耗的模型用量及已交付的数字成果。" })}</li>
          <li>{T({ ko: "사용자 연결 키 또는 로컬 모델 사용 비용은 Loreguard 결제 대상이 아닙니다.", en: "Costs for your own connection keys or local models are not billed by Loreguard.", ja: "利用者の接続キー・ローカルモデル費用は Loreguard の課金対象外です。", zh: "用户连接密钥或本地模型的费用不属于 Loreguard 收费项目。" })}</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "환불 절차", en: "Refund Process", ja: "返金手続き", zh: "退款流程" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "환불은 아래 이메일로 결제 정보(영수증·결제일)와 함께 요청해 주세요. 검토 후 영업일 기준 3~5일 내 Stripe를 통해 원결제 수단으로 환불됩니다(카드사 처리 기간 별도).",
            en: "Request a refund by email with your payment details (receipt, date). After review, refunds are issued via Stripe to the original payment method within 3 to 5 business days (card-issuer processing time excluded).",
            ja: "返金は決済情報を添えて下記メールへご請求ください。審査後3〜5営業日以内に Stripe で返金します。",
            zh: "请通过下方邮箱附付款信息申请退款。审核后 3 至 5 个工作日内经 Stripe 退至原支付方式。",
          })}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          6. {T({ ko: "문의", en: "Contact", ja: "お問い合わせ", zh: "联系方式" })}
        </h2>
        {HAS_SUPPORT_EMAIL && (
        <p className="text-text-secondary text-sm leading-relaxed">
          Email:{" "}
          <a href={supportMailtoHref()} className="text-accent-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">
            {SUPPORT_EMAIL_DISPLAY}
          </a>
        </p>
        )}
      </section>
    </LegalPageLayout>
  );
}
