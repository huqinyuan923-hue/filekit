# FileKit · 文件工具箱

> 🖼️ 图片压缩 · 📎 PDF 合并 · ✂️ PDF 提取 —— 纯前端文件处理小工具，**文件全程不出浏览器**。

**在线使用 → <https://filekit.adcakeyuan.top>**

## 功能

| 工具 | 说明 |
| --- | --- |
| 图片压缩 | 拖入 / 粘贴 / 多选图片，Canvas 本地压缩，支持保持原格式或转 JPEG / WebP / PNG，可设质量与最长边缩放，显示压缩率并逐个或批量下载 |
| PDF 合并 | 多选 PDF，拖入后用 ↑ ↓ 调整顺序，一键合并为单个 PDF |
| PDF 提取 | 按页码范围（如 `1-3, 5, 8-`）提取页面，可合并为一个 PDF，也可按页拆分成多个 PDF |

## 特点

- **零上传**：所有处理在浏览器本地完成（Canvas + 内置打包的 [pdf-lib](https://github.com/Hopding/pdf-lib)），断网也能用
- **零框架**：原生 HTML / CSS / JavaScript，单页即开即用，无 CDN 依赖
- **深浅色**：跟随系统主题，可手动切换
- **响应式**：手机、平板、桌面均可使用

## 本地运行

无需构建，直接打开 `index.html`，或：

```bash
npx serve .
```

## 部署

静态站点，推送 GitHub 后由 **GitHub Pages** 托管，自定义域 `filekit.adcakeyuan.top`（CNAME 文件 + Cloudflare DNS）。

## License

[MIT](LICENSE) © 2026 huqinyuan923-hue
