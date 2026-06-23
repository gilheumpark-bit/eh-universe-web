"use client";

import {
  DNA_CARDS,
  getSliderDescriptor,
  REF_AUTHORS,
  SLIDERS_I18N,
  type RefAuthor,
} from "./StyleStudioView.data";

interface StyleProfilePanelProps {
  en: boolean;
  selectedCards: Set<number>;
  totalChecked: number;
  totalItems: number;
  resultText: string;
  sliderVals: Record<string, number>;
}

export function StyleProfilePanel({
  en,
  selectedCards,
  totalChecked,
  totalItems,
  resultText,
  sliderVals,
}: StyleProfilePanelProps) {
  const authors = new Map<string, RefAuthor>();
  Array.from(selectedCards).forEach((cardIdx) => {
    REF_AUTHORS[cardIdx]?.forEach((a) => authors.set(a.name, a));
  });
  const referenceAuthors = authors.size > 0 ? Array.from(authors.values()).slice(0, 3) : REF_AUTHORS[0];

  return (
    <div>
      <h2 className="ss-section-title">
        {en ? "My Style Profile" : "내 문체 프로필 · 현재 설정 기준"}
      </h2>

      <div className="ss-profile-grid">
        <div className="ss-profile-card">
          <h3>{en ? "Genre Identity" : "장르 정체성"}</h3>
          <div className="ss-tag-row">
            {Array.from(selectedCards).map((i) => (
              <span key={i} className="ss-tag ss-tag-gold">{DNA_CARDS[i].label}</span>
            ))}
            {selectedCards.size === 0 && (
              <span className="ss-tag ss-tag-gold">{en ? "None" : "미선택"}</span>
            )}
          </div>
          <div className="ss-profile-items">
            <div className="ss-profile-item">
              <span className="ss-profile-key">{en ? "Selected Styles" : "선택 문체"}</span>
              <span>{selectedCards.size > 0
                ? Array.from(selectedCards).map((i) => en ? DNA_CARDS[i].titleEN : DNA_CARDS[i].title).join(" + ")
                : (en ? "Not set" : "미설정")}</span>
            </div>
            <div className="ss-profile-item">
              <span className="ss-profile-key">{en ? "Techniques" : "습득 기법"}</span>
              <span>{totalChecked} / {totalItems} {en ? "mastered" : "완료"}</span>
            </div>
            <div className="ss-profile-item">
              <span className="ss-profile-key">{en ? "Lab Usage" : "실험실 사용"}</span>
              <span>{resultText ? (en ? "Active" : "활성") : (en ? "Not yet" : "미사용")}</span>
            </div>
          </div>
        </div>

        <div className="ss-profile-card">
          <h3>{en ? "Style Parameters" : "문체 파라미터"}</h3>
          <div className="ss-profile-items">
            {SLIDERS_I18N.map((s) => (
              <div key={s.id} className="ss-profile-item">
                <span className="ss-profile-key">{en ? s.en : s.ko}</span>
                <span>{getSliderDescriptor(s, sliderVals[s.id], en)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ss-author-dna">
        <div className="ss-author-dna-bg" aria-hidden="true">DNA</div>
        <h3>{en ? "Author Style DNA Statement" : "작가 문체 DNA 선언문"}</h3>
        <div className="ss-dna-statement">
          {selectedCards.size === 0 ? (
            <span className="ss-empty-dna">
              {en
                ? "Select your style identity in Step 01 to generate your DNA statement."
                : "Step 01에서 문체 정체성을 선택하면 DNA 선언문이 생성됩니다."}
            </span>
          ) : (
            <>
              {en ? "I write " : "나는 "}
              <em className="ss-hl">
                {selectedCards.has(0) && (en ? "the language of systems" : "시스템의 언어")}
                {selectedCards.has(1) && (selectedCards.has(0) ? (en ? " and rhythm" : "와 리듬") : (en ? "fast-paced rhythm" : "빠른 호흡의 리듬"))}
                {selectedCards.has(2) && ((selectedCards.has(0) || selectedCards.has(1)) ? (en ? " and sensory depth" : "과 감각의 깊이") : (en ? "sensory depth" : "감각의 깊이"))}
                {selectedCards.has(3) && ((selectedCards.has(0) || selectedCards.has(1) || selectedCards.has(2)) ? (en ? " across genres" : "을 장르 너머") : (en ? "genre-crossing craft" : "장르를 넘나드는 문장"))}
              </em>
              {en ? " to capture " : "으로 "}
              <em className="ss-hl2">
                {sliderVals.s2 <= 2
                  ? (en ? "what data reveals" : "데이터가 드러내는 것들")
                  : sliderVals.s2 >= 4
                    ? (en ? "the weight of emotion" : "감정의 무게")
                    : (en ? "the tension between logic and feeling" : "논리와 감정 사이의 긴장")}
              </em>
              {en ? ", and my sentences make readers " : "을 포착하고,"}<br />
              {en ? "" : "독자가 이해하기 전에 "}
              <em className="ss-hl">
                {sliderVals.s4 >= 4
                  ? (en ? "feel before they understand" : "먼저 느끼게")
                  : sliderVals.s4 <= 2
                    ? (en ? "see the whole picture" : "전체를 조망하게")
                    : (en ? "step into the story" : "이야기 안으로 걸어 들어가게")}
              </em>
              {en ? "." : " 만드는 것이 내 문체다."}
            </>
          )}
        </div>
      </div>

      <hr className="ss-divider" />

      <h2 className="ss-section-title">{en ? "Reference Authors" : "참고할 작가 · 문체 레퍼런스"}</h2>
      <div className="ss-ref-grid">
        {referenceAuthors.map((a, i) => (
          <div key={i} className="ss-tip">
            <h3>{en ? a.nameEN : a.name}</h3>
            <p>{en ? a.descEN : a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
