# 파이썬 기반 심리 블로그 자동화 MVP 아키텍처

현재 이 개발 환경은 웹에서 즉각적으로 UI를 확인하고 테스트할 수 있도록 **Node.js (TypeScript) + React** 기반으로 구동되고 있습니다. 하지만 요청하신 대로, 실제 개인 환경이나 서버에서 안정적으로 운영할 수 있는 **파이썬(Python) 기반의 모듈화 구조**를 제안해 드립니다.

## 1. 디렉토리 구조 (Python MVP)

```text
psychology_blog_bot/
âââ .env                  # API 키 (Gemini API 등)
âââ requirements.txt      # 의존성 패키지 목록
âââ main.py               # 메인 실행 파일 (스케줄러 또는 파이프라인 관리)
âââ agents/
â   âââ __init__.py
â   âââ topic_agent.py    # [모듈 1] 유튜브/인터넷 검색 및 글감 발굴 에이전트
â   âââ writer_agent.py   # [모듈 2] OREO 형식 SEO 블로그 작성 에이전트
âââ utils/
â   âââ __init__.py
â   âââ logger.py         # 로깅 모듈
â   âââ seo_optimizer.py  # 키워드 추출 및 SEO 점검 헬퍼
âââ output/               # 작성된 마크다운(.md) 결과물이 저장되는 폴더
```

## 2. 필수 라이브러리 (requirements.txt)

```text
google-genai==0.3.0       # 최신 Gemini API SDK
beautifulsoup4==4.12.3    # 웹 크롤링 (글감 검색용)
requests==2.31.0          # HTTP 요청
python-dotenv==1.0.1      # 환경변수 관리
schedule==1.2.1           # 자동화 스케줄링 (선택)
```

## 3. 핵심 모듈 설명 및 코드 예시

### 1) 글감 검색 에이전트 (`agents/topic_agent.py`)
현재 트렌드 키워드(예: "직장인 번아웃", "자존감 회복")를 바탕으로 웹 검색 또는 Gemini를 활용해 흥미로운 심리학 이론을 매칭합니다.

```python
import os
from google import genai
from google.genai import types

def find_topics(seed_keyword="일상 고민"):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    prompt = f"""
    당신은 심리학 콘텐츠 기획자입니다.
    키워드 '{seed_keyword}'와 관련된 대중이 흥미로워할 만한 심리학 주제 3가지를 제안해주세요.
    각 주제는 일상적인 고민과 전문적인 심리학 이론(예: 인지부조화, 방어기제 등)이 결합되어야 합니다.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt
    )
    return response.text
```

### 2) OREO 대본 작성 에이전트 (`agents/writer_agent.py`)
발굴된 주제를 바탕으로 OREO (Opinion, Reason, Example, Offer/Opinion) 프레임워크에 맞춰 글을 작성합니다.

```python
def write_oreo_blog(topic):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    prompt = f"""
    당신은 SEO 최적화 전문가이자 따뜻한 심리 상담가입니다.
    주제: "{topic}"
    
    위 주제로 블로그 포스팅을 작성하세요. 반드시 다음 OREO 형식을 따르세요:
    - Opinion (의견): 핵심 메시지와 공감 포인트
    - Reason (이유): 심리학적 이론을 바탕으로 한 쉬운 설명
    - Example (사례): 독자가 공감할 수 있는 일상 속 구체적 예시
    - Offer/Opinion (제안/강조): 실천할 수 있는 팁이나 따뜻한 위로의 마무리
    
    검색엔진 최적화(SEO)를 위해 소제목(H2, H3)을 활용하고, 읽기 편한 마크다운 형식으로 작성하세요.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=prompt
    )
    return response.text
```

## 4. 진행 가이드 및 필요한 정보 (개발 피드백 요청)

이 앱의 우측 화면(또는 새 창)에서 제가 구현한 **React + Node.js 기반의 MVP 대시보드**를 바로 테스트해보실 수 있습니다.

**앞으로 파이썬 환경으로 확장하거나 현재 MVP를 고도화하기 위해 다음 정보들을 알려주시면 맞춰서 적용해 드리겠습니다:**

1. **타겟 독자층의 연령대/성별**: (예: 2030 직장인 여성, 40대 가장 등)
2. **주로 참고하고 싶은 유튜브 채널이나 사이트**: 특정 채널의 요약본을 바탕으로 글감을 잡을지 결정합니다.
3. **업로드할 플랫폼**: 티스토리, 네이버 블로그, 워드프레스 중 어디에 업로드하실 계획이신가요? (마크다운 형식을 플랫폼에 맞게 조율할 수 있습니다)

우선 현재 화면에 구현된 웹 MVP에서 **[글감 검색]**과 **[블로그 작성]** 기능을 테스트해 보시고, 결과물의 퀄리티(말투, 분량 등)에 대한 피드백을 주시면 프롬프트를 더욱 날카롭게 튜닝해 드리겠습니다.
