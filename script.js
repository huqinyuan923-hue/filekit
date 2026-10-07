'use strict';

/* ================= 主题 ================= */
const THEME_KEY = 'filekit-theme';
const themeBtn = document.getElementById('themeToggle');

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
}
applyTheme(localStorage.getItem(THEME_KEY) ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* ================= 标签页 ================= */
const tabs = [...document.querySelectorAll('.tool-btn[role="tab"]')];
function selectTab(name) {
  for (const t of tabs) {
    const on = t.dataset.tool === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(`tool-${t.dataset.tool}`).classList.toggle('hidden', !on);
  }
}
tabs.forEach(t => t.addEventListener('click', () => selectTab(t.dataset.tool)));
tabs.forEach((t, i) => t.addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const dir = e.key === 'ArrowRight' ? 1 : -1;
  const next = tabs[(i + dir + tabs.length) % tabs.length];
  next.focus(); selectTab(next.dataset.tool);
}));

/* ================= 通用 ================= */
const $ = id => document.getElementById(id);

function toast(msg, ms = 2400) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), ms);
}

function fmtBytes(n) {
  if (n === 0 || n == null) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function baseName(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

function extOf(mime) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime] || 'bin';
}

function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function bindDropzone(zone, input, onFiles) {
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragover', 'dragenter'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('dragover'); }));
  zone.addEventListener('drop', e => onFiles([...e.dataTransfer.files]));
  input.addEventListener('change', () => { onFiles([...input.files]); input.value = ''; });
}

/* ================= 图片压缩 ================= */
const imgItems = []; // { file, name, status, outBlob, outName, outSize, origSize, thumbUrl }

const imgDrop = $('imgDrop'), imgInput = $('imgInput'), imgList = $('imgList');

function imgOpts() {
  return {
    format: $('outFormat').value,          // auto | image/jpeg | image/webp | image/png
    quality: Number($('quality').value) / 100,
    maxEdge: Number($('maxEdge').value) || 0,
  };
}

function renderImgList() {
  imgList.innerHTML = '';
  let done = 0;
  imgItems.forEach((it, idx) => {
    const li = document.createElement('li');
    li.className = 'file-item';

    if (it.status === 'error') {
      li.innerHTML = `
        <div class="file-thumb pdf">⚠️</div>
        <div class="file-main">
          <div class="file-name"></div>
          <div class="file-meta"><span class="err"></span></div>
        </div>
        <div class="file-actions"><button class="mini-btn" data-del="${idx}" title="移除">✕</button></div>`;
      li.querySelector('.file-name').textContent = it.name;
      li.querySelector('.err').textContent = it.error;
      imgList.appendChild(li);
      return;
    }

    if (it.status === 'done') done++;

    const pct = it.outSize ? Math.round((1 - it.outSize / it.origSize) * 100) : 0;
    li.innerHTML = `
      <img class="file-thumb" alt="" loading="lazy">
      <div class="file-main">
        <div class="file-name"></div>
        <div class="file-meta"></div>
      </div>
      <div class="file-actions">
        ${it.status === 'done' ? '<button class="mini-btn go" data-dl="' + idx + '">下载</button>' : '<span class="status-done">处理中…</span>'}
        <button class="mini-btn" data-del="${idx}" title="移除">✕</button>
      </div>`;

    li.querySelector('.file-name').textContent = it.outName || it.name;
    const meta = li.querySelector('.file-meta');
    if (it.status === 'done') {
      meta.innerHTML = `${fmtBytes(it.origSize)} → ${fmtBytes(it.outSize)}　` +
        (it.outSize <= it.origSize
          ? `<span class="save">省 ${pct}%</span>`
          : `<span class="err">大 ${-pct}%（原格式已足够小）</span>`) +
        (it.dims ? `　${it.dims.width}×${it.dims.height}` : '');
      li.querySelector('.file-thumb').src = it.thumbUrl;
    } else {
      meta.textContent = '压缩中…';
    }
    imgList.appendChild(li);
  });

  $('imgDownloadAll').disabled = done === 0;
}

imgList.addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  const dl = e.target.closest('[data-dl]');
  if (del) {
    const it = imgItems[Number(del.dataset.del)];
    if (it?.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
    imgItems.splice(Number(del.dataset.del), 1);
    renderImgList();
  } else if (dl) {
    const it = imgItems[Number(dl.dataset.dl)];
    if (it?.outBlob) triggerDownload(it.outBlob, it.outName);
  }
});

