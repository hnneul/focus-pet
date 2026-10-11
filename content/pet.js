// 페이지 위에 펫과 말풍선 띄우기 (PRD #4-3). 백그라운드가 펫이 나와야 할 때만 이 탭에 넣는다
if (!window.focusPet) {
  const url = (path) => chrome.runtime.getURL(path);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let host = null;

  // 말풍선 픽셀 폰트. Shadow DOM 안에서는 @font-face가 안 먹어서 페이지에 등록한다
  new FontFace('FocusPetGalmuri', `url(${url('fonts/Galmuri11.woff2')})`)
    .load()
    .then((font) => document.fonts.add(font))
    .catch(() => {});

  const STYLE = `
    .pet {
      position: fixed; right: 24px; bottom: 24px;
      display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
      pointer-events: auto;
      font: 14px/1.5 'FocusPetGalmuri', sans-serif; color: #2b1d12;
    }
    .bubble {
      max-width: 240px; margin: 0; padding: 10px 12px;
      background: #fff; border: 3px solid #2b1d12; box-shadow: 4px 4px 0 #2b1d12;
    }
    .explode .bubble { border-color: #d9412f; box-shadow: 4px 4px 0 #d9412f; }
    .buttons { display: flex; gap: 6px; }
    button {
      padding: 4px 10px; border: 2px solid #2b1d12; background: #f8b010;
      font: inherit; color: inherit; cursor: pointer;
    }
    button.close { background: #fff; }
    img { width: 96px; height: 96px; image-rendering: pixelated; animation: bounce 0.9s ease-in-out infinite; }
    .explode img { animation: tremble 0.12s linear infinite; }
    .glow {
      position: fixed; inset: 0; pointer-events: none;
      box-shadow: inset 0 0 80px 24px rgba(217, 65, 47, 0.6);
      animation: pulse 1s ease-in-out infinite alternate;
    }
    @keyframes bounce { 50% { transform: translateY(-6px); } }
    @keyframes tremble { 25% { transform: translate(-2px, 1px); } 75% { transform: translate(2px, -1px); } }
    @keyframes pulse { from { opacity: 0.6; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { img, .glow { animation: none !important; } }
  `;

  // 4-6. 닫으면 백그라운드에 알려서 한동안 다시 안 나오게 한다
  function close(type) {
    host?.remove();
    host = null;
    chrome.runtime.sendMessage({ type });
  }

  function show({ stage, line }) {
    host?.remove();
    // 4-2. 원래 페이지와 스타일이 섞이지 않게 Shadow DOM 안에 그린다
    host = document.createElement('focus-pet');
    host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>${STYLE}</style>
      ${stage === 'explode' ? '<div class="glow"></div>' : ''}
      <div class="pet ${stage}" role="alert">
        <p class="bubble"></p>
        <div class="buttons">
          <button type="button" class="snooze">5분만</button>
          <button type="button" class="close">닫기</button>
        </div>
        <img alt="">
      </div>`;
    root.querySelector('.bubble').textContent = line;
    root.querySelector('img').src = url(`icons/${stage}.png`);
    root.querySelector('.snooze').addEventListener('click', () => close('snooze'));
    root.querySelector('.close').addEventListener('click', () => close('close'));
    document.documentElement.append(host);

    // 4-8. 폭발: 화면을 잠깐 흔든다
    if (stage === 'explode' && !reduceMotion) {
      const shake = [0, -8, 8, -6, 6, -3, 3, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? 3 : -3}px)` }));
      document.documentElement.animate(shake, { duration: 600, iterations: 2 });
    }
  }

  window.focusPet = { show };
}
