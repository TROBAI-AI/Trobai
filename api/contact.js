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

    const payload = {
      access_key: ACCESS_KEY,
      subject: `[Trobai 문의] ${company} · ${subject}`,
      from_name: `${name} (${company})`,
      // Web3Forms가 회신 주소로 사용 — 받은 메일에서 바로 '답장'이 가능해집니다
      replyto: email,
      email: email,
      이름: name,
      회사명: company,
      이메일: email,
      문의제목: subject,
      문의내용: message,
      message: `이름: ${name}\n회사명: ${company}\n이메일: ${email}\n제목: ${subject}\n\n${message}`
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
