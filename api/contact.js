// Vercel 서버리스 함수 — 문의 폼을 Discord 웹훅으로 전달
//
// 왜 Discord인가:
//   Web3Forms 무료 플랜은 서버(백엔드)에서의 submit 호출을 403으로 차단합니다.
//   "This method is not allowed. Use our API in client side or
//    contact support with server IP address (Pro plan is required)"
//   Discord 웹훅은 서버에서 호출하는 것을 전제로 만들어진 기능이라 제약이 없습니다.
//
// 웹훅 URL은 코드/깃 어디에도 없고 Vercel 환경변수에서만 읽습니다.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않은 요청입니다.' });
  }

  const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
  if (!WEBHOOK) {
    return res.status(500).json({ success: false, message: '서버 설정 오류입니다. 관리자에게 문의해주세요.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const clean = (v, max) => (v || '').toString().trim().slice(0, max);

    const name = clean(body.name, 50);
    const company = clean(body.company, 80);
    const email = clean(body.email, 120);
    const subject = clean(body.subject, 150);
    const message = clean(body.message, 3000);
    const botcheck = clean(body.botcheck, 50);

    // 허니팟: 봇이 채우는 숨김 필드에 값이 있으면 성공처럼 응답하고 조용히 폐기
    if (botcheck) {
      return res.status(200).json({ success: true });
    }

    if (!name || !company || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: '모든 항목을 입력해주세요.' });
    }

    // 이메일 형식 검증 — 회신 주소가 잘못되면 문의에 답할 수 없으므로 서버에서도 확인
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ success: false, message: '이메일 주소를 다시 확인해주세요.' });
    }

    const payload = {
      username: 'Trobai 문의',
      // @everyone / @here 등이 실제 멘션되지 않도록 차단
      allowed_mentions: { parse: [] },
      embeds: [{
        title: `📩 새 문의 · ${company}`,
        description: message,
        color: 0x1E40FF,
        fields: [
          { name: '이름', value: name, inline: true },
          { name: '회사명', value: company, inline: true },
          { name: '이메일', value: email, inline: false },
          { name: '제목', value: subject, inline: false }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    const dc = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Discord 웹훅 성공 시 204 No Content (본문 없음)
    if (dc.ok) {
      return res.status(200).json({ success: true, message: '문의가 전송되었습니다.' });
    }

    const raw = await dc.text().catch(() => '');
    console.error('[discord] status=%s body=%s', dc.status, raw.slice(0, 500));
    return res.status(502).json({ success: false, message: `전송에 실패했습니다. (upstream ${dc.status})` });
  } catch (err) {
    console.error('[contact] %s', err && err.message);
    return res.status(500).json({ success: false, message: '전송 중 오류가 발생했습니다.' });
  }
}
