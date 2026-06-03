// Vercel 서버리스 함수 — 문의 폼을 Web3Forms로 안전하게 전달
// access_key는 코드/깃/브라우저 어디에도 노출되지 않고, Vercel 환경변수에서만 읽습니다.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않은 요청입니다.' });
  }

  const ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY;
  if (!ACCESS_KEY) {
    return res.status(500).json({ success: false, message: '서버 설정 오류입니다. 관리자에게 문의해주세요.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const subject = (body.subject || '').toString().trim();
    const message = (body.message || '').toString().trim();
    const botcheck = (body.botcheck || '').toString().trim();

    // 허니팟: 봇이 채우는 숨김 필드에 값이 있으면 성공처럼 응답하고 조용히 폐기
    if (botcheck) {
      return res.status(200).json({ success: true });
    }

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: '제목과 내용을 모두 입력해주세요.' });
    }

    const payload = {
      access_key: ACCESS_KEY,
      subject: `[Trobai 홈페이지 문의] ${subject}`,
      from_name: 'Trobai 홈페이지',
      message: `제목: ${subject}\n\n${message}`
    };

    const w3 = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await w3.json().catch(() => ({}));

    if (data && data.success) {
      return res.status(200).json({ success: true, message: '문의가 전송되었습니다.' });
    }
    return res.status(502).json({ success: false, message: (data && data.message) || '전송에 실패했습니다.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: '전송 중 오류가 발생했습니다.' });
  }
}
