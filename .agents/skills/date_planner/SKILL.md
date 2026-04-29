---
name: ai_date_planner
description: Calculates empty slots in a couple's calendar and generates an optimized date course using OpenAI.
---

# Date Planner AI Skill (데이트 조율 스킬)

**목적**: 커플 사용자의 일정 달력을 스캔하여 빈 슬롯을 찾아내고, 위시리스트 태그를 프롬프트로 엮어 LLM에 데이트 코스 큐레이션을 요청하는 스킬.

## 동작 원리 (Mechanism)
1. **DB 조회**: `couple_id`와 `target_date`를 파라미터로 받아서 해당 날짜의 `schedules` 레코드를 모두 읽어옵니다.
2. **슬롯 계산 (Slot Calculation)**: 이미 예약된 일정들의 시작-종료 시간을 배열로 묶은 뒤, 남은 여유 시간을 "사용 가능한 시간대"로 추출합니다.
3. **LLM 큐레이션**: `wishlists`에서 가장 많이 언급된 카테고리를 프롬프트 컨텍스트에 담아 GPT-4에 던져 가장 적합한 실내/실외 데이트 코스 JSON을 반환받습니다.

## 사용법 가이드 (API Call Example)
이 스킬은 프론트엔드 달력 뷰(모달)에서 사용자가 "AI 코스 조율하기 ✨" 버튼을 누를 때 호출됩니다.

```javascript
// 프론트엔드 클라이언트 호출 예시
const { data, error } = await supabase.functions.invoke('ai-date-planner', {
  body: { couple_id: 'uuid-1234', target_date: '2026-03-24' }
})

if (data) {
  console.log('AI Recommendation:', data.recommendation)
  // 예: "오후 4시에 성수동 팝업스토어에서 만나는 것은 어떨까요?"
}
```

## 에러 처리 제약 (Constraints)
- OpenAI API 호출 지연 시 프론트엔드에서 최소 3초 이상 Lottie Loading 애니메이션을 유지해야 합니다.
- 스케줄이 하루 종일 꽉 차 있는(All-day busy) 경우, 프론트엔드 모달에 "이 날짜는 너무 바빠요! 다른 날짜로 조율해 볼까요?" 라는 예외 처리를 반환합니다.
