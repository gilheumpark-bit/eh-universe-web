// ============================================================
// builtin-snippets.ts — 작가용 빌트인 스니펫.
// 한국 웹소설 작가 흔한 패턴 25 개 (5 카테고리 × 5).
// ============================================================

import type { Snippet } from './types';

export const BUILTIN_SNIPPETS: Snippet[] = [
  // description (5)
  {
    id: 'desc-night',
    prefix: 'desc-night',
    name: { ko: '밤 풍경', en: 'Night scene', ja: '夜の風景', zh: '夜景' },
    category: 'description',
    body: '달빛이 ${1:고즈넉하게} 내려앉은 ${2:거리}는 ${3:적막}으로 가득했다.',
    scope: 'builtin',
  },
  {
    id: 'desc-rain',
    prefix: 'desc-rain',
    name: { ko: '비 묘사', en: 'Rain', ja: '雨の描写', zh: '雨' },
    category: 'description',
    body: '굵은 빗줄기가 ${1:창문을} 두드렸다. ${2:차가운 공기}가 안으로 스며들었다.',
    scope: 'builtin',
  },
  {
    id: 'desc-cold',
    prefix: 'desc-cold',
    name: { ko: '추위', en: 'Cold', ja: '寒さ', zh: '冷' },
    category: 'description',
    body: '찬 바람이 ${1:뺨을} 스쳤다. ${2:입김}이 허공에 흩어졌다.',
    scope: 'builtin',
  },
  {
    id: 'desc-light',
    prefix: 'desc-light',
    name: { ko: '아침 빛', en: 'Morning light', ja: '朝の光', zh: '晨光' },
    category: 'description',
    body: '햇살이 ${1:창문 사이로} 비집고 들어왔다.',
    scope: 'builtin',
  },
  {
    id: 'desc-silence',
    prefix: 'desc-silence',
    name: { ko: '정적', en: 'Silence', ja: '静寂', zh: '寂静' },
    category: 'description',
    body: '${1:방 안}은 숨소리조차 들리지 않을 만큼 고요했다.',
    scope: 'builtin',
  },

  // dialogue (5)
  {
    id: 'dlg-tense',
    prefix: 'dlg-tense',
    name: { ko: '긴장 대화', en: 'Tense dialogue', ja: '緊張の対話', zh: '紧张对话' },
    category: 'dialogue',
    body: '"${1:정말 그래?}"\n${2:그}는 ${3:나}를 ${4:똑바로} 쳐다보았다.\n"${5:그렇다.}"',
    scope: 'builtin',
  },
  {
    id: 'dlg-calm',
    prefix: 'dlg-calm',
    name: { ko: '평온 대화', en: 'Calm dialogue', ja: '穏やかな対話', zh: '平静对话' },
    category: 'dialogue',
    body: '"${1:그래.}" ${2:그}가 가볍게 ${3:고개를 끄덕였다}.',
    scope: 'builtin',
  },
  {
    id: 'dlg-shout',
    prefix: 'dlg-shout',
    name: { ko: '외침', en: 'Shout', ja: '叫び', zh: '喊叫' },
    category: 'dialogue',
    body: '"${1:안 돼!}"\n${2:그}의 외침이 ${3:공간}을 가득 채웠다.',
    scope: 'builtin',
  },
  {
    id: 'dlg-whisper',
    prefix: 'dlg-whisper',
    name: { ko: '속삭임', en: 'Whisper', ja: 'ささやき', zh: '低语' },
    category: 'dialogue',
    body: '"${1:비밀이야.}" ${2:그}가 ${3:나}의 귀에 대고 속삭였다.',
    scope: 'builtin',
  },
  {
    id: 'dlg-question',
    prefix: 'dlg-question',
    name: { ko: '질문 응답', en: 'Q&A', ja: '質疑応答', zh: '问答' },
    category: 'dialogue',
    body: '"${1:왜 그랬어?}"\n${2:그}는 잠시 침묵하다 ${3:천천히 입을 열었다}.\n"${4:나도 모르겠어.}"',
    scope: 'builtin',
  },

  // transition (5)
  {
    id: 'trans-time',
    prefix: 'trans-time',
    name: { ko: '시간 경과', en: 'Time skip', ja: '時間経過', zh: '时间流逝' },
    category: 'transition',
    body: '시간이 흘렀다. ${1:며칠} 후, ${2:나}는 ${3:다시 그 자리에 서 있었다}.',
    scope: 'builtin',
  },
  {
    id: 'trans-place',
    prefix: 'trans-place',
    name: { ko: '장소 이동', en: 'Place change', ja: '場所移動', zh: '场景切换' },
    category: 'transition',
    body: '\n* * *\n\n${1:장소}는 사뭇 달랐다.',
    scope: 'builtin',
  },
  {
    id: 'trans-pov',
    prefix: 'trans-pov',
    name: { ko: '시점 전환', en: 'POV switch', ja: '視点切替', zh: '视角切换' },
    category: 'transition',
    body: '\n* * *\n\n한편 ${1:그쪽}에서는 ${2:그}가 ${3:다른 일}에 몰두하고 있었다.',
    scope: 'builtin',
  },
  {
    id: 'trans-flashback',
    prefix: 'trans-flashback',
    name: { ko: '회상', en: 'Flashback', ja: '回想', zh: '回忆' },
    category: 'transition',
    body: '${1:그 순간}, ${2:나}는 ${3:오래 전 어느 날}을 떠올렸다.',
    scope: 'builtin',
  },
  {
    id: 'trans-cliff',
    prefix: 'trans-cliff',
    name: { ko: '클리프행어', en: 'Cliffhanger', ja: 'クリフハンガー', zh: '悬念' },
    category: 'transition',
    body: '${1:그러나} 그것이 ${2:끝}이 아니었다.\n\n— ${3:다음 화에서 계속}',
    scope: 'builtin',
  },

  // action (5)
  {
    id: 'act-fight',
    prefix: 'act-fight',
    name: { ko: '전투', en: 'Combat', ja: '戦闘', zh: '战斗' },
    category: 'action',
    body: '${1:검}이 허공을 갈랐다. ${2:상대}가 ${3:몸을 비틀어} 피했다. ${4:공기}가 갈라지는 소리.',
    scope: 'builtin',
  },
  {
    id: 'act-chase',
    prefix: 'act-chase',
    name: { ko: '추격', en: 'Chase', ja: '追跡', zh: '追逐' },
    category: 'action',
    body: '${1:나}는 달렸다. ${2:발소리}가 점점 가까워졌다.',
    scope: 'builtin',
  },
  {
    id: 'act-magic',
    prefix: 'act-magic',
    name: { ko: '마법 발동', en: 'Magic cast', ja: '魔法発動', zh: '施法' },
    category: 'action',
    body: '${1:손바닥}에 ${2:푸른 빛}이 모였다. ${3:주문}이 입술을 떠나는 순간 ${4:공간}이 일그러졌다.',
    scope: 'builtin',
  },
  {
    id: 'act-fall',
    prefix: 'act-fall',
    name: { ko: '낙하', en: 'Fall', ja: '落下', zh: '坠落' },
    category: 'action',
    body: '${1:나}는 떨어졌다. ${2:바람}이 귓가를 사납게 스쳤다.',
    scope: 'builtin',
  },
  {
    id: 'act-explode',
    prefix: 'act-explode',
    name: { ko: '폭발', en: 'Explosion', ja: '爆発', zh: '爆炸' },
    category: 'action',
    body: '쾅—\n${1:충격파}가 ${2:공간}을 휩쓸었다. ${3:연기}가 자욱했다.',
    scope: 'builtin',
  },

  // emotion (5)
  {
    id: 'emo-anger',
    prefix: 'emo-anger',
    name: { ko: '분노', en: 'Anger', ja: '怒り', zh: '愤怒' },
    category: 'emotion',
    body: '${1:나}의 손이 떨렸다. ${2:가슴} 속에서 무언가가 부글거렸다.',
    scope: 'builtin',
  },
  {
    id: 'emo-sad',
    prefix: 'emo-sad',
    name: { ko: '슬픔', en: 'Sadness', ja: '悲しみ', zh: '悲伤' },
    category: 'emotion',
    body: '${1:나}는 ${2:고개를 떨궜다}. ${3:눈물}이 ${4:뺨}을 타고 흘렀다.',
    scope: 'builtin',
  },
  {
    id: 'emo-joy',
    prefix: 'emo-joy',
    name: { ko: '기쁨', en: 'Joy', ja: '喜び', zh: '喜悦' },
    category: 'emotion',
    body: '${1:나}는 웃었다. ${2:오랜만}의 웃음이었다.',
    scope: 'builtin',
  },
  {
    id: 'emo-fear',
    prefix: 'emo-fear',
    name: { ko: '공포', en: 'Fear', ja: '恐怖', zh: '恐惧' },
    category: 'emotion',
    body: '${1:심장}이 빠르게 뛰었다. ${2:그}는 ${3:한 발짝}도 움직일 수 없었다.',
    scope: 'builtin',
  },
  {
    id: 'emo-love',
    prefix: 'emo-love',
    name: { ko: '사랑', en: 'Love', ja: '愛', zh: '爱' },
    category: 'emotion',
    body: '${1:그}의 미소가 ${2:나}의 마음 한 켠에 ${3:따스하게} 자리잡았다.',
    scope: 'builtin',
  },
];
