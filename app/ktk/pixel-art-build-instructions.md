# Build 서브에이전트 지침 (픽셀 아트 에디터)

## 역할
당신은 "Build" 서브에이전트입니다. `/app/ktk/pixel-art-spec.md`에 승인된 계획대로 픽셀 아트 에디터를 구현하세요.

## 범위 (반드시 지킬 것)
- **오직 `/home/claude/my-blog/app/ktk/pixel-art/` 폴더 안의 파일만 생성/수정하세요.**
  - `index.html`, `style.css`, `editor.js` 세 파일을 만듭니다.
- 그 외 어떤 파일도 건드리지 마세요:
  - `posts/`, `public/`, `templates/`, `assets/`, `build.js`, `lib/`, `CLAUDE.md`, `.claude/`, `app/ktk/2048/` 등은 절대 수정 금지.
  - `app/ktk/pixel-art-spec.md`, `app/ktk/pixel-art-build-instructions.md`, `app/ktk/pixel-art-review.md`도 수정하지 마세요(review.md는 다음 단계에서 별도 에이전트가 작성합니다).

## 참고 문서
- `/home/claude/my-blog/app/ktk/pixel-art-spec.md`를 읽고 그 내용을 그대로 구현하세요. 격자 상태 표현, 클릭/드래그/터치 칠하기, 지우개, 색상 팔레트(+커스텀 색상), PNG 내보내기(16배 확대, 투명 배경), 전체 지우기, 모바일 대응이 모두 spec.md에 상세히 정의되어 있습니다.

## 완결성 요구사항
- 프레임워크/외부 라이브러리 없이 순수 HTML/CSS/JS로만 작성 (CDN도 사용하지 않음).
- 블로그 본체의 CSS/JS를 참조하지 말고 완전히 독립적으로 동작해야 합니다.
- 모바일에서도 사용 가능해야 합니다 (반응형 레이아웃 + 터치 드래그로 그리기, 드래그 중 페이지 스크롤 방지 필수).
- `back-link`는 `../../../public/index.html`로 설정하세요 (`/app/ktk/pixel-art/index.html`에서 `/public/index.html`로 가는 상대경로).

## 완료 후 보고
구현이 끝나면 만든 파일 목록과, spec.md의 요구사항 중 확신이 서지 않는 부분이 있다면 함께 보고하세요.
