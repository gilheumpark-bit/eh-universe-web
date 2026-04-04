# -*- coding: utf-8 -*-
import os, json, re

SRC_KO = "C:/Users/sung4/OneDrive/바탕 화면/AI 소설/EH_Universe_소스정리/보고서_콘텐츠"
SRC_EN = "C:/Users/sung4/OneDrive/바탕 화면/AI 소설/EH_Universe_소스정리/보고서_콘텐츠_EN"
WEB_FILE = "C:/Users/sung4/OneDrive/바탕 화면/AI 소설/설정집/최종 정리본/EH프로젝트/eh-universe-web/src/lib/articles-reports.ts"
OUT_FILE = "C:/Users/sung4/OneDrive/바탕 화면/AI 소설/설정집/최종 정리본/EH프로젝트/eh-universe-web/scripts/new-report-entries.txt"

# 웹에 이미 있는 slug
with open(WEB_FILE, 'r', encoding='utf-8') as f:
    content = f.read()
existing_slugs = set(re.findall(r'"(rpt-[^"]+)":', content))

SLUG_MAP = {
    'EH알파_신경제어_매뉴얼': 'rpt-eh-alpha-neural-control',
    '1954년_해외자산위탁_계약서': 'rpt-1954-overseas-asset-trust',
    '할란_노드폐기_통보': 'rpt-halan-node-disposal',
    'NHDC_등급분류체계_해설서': 'rpt-nhdc-classification-system',
    '강화인간_세대분류_보고서': 'rpt-enhanced-human-generations',
    '프로젝트_어센던시_개요서': 'rpt-project-ascendancy',
    'EH_통화체계_개요서': 'rpt-eh-currency-system',
    '이루아_인물기밀파일': 'rpt-irua-classified-file',
    '델타제로_부대_작전기록': 'rpt-delta-zero-operations',
    '글로벌노드_네트워크_구조도': 'rpt-global-node-network',
    '수용소_운영지침서': 'rpt-detention-facility-manual',
    '강태식_인물파일': 'rpt-kang-taesik-file',
    '제2차전쟁_경과보고서': 'rpt-second-war-progress',
    '제이든카터_인물파일': 'rpt-jayden-carter-file',
    '카터스레코드_아카이브_서문': 'rpt-carters-record-preface',
    '비밀조사국_요원등급체계': 'rpt-bureau-agent-classification',
    '97퍼센트_무지유지_프로토콜': 'rpt-97pct-ignorance-protocol',
    '네카_화학신호_중계시스템_분석': 'rpt-neka-chemical-relay',
    'HPP_인류보존프로토콜_상세': 'rpt-hpp-human-preservation',
    'NOA_안드로이드_기술사양서': 'rpt-noa-android-specs',
    '은하구역_위협도_평가서': 'rpt-galaxy-threat-assessment',
    '안식_약물_연구기록': 'rpt-rest-drug-research',
    'AK_최고의장_인물파일': 'rpt-ak-chairman-file',
    '인식표_시스템_매뉴얼': 'rpt-id-tag-system-manual',
    '람틴타핀_황제_인물파일': 'rpt-ramtintapin-emperor-file',
    'Finis_행성_정찰보고': 'rpt-finis-recon',
    '비개입원칙_역설분석': 'rpt-non-intervention-paradox',
    '생체서버_기술사양서': 'rpt-bioserver-specs',
    '협의회_함선등급_사양서': 'rpt-council-vessel-specs',
    'EH_Universe_타임라인': 'rpt-eh-universe-timeline',
    'SubprimeHuman_ProjectUSA_서문': 'rpt-subprime-human-usa',
    '기록은_사람보다_오래_산다': 'rpt-records-outlive-people',
    '하한선_계산공식_유출본': 'rpt-baseline-formula-leak',
    'NOB_시민등급_분류표': 'rpt-nob-citizen-classification',
    'JOCEI_한미공동감독위원회': 'rpt-jocei-committee',
    '네카_화학신호_7대체계': 'rpt-neka-chemical-7systems',
    'RIDE_Rip_공간절개_도약': 'rpt-ride-rip-spatial-leap',
    '공주_Princeps_탐지사격관제': 'rpt-princeps-fire-control',
    '황제함_임페라토르_내부구조': 'rpt-imperator-internal',
    '비밀조사국_조직개요': 'rpt-bureau-organization',
    '네카_황제_계보_1대4대': 'rpt-neka-emperor-lineage',
    '수오_철학_원문_분석서': 'rpt-suo-philosophy-analysis',
    'HPG_원년멤버_5인_프로필': 'rpt-hpg-founding-members',
    'HTCTBB_CWEH_기술사양서': 'rpt-htctbb-cweh-specs',
    '해방연대_조직구조_보고서': 'rpt-liberation-org-structure',
    '해방연대_3개거점행성_개요서': 'rpt-liberation-3planets',
    'NEO_모행성_프로필': 'rpt-neo-homeworld',
    '시코르_모성_프로필': 'rpt-sikor-homeworld',
    '인류_존재_3축_분류체계': 'rpt-human-3axis-classification',
    '3세력_전투교리_비교분석': 'rpt-3factions-combat-doctrine',
    'EH챔버_운용_매뉴얼': 'rpt-eh-chamber-manual',
    '함내_안드로이드_편제교범': 'rpt-android-org-manual',
    '양은하_비교관측_보고서': 'rpt-dual-galaxy-observation',
    'RED접경_8행성_전략프로필': 'rpt-red-border-8planets',
    '대기권_비행체_전수_카탈로그': 'rpt-atmo-vehicle-catalog',
    '3세력_이동체계_통합개요서': 'rpt-3factions-transport',
    '전략무기_전략자산_통합개요서': 'rpt-strategic-weapons-assets',
    # 기존 매핑 (중복 체크용)
    'Eschaton_함선침몰_사건보고서': 'rpt-eschaton-incident',
    'NOA10005_심문기록': 'rpt-noa10005-interrogation',
    'HPG01_기술로그': 'rpt-hpg01-technical',
    'RIDE_샘플_분석보고서': 'rpt-ride-analysis',
    '첫전투_17분_교전기록': 'rpt-first-combat-17min',
    '신민아_인물기밀파일': 'rpt-shin-mina-file',
    '비개입선언_원문_2100': 'rpt-non-intervention-2100',
    '네카종족_최초분류보고서': 'rpt-neka-classification',
    'RED구역_지정_의결서': 'rpt-red-zone-resolution',
    '탑승자_교범_발췌': 'rpt-rider-field-manual',
    'NHDC_긴급상황_가이드': 'rpt-nhdc-emergency-guide',
    '섹터제로_메인프레임_조사보고': 'rpt-sector-zero-mainframe',
    '국정감사_폭로사건_조사보고': 'rpt-national-audit-exposure',
    '에이든의_장부_발견보고': 'rpt-aidens-ledger-discovery',
    '하한선_상향조정_의결서': 'rpt-baseline-elevation',
    '건설감사_골재보강재_재분류': 'rpt-construction-aggregate',
    '안경착용자_긴급수거지침': 'rpt-eyeglass-collection',
    '신민아의_만년필_유물감정서': 'rpt-fountain-pen-appraisal',
    '인간자산_시가평가_기록': 'rpt-human-asset-valuation',
    'NHDC_건설감사_보고서': 'rpt-nhdc-construction-audit',
    '환경소음_주파수_조정기록': 'rpt-noise-frequency-adjust',
    '하수도_탈출경로_설계도': 'rpt-sewer-escape-blueprint',
    '수면유도제_배포_결과보고서': 'rpt-sleep-inducer-report',
}

