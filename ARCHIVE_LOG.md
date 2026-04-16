# inspirachiving — 작업 로그

> SNS, 웹에서 글귀·이미지·링크를 캡처하고, 속성 기반으로 자동 분류·연결하는 개인 아카이빙 앱.
> GitHub Pages 배포: `https://junhyuk-chang.github.io/inspirachiving`

---

## 세션 기록

### 2026-04-16 — 프로토타입 초기 구축

**결정 사항**
- 스택: Vite + React + TypeScript + GitHub Pages (백엔드 없음)
- 저장소: IndexedDB (브라우저 로컬, 서버 불필요)
- 속성 분류: 키워드 사전 방식 (Claude API는 추후 추가 예정)
- 레포: `github.com/Junhyuk-Chang/inspirachiving`

**구현 완료**
- `src/types.ts` — Item, Attribute 타입 정의
- `src/lib/classifier.ts` — 자동 속성 분류 (감정, 키워드, 언어, 색상, 출처 등)
- `src/lib/storage.ts` — IndexedDB CRUD 래퍼
- `src/components/PasteZone.tsx` — Ctrl+V / 드래그앤드롭 입력
- `src/components/ItemCard.tsx` — 아이템 카드 (text/image/url 타입별)
- `src/components/FilterBar.tsx` — 속성 필터 칩 + 검색
- `src/components/AttributeGraph.tsx` — Force-directed 속성 연결 그래프
- `src/App.tsx` — 전체 상태 관리 및 라우팅
- `.github/workflows/deploy.yml` — main 브랜치 push → GitHub Pages 자동 배포
- `vite.config.ts` — base: "/inspirachiving/" 설정

**빌드 결과**: 성공 (203KB JS / 6.7KB CSS)

---

## 다음 작업 후보 (우선순위순)

- [ ] GitHub 레포 생성 및 첫 push
- [ ] GitHub Pages 설정 (Settings → Pages → GitHub Actions)
- [ ] 이미지 저장 시 색상 팔레트 UI 표시 개선
- [ ] 아이템 메모(note) 편집 기능
- [ ] Claude API 연동 — 감정/주제 분류 정확도 향상
- [ ] 브라우저 익스텐션 (선택된 텍스트 → 바로 저장)
- [ ] 모바일 공유 시트 연동 (PWA)
- [ ] 아이템 간 수동 연결 (사용자가 직접 관계 정의)

---

## 아키텍처 메모

```
입력 (PasteZone)
  └─ classifyItem() → Attribute[]
        ├── 텍스트: 언어, 감정, 키워드, 길이
        ├── 이미지: 색상 팔레트, 밝기 (Canvas API)
        └── URL: 출처 도메인 + og 메타 추출
  └─ saveItem() → IndexedDB

출력
  ├── Grid View: 마소니리 카드 레이아웃
  ├── Filter Bar: 속성별 칩 필터 + 텍스트 검색
  └── Graph View: Force-directed 그래프 (속성 노드 클릭 → 필터)
```
