# Research — Timeboxing 與 My Life in Weeks

Branch: `claude/timeboxing-life-week-5rgbzq` · Status: research notes（尚未做任何產品決策）

這份筆記研究兩個時間管理／時間感知的概念：**Timeboxing**（時間盒）與 **My Life in Weeks**（人生週曆），
整理它們的起源、原理、實踐方式與常見批評，最後討論兩者的關係，以及對 Cadence 可能的啟發。

---

## 1. Timeboxing（時間盒）

### 1.1 定義

Timeboxing 是把一段**固定、有明確起訖的時間**分配給一件事，時間到了就停，
以「時間用完」而不是「事情做完」作為結束條件。反過來說，一般的 to-do list
是「事情導向」：任務沒有時間屬性，永遠可以往後拖。Timeboxing 把任務**搬進行事曆**，
讓每件事都回答兩個問題：*什麼時候做？做多久？*

一個 timebox 通常包含：

- **一件具體的事**（不是「寫報告」而是「寫報告的大綱」）
- **開始與結束時間**（例如 09:00–09:45）
- **一個可驗收的產出**（時間到時，要能說出「完成了什麼」）

### 1.2 起源

- 「timebox」一詞最早見於 1988 年，是 Scott Schultz 的 Rapid Iterative Production
  Prototyping 方法的核心元素。
- 1991 年，IT 顧問 James Martin 在《Rapid Application Development》一書中將其發揚光大，
  之後成為敏捷開發（Scrum 的 sprint、站立會議的時限）的基本構件。
- 它的理論根據是 **Parkinson's Law**（帕金森定律）：「工作會膨脹，直到填滿可用的時間。」
  Timeboxing 直接反轉這個定律——先把時間縮到一個盒子裡，工作就被迫收斂。
- 2018 年 Marc Zao-Sanders 在《Harvard Business Review》發表
  〈How Timeboxing Works and Why It Will Make You More Productive〉。他調查了 100 種
  生產力技巧，timeboxing（把 to-do list 遷移進行事曆）排名第一。他後來在 2024 年
  出版了專書《Timeboxing: The Power of Doing One Thing at a Time》。

### 1.3 Timeboxing vs. Time Blocking

兩者常被混用，但有一個關鍵差別：

| | Time Blocking（時間區塊） | Timeboxing（時間盒） |
|---|---|---|
| 主要提倡者 | Cal Newport（《Deep Work》, 2016） | James Martin → Marc Zao-Sanders |
| 時間的角色 | **保護專注的容器**——這段時間只做這類事 | **硬性的截止線**——時間到就停，驗收產出 |
| 結束條件 | 事情告一段落、或區塊結束 | 盒子結束（時間是不可協商的） |
| 對抗的敵人 | 干擾、切換成本、淺工作 | 完美主義、拖延、範圍蔓延 |

Cal Newport 估計：「一個 40 小時、完整 time-block 過的工作週，產出等於一個 60+ 小時
無結構的工作週。」他建議區塊最小 30 分鐘，因為更短的切片會浪費進入狀態的時間。

實務上兩者常混合使用：用 time blocking 規劃一天的骨架（深度工作、會議、雜務），
在骨架內用 timeboxing 給個別任務設硬時限。

### 1.4 為什麼有效（心理機制）

1. **實作意圖（implementation intentions）**：心理學研究顯示，「在 X 時間、X 地點做 X 事」
   的具體計畫，比「我要做 X」的模糊意圖更可能被執行。Timebox 就是行事曆化的實作意圖。
2. **對抗 Parkinson's Law**：人為的稀缺性迫使你先決定「什麼程度算夠好」，
   抑制完美主義與範圍蔓延。
3. **單工（single-tasking）**：一個盒子裡只有一件事，消除了「現在該做什麼」的持續決策，
   減少決策疲勞與任務切換成本。
4. **降低啟動門檻**：「只做 25 分鐘」比「把它做完」容易開始——這也是 Pomodoro
   （番茄鐘，25 分鐘工作 + 5 分鐘休息）受歡迎的原因。Pomodoro 可視為固定尺寸、
   帶節奏的 timeboxing 特例。
5. **留下紀錄**：做過的 timebox 留在行事曆上，形成可回顧的「時間都花去哪了」的資料，
   而 to-do list 上被劃掉的項目不帶時間資訊。

### 1.5 實踐要點

- **軟盒 vs. 硬盒**：硬盒（hard timebox）時間到絕對停；軟盒（soft timebox）允許收尾。
  新手建議從軟盒開始，避免挫折。
