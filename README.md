# 艾泽拉斯放置勇者 · Idle Azeroth

魔兽世界题材的放置 RPG，纯前端单页应用。

## 快速开始

用浏览器打开 `index.html` 即可游玩。

## 项目结构

```
index.html          — 主页面
styles.css          — 样式
data.js             — 职业/技能/天赋/装备池/怪物/地图/物品 等数据
state.js            — 存档/状态管理
combat.js           — 战斗计算/属性重算/装备生成
render.js           — UI 渲染
main.js             — 启动/游戏循环/事件代理
skills_ext.js       — 职业技能与 BUFF_FX 表
talents_ext.js      — 扩展天赋
companion_ext.js    — 随从系统
enhance.js          — 装备深度(词缀/宝石/附魔)
artifact.js         — 神器
ascend.js           — 觉醒
progression.js      — 成就/图鉴/声望
events.js           — 世界Boss/日常/赛季
world.js            — 地图/副本/大秘境
tower.js            — 无尽塔
arena.js            — 竞技场
life.js             — 生活技能(采集/制作)
mount.js            — 坐骑
passives.js         — 被动技能
spd_tuning.js       — 攻速稀有化
icons.js            — 魔兽图标映射
assets/wow/         — 魔兽图标资源
```

## 开发铁律

**改数值必须同步改显示。** 任何属性/技能/天赋/装备/buff 的数值修改，必须同时更新所有展示该数值的文字：技能 `desc`、天赋 `desc`、BUFF_NAMES、属性面板、悬浮提示、词缀/宝石/附魔文案等。

## 技术栈

纯 JavaScript (ES6+)，无框架，无构建工具。所有脚本通过 `<script>` 标签加载。