async function compressOne(it, opts) {
  const bmp = await createImageBitmap(it.file, { imageOrientation: 'from-image' });
  let { width, height } = bmp;
  if (opts.maxEdge && Math.max(width, height) > opts.maxEdge) {
    const s = opts.maxEdge / Math.max(width, height);
    width = Math.max(1, Math.round(width * s));
    height = Math.max(1, Math.round(height * s));
  }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  let mime = opts.format;
  if (mime === 'auto') mime = ['image/png', 'image/webp'].includes(it.file.type) ? it.file.type : 'image/jpeg';

  if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); }
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close?.();

  const blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('编码失败'))), mime, mime === 'image/png' ? undefined : opts.quality));

  it.outBlob = blob;
  it.outSize = blob.size;
  it.outName = `${baseName(it.name)}.${extOf(mime)}`;
  it.dims = { width, height };
  it.status = 'done';
}

async function addImages(files) {
  const opts = imgOpts();
  for (const file of files) {
    const it = { file, name: file.name, origSize: file.size, status: 'working', thumbUrl: '' };
    imgItems.push(it);
    if (!file.type.startsWith('image/')) {
      it.status = 'error'; it.error = '不是图片文件'; renderImgList(); continue;
    }
    it.thumbUrl = URL.createObjectURL(file);
    renderImgList();
    try {
      await compressOne(it, opts);
    } catch (err) {
      it.status = 'error';
      it.error = file.type === 'image/heic' || file.type === 'image/heif'
        ? '浏览器不支持 HEIC，请先转换'
        : '无法解码该图片';
    }
    renderImgList();
  }
}

bindDropzone(imgDrop, imgInput, files => {
  const imgs = files.filter(f => f.type.startsWith('image/'));
  if (files.length && !imgs.length) toast('请选择图片文件');
  addImages(imgs);
});
document.addEventListener('paste', e => {
  if ($('tool-image').classList.contains('hidden')) return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if (files.length) addImages(files);
});

$('imgClear').addEventListener('click', () => {
  imgItems.forEach(it => it.thumbUrl && URL.revokeObjectURL(it.thumbUrl));
  imgItems.length = 0;
  renderImgList();
});

$('imgDownloadAll').addEventListener('click', async () => {
  const done = imgItems.filter(it => it.status === 'done');
  for (let i = 0; i < done.length; i++) {
    triggerDownload(done[i].outBlob, done[i].outName);
    if (i < done.length - 1) await new Promise(r => setTimeout(r, 350));
  }
  toast(`已触发 ${done.length} 个下载`);
});

/* ================= PDF：公共 ================= */
const { PDFDocument } = self.PDFLib || {};

function pdfLibReady() {
  if (!self.PDFLib) {
    toast('PDF 组件尚未加载完成，请稍候重试或检查网络');
    return false;
  }
  return true;
}

async function readPdf(file) {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { name: file.name, size: file.size, bytes, doc, pages: doc.getPageCount() };
}

/* ================= PDF 合并 ================= */
const mergeQueue = []; // readPdf 结果
const mergeDrop = $('mergeDrop'), mergeInput = $('mergeInput'), mergeList = $('mergeList');

bindDropzone(mergeDrop, mergeInput, files => addMerge(files));

async function addMerge(files) {
  if (!pdfLibReady()) return;
  const pdfs = files.filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (files.length && !pdfs.length) { toast('请选择 PDF 文件'); return; }
  for (const f of pdfs) {
    try {
      mergeQueue.push(await readPdf(f));
    } catch {
      toast(`「${f.name}」无法解析（可能是加密 PDF）`);
    }
    renderMerge();
  }
}