- **尺寸**：常見建議 15 分鐘～3 小時之間；太小切碎專注，太大失去截止線的張力。
- **留白**：不要把行事曆排滿。保留 buffer（例如每天 20–30% 空白）吸收溢出與突發事項。
- **回顧**：盒子結束時花 30 秒記錄「實際 vs. 預估」，長期下來校準自己的估時能力
  （對抗 planning fallacy）。
- **從明天開始排，不要排下週**：計畫的保鮮期很短，timeboxing 是每日／隔日的操作，
  不是月度規劃工具。

### 1.6 常見批評與限制

- **僵化**：創意工作、心流狀態被鬧鐘打斷是有成本的；不是所有工作都適合硬截止。
- **估時困難**：新手常把盒子開太小，導致連環遲到、整天計畫崩盤（骨牌效應）。
- **維護成本**：每天排盒子本身要花時間；計畫趕不上變化時，重排的摩擦力會讓人放棄。
- **不適合高中斷環境**：值班、客服、照顧者等角色無法承諾「這 45 分鐘只做一件事」。

---

## 2. My Life in Weeks（人生週曆）

### 2.1 定義與起源

「My Life in Weeks」是把**一個人的一生以「週」為單位畫成一張格子圖**：
一列代表一年、一列 52 格，90 年的人生就是 90 × 52 = **4,680 個格子**——
整個人生放得進一張 A4 紙。

- 最著名的版本是 **Tim Urban** 2014 年在部落格 *Wait But Why* 發表的
  〈Your Life in Weeks〉。他用 90 年為預期壽命，把已經過去的週塗掉，
  讓讀者直觀看到「剩下的格子其實不多」。文章爆紅，衍生出無數海報、
  app 與互動網頁（例如 bryanbraun.com 的互動版）。
- 哲學上這是數位時代的 **memento mori**（記住你終有一死）——斯多噶學派的古老練習。
  Seneca 在《論生命之短暫》裡的論點如出一轍：生命不是太短，而是我們浪費了太多。
- **Oliver Burkeman** 2021 年的暢銷書《Four Thousand Weeks》（中譯《人生 4 千個禮拜》）
  把同一個算術變成書名：平均壽命約 80 年 ≈ 4,000 週。他的結論不是「所以要更有效率」，
  而是「所以要接受做不完，把有限的週花在真正重要的事上」。

### 2.2 為什麼有效（心理機制）

1. **把抽象變具體**：「人生苦短」是陳腔濫調，但「你只剩 2,340 個格子」是一個
   可以數的數字。週是剛好的顆粒度——日太多（3 萬多個，麻木），年太少（90 個，粗糙），
   週（4,680 個）既看得完又感覺得到流逝。
2. **死亡凸顯效應**：恐懼管理理論（Terror Management Theory）的研究顯示，
   當人被提醒時間有限時，傾向做出更符合自身價值觀的選擇——更感恩、
   更重視關係、行動更有目的性。
3. **一頁縱覽**：童年是頂端的一小塊，現在是中間一條推進的邊界線，
   下方是還空白的未來。這種「一眼看盡」的構圖是它瘋傳的原因——
   任何逐頁翻閱的行事曆都給不了這個視角。
4. **反向的生產力**：與 timeboxing 相反，它不是催你做更多，而是催你**選擇**——
   Burkeman 稱之為「解放性的絕望」：承認做不完，才會認真取捨。

### 2.3 常見形式與變體

- **靜態海報／PDF**：Wait But Why 官方海報，自己拿筆塗格子。
- **互動網頁**：輸入生日，自動塗掉已過的週；有些允許在格子上標註人生事件
  （畢業、搬家、孩子出生），把格子圖變成**人生年表**。
- **週記型**：每週在當週格子寫一句話（本週最重要的一件事），
  一年後得到 52 句話的年度回顧，一生後得到一張寫滿的人生地圖。
- **倒數型**：只顯示剩餘週數，每週一推播「又用掉一格」。
- **里程碑疊加**：疊上統計事實（與父母相處的剩餘次數、孩子 18 歲離家前的剩餘週末），
  進一步把格子換算成具體的人與事。

### 2.4 常見批評與限制

- **焦慮而非行動**：對某些人，死亡倒數引發的是麻痺與焦慮，不是清晰。
  設計上通常用「已活過的格子 = 已擁有的，不是已失去的」的框架緩解。
