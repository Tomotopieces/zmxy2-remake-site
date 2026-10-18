# zmxy2-remake-site

《造梦西游2：十殿阎罗篇》重制版（[zmxy2-remake](https://github.com/Tomotopieces/zmxy2-remake)）的玩家介绍站：重制说明、敌人图鉴、物品图鉴。设计见 `DESIGN.md`。

- `npm run dev` 本地预览，`npm run build` 构建到 `dist/`（推送 main 后由 GitHub Actions 发布到 Pages）。
- 数据：`npm run data -- <zmxy2-remake 路径>` 从重制版的游戏数据导出 `src/data/*.json` 并复制物品图标；数值只取游戏数据。
- 游戏数据没有的文字（Boss 称号 / 简介 / 技能、部分物品描述）只取自 4399 官方攻略站，存在 `scripts/official/*.json`，每条带来源链接。
- 敌人与主角立绘是从重制版场景渲染的透明 PNG（`public/img/monsters`、`public/img/heroes`）。
- 字体：`npm run fonts -- <字体目录>` 按站内用到的字裁剪霞鹜975圆体 / 851 马克笔体；改了文案或数据后要重新裁剪。
