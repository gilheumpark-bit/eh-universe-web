/* ===========================================================
   Loreguard — prototype icon names → lucide-react re-exports
   Source: /tmp/design2_handoff/2/project/icons.jsx (window.Icons)

   프로토타입은 자체 SVG 아톰(window.Icons.Globe 등)을 썼다. 앱은 lucide-react
   를 표준으로 쓰므로, 프로토타입 아이콘명을 가장 가까운 lucide 컴포넌트로
   매핑해 re-export 한다. 6탭 컴포넌트(Phase 2)는 이 파일에서만 import:
       import { Globe, Send, Sparkle } from "@/components/loreguard/icons";

   lucide 아이콘은 { size, strokeWidth, color, className, style, ... } props 를
   받는다. 프로토타입의 stroke 숫자 prop 은 strokeWidth 로 매핑하면 된다.
   =========================================================== */
export {
  Globe, // 세계관
  User, // 캐릭터
  GitBranch as Branch, // 플롯
  Film, // 연출
  PenLine as Pen, // 집필
  Languages, // 번역
  Search,
  Bell,
  HelpCircle as Help,
  Settings,
  RefreshCw as Sync,
  ChevronDown as Chevron,
  ChevronRight as ChevronR,
  ChevronLeft as ChevronL, // S4 회차 prev 내비 (TabWriting)
  Check,
  X,
  Info, // ToastHost info variant (F2)
  Pencil as Edit,
  Sparkles as Sparkle,
  Lock,
  Shield,
  BookOpen as Book,
  Map,
  Clock,
  Scale,
  AlertTriangle as Alert,
  Plus,
  Send,
  Mic,
  Maximize2 as Expand,
  MoreHorizontal as Dots,
  LayoutGrid as Grid,
  List,
  Flag,
  PlayCircle as Play,
  Eye,
  Download,
  Filter,
  Pin,
  Wand2 as Wand,
  Quote,
  Layers,
  ScrollText as Scroll, // 창작 과정 확인서 (구 NovelIDELauncher journal 탭과 동일 모티프)
  StickyNote, // 메모 보드 slide-over (MemoPanel — Z1c-mid-ports)
  Coins, // 세계관 — 경제와 생활 (G3 연출 구조 필드 복원)
  GraduationCap as Grad, // 세계관 — 교육/지식 전달
  Route, // 세계관 — 이동/통신 속도
  MessageSquare, // 채팅 도크 토글 (ChatCanvasDock — Z2a-chatcanvas)
  Copy, // 비주얼 패널 프롬프트 복사 (VisualPanel — Z2c-history-visual)
  Image as Img, // 비주얼 패널 헤더·카드 (VisualPanel — Z2c-history-visual)
} from "lucide-react";