- **一次性衝擊**：第一次看到很震撼，之後邊際效果遞減；要靠「每週互動一次」
  的儀式（塗格子、寫一句話）維持效果。
- **假精確**：90 年是假設，不是保證；它的價值在比例感，不在數字本身。

---

## 3. 兩個概念的關係：同一件事的兩個縮放層級

這兩個概念表面上一個管「今天的 45 分鐘」、一個管「一生的 4,680 週」，
但它們是**同一個操作在不同 zoom level 的投影**：

```
人生（~4,680 週）      ← My Life in Weeks：預算總表，回答「值得嗎」
  └─ 一年（52 週）
      └─ 一週（168 小時）
          └─ 一天（~16 醒著的小時）
              └─ 一個 timebox（15–90 分鐘）← Timeboxing：執行單位，回答「何時、多久」
```

- **共同前提**：時間是有限的、會用完的資源，必須「先分配、再使用」。
  Timebox 把一天切成盒子；Life in Weeks 把一生切成盒子。格子只是大小不同。
- **互補方向**：Timeboxing 是**由下而上的執行工具**（讓今天不被浪費）；
  Life in Weeks 是**由上而下的取捨工具**（讓今天做的是對的事）。
  只有前者會變成高效地做不重要的事；只有後者會變成清醒地焦慮。
  Burkeman 在《Four Thousand Weeks》裡正是把兩者接起來：接受總預算有限（週曆），
  然後用 closed list／固定時段（盒子）去過每一天。
- **同一種 UI 隱喻**：兩者都把時間**空間化**成可著色的格子。這是行事曆 app
  的核心隱喻，只是行事曆通常止步於「月」，而 Life in Weeks 把它延伸到「一生」。

---

## 4. 對 Cadence 的啟發（初步觀察，非決策）

Cadence 目前的視圖階層是 **Day / Week / Month**（`DayPageV2` / `WeekPageV2` /
`MonthPageV2`，Month 已有海報式的 poster header）。對照上面的縮放層級：

1. **Timeboxing 幾乎是 Day/Week 視圖的原生用法**。現有的 event + task 模型
   已具備「把任務放上時間軸」的基礎；差距在於 timeboxing 特有的機制——
   例如任務的預估時長、時間到的提示、實際 vs. 預估的回顧。
2. **Life in Weeks 是 Month poster 往上的自然延伸**：Day → Week → Month → **Life**。
   一張以生日為起點、一列一年的格子海報，與現有 month poster 的視覺語言
   （格狀、可著色、標註事件）一致。
3. **兩者的連接點是「本週」**：Life in Weeks 的「當前格子」點進去就是 Week 視圖；
   Week 視圖裡排的 timebox 就是「這一格人生」的內容。這條 zoom 路徑
   （一生 → 這一週 → 今天的盒子）是兩個概念在產品上最有機的結合方式。

這些只是研究階段的觀察；實際功能範圍、資料模型與 UI 需要另開 spec 討論。

---

## 5. 參考資料

### Timeboxing
- Marc Zao-Sanders, [How Timeboxing Works and Why It Will Make You More Productive](https://hbr.org/2018/12/how-timeboxing-works-and-why-it-will-make-you-more-productive), *Harvard Business Review*, 2018
- Marc Zao-Sanders, [Timeboxing doubles productivity](https://marczaosanders.substack.com/p/timeboxing-doubles-productivity)
- [Timeboxing: What is it and how to use it](https://clockify.me/timeboxing) — Clockify（含起源：Scott Schultz 1988、James Martin《Rapid Application Development》1991）
- [What Is Timeboxing?](https://zenkit.com/en/blog/what-is-timeboxing/) — Zenkit
- Cal Newport, *Deep Work* (2016) — time blocking 的主要出處

### My Life in Weeks
- Tim Urban, [Your Life in Weeks](https://waitbutwhy.com/2014/05/life-weeks.html), *Wait But Why*, 2014 — 原始文章
- Bryan Braun, [Your Life in Weeks — Interactive](https://www.bryanbraun.com/your-life/weeks.html) — 互動實作範例
- [Why Tim Urban's Chart Went Viral](https://www.yourlifeinsquares.com/blog/wait-but-why-life-calendar) — Your Life in Squares Blog
- Oliver Burkeman, *Four Thousand Weeks: Time Management for Mortals* (2021)
- Seneca, *De Brevitate Vitae*（論生命之短暫）— 概念的古典源頭
