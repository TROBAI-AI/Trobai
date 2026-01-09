# 회사 레포로 푸시하기

## 회사 정보
- **회사명**: TROBAI-AI
- **이메일**: trobai@trobai.com
- **회사 Remote**: company (git@github.com:TROBAI-AI/AITravel.git)

## 커밋 (회사 이름으로)
```bash
git commit --author="TROBAI-AI <trobai@trobai.com>" -m "커밋메시지"
```

## 커밋 수정 (amend)
```bash
git commit --amend --author="TROBAI-AI <trobai@trobai.com>" --no-edit
```

## 푸시
```bash
git push company TH:main
```

## 주의사항
- 개인 이름(cho1taeho)으로 회사 repo에 커밋하지 않기
- origin으로 푸시하지 않기
