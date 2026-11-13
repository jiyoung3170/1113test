/* =============================================================================
   OAT & CLAY — Handmade Soap Promotion  /  main.js
   -----------------------------------------------------------------------------
   [수정가이드] 이 파일의 구성 (기능별 함수로 나뉘어 있습니다)
     00. 공통 설정·도우미 함수
     01. 부드러운 스크롤(Lenis) & 섹션 이동
     02. 헤더 (스크롤 상태·숨김·현재 메뉴 표시·어두운 섹션 감지)
     03. 모바일 햄버거 메뉴
     04. 스크롤 진행률 바 / 맨 위로 버튼
     05. SECTION 01 HOME       : 텍스트 등장, 원형 이미지 확대 → 다음 섹션 연결
     06. SECTION 02 BRAND STORY: 배경 패럴랙스, 문장 순차 등장, 다층 패럴랙스
     07. SECTION 03 OUR VALUES : 배경색 전환, 화면 고정 + 키워드 교체
     08. SECTION 04 PRODUCT    : 가로 스크롤(데스크톱) / 터치 슬라이드(모바일)
     09. SECTION 05 PROCESS    : 고정 이미지 + 단계별 마스크 전환
     10. SECTION 06 SHOP NOW   : 배경 줌, 카피 등장, 지연 버튼
     11. 공통 스크롤 등장(reveal-up)
     12. 제품 상세 모달
     13. 장바구니 (localStorage 저장)
     14. 뉴스레터 폼 검사
     15. 토스트 알림 / 이미지 오류 대체
     16. 초기 실행

   * 애니메이션 시간·속도는 각 함수 안의 duration(초), end:'+=200%'(고정 구간 길이) 값을 조절하세요.
   * GSAP 이 없거나 '동작 줄이기' 설정이면 애니메이션 없이도 모든 기능이 동작하도록 만들어져 있습니다.
   ============================================================================= */