def to_slug(name):
    name = re.sub(r'^\d+_', '', name).replace('.md', '')
    return SLUG_MAP.get(name, 'rpt-' + re.sub(r'[^a-z0-9-]', '', name.lower().replace('_', '-'))[:50])

en_files = {f: os.path.join(SRC_EN, f) for f in os.listdir(SRC_EN)}
ko_files = sorted(os.listdir(SRC_KO))

new_entries = []
for ko_file in ko_files:
    name = re.sub(r'^\d+_', '', ko_file.replace('.md', ''))
    slug = to_slug(ko_file)

    if slug in existing_slugs:
        continue

    with open(os.path.join(SRC_KO, ko_file), 'r', encoding='utf-8') as f:
        ko_content = f.read().strip()

    ko_title = name.replace('_', ' ')

    en_content = ""
    en_title = ko_title
    if ko_file in en_files:
        with open(en_files[ko_file], 'r', encoding='utf-8') as f:
            en_content = f.read().strip()
        en_first = en_content.split('\n')[0].strip()
        if en_first.startswith('#'):
            en_title = en_first.lstrip('#').strip()

    new_entries.append({
        'slug': slug,
        'ko_title': ko_title,
        'en_title': en_title,
        'ko_content': ko_content,
        'en_content': en_content,
    })

print(f"미등록 {len(new_entries)}건")

# Generate TS
lines = []
for e in new_entries:
    ko_c = json.dumps(e['ko_content'], ensure_ascii=False)
    en_c = json.dumps(e['en_content'], ensure_ascii=False)
    ko_t = json.dumps(e['ko_title'], ensure_ascii=False)
    en_t = json.dumps(e['en_title'], ensure_ascii=False)
    lines.append(f'  {json.dumps(e["slug"])}: {{\n    "title": {{ "ko": {ko_t}, "en": {en_t} }},\n    "level": "CLASSIFIED",\n    "category": "REPORTS",\n    "related": [],\n    "content": {{ "ko": {ko_c}, "en": {en_c} }}\n  }}')

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(',\n'.join(lines))

print(f"출력: {OUT_FILE} ({len(lines)}건)")
