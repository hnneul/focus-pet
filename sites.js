// 방해 사이트 판정 (PRD #4-2). 백그라운드·팝업·테스트에서 같이 쓴다

// 주소가 방해 사이트면 그 사이트를, 아니면 null을 돌려준다
// 도메인이 정확히 같거나 하위 도메인(m.youtube.com)일 때만 맞다고 본다
function matchSite(url, sites) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  return sites.find((site) => host === site || host.endsWith('.' + site)) || null;
}

// 입력한 주소를 도메인으로 바꾼다: "https://www.youtube.com/watch" → "youtube.com"
function normalizeSite(input) {
  const text = input.trim().toLowerCase();
  if (!text) return '';
  try {
    const host = new URL(text.includes('://') ? text : 'https://' + text).hostname.replace(/^www\./, '');
    return host.includes('.') ? host : '';
  } catch {
    return '';
  }
}

if (typeof module !== 'undefined') module.exports = { matchSite, normalizeSite };
