'use strict';
// 之後出國比賽要用的 10 張地圖資料（第三階段才會接進遊戲）。格式和 js/maps.js 相同。
const OVERSEAS_MAPS = {
 "1": {
  "name": "綠蔭小鎮",
  "theme": "grass",
  "rows": [
   "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
   "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
   "T............................T",
   "T.......................TTTT.T",
   "T.......................TTTT.T",
   "T.......................TTTT.T",
   "T.......................TTTT.T",
   "T..f.=.ff..=.f..f...=..f.....T",
   "T....=.....=........=....f...T",
   "T.============================",
   "T.===========================T",
   "T.............==......,,,,,,.T",
   "T~~~~..TTT....==...TT.,,,,,,.T",
   "T~~~~..TTT....==...TT.,,,,,,.T",
   "T~~~~.........==......,,,,,,.T",
   "T~~~~~~~~~~~~~BB~~~~~~~~~~~~~T",
   "T~~~~~~~~~~~~~BB~~~~~~~~~~~~~T",
   "TTTTTT........==.......TTTTTTT",
   "TTTTTT........==.......TTTTTTT",
   "TTTTTTTTTTTTTT=TTTTTTTTTTTTTTT"
  ],
  "buildings": [
   {
    "kind": "home",
    "x": 3,
    "y": 4,
    "w": 4,
    "h": 3,
    "name": "我的家",
    "roof": "red",
    "door": [
     5,
     6
    ]
   },
   {
    "kind": "shop",
    "x": 9,
    "y": 4,
    "w": 4,
    "h": 3,
    "name": "綠蔭球具店",
    "roof": "blue",
    "door": [
     11,
     6
    ],
    "maxPrice": 1500
   },
   {
    "kind": "arena",
    "x": 17,
    "y": 3,
    "w": 6,
    "h": 4,
    "name": "社區活動中心",
    "roof": "red",
    "door": [
     20,
     6
    ],
    "tiers": [
     0
    ]
   }
  ],
  "trainers": [
   {
    "id": "g1",
    "x": 25,
    "y": 12,
    "dir": "left",
    "name": "捕蟲少年 小傑",
    "char": "male",
    "style": "allround",
    "str": 0.06,
    "range": 4,
    "prize": 80,
    "intro": "眼神對上了就是要比賽！來吧！",
    "after": "下次我一定會贏的…"
   },
   {
    "id": "g2",
    "x": 12,
    "y": 13,
    "dir": "right",
    "name": "學生 小芳",
    "char": "female",
    "style": "lobber",
    "str": 0.1,
    "range": 3,
    "prize": 110,
    "intro": "我最擅長放高球了，你接得到嗎？",
    "after": "好吧，你比較厲害。"
   }
  ],
  "npcs": [
   {
    "x": 8,
    "y": 8,
    "dir": "down",
    "name": "媽媽",
    "char": "female",
    "lines": [
     "加油喔！記得常回家休息，我會幫你存檔。",
     "先去「社區活動中心」報名比賽，再去「綠蔭球具店」看看吧！"
    ]
   },
   {
    "x": 17,
    "y": 11,
    "dir": "left",
    "name": "鎮民",
    "char": "male",
    "lines": [
     "往東走是海岸之城，那裡的體育館在辦縣市賽。",
     "往南過橋是山區，路上有很多想找人比賽的球友。"
    ]
   }
  ],
  "exits": [
   {
    "x": 29,
    "y": 9,
    "to": 2,
    "tx": 0,
    "ty": 9,
    "dir": "right"
   },
   {
    "x": 14,
    "y": 19,
    "to": 4,
    "tx": 14,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "2": {
  "name": "海岸之城",
  "theme": "coast",
  "rows": [
   "TTTTTTTTTTTTTTTT~~~~~~~~~~~~~~",
   "TTTppppppppppTTT~~~~~~~~~~~~~~",
   "TTTppppppppppppp~~~~~~~~~~~~~~",
   "Tppppppppppppppp~~~~~~~~~o~~~~",
   "Tppppppppppppppp~~~o~~~~~~~~~~",
   "Tppppppppppppppp~~~~~~~~~~~~~~",
   "Tppppppppppppppp~~~~~~~~~~~~~~",
   "Tppppppppppppppp~~~~~~~~~~~~~~",
   "Tpppppppppppppppbbbbbbbbbbbbb~",
   "ppppppppppppppppbbbbbbbbbbbbbb",
   "Tpppppppppppppppbbbbbbbbbbbbb~",
   "Tppppppppppppppp~~~~~~B~~~~~~~",
   "Tppppppppppppppp~~~~~~B~~~~~~~",
   "Tsssssssssssssss~~o~~~B~~~o~~~",
   "Tsssssssssssssss~~~~~~B~~~~~~~",
   "Tsssssssssssssssssss~bbb~~~~~~",
   "Tsssssssssssssssssss~bbb~~~o~~",
   "Tsssssssssssssssssss~~~~~~~~~~",
   "Tsssssssssssssssssss~~~~~~~~~~",
   "TTTTTTTTTTTTTTsT~~~~~~~~~~~~~~"
  ],
  "buildings": [
   {
    "kind": "shop",
    "x": 2,
    "y": 3,
    "w": 4,
    "h": 3,
    "name": "海岸球具行",
    "roof": "blue",
    "door": [
     4,
     5
    ],
    "maxPrice": 4000
   },
   {
    "kind": "arena",
    "x": 8,
    "y": 2,
    "w": 6,
    "h": 4,
    "name": "海岸體育館",
    "roof": "red",
    "door": [
     11,
     5
    ],
    "tiers": [
     1
    ]
   },
   {
    "kind": "lighthouse",
    "x": 2,
    "y": 14,
    "w": 2,
    "h": 3,
    "name": "燈塔",
    "roof": "red",
    "door": [
     3,
     16
    ]
   }
  ],
  "trainers": [
   {
    "id": "c1",
    "x": 22,
    "y": 16,
    "dir": "up",
    "name": "漁夫 老陳",
    "char": "male",
    "style": "chopper",
    "str": 0.18,
    "range": 5,
    "prize": 170,
    "intro": "在海邊練出來的下旋，可是很沉的喔！",
    "after": "哈哈，今天魚沒釣到，球也輸了。"
   },
   {
    "id": "c2",
    "x": 18,
    "y": 16,
    "dir": "left",
    "name": "衝浪手 阿凱",
    "char": "male",
    "style": "speedster",
    "str": 0.22,
    "range": 4,
    "prize": 210,
    "intro": "跟浪一樣快的球，你跟得上嗎？",
    "after": "你的反應真快！"
   },
   {
    "id": "c3",
    "x": 7,
    "y": 11,
    "dir": "right",
    "name": "遊客 艾莉",
    "char": "female",
    "style": "spinner",
    "str": 0.2,
    "range": 4,
    "prize": 190,
    "intro": "我在旅行途中學會了側旋，試試看吧！",
    "after": "側旋被你看穿了…"
   }
  ],
  "npcs": [
   {
    "x": 13,
    "y": 8,
    "dir": "down",
    "name": "市民",
    "char": "male",
    "lines": [
     "海岸體育館在辦縣市賽。",
     "要先在綠蔭小鎮的里民盃拿冠軍，才能報名喔！"
    ]
   }
  ],
  "exits": [
   {
    "x": 0,
    "y": 9,
    "to": 1,
    "tx": 29,
    "ty": 9,
    "dir": "left"
   },
   {
    "x": 29,
    "y": 9,
    "to": 3,
    "tx": 0,
    "ty": 9,
    "dir": "right"
   },
   {
    "x": 14,
    "y": 19,
    "to": 5,
    "tx": 14,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "3": {
  "name": "森林路徑",
  "theme": "forest",
  "rows": [
   "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
   "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
   "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
   "TTT,,,,,,,TTTTTTTTTTTTTTTTTTTT",
   "TTT,,~~,,,TTTTTTTT........TTTT",
   "TTT,,~~,,,TTTTTTTT...~~~..TTTT",
   "TTT,,,,,,,TTTTTTTT...~~~..TTTT",
   "TTT,,,,,,,TTTTTT..........TTTT",
   "TTTTT..TTTTTTTTT..........TTTT",
   "================..TTTTTTTTTTTT",
   "T===============TTTTTTTTTTTTTT",
   "TTTTTTTTTTTTTT==TTTTTTTTTTTTTT",
   "TTTTTTTTTTTTTT==,,,,,,,,,TTTTT",
   "TT............==,,,,,,,,,TTTTT",
   "TT.~~.....TTTT==,,,,,,,,,TTTTT",
   "TT.~~.....TTTT==,,,,,,,,,TTTTT",
   "TT........TTTT==,,,,,,,,,TTTTT",
   "TT........TTTT==TTTTTTTTTTTTTT",
   "TTTTTTTTTTTTTT==TTTTTTTTTTTTTT",
   "TTTTTTTTTTTTTT=TTTTTTTTTTTTTTT"
  ],
  "buildings": [],
  "trainers": [
   {
    "id": "f1",
    "x": 8,
    "y": 4,
    "dir": "down",
    "name": "森林小子",
    "char": "male",
    "style": "looper",
    "str": 0.28,
    "range": 4,
    "prize": 280,
    "intro": "我在樹林裡每天練拉球！",
    "after": "你比樹還穩…"
   },
   {
    "id": "f2",
    "x": 20,
    "y": 14,
    "dir": "left",
    "name": "露營女孩",
    "char": "female",
    "style": "allround",
    "str": 0.3,
    "range": 5,
    "prize": 310,
    "intro": "露營的時候最適合打球了！",
    "after": "輸了，回去烤棉花糖。"
   },
   {
    "id": "f3",
    "x": 6,
    "y": 15,
    "dir": "right",
    "name": "登山客",
    "char": "male",
    "style": "lobber",
    "str": 0.32,
    "range": 4,
    "prize": 330,
    "intro": "高球就像山一樣高！",
    "after": "這座山被你翻過去了。"
   },
   {
    "id": "f4",
    "x": 24,
    "y": 7,
    "dir": "left",
    "name": "採菇人",
    "char": "female",
    "style": "chopper",
    "str": 0.34,
    "range": 3,
    "prize": 360,
    "intro": "小心，我的切球跟毒菇一樣危險！",
    "after": "嗚，被你接住了。"
   }
  ],
  "npcs": [],
  "exits": [
   {
    "x": 0,
    "y": 9,
    "to": 2,
    "tx": 29,
    "ty": 9,
    "dir": "left"
   },
   {
    "x": 14,
    "y": 19,
    "to": 6,
    "tx": 14,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "4": {
  "name": "山區",
  "theme": "mountain",
  "rows": [
   "##############=###############",
   "##############==##############",
   "######O#######==##############",
   "###T.......###==#######....T##",
   "###......T.###==#######.....##",
   "###........HHH==#######.....##",
   "###........###==#######.....##",
   "###.T......###==#######.....##",
   "###........###==########H#####",
   "##############================",
   "##############===============#",
   "####################==########",
   "###==========#######==########",
   "###===================########",
   "###==o=======#######==....####",
   "###======o===#######==....####",
   "###==========#######==....####",
   "###==========#######==...T####",
   "####################==########",
   "####################=#########"
  ],
  "buildings": [],
  "trainers": [
   {
    "id": "m1",
    "x": 8,
    "y": 13,
    "dir": "right",
    "name": "礦工大叔",
    "char": "male",
    "style": "chopper",
    "str": 0.35,
    "range": 5,
    "prize": 370,
    "intro": "挖礦挖出來的切球，又重又低！",
    "after": "礦坑裡沒有你這麼強的人。"
   },
   {
    "id": "m2",
    "x": 25,
    "y": 4,
    "dir": "down",
    "name": "攀岩少女",
    "char": "female",
    "style": "speedster",
    "str": 0.38,
    "range": 4,
    "prize": 410,
    "intro": "我的球跟攀岩一樣快狠準！",
    "after": "你爬得比我高。"
   },
   {
    "id": "m3",
    "x": 22,
    "y": 15,
    "dir": "left",
    "name": "山中隱士",
    "char": "male",
    "style": "spinner",
    "str": 0.42,
    "range": 2,
    "prize": 470,
    "intro": "老夫的側旋，參透了山的道理…",
    "after": "後生可畏啊。"
   }
  ],
  "npcs": [],
  "exits": [
   {
    "x": 14,
    "y": 0,
    "to": 1,
    "tx": 14,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 29,
    "y": 9,
    "to": 5,
    "tx": 0,
    "ty": 9,
    "dir": "right"
   },
   {
    "x": 20,
    "y": 19,
    "to": 7,
    "tx": 20,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "5": {
  "name": "沙漠遺跡",
  "theme": "desert",
  "rows": [
   "##############s###############",
   "#ssssssssssssssssssssssssssss#",
   "#ssssssss###O#p######ssssssss#",
   "#ssssssss##pppppppp##sscsssss#",
   "#ssscssss##pppppppp##ssssssss#",
   "#ssssssss##pppppppp##ssssssss#",
   "#ssssssss#####p######ssssssss#",
   "#ssssssssssssssssssssssssscss#",
   "#ssssssssssssssssssssssssssss#",
   "ssssssssssssssssssssssssssssss",
   "#ssssssscssssssssssssssssssss#",
   "#sssssssssssssssssss.....ssss#",
   "#sssssssssssssssssss.~~~.ssss#",
   "#sssssssssssssssssss.~~~.csss#",
   "#ssssscsssssssssssss.....ssss#",
   "#ssssssssssssssssssssssssssss#",
   "#sscssssssssssssssscsssssssss#",
   "#ssssssssssssssssssssssssssss#",
   "#ssssssssssssssssssssssssssss#",
   "##############s###############"
  ],
  "buildings": [],
  "trainers": [
   {
    "id": "d1",
    "x": 5,
    "y": 9,
    "dir": "right",
    "name": "尋寶人",
    "char": "male",
    "style": "looper",
    "str": 0.45,
    "range": 4,
    "prize": 510,
    "intro": "找寶藏之前，先找人比一場！",
    "after": "寶藏還是你拿走吧。"
   },
   {
    "id": "d2",
    "x": 24,
    "y": 9,
    "dir": "left",
    "name": "考古學家",
    "char": "female",
    "style": "chopper",
    "str": 0.5,
    "range": 4,
    "prize": 590,
    "intro": "古代人也是這樣切球的！",
    "after": "這真是歷史性的一戰。"
   },
   {
    "id": "d3",
    "x": 17,
    "y": 4,
    "dir": "left",
    "name": "沙漠旅人",
    "char": "male",
    "style": "speedster",
    "str": 0.52,
    "range": 3,
    "prize": 620,
    "intro": "沙漠的風很快，我的球更快！",
    "after": "我要再去流浪修行了。"
   }
  ],
  "npcs": [],
  "exits": [
   {
    "x": 14,
    "y": 0,
    "to": 2,
    "tx": 14,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 0,
    "y": 9,
    "to": 4,
    "tx": 29,
    "ty": 9,
    "dir": "left"
   },
   {
    "x": 29,
    "y": 9,
    "to": 6,
    "tx": 0,
    "ty": 9,
    "dir": "right"
   },
   {
    "x": 14,
    "y": 19,
    "to": 8,
    "tx": 14,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "6": {
  "name": "冰雪之地",
  "theme": "snow",
  "rows": [
   "TTTTTTTTTTTTTT*TTTTTTTTTTTTTTT",
   "T****************************T",
   "T***#####********************T",
   "T***#####********************T",
   "T***##O##********************T",
   "T****************************T",
   "T*********TTT****************T",
   "T*********TTT***iii**********T",
   "T*********TTT***iii**********T",
   "************************TTTT*T",
   "T***********************TTTT*T",
   "T***********************TTTT*T",
   "T**~~~~~~~**************TTTT*T",
   "T**~~~~~~~iii****************T",
   "T**~~~~~~~iii**TTTT**********T",
   "T**~~~~~~~*****TTTT*******TTTT",
   "T**~~~~~~~*****TTTT*******TTTT",
   "TTTTT*********************TTTT",
   "TTTTT*********************TTTT",
   "TTTTTTTTTTTTTTTTTTTTTT*TTTTTTT"
  ],
  "buildings": [
   {
    "kind": "rest",
    "x": 19,
    "y": 3,
    "w": 4,
    "h": 3,
    "name": "山中小屋",
    "roof": "red",
    "door": [
     21,
     5
    ]
   }
  ],
  "trainers": [
   {
    "id": "s1",
    "x": 8,
    "y": 9,
    "dir": "right",
    "name": "滑雪少年",
    "char": "male",
    "style": "speedster",
    "str": 0.55,
    "range": 5,
    "prize": 670,
    "intro": "滑雪練出來的速度，看招！",
    "after": "我摔了一大跤…"
   },
   {
    "id": "s2",
    "x": 13,
    "y": 11,
    "dir": "down",
    "name": "雪地精靈",
    "char": "female",
    "style": "spinner",
    "str": 0.58,
    "range": 4,
    "prize": 720,
    "intro": "雪花是轉著落下的，我的球也是！",
    "after": "雪融化了…"
   },
   {
    "id": "s3",
    "x": 25,
    "y": 14,
    "dir": "left",
    "name": "冰釣大叔",
    "char": "male",
    "style": "lobber",
    "str": 0.6,
    "range": 4,
    "prize": 760,
    "intro": "等魚上鉤很無聊，來打球吧！",
    "after": "還是回去釣魚好了。"
   }
  ],
  "npcs": [],
  "exits": [
   {
    "x": 14,
    "y": 0,
    "to": 3,
    "tx": 14,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 0,
    "y": 9,
    "to": 5,
    "tx": 29,
    "ty": 9,
    "dir": "left"
   },
   {
    "x": 22,
    "y": 19,
    "to": 8,
    "tx": 22,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "7": {
  "name": "火山地帶",
  "theme": "volcano",
  "rows": [
   "####################r#########",
   "#rrrrrrrrr####rrrrrrrrrrrrrrr#",
   "#rrrrrrrrr####rrrrrrrrrrrrrrr#",
   "#rrrrrrrrr#O##rrLLLrrrrrrrrrr#",
   "#rrLLLLLLLrrrrrrLLLrrrrrrrorr#",
   "#rrLLLLLLLrrrrrrLLLrrrrrrrrrr#",
   "#rrLLLLLLLrrorrrLLLrrTrrrrrrr#",
   "#rrLLLLLLLrrrrrrLLLrrrrrrrrrr#",
   "#rrrrrrrrrrrrrrrLLLrrrrrrrrrr#",
   "#rrrrrrrrrrrrrrrbbbrrrrrrrrrrr",
   "#rrrrorrrrrrrrrrLLLrrrrrrrrrr#",
   "#rrrrrrrrrrrrrrrLLLrrrrrrrrrr#",
   "#rrrrrrrrrrrrrrrLLLrrrrrrrrrr#",
   "#rLLLLLLLrrrrrrrLLLrrrorrrrrr#",
   "#rLLLLLLLrrrrrrrLLLrrrrrrrrrr#",
   "#rLLLLLLLrrrrrrrLLLrrrrrrrrrr#",
   "#rLLLLLLLrrrrrrrLLLrrrrrrorrr#",
   "#rrrrrrrrrTrrrrrrrrrrrrrrrrrr#",
   "#rrrrrrrrrrrrrrrrrrrrrrrrrrrr#",
   "##############r###############"
  ],
  "buildings": [],
  "trainers": [
   {
    "id": "v1",
    "x": 24,
    "y": 5,
    "dir": "down",
    "name": "火山研究員",
    "char": "female",
    "style": "looper",
    "str": 0.65,
    "range": 3,
    "prize": 850,
    "intro": "我的拉球跟岩漿一樣燙！",
    "after": "數據顯示…是我輸了。"
   },
   {
    "id": "v2",
    "x": 12,
    "y": 9,
    "dir": "right",
    "name": "熔岩鬥士",
    "char": "male",
    "style": "speedster",
    "str": 0.7,
    "range": 3,
    "prize": 940,
    "intro": "過橋之前，先打贏我！",
    "after": "你的熱情比岩漿還熱！"
   },
   {
    "id": "v3",
    "x": 11,
    "y": 15,
    "dir": "right",
    "name": "鍛造師",
    "char": "male",
    "style": "chopper",
    "str": 0.72,
    "range": 3,
    "prize": 980,
    "intro": "千錘百鍊的切球，接招！",
    "after": "我要回去重新鍛造了。"
   }
  ],
  "npcs": [],
  "exits": [
   {
    "x": 20,
    "y": 0,
    "to": 4,
    "tx": 20,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 29,
    "y": 9,
    "to": 8,
    "tx": 0,
    "ty": 9,
    "dir": "right"
   },
   {
    "x": 14,
    "y": 19,
    "to": 9,
    "tx": 14,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "8": {
  "name": "湖泊",
  "theme": "lake",
  "rows": [
   "TTTTTTTTTTTTTT=TTTTTTT=TTTTTTT",
   "T.............=..www..=......T",
   "T.............=..www..=......T",
   "T........T....=.~~~~~.=......T",
   "T...T.........=.~~~~~.=...T..T",
   "T.............=.~~~~~.=......T",
   "T.............=.......=....T.T",
   "T..T..........=.......=......T",
   "T.............=.......=......T",
   "==============================",
   "T.....................=......T",
   "T....~~~~~~B~~~~~~~...=......T",
   "T.~~.~~~~~~B~~~~~~~...=......T",
   "T.~~.~~~~~~B~~~~~~~...=......T",
   "T.~~.~~~~~~B~~~~~~~...=......T",
   "T.~~.~~~~~~B~~~~~~~...=......T",
   "T....~~~~~~B~~~~~~~...=...=..T",
   "T.=====================.===..T",
   "T.....................=......T",
   "TTTTTTTTTTTTTTTTTTTTTT=TTTTTTT"
  ],
  "buildings": [
   {
    "kind": "arena",
    "x": 23,
    "y": 12,
    "w": 6,
    "h": 4,
    "name": "湖畔全國體育館",
    "roof": "blue",
    "door": [
     26,
     15
    ],
    "tiers": [
     2
    ]
   }
  ],
  "trainers": [
   {
    "id": "l1",
    "x": 10,
    "y": 7,
    "dir": "down",
    "name": "釣魚高手",
    "char": "male",
    "style": "chopper",
    "str": 0.62,
    "range": 2,
    "prize": 790,
    "intro": "湖邊最適合練切球了！",
    "after": "今天的魚和球都跑了。"
   },
   {
    "id": "l2",
    "x": 11,
    "y": 18,
    "dir": "up",
    "name": "划船選手",
    "char": "female",
    "style": "looper",
    "str": 0.66,
    "range": 5,
    "prize": 860,
    "intro": "划船練出來的手臂，拉球超有力！",
    "after": "你的球比船還穩。"
   },
   {
    "id": "l3",
    "x": 25,
    "y": 7,
    "dir": "down",
    "name": "湖畔畫家",
    "char": "female",
    "style": "lobber",
    "str": 0.64,
    "range": 1,
    "prize": 830,
    "intro": "高球的弧線，就像畫裡的彩虹！",
    "after": "這一幕我要畫下來。"
   }
  ],
  "npcs": [
   {
    "x": 16,
    "y": 8,
    "dir": "down",
    "name": "湖畔居民",
    "char": "male",
    "lines": [
     "湖畔的全國體育館在辦全國賽。",
     "要先拿到縣市錦標賽的冠軍才能報名。"
    ]
   }
  ],
  "exits": [
   {
    "x": 14,
    "y": 0,
    "to": 5,
    "tx": 14,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 22,
    "y": 0,
    "to": 6,
    "tx": 22,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 0,
    "y": 9,
    "to": 7,
    "tx": 29,
    "ty": 9,
    "dir": "left"
   },
   {
    "x": 29,
    "y": 9,
    "to": 10,
    "tx": 0,
    "ty": 9,
    "dir": "right"
   },
   {
    "x": 22,
    "y": 19,
    "to": 9,
    "tx": 22,
    "ty": 0,
    "dir": "down"
   }
  ]
 },
 "9": {
  "name": "城堡",
  "theme": "castle",
  "rows": [
   "WWWWWWWWWWWWWWpWWWWWWWpWWWWWWW",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "Wppppppppppppppppppppppppppppp",
   "WppppppppppppppppppppppppppppW",
   "WppppppppppppppppppppppppppppW",
   "WppppopppppppppppppppppppopppW",
   "WppppppppppppppppppppppppppppW",
   "W~~~~~~~~~~~~~~B~~~~~~~~~~~~~W",
   "W~~~~~~~~~~~~~~B~~~~~~~~~~~~~W",
   "W............................W",
   "W.TTTT..................TTTT.W",
   "W.TTTT..................TTTT.W",
   "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
  ],
  "buildings": [
   {
    "kind": "castle",
    "x": 8,
    "y": 4,
    "w": 14,
    "h": 7,
    "name": "國際賽場",
    "roof": "blue",
    "door": [
     15,
     10
    ],
    "tiers": [
     3
    ]
   }
  ],
  "trainers": [
   {
    "id": "k1",
    "x": 12,
    "y": 11,
    "dir": "right",
    "name": "城堡騎士",
    "char": "male",
    "style": "allround",
    "str": 0.8,
    "range": 2,
    "prize": 1130,
    "intro": "想進城堡，先過我這關！",
    "after": "請進吧，勇者。"
   },
   {
    "id": "k2",
    "x": 18,
    "y": 11,
    "dir": "left",
    "name": "宮廷侍女",
    "char": "female",
    "style": "spinner",
    "str": 0.82,
    "range": 2,
    "prize": 1170,
    "intro": "宮廷裡流行的是側旋喔。",
    "after": "您真是位紳士…／淑女。"
   },
   {
    "id": "k3",
    "x": 8,
    "y": 17,
    "dir": "right",
    "name": "皇家教練",
    "char": "male",
    "style": "looper",
    "str": 0.86,
    "range": 6,
    "prize": 1260,
    "intro": "我教出了好幾位國手，你呢？",
    "after": "你有成為球王的實力。"
   }
  ],
  "npcs": [
   {
    "x": 24,
    "y": 11,
    "dir": "down",
    "name": "衛兵",
    "char": "male",
    "lines": [
     "城堡裡就是國際賽場。",
     "世界上最強的選手都在這裡比賽！"
    ]
   }
  ],
  "exits": [
   {
    "x": 14,
    "y": 0,
    "to": 7,
    "tx": 14,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 22,
    "y": 0,
    "to": 8,
    "tx": 22,
    "ty": 19,
    "dir": "up"
   },
   {
    "x": 29,
    "y": 9,
    "to": 10,
    "tx": 0,
    "ty": 15,
    "dir": "right"
   }
  ]
 },
 "10": {
  "name": "夢幻花園",
  "theme": "garden",
  "rows": [
   "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
   "T............................T",
   "T.TTTTT......................T",
   "T.TTTTT......................T",
   "T.TTTTT......................T",
   "T............................T",
   "T..fffff..==============.....T",
   "T..fffff..=========..........T",
   "T.........==~~~~~==.....ffff.T",
   "============~~~~~==ffff.ffff.T",
   "T.........==~~~~~==ffff......T",
   "T..ffffff.==~~~~~==ffff.TTTT.T",
   "T..ffffff.=========ffff.TTTT.T",
   "T..ffffff.=========.....TTTT.T",
   "T.........=..................T",
   "===========.ffffff..TTTT.....T",
   "T...........ffffff..TTTT.....T",
   "T..TTTTT....ffffff..TTTT.....T",
   "T..TTTTT.....................T",
   "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
  ],
  "buildings": [
   {
    "kind": "shop",
    "x": 21,
    "y": 3,
    "w": 4,
    "h": 3,
    "name": "球具大師",
    "roof": "red",
    "door": [
     23,
     5
    ],
    "maxPrice": 999999
   }
  ],
  "trainers": [
   {
    "id": "p1",
    "x": 20,
    "y": 8,
    "dir": "down",
    "name": "花園管理員",
    "char": "female",
    "style": "allround",
    "str": 0.88,
    "range": 2,
    "prize": 1300,
    "intro": "花園裡的花，和球一樣需要細心照顧。",
    "after": "你連花都照顧得比我好吧。"
   },
   {
    "id": "p2",
    "x": 14,
    "y": 14,
    "dir": "up",
    "name": "隱居名人",
    "char": "male",
    "style": "chopper",
    "str": 0.92,
    "range": 2,
    "prize": 1380,
    "intro": "我退休前，可是削球的世界冠軍。",
    "after": "桌球界後繼有人了。"
   },
   {
    "id": "p3",
    "x": 5,
    "y": 10,
    "dir": "right",
    "name": "傳說的球王",
    "char": "male",
    "style": "allround",
    "str": 0.97,
    "range": 3,
    "prize": 1490,
    "intro": "……你終於來了。讓我看看你的實力吧！",
    "after": "新的球王誕生了。"
   }
  ],
  "npcs": [],
  "exits": [
   {
    "x": 0,
    "y": 9,
    "to": 8,
    "tx": 29,
    "ty": 9,
    "dir": "left"
   },
   {
    "x": 0,
    "y": 15,
    "to": 9,
    "tx": 29,
    "ty": 9,
    "dir": "left"
   }
  ]
 }
};
const OVERSEAS_SPAWN = {"map": 1, "x": 5, "y": 7, "dir": "down"};
