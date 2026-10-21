# 5K.STUDIO 홈페이지

- 내용 파일: `content/site.json` / 영상·이미지: `media/`
- 디자인: `src/template.html`, `src/style.css`, `src/site.js`
- 빌드: `node build.mjs` → `dist/` (GitHub Actions가 자동으로 실행·배포)

## 홈페이지에서 바로 편집하기
홈페이지 주소 뒤에 `?edit` 를 붙여 열면 편집 모드가 켜집니다.
예) https://park800520-bit.github.io/5kstudio-official/?edit
- 글자: 클릭해서 바로 수정
- 영상·썸네일: 각 작품 위 버튼으로 교체 / 삭제 / 분류 변경
- 하단 바: 메인 영상, + 작품 추가, 기본 정보, 저장하기
처음 한 번 GitHub 열쇠(토큰)를 넣어야 하며, 열쇠는 그 브라우저에만 저장됩니다.