(function () {
  'use strict';

  /* ===========================================================================
     00. 공통 설정·도우미 함수
     =========================================================================== */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const root = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const MOTION = hasGSAP && !prefersReduced;            // 스크롤 애니메이션 사용 여부
  const isTouch = window.matchMedia('(hover: none)').matches;

  // 반응형 기준점 (CSS 의 768px 미디어쿼리와 동일하게 유지하세요)
  const MQ_DESKTOP = '(min-width: 769px)';
  const MQ_MOBILE  = '(max-width: 768px)';

  // 애니메이션을 쓰지 않는 경우, 미리 숨겨 둔 요소가 보이도록 클래스 제거
  if (!MOTION) root.classList.remove('has-motion');
  if (MOTION) gsap.registerPlugin(ScrollTrigger);

  // 원화 표시 (예: 15000 → ₩15,000)
  const won = (n) => '₩' + Number(n).toLocaleString('ko-KR');

  // 스크롤 잠금 (모달·메뉴가 열려 있을 때 배경 스크롤 방지)
  function lockScroll(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
    if (lenis) lock ? lenis.stop() : lenis.start();
  }


  /* ===========================================================================
     01. 부드러운 스크롤(Lenis) & 섹션 이동
     - Lenis 는 마우스 휠 스크롤을 부드럽게 만들어 주는 선택 라이브러리입니다.
       터치 기기는 기본 스크롤이 이미 부드러워 사용하지 않습니다.
     - lerp 값(0~1)이 작을수록 더 천천히 미끄러지듯 움직입니다.
     =========================================================================== */
  let lenis = null;
  if (MOTION && !isTouch && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);                 // ScrollTrigger 와 동기화
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // 지정 위치(요소 또는 숫자)로 부드럽게 이동
  function scrollToTarget(target) {
    // 화면에 고정(pin)된 섹션은 감싸고 있는 pin-spacer 의 위치를 기준으로 계산
    if (typeof target !== 'number' && target.parentElement && target.parentElement.classList.contains('pin-spacer')) {
      target = target.parentElement;
    }
    const y = typeof target === 'number'
      ? target
      : target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
  }

  // 페이지 안 링크(#home, #story …) 클릭 시 부드럽게 이동
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute('href');
      e.preventDefault();
      if (hash === '#') {                       // 아직 주소가 없는 링크(SNS 등)
        showToast('준비 중인 링크입니다. HTML에서 주소를 입력해 주세요.');
        return;
      }
      const target = $(hash);
      if (!target) return;
      closeMenu();
      scrollToTarget(target);
      history.replaceState(null, '', hash);     // 주소창에 #섹션 표시
    });
  }


  /* ===========================================================================
     02. 헤더
     - 스크롤 40px 이상 : 반투명 배경(.is-scrolled)
     - 아래로 스크롤 : 헤더 숨김 / 위로 스크롤 : 다시 표시
     - 현재 보고 있는 섹션의 메뉴에 .is-active 표시
     - OUR VALUES · SHOP NOW 처럼 어두운 섹션 위에서는 글자색 반전(.is-dark)
     =========================================================================== */
  const header = $('#header');
  const sections = $$('main > section[id]');
  const navLinks = $$('.gnb__link');
  const DARK_SECTIONS = ['values', 'shop'];   // 어두운 배경 섹션 id (추가 시 여기에 등록)
  let lastY = window.scrollY;

  function updateHeader() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);

    // 메뉴가 열려 있지 않을 때만 숨김/표시
    if (!document.body.classList.contains('menu-open')) {
      const goingDown = y > lastY && y > 300;
      header.classList.toggle('is-hidden', goingDown);
    }
    lastY = y;

    // 헤더 높이 지점에 걸친 섹션 찾기
    const probe = header.offsetHeight * 0.6;
    let current = sections[0];
    sections.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) current = sec;
    });
    if (current) {
      header.classList.toggle('is-dark', DARK_SECTIONS.includes(current.id));
      navLinks.forEach((link) => {
        const on = link.getAttribute('href') === '#' + current.id;
        link.classList.toggle('is-active', on);
        on ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
      });
    }
  }


  /* ===========================================================================
     03. 모바일 햄버거 메뉴 (1024px 이하에서 표시)
     =========================================================================== */
  const menuBtn = $('#menuBtn');
  const gnb = $('#gnb');

  function openMenu() {
    gnb.classList.add('is-open');
    document.body.classList.add('menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', '메뉴 닫기');
    header.classList.remove('is-hidden');
    lockScroll(true);
  }
  function closeMenu() {
    if (!gnb.classList.contains('is-open')) return;
    gnb.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', '메뉴 열기');
    lockScroll(false);
  }
  function initMenu() {
    menuBtn.addEventListener('click', () => (gnb.classList.contains('is-open') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    // 화면을 넓히면 모바일 메뉴 자동 닫기
    window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
  }


  /* ===========================================================================
     04. 스크롤 진행률 바 / 맨 위로 버튼
     =========================================================================== */
  const progressBar = $('.scroll-progress span');
  const toTop = $('#toTop');

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    progressBar.style.width = (ratio * 100).toFixed(2) + '%';
    toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  }
  function initToTop() {
    toTop.addEventListener('click', () => scrollToTarget(0));
  }

  // 스크롤 이벤트를 한 프레임에 한 번만 처리 (성능 최적화)
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateHeader();
      updateProgress();
      ticking = false;
    });
  }


  /* ===========================================================================
     05. SECTION 01 HOME
     ① 로딩 시 대형 타이틀이 아래에서 위로 순차 등장 (Text Reveal + Fade In)
     ② 원형 비누 이미지가 작은 크기에서 확대되며 등장 (Scale Up)
     ③ 스크롤 시 타이틀은 빠르게, 이미지는 천천히 위로 (Parallax)
     ④ 원형 이미지가 확대되어 다음 섹션 배경으로 연결 (Circle Mask Expansion, 데스크톱)
     =========================================================================== */
  function initHeroIntro() {
    if (!MOTION) return;
    const tl = gsap.timeline({ delay: 0.15, defaults: { ease: 'power3.out' } });
    tl.to('.hero__eyebrow', { opacity: 1, duration: 0.8 })
      .to('.hero__title .line > span', { y: 0, duration: 1.0, stagger: 0.14 }, '-=0.5')        // ①
      .to('.hero__circle', { scale: 1, opacity: 1, duration: 1.4, ease: 'expo.out' }, '-=0.9') // ②
      .to(['.hero__copy', '.scroll-cue'], { opacity: 1, duration: 0.8, stagger: 0.1 }, '-=0.8');
  }

  function initHeroScroll() {
    if (!MOTION) return;
    const hero = $('#home');
    const inner = $('.hero__inner');
    const circle = $('#heroCircle');
    const mask = $('#heroMask');
    const mm = gsap.matchMedia();

    // --- 데스크톱 : 화면 고정 + 원형 확장 ---
    mm.add(MQ_DESKTOP, () => {
      const state = { r: 0, dy: 0 };   // r: 마스크 반지름(px), dy: 원 이미지 이동량
      let cx = 0, cy = 0, r0 = 0, rMax = 0;

      // 원의 중심·반지름 계산 (창 크기가 바뀌면 다시 계산)
      const measure = () => {
        r0 = circle.offsetWidth / 2;
        cx = inner.offsetLeft + circle.offsetLeft + r0;
        cy = inner.offsetTop + circle.offsetTop + r0;
        const w = hero.offsetWidth, h = hero.offsetHeight;
        rMax = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 20;
      };
      const paint = () => {
        // 원이 원래 크기일 때는 마스크를 숨기고, 커지기 시작하면 표시
        const r = state.r <= r0 + 1 ? 0 : state.r;
        mask.style.clipPath = `circle(${r}px at ${cx}px ${cy + state.dy}px)`;
      };
      measure();
      state.r = r0;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=130%',            // 고정 구간 길이 (값이 클수록 천천히 확장)
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onRefresh: () => { measure(); paint(); }
        },
        onUpdate: paint
      });

      tl.to('.hero__title', { y: -260, opacity: 0, ease: 'none', duration: 0.6 }, 0)          // 타이틀: 빠르게
        .to(['.hero__eyebrow', '.hero__copy'], { y: -120, opacity: 0, ease: 'none', duration: 0.4 }, 0)
        .to(state, { dy: -70, ease: 'none', duration: 0.3 }, 0)                               // 이미지: 천천히
        .to(circle, { y: -70, ease: 'none', duration: 0.3 }, 0)
        .to(state, { r: () => rMax, ease: 'power2.in', duration: 0.7 }, 0.3)                  // ④ 원형 확장
        .to('.deco--blob1', { scale: 1.4, opacity: 0, ease: 'none', duration: 0.6 }, 0);

      return () => { mask.style.clipPath = ''; };
    });

    // --- 모바일 : 고정 없이 가벼운 패럴랙스만 ---
    mm.add(MQ_MOBILE, () => {
      gsap.to('.hero__title', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to(circle, { y: -40, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    });
  }


  /* ===========================================================================
     06. SECTION 02 BRAND STORY
     ① 배경 사진이 화면보다 느리게 이동 (Background Parallax)
     ② 소개 문장이 한 줄씩 등장 (Stagger Text Reveal)
     ③ 제작 사진 두 장이 서로 다른 속도로 이동 (Multi-layer Parallax, data-speed)
     ④ 사진 영역 진입 시 천천히 확대 → 원래 크기 (Scroll Scale)
     =========================================================================== */
  function initStory() {
    if (!MOTION) return;

    gsap.fromTo('.story__bg', { yPercent: -6 }, {                                  // ①
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.story__hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.from('.story__hero-text > *', {
      y: 60, opacity: 0, duration: 1, stagger: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '.story__hero', start: 'top 40%' }
    });

    gsap.to('.story-line', {                                                        // ②
      opacity: 1, y: 0, duration: 0.9, stagger: 0.18, ease: 'power3.out',
      scrollTrigger: { trigger: '.story__lines', start: 'top 80%' }
    });

    const mm = gsap.matchMedia();
    mm.add(MQ_DESKTOP, () => {
      $$('.story__img').forEach((fig) => {                                          // ③
        const speed = parseFloat(fig.dataset.speed) || 0;
        gsap.fromTo(fig, { y: -speed / 2 }, {
          y: speed, ease: 'none',
          scrollTrigger: { trigger: '.story__media', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });
    $$('.story__img img').forEach((img) => {                                        // ④
      gsap.fromTo(img, { scale: 1.3 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'center center', scrub: true }
      });
    });
  }


  /* ===========================================================================
     07. SECTION 03 OUR VALUES
     ① 섹션 진입 시 배경색 Oat Cream → Cocoa (Background Color Transition)
     ② 데스크톱: 중앙 키워드를 화면에 고정 (Scroll Pinning)
     ③ 스크롤에 따라 NATURAL → HANDMADE → SUSTAINABLE 교체 (Text Change)
     ④ 키워드별 이미지·원료 이미지가 다른 방향/속도로 이동 (Layered Parallax / Overlap)
     - 모바일·애니메이션 미사용 시 : 키워드가 2.6초마다 자동으로 바뀝니다.
     =========================================================================== */
  const values = {
    words: [], infos: [], dots: [], layers: [],
    index: 0, pinned: false, timer: null, inView: false
  };

  function setValue(i) {
    if (i === values.index) return;
    const prev = values.index;
    values.index = i;
    values.words.forEach((el, n) => {
      el.classList.toggle('is-active', n === i);
      el.classList.toggle('is-prev', n === prev && n !== i);
      el.setAttribute('aria-hidden', n === i ? 'false' : 'true');
    });
    values.infos.forEach((el, n) => el.classList.toggle('is-active', n === i));
    values.dots.forEach((el, n) => el.classList.toggle('is-active', n === i));
    values.layers.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.index) === i));
  }

  function initValues() {
    values.words = $$('.values__word');
    values.infos = $$('.values__info');
    values.dots = $$('.values__dots li');
    values.layers = $$('.values__layer');
    values.words.forEach((el, n) => el.setAttribute('aria-hidden', n === 0 ? 'false' : 'true'));
    values.layers.forEach((el) => el.classList.toggle('is-active', el.dataset.index === '0'));
    const count = values.words.length;

    // 자동 전환 (고정 모드가 아닐 때, 화면에 보일 때만 동작)
    new IntersectionObserver((entries) => {
      values.inView = entries[0].isIntersecting;
    }, { threshold: 0.3 }).observe($('#valuesStage'));
    values.timer = setInterval(() => {
      if (!values.pinned && values.inView) setValue((values.index + 1) % count);
    }, 2600);

    if (!MOTION) return;

    gsap.fromTo('.values', { backgroundColor: '#F2E6D5' }, {                         // ①
      backgroundColor: '#6C493A', ease: 'none',
      scrollTrigger: { trigger: '.values', start: 'top 85%', end: 'top 25%', scrub: true }
    });

    const mm = gsap.matchMedia();
    mm.add(MQ_DESKTOP, () => {
      values.pinned = true;
      setValue(0);
      ScrollTrigger.create({                                                         // ② ③
        trigger: '#valuesStage',
        start: 'top top',
        end: '+=' + (count * 70) + '%',     // 키워드 1개당 화면 높이의 70%만큼 머무름
        pin: true,
        onUpdate: (self) => setValue(Math.min(count - 1, Math.floor(self.progress * count)))
      });
      return () => { values.pinned = false; };
    });

    $$('.values__float').forEach((el) => {                                           // ④
      gsap.to(el, {
        y: parseFloat(el.dataset.speed) || 0, ease: 'none',
        scrollTrigger: { trigger: '.values', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('.values__layer img').forEach((img, n) => {
      gsap.fromTo(img, { yPercent: n % 2 ? 8 : -8, scale: 1.15 }, {
        yPercent: n % 2 ? -8 : 8, ease: 'none',
        scrollTrigger: { trigger: '.values', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }


  /* ===========================================================================
     08. SECTION 04 PRODUCT
     [데스크톱] ① 화면 고정 + 세로 스크롤로 가로 이동 (Horizontal Scroll + Pin)
               ② 가운데 제품은 확대, 양옆은 축소 (Focus Scale)
               ③ 이미지와 제품명이 다른 속도로 이동 (Foreground Parallax)
               ④ 가운데 제품의 data-bg 색으로 배경 전환 (Background Color Transition)
               ⑤ 마우스 오버 시 확대 + '자세히 보기' 등장 (CSS 호버)
     [모바일]  가로 스크롤 대신 손가락으로 넘기는 터치 슬라이드 + 점 표시
     =========================================================================== */
  const product = {
    section: null, viewport: null, track: null, cards: [], dots: [],
    mode: 'native',       // 'pin'(데스크톱 가로 스크롤) 또는 'native'(터치 슬라이드)
    st: null, current: 0
  };

  // 화면 중앙과 가까울수록 크게 + 배경색 전환 + 이미지 시차 이동
  function updateProductFocus() {
    const vpRect = product.viewport.getBoundingClientRect();
    const center = vpRect.left + vpRect.width / 2;
    let nearest = 0, nearestDist = Infinity;

    product.cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const d = (r.left + r.width / 2 - center) / vpRect.width;   // -0.5 ~ 0.5 정도
      const ad = Math.min(Math.abs(d), 1);
      if (Math.abs(d) < nearestDist) { nearestDist = Math.abs(d); nearest = i; }
      if (MOTION) {
        card.style.transform = `scale(${(1.06 - ad * 0.22).toFixed(3)})`;                       // ②
        const img = card.querySelector('.product-card__img img');
        if (img) img.style.setProperty('--px', (d * -30).toFixed(1) + 'px');                     // ③
        card.querySelector('.product-card__info').style.transform = `translateX(${(d * 24).toFixed(1)}px)`;
      }
    });

    if (nearest !== product.current || !product.section.style.backgroundColor) {
      product.current = nearest;
      product.section.style.backgroundColor = product.cards[nearest].dataset.bg || '';       // ④
      product.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === nearest));
    }
    $('#prodPrev').disabled = nearest === 0;
    $('#prodNext').disabled = nearest === product.cards.length - 1;
  }

  // 특정 제품으로 이동
  function goToProduct(i) {
    i = Math.max(0, Math.min(product.cards.length - 1, i));
    const card = product.cards[i];
    if (product.mode === 'pin' && product.st) {
      // 가로 스크롤 모드: 해당 카드가 중앙에 오도록 세로 스크롤 위치 계산
      const dist = product.track.scrollWidth - window.innerWidth;
      const offset = card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
      const ratio = Math.max(0, Math.min(1, offset / dist));
      scrollToTarget(product.st.start + (product.st.end - product.st.start) * ratio);
    } else {
      // 터치 슬라이드 모드: 가로로 스크롤
      const vp = product.viewport;
      vp.scrollTo({ left: card.offsetLeft - (vp.clientWidth - card.offsetWidth) / 2, behavior: prefersReduced ? 'auto' : 'smooth' });
    }
  }

  function setProductMode(mode) {
    product.mode = mode;
    product.section.classList.toggle('is-native', mode === 'native');
    // Lenis 가 터치 슬라이드의 가로 스크롤을 가로채지 않도록 표시
    if (mode === 'native') product.viewport.setAttribute('data-lenis-prevent', '');
    else product.viewport.removeAttribute('data-lenis-prevent');
  }

  function initProduct() {
    product.section = $('#product');
    product.viewport = $('#productViewport');
    product.track = $('#productTrack');
    product.cards = $$('.product-card', product.track);

    // 점(dot) 버튼 자동 생성 : 제품 수만큼
    const dotsWrap = $('#productDots');
    product.cards.forEach((card, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `${i + 1}번째 제품 보기`);
      b.addEventListener('click', () => goToProduct(i));
      dotsWrap.appendChild(b);
    });
    product.dots = $$('button', dotsWrap);
    dotsWrap.removeAttribute('aria-hidden');

    $('#prodPrev').addEventListener('click', () => goToProduct(product.current - 1));
    $('#prodNext').addEventListener('click', () => goToProduct(product.current + 1));

    // 터치 슬라이드 스크롤 시 포커스 갱신
    let raf = 0;
    product.viewport.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateProductFocus);
    }, { passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(updateProductFocus));

    // 상세 보기 : 이미지 영역이나 '자세히 보기' 클릭 시 모달 열기
    product.track.addEventListener('click', (e) => {
      const hit = e.target.closest('.product-card__more, .product-card__img');
      if (hit) openModal(hit.closest('.product-card'), hit);
    });

    if (!MOTION) {
      setProductMode('native');
      updateProductFocus();
      return;
    }

    const mm = gsap.matchMedia();
    mm.add(MQ_DESKTOP, () => {
      setProductMode('pin');
      const dist = () => product.track.scrollWidth - window.innerWidth;
      const tween = gsap.to(product.track, {                                          // ①
        x: () => -dist(),
        ease: 'none',
        onUpdate: updateProductFocus,
        scrollTrigger: {
          trigger: '#productPin',
          start: 'top top',
          end: () => '+=' + dist(),
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: updateProductFocus
        }
      });
      product.st = tween.scrollTrigger;
      updateProductFocus();
      return () => { product.st = null; };
    });
    mm.add(MQ_MOBILE, () => {
      setProductMode('native');
      gsap.set(product.track, { x: 0 });
      updateProductFocus();
    });
  }


  /* ===========================================================================
     09. SECTION 05 HANDMADE PROCESS
     ① 왼쪽 메인 이미지가 화면에 고정 (CSS position: sticky)
     ② 단계가 화면 중앙에 오면 해당 단계 이미지로 교체 (Image Sequence)
     ③ 단계 번호·설명이 아래에서 위로 등장 (Fade Up)
     ④ 이미지 내부 패럴랙스 (Image Parallax)
     ⑤ 이미지 전환 시 아래→위로 열리는 마스크 (CSS clip-path 전환)
     =========================================================================== */
  function setProcessStep(n) {
    $$('.process__frame').forEach((f) => {
      const s = Number(f.dataset.step);
      f.classList.toggle('is-active', s === n);
      f.classList.toggle('is-past', s < n);
    });
    $$('.process__step').forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === n));
    $('#processNow').textContent = String(n).padStart(2, '0');
  }

  function initProcess() {
    const steps = $$('.process__step');
    setProcessStep(1);

    // 화면 세로 중앙(위아래 45% 제외 영역)에 들어온 단계를 활성화 → ②⑤
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setProcessStep(Number(en.target.dataset.step)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));

    if (!MOTION) return;

    steps.forEach((step) => {                                                          // ③
      gsap.from(step.querySelectorAll('.process__num, h3, p'), {
        y: 50, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: step, start: 'top 75%' }
      });
    });
    gsap.fromTo('.process__frame img', { yPercent: -6 }, {                             // ④
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.process__wrap', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }


  /* ===========================================================================
     10. SECTION 06 SHOP NOW
     ① 배경 이미지가 천천히 축소되며 화면을 채움 (Background Zoom)
     ② 메인 카피가 아래에서 위로 등장 (Text Reveal)
     ③ 배경은 느리게, 텍스트는 빠르게 이동 (Parallax)
     ④ 구매 버튼은 약간 늦게 등장 (Delayed Fade In)
     ⑤ 버튼 호버 시 배경 전환 + 화살표 이동 (CSS :hover)
     =========================================================================== */
  function initShop() {
    if (!MOTION) return;
    const trig = { trigger: '.shop', start: 'top bottom', end: 'bottom bottom', scrub: true };

    gsap.fromTo('.shop__bg img', { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: trig });      // ①
    gsap.fromTo('.shop__bg', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: trig });      // ③ 배경(느림)
    gsap.fromTo('.shop__content', { y: 120 }, { y: -30, ease: 'none', scrollTrigger: { ...trig, end: 'bottom top' } }); // ③ 텍스트(빠름)

    const tl = gsap.timeline({ scrollTrigger: { trigger: '.shop', start: 'top 55%' }, defaults: { ease: 'power3.out' } });
    tl.to('.shop__title .line > span', { y: 0, duration: 1, stagger: 0.14 })                                 // ②
      .to('.shop__fade', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, '-=0.5')
      .to('.shop__cta', { opacity: 1, y: 0, duration: 0.8 }, '+=0.25');                                       // ④
  }


  /* ===========================================================================
     11. 공통 스크롤 등장 — class="reveal-up" 이 붙은 요소는 화면에 들어올 때 떠오릅니다.
     =========================================================================== */
  function initReveal() {
    if (!MOTION) return;
    ScrollTrigger.batch('.reveal-up', {
      start: 'top 88%',
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', overwrite: true })
    });
  }


  /* ===========================================================================
     12. 제품 상세 모달
     - 내용은 제품 카드의 data-name / data-price / data-desc / data-notes 에서 가져옵니다.
     - ESC 키, 배경 클릭, X 버튼으로 닫힙니다. 열려 있는 동안 Tab 키 포커스가 모달 안에 머뭅니다.
     =========================================================================== */
  const modal = {
    el: null, current: null, lastFocus: null, price: 0
  };

  function getFocusable(container) {
    return $$('button, [href], input, [tabindex]:not([tabindex="-1"])', container).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function openModal(card, trigger) {
    if (!card) return;
    const img = card.querySelector('img');
    modal.current = card;
    modal.lastFocus = trigger || document.activeElement;
    modal.price = Number(card.dataset.price) || 0;

    $('#modalImg').src = img.currentSrc || img.src;
    $('#modalImg').alt = img.alt;
    $('#modalTitle').textContent = card.dataset.name;
    $('#modalTag').textContent = card.querySelector('.product-card__tag').textContent;
    $('#modalDesc').textContent = card.dataset.desc || '';
    $('#modalNotes').textContent = card.dataset.notes || '';
    $('#qtyInput').value = 1;
    updateModalPrice();

    modal.el.hidden = false;
    requestAnimationFrame(() => modal.el.classList.add('is-open'));
    lockScroll(true);
    $('.modal__close', modal.el).focus();
  }

  function closeModal() {
    if (modal.el.hidden) return;
    modal.el.classList.remove('is-open');
    setTimeout(() => { modal.el.hidden = true; }, 450);
    lockScroll(false);
    if (modal.lastFocus) modal.lastFocus.focus({ preventScroll: true });
  }

  function getQty() {
    const input = $('#qtyInput');
    let q = parseInt(input.value, 10);
    if (isNaN(q) || q < 1) q = 1;
    if (q > 20) q = 20;                   // 최대 구매 수량 (필요 시 변경)
    input.value = q;
    return q;
  }
  function updateModalPrice() { $('#modalPrice').textContent = won(modal.price * getQty()); }

  function initModal() {
    modal.el = $('#productModal');
    modal.el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
    $('#qtyMinus').addEventListener('click', () => { $('#qtyInput').value = getQty() - 1; updateModalPrice(); });
    $('#qtyPlus').addEventListener('click', () => { $('#qtyInput').value = getQty() + 1; updateModalPrice(); });
    $('#qtyInput').addEventListener('change', updateModalPrice);

    $('#addToCart').addEventListener('click', () => {
      const card = modal.current;
      const img = card.querySelector('img');
      cart.add({ id: card.dataset.name, name: card.dataset.name, price: modal.price, img: img.currentSrc || img.src }, getQty());
      closeModal();
      showToast(`${card.dataset.name} ${getQty()}개를 장바구니에 담았어요.`);
    });

    // 키보드 : ESC 닫기 + 포커스 가두기
    document.addEventListener('keydown', (e) => {
      if (modal.el.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') {
        const f = getFocusable(modal.el);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }


  /* ===========================================================================
     13. 장바구니
     - 담은 상품은 브라우저의 localStorage('oatclay-cart')에 저장되어 새로고침해도 유지됩니다.
     - 실제 결제를 연결하려면 아래 checkout 클릭 부분에서 쇼핑몰 주소로 이동시키세요.
     =========================================================================== */
  const STORAGE_KEY = 'oatclay-cart';
  const cart = {
    items: [],
    el: null,

    load() {
      try { this.items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
      catch (err) { this.items = []; }            // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)
    },
    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); } catch (err) { /* 저장 실패 시 무시 */ }
    },
    add(item, qty = 1) {
      const found = this.items.find((it) => it.id === item.id);
      if (found) found.qty = Math.min(99, found.qty + qty);
      else this.items.push({ ...item, qty });
      this.save(); this.render(true);
    },
    change(id, delta) {
      const it = this.items.find((x) => x.id === id);
      if (!it) return;
      it.qty += delta;
      if (it.qty < 1) this.remove(id);
      else { this.save(); this.render(); }
    },
    remove(id) {
      this.items = this.items.filter((x) => x.id !== id);
      this.save(); this.render();
    },
    total() { return this.items.reduce((sum, it) => sum + it.price * it.qty, 0); },
    count() { return this.items.reduce((sum, it) => sum + it.qty, 0); },

    // 화면 다시 그리기
    render(bump) {
      const list = $('#cartList');
      list.innerHTML = '';
      this.items.forEach((it) => {
        const li = document.createElement('li');
        li.className = 'cart__item';
        li.innerHTML = `
          <img src="${it.img}" alt="">
          <div>
            <h4></h4>
            <p>${won(it.price)}</p>
            <div class="cart__item-ctrl">
              <button type="button" data-act="minus" aria-label="수량 줄이기">−</button>
              <span>${it.qty}</span>
              <button type="button" data-act="plus" aria-label="수량 늘리기">+</button>
            </div>
          </div>
          <button type="button" class="cart__remove" data-act="remove">삭제</button>`;
        li.querySelector('h4').textContent = it.name;     // 상품명은 textContent 로 안전하게 삽입
        li.dataset.id = it.id;
        list.appendChild(li);
      });
      $('#cartEmpty').hidden = this.items.length > 0;
      $('#cartTotal').textContent = won(this.total());
      const countEl = $('#cartCount');
      countEl.textContent = this.count();
      if (bump) {
        countEl.classList.add('bump');
        setTimeout(() => countEl.classList.remove('bump'), 300);
      }
    },

    open() {
      this.lastFocus = document.activeElement;
      this.el.hidden = false;
      requestAnimationFrame(() => this.el.classList.add('is-open'));
      lockScroll(true);
      $('.modal__close', this.el).focus();
    },
    close() {
      if (this.el.hidden) return;
      this.el.classList.remove('is-open');
      setTimeout(() => { this.el.hidden = true; }, 500);
      lockScroll(false);
      if (this.lastFocus) this.lastFocus.focus({ preventScroll: true });
    }
  };

  function initCart() {
    cart.el = $('#cart');
    cart.load();
    cart.render();

    $('#cartOpen').addEventListener('click', () => cart.open());
    cart.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-close]')) return cart.close();
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.closest('.cart__item').dataset.id;
      if (btn.dataset.act === 'plus') cart.change(id, 1);
      if (btn.dataset.act === 'minus') cart.change(id, -1);
      if (btn.dataset.act === 'remove') cart.remove(id);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cart.el.hidden) cart.close(); });

    $('#checkout').addEventListener('click', () => {
      if (!cart.items.length) return showToast('장바구니가 비어 있어요.');
      // [실제 결제 연결] 예: window.location.href = 'https://smartstore.naver.com/내스토어';
      showToast(`총 ${cart.count()}개, ${won(cart.total())} — 데모 페이지라 실제 결제는 진행되지 않아요.`);
    });
  }


  /* ===========================================================================
     14. 뉴스레터 폼 검사
     =========================================================================== */
  function initNewsletter() {
    const form = $('#newsletter');
    const input = $('#nlEmail');
    const msg = $('#nlMsg');
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      msg.classList.remove('is-error', 'is-ok');

      if (!value) {
        msg.textContent = '이메일 주소를 입력해 주세요.';
        msg.classList.add('is-error'); input.focus(); return;
      }
      if (!EMAIL_RE.test(value)) {
        msg.textContent = '이메일 형식이 올바르지 않아요. 예) ritual@oatandclay.kr';
        msg.classList.add('is-error'); input.focus(); return;
      }

      // [실제 전송] 메일 서비스(스티비, 메일침프 등)와 연결할 때 이 위치에서 전송하세요.
      // 예) fetch('https://구독-API-주소', { method: 'POST', body: new FormData(form) });
      msg.textContent = '구독해 주셔서 고마워요! 웰컴 쿠폰을 메일로 보내드릴게요.';
      msg.classList.add('is-ok');
      form.reset();
    });
  }


  /* ===========================================================================
     15. 토스트 알림 / 이미지 오류 대체
     =========================================================================== */
  let toastTimer = 0;
  function showToast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
  }

  // 웹 이미지 주소가 끊기면 images/placeholder.svg 로 자동 교체
  const FALLBACK_IMG = 'images/placeholder.svg';
  function initImageFallback() {
    $$('img').forEach((img) => {
      const swap = () => {
        if (img.dataset.fallback) return;
        img.dataset.fallback = '1';
        img.src = FALLBACK_IMG;
      };
      img.addEventListener('error', swap);
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) swap();
    });
  }


  /* ===========================================================================
     16. 초기 실행
     =========================================================================== */
  function init() {
    initImageFallback();
    initAnchors();
    initMenu();
    initToTop();
    initHeroIntro();
    initHeroScroll();
    initStory();
    initValues();
    initProduct();
    initProcess();
    initShop();
    initReveal();
    initModal();
    initCart();
    initNewsletter();

    window.addEventListener('scroll', onScroll, { passive: true });
    updateHeader();
    updateProgress();

    // 이미지가 모두 로딩되면 스크롤 위치 계산을 한 번 더 정확하게
    if (MOTION) window.addEventListener('load', () => ScrollTrigger.refresh());

    // 주소에 #섹션 이 붙어 들어온 경우 해당 위치로 이동
    if (location.hash && $(location.hash)) {
      window.addEventListener('load', () => setTimeout(() => scrollToTarget($(location.hash)), 100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
