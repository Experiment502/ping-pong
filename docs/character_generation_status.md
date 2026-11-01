# 角色步行原圖產製紀錄

本批依照 [character_prompts.md](character_prompts.md) 補齊 18 個角色的步行原圖，共 216 張 PNG。每個角色各有正面、右側面、背面、左側面，以及各方向的站立與兩個跨步。

## 已存入的角色

| 角色 | 資料夾 | 步行原圖 |
|---|---|---|
| 陳教練 | [coach](../assets/char_frames/coach/) | 12／12 |
| 三年級學長 | [senior_m](../assets/char_frames/senior_m/) | 12／12 |
| 班導 林老師 | [teacher_lin](../assets/char_frames/teacher_lin/) | 12／12 |
| 體育老師 | [teacher_pe](../assets/char_frames/teacher_pe/) | 12／12 |
| 美術老師 | [teacher_art](../assets/char_frames/teacher_art/) | 12／12 |
| 訓導主任 | [director](../assets/char_frames/director/) | 12／12 |
| 校長 | [principal](../assets/char_frames/principal/) | 12／12 |
| 媽媽 | [mom](../assets/char_frames/mom/) | 12／12 |
| 老爺爺 | [grandpa](../assets/char_frames/grandpa/) | 12／12 |
| 老奶奶 | [grandma](../assets/char_frames/grandma/) | 12／12 |
| 中年婦女 | [aunt](../assets/char_frames/aunt/) | 12／12 |
| 上班族男子 | [office_m](../assets/char_frames/office_m/) | 12／12 |
| 上班族女子 | [office_w](../assets/char_frames/office_w/) | 12／12 |
| 高中男生 | [high_m](../assets/char_frames/high_m/) | 12／12 |
| 高中女生 | [high_f](../assets/char_frames/high_f/) | 12／12 |
| 小學男生 | [kid_m](../assets/char_frames/kid_m/) | 12／12 |
| 小學女生 | [kid_f](../assets/char_frames/kid_f/) | 12／12 |
| 男性桌球裁判 | [referee_m](../assets/char_frames/referee_m/) | 12／12 |

原先已存在的主角男、主角女、韓宇與桌球社學姊，不在本批新增範圍。

## 預覽與檔案

- [原圖步行預覽頁](../test/character_frames_review.html)：可直接用瀏覽器開啟，選角色、暫停、逐格、調速度與顯示定位線。
- [完整生成提示與來源紀錄](character_generation.jsonl)：使用內建 imagegen，逐張生成；其後的姿勢使用角色參考圖。相同 destination 的最後一筆是目前採用版本。
- 依文件指定命名：每個方向各有 `stand`、`step1`、`step2`。
- 檔名與 PNG 檔頭檢查：18 個角色、216 張，沒有缺檔。
- 針對 22 張做局部重畫，其中 2 張再修一次，處理額外手臂、持物換手、懸空書本、重複擺臂及反戴帽子等問題。
- 預覽頁 JavaScript 語法檢查通過；環境沒有可用瀏覽器連線，未實際開頁驗證播放。

## 尚待驗收

生成工具雖收到 1024×1024 指令，實際 216 張皆為 **1254×1254**。本批保留生成原圖，尚未做尺寸轉換、逐像素定位校正或遊戲內連續動畫驗收。頭頂比例、腳底 90% 與各幀位置仍需在預覽頁對照定位線確認，不能視為已達到文件要求的精確定位。

本批僅處理 12 張步行姿勢；對戰姿勢、頭像、去背切圖與遊戲角色對應尚未製作或修改。

