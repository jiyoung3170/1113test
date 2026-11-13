/* =============================================================================
   preload.js — 첫 화면 깜빡임 방지용 (head 에서 가장 먼저 실행)
   -----------------------------------------------------------------------------
   - 사용자가 운영체제에서 '동작 줄이기(reduced motion)'를 켜지 않았다면
     <html> 에 has-motion 클래스를 붙여, 등장 애니메이션 전의 '숨김 상태'를 미리 적용합니다.
   - 만약 GSAP 라이브러리를 불러오지 못하면 main.js 가 이 클래스를 다시 제거해
     모든 콘텐츠가 그대로 보이도록 합니다. (수정할 필요 없는 파일입니다)
   ============================================================================= */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('has-motion');
})();
