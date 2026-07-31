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
    const clean = (v, max) => (v || '').toString().trim().slice(0, max);

    const name = clean(body.name, 50);
    const company = clean(body.company, 80);
    const email = clean(body.email, 120);
    const subject = clean(body.subject, 150);
    const message = clean(body.message, 5000);
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

    // Web3Forms 표준 필드만 사용 (ASCII 키). 사람이 읽을 정보는 message 본문에 담습니다.
    const payload = {
      access_key: ACCESS_KEY,
      subject: `[Trobai 문의] ${company} · ${subject}`,
      from_name: `${name} (${company})`,
      // Web3Forms가 회신 주소로 사용 — 받은 메일에서 바로 '답장'이 가능해집니다
      replyto: email,
      email: email,
      name: name,
      company: company,
      message: `이름: ${name}\n회사명: ${company}\n이메일: ${email}\n제목: ${subject}\n\n${message}`
    };

    const w3 = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });

    const raw = await w3.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (_) { /* JSON이 아니면 아래에서 원문으로 진단 */ }

    if (w3.ok && data && data.success) {
      return res.status(200).json({ success: true, message: '문의가 전송되었습니다.' });
    }

    // Vercel 로그에 원문 기록 (access_key는 페이로드에만 있고 여기엔 찍히지 않음)
    console.error('[web3forms] status=%s body=%s', w3.status, raw.slice(0, 500));

    const detail = (data && data.message) ? data.message : `upstream ${w3.status}`;
    return res.status(502).json({ success: false, message: `전송에 실패했습니다. (${detail})` });
  } catch (err) {
    return res.status(500).json({ success: false, message: '전송 중 오류가 발생했습니다.' });
  }
}