function renderMerge() {
  mergeList.innerHTML = '';
  mergeQueue.forEach((it, idx) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      <div class="file-thumb pdf">📄</div>
      <div class="file-main">
        <div class="file-name"></div>
        <div class="file-meta"></div>
      </div>
      <div class="file-actions">
        <button class="mini-btn" data-up="${idx}" title="上移" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button class="mini-btn" data-down="${idx}" title="下移" ${idx === mergeQueue.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="mini-btn" data-del="${idx}" title="移除">✕</button>
      </div>`;
    li.querySelector('.file-name').textContent = it.name;
    li.querySelector('.file-meta').textContent = `${it.pages} 页 · ${fmtBytes(it.size)}`;
    mergeList.appendChild(li);
  });
  $('mergeGo').disabled = mergeQueue.length < 2;
  $('mergeClear').disabled = mergeQueue.length === 0;
}

mergeList.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.up != null) {
    const i = Number(b.dataset.up);
    [mergeQueue[i - 1], mergeQueue[i]] = [mergeQueue[i], mergeQueue[i - 1]];
  } else if (b.dataset.down != null) {
    const i = Number(b.dataset.down);
    [mergeQueue[i + 1], mergeQueue[i]] = [mergeQueue[i], mergeQueue[i + 1]];
  } else if (b.dataset.del != null) {
    mergeQueue.splice(Number(b.dataset.del), 1);
  }
  renderMerge();
});

$('mergeClear').addEventListener('click', () => { mergeQueue.length = 0; renderMerge(); });

$('mergeGo').addEventListener('click', async () => {
  if (!pdfLibReady() || mergeQueue.length < 2) return;
  $('mergeGo').disabled = true;
  try {
    const out = await PDFDocument.create();
    for (const it of mergeQueue) {
      const pages = await out.copyPages(it.doc, it.doc.getPageIndices());
      pages.forEach(p => out.addPage(p));
    }
    const bytes = await out.save();
    triggerDownload(new Blob([bytes], { type: 'application/pdf' }), 'FileKit-合并.pdf');
    toast(`已合并 ${mergeQueue.length} 个文件，共 ${out.getPageCount()} 页`);
  } catch (err) {
    toast('合并失败：' + err.message);
  }
  $('mergeGo').disabled = false;
});

/* ================= PDF 提取 ================= */
let extractDoc = null; // { name, doc, pages }
const extractDrop = $('extractDrop'), extractInput = $('extractInput'), extractList = $('extractList');

bindDropzone(extractDrop, extractInput, files => loadExtract(files[0]));

async function loadExtract(file) {
  if (!file) return;
  if (!pdfLibReady()) return;
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { toast('请选择 PDF 文件'); return; }
  try {
    const it = await readPdf(file);
    extractDoc = it;
    $('extractOps').classList.remove('hidden');
    $('extractInfo').textContent = `「${it.name}」共 ${it.pages} 页，范围留空则提取全部页。`;
    extractList.innerHTML = '';
  } catch {
    toast('无法解析该 PDF（可能是加密文件）');
  }
}

function parseRanges(text, total) {
  const t = text.trim();
  if (!t) return [[1, total]];
  const out = [];
  for (const part of t.split(/[,，、]/)) {
    const p = part.trim();
    if (!p) continue;
    let m = p.match(/^(\d+)\s*-\s*(\d*)$/);
    if (m) {
      const a = Number(m[1]);
      const b = m[2] === '' ? total : Number(m[2]);
      if (a < 1 || a > b || b > total) throw new Error(`范围「${p}」超出 1–${total}`);
      out.push([a, b]);
    } else if (/^\d+$/.test(p)) {
      const n = Number(p);
      if (n < 1 || n > total) throw new Error(`页码「${p}」超出 1–${total}`);
      out.push([n, n]);
    } else {
      throw new Error(`无法识别「${p}」`);
    }
  }
  if (!out.length) throw new Error('页码范围为空');
  return out;
}

$('extractGo').addEventListener('click', async () => {
  if (!extractDoc || !pdfLibReady()) return;
  let ranges;
  try {
    ranges = parseRanges($('pageRanges').value, extractDoc.pages);
  } catch (err) {
    toast(err.message);
    return;
  }
  const mode = document.querySelector('input[name="extractMode"]:checked').value;
  extractList.innerHTML = '';
  const pageIdx = (n) => n - 1;

  try {
    if (mode === 'merged') {
      const out = await PDFDocument.create();
      const flat = [];
      ranges.forEach(([a, b]) => { for (let n = a; n <= b; n++) flat.push(pageIdx(n)); });
      const pages = await out.copyPages(extractDoc.doc, flat);
      pages.forEach(p => out.addPage(p));
      const bytes = await out.save();
      const name = `${baseName(extractDoc.name)}-提取.pdf`;
      addExtractRow(name, out.getPageCount(), new Blob([bytes], { type: 'application/pdf' }));
    } else {
      for (const [a, b] of ranges) {
        for (let n = a; n <= b; n++) {
          const out = await PDFDocument.create();
          const [p] = await out.copyPages(extractDoc.doc, [pageIdx(n)]);
          out.addPage(p);
          const bytes = await out.save();
          addExtractRow(`${baseName(extractDoc.name)}-第${n}页.pdf`, 1, new Blob([bytes], { type: 'application/pdf' }));
        }
      }
    }
    toast('提取完成，点击列表中的「下载」保存');
  } catch (err) {
    toast('提取失败：' + err.message);
  }
});

function addExtractRow(name, pages, blob) {
  const li = document.createElement('li');
  li.className = 'file-item';
  li.innerHTML = `
    <div class="file-thumb pdf">📄</div>
    <div class="file-main">
      <div class="file-name"></div>
      <div class="file-meta"></div>
    </div>
    <div class="file-actions"><button class="mini-btn go">下载</button></div>`;
  li.querySelector('.file-name').textContent = name;
  li.querySelector('.file-meta').textContent = `${pages} 页 · ${fmtBytes(blob.size)}`;
  li.querySelector('.mini-btn.go').addEventListener('click', () => triggerDownload(blob, name));
  extractList.appendChild(li);
}

/* 初始化默认视图 */
renderImgList();
