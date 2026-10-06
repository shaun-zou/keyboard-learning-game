# 生成分享二维码海报 public/poster-qr.png（1200x630）
# 左侧：标题 + 二维码 + 网址；右侧：键盘插画（与 OG 封面风格一致）
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function RoundedRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
  $p.AddArc($x + $w - $r * 2, $y, $r * 2, $r * 2, 270, 90)
  $p.AddArc($x + $w - $r * 2, $y + $h - $r * 2, $r * 2, $r * 2, 0, 90)
  $p.AddArc($x, $y + $h - $r * 2, $r * 2, $r * 2, 90, 90)
  $p.CloseFigure()
  return $p
}

# 背景渐变
$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(147, 197, 253), [System.Drawing.Color]::FromArgb(249, 168, 212), 45)
$g.FillRectangle($bg, $rect)

# 装饰圆点
$rand = New-Object System.Random(11)
for ($i = 0; $i -lt 36; $i++) {
  $x = $rand.Next(0, $W); $y = $rand.Next(0, $H); $s = $rand.Next(4, 11)
  $alpha = 150 + $rand.Next(0, 80)
  $col = if ($i % 2 -eq 0) { [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255) } else { [System.Drawing.Color]::FromArgb($alpha, 253, 224, 71) }
  $br = New-Object System.Drawing.SolidBrush($col)
  $g.FillEllipse($br, $x - $s / 2, $y - $s / 2, $s, $s)
  $br.Dispose()
}

$yahei = New-Object System.Drawing.FontFamily('Microsoft YaHei')
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$ink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 49, 46, 129))

# ---- 左侧：标题 + 二维码卡 ----
$titleFont = New-Object System.Drawing.Font($yahei, 64, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('键盘小达人', $titleFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 49, 46, 129))), (New-Object System.Drawing.RectangleF(0, 46, 560, 90)), $sf)
$g.DrawString('键盘小达人', $titleFont, $white, (New-Object System.Drawing.RectangleF(0, 40, 560, 90)), $sf)
$subFont = New-Object System.Drawing.Font($yahei, 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('扫码即玩 · 免费免注册', $subFont, $white, (New-Object System.Drawing.RectangleF(0, 136, 560, 42)), $sf)

# 二维码白卡
$cardX = 130; $cardY = 196; $cardW = 340; $cardH = 370
$cardPath = RoundedRect $cardX $cardY $cardW $cardH 24
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250, 255, 255, 255))), $cardPath)

# 二维码图片（用 python 预生成到 temp）
$qrPath = Join-Path $PSScriptRoot '_qr_tmp.png'
$qrPathFull = [System.IO.Path]::GetFullPath($qrPath)
python -c "import qrcode; img=qrcode.make('https://keyboard-learning-game-1fr.pages.dev/'); img.save(r'''$qrPathFull''')"
$qr = [System.Drawing.Image]::FromFile($qrPathFull)
$g.DrawImage($qr, $cardX + 25, $cardY + 25, 250, 250)
$qr.Dispose()
Remove-Item $qrPathFull -ErrorAction SilentlyContinue

# 网址（深靛蓝，居中于白卡底部）
$urlFont = New-Object System.Drawing.Font($yahei, 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$ink2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(67, 56, 202))
$g.DrawString('keyboard-learning-game-1fr.pages.dev', $urlFont, $ink2, (New-Object System.Drawing.RectangleF($cardX, ($cardY + 300), $cardW, 48)), $sf)

# ---- 右侧：键盘插画 ----
$kx = 600; $ky = 250; $kw = 540; $kh = 190
$kbPath = RoundedRect $kx $ky $kw $kh 30
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))), $kbPath)
$g.DrawPath((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(205, 214, 254), 6)), $kbPath)

$keyColors = @(
  [System.Drawing.Color]::FromArgb(99, 102, 241),
  [System.Drawing.Color]::FromArgb(168, 85, 247),
  [System.Drawing.Color]::FromArgb(34, 197, 94)
)
$rows = 4; $cols = 13
$marginX = 30; $marginY = 26; $gap = 8
$keyW = ($kw - $marginX * 2 - $gap * ($cols - 1)) / $cols
$keyH = ($kh - $marginY * 2 - $gap * ($rows - 1)) / $rows
$keyFont = New-Object System.Drawing.Font($yahei, 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(146, 64, 14))
for ($r = 0; $r -lt $rows; $r++) {
  for ($c = 0; $c -lt $cols; $c++) {
    $x = $kx + $marginX + $c * ($keyW + $gap)
    $y = $ky + $marginY + $r * ($keyH + $gap)
    $hl = ($r -eq 2 -and $c -eq 4)
    $col = if ($hl) { [System.Drawing.Color]::FromArgb(251, 191, 36) } else { $keyColors[($r + $c) % 3] }
    $kb = New-Object System.Drawing.SolidBrush($col)
    $g.FillPath($kb, (RoundedRect $x $y $keyW $keyH 7))
    if ($hl) { $g.DrawString('F', $keyFont, $darkBrush, (New-Object System.Drawing.RectangleF($x, $y, $keyW, $keyH)), $sf) }
    $kb.Dispose()
  }
}
$spX = $kx + $marginX + $keyW * 3 + $gap * 3
$spW = $keyW * 7 + $gap * 6
$g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(129, 140, 248))), (RoundedRect $spX ($ky + $marginY + 3 * ($keyH + $gap)) $spW $keyH 7))

# 右侧顶部小字
$g.DrawString('认识键盘 · 找键位闯关', $subFont, $white, (New-Object System.Drawing.RectangleF(560, 60, 600, 44)), $sf)
$g.DrawString('趣味练打字 · 星球大战', $subFont, $white, (New-Object System.Drawing.RectangleF(560, 116, 600, 44)), $sf)

# 底部标语
$tagFont = New-Object System.Drawing.Font($yahei, 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('电脑打开 · 孩子专属 · 键盘键位轻松学', $tagFont, $white, (New-Object System.Drawing.RectangleF(0, 570, $W, 40)), $sf)

$out = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\public\poster-qr.png'))
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "saved: $out"
