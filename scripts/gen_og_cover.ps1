# 生成 OG 分享封面图 public/og-cover.png（1200x630），使用 Windows GDI+，无外部依赖
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

# 背景渐变：蓝 -> 紫 -> 粉
$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(147, 197, 253), [System.Drawing.Color]::FromArgb(249, 168, 212), 45)
$g.FillRectangle($bg, $rect)

# 装饰星星 / 圆点
$rand = New-Object System.Random(7)
$decoColors = @(
  [System.Drawing.Color]::FromArgb(200, 255, 255, 255),
  [System.Drawing.Color]::FromArgb(190, 253, 224, 71),
  [System.Drawing.Color]::FromArgb(160, 255, 255, 255)
)
for ($i = 0; $i -lt 40; $i++) {
  $x = $rand.Next(0, $W); $y = $rand.Next(0, $H); $s = $rand.Next(4, 12)
  $c = $decoColors[$rand.Next(0, 3)]
  $br = New-Object System.Drawing.SolidBrush($c)
  if ($i % 3 -eq 0) {
    # 四角星
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pts = @(
      (New-Object System.Drawing.PointF($x, ($y - $s))),
      (New-Object System.Drawing.PointF(($x + $s * 0.3), ($y - $s * 0.3))),
      (New-Object System.Drawing.PointF(($x + $s), $y)),
      (New-Object System.Drawing.PointF(($x + $s * 0.3), ($y + $s * 0.3))),
      (New-Object System.Drawing.PointF($x, ($y + $s))),
      (New-Object System.Drawing.PointF(($x - $s * 0.3), ($y + $s * 0.3))),
      (New-Object System.Drawing.PointF(($x - $s), $y)),
      (New-Object System.Drawing.PointF(($x - $s * 0.3), ($y - $s * 0.3)))
    )
    $gp.AddPolygon([System.Drawing.PointF[]]$pts)
    $g.FillPath($br, $gp)
  } else {
    $g.FillEllipse($br, $x - $s / 2, $y - $s / 2, $s, $s)
  }
  $br.Dispose()
}

# 标题
$yahei = New-Object System.Drawing.FontFamily('Microsoft YaHei')
$titleFont = New-Object System.Drawing.Font($yahei, 78, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$titleRect = New-Object System.Drawing.RectangleF(0, 56, $W, 110)
# 文字阴影
$shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 49, 46, 129))
$shadowRect = New-Object System.Drawing.RectangleF(0, 64, $W, 110)
$g.DrawString('键盘小达人', $titleFont, $shadow, $shadowRect, $sf)
$g.DrawString('键盘小达人', $titleFont, $white, $titleRect, $sf)

# 副标题
$subFont = New-Object System.Drawing.Font($yahei, 34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subRect = New-Object System.Drawing.RectangleF(0, 176, $W, 56)
$g.DrawString('儿童键盘打字小游戏 · 免费免注册', $subFont, $white, $subRect, $sf)

# 键盘本体（白色圆角卡片）
$kx = 200; $ky = 280; $kw = 800; $kh = 230
$kbPath = RoundedRect $kx $ky $kw $kh 36
$kbBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
$g.FillPath($kbBrush, $kbPath)
$kbPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(205, 214, 254), 8)
$g.DrawPath($kbPen, $kbPath)

# 键帽
$keyColors = @(
  [System.Drawing.Color]::FromArgb(99, 102, 241),
  [System.Drawing.Color]::FromArgb(168, 85, 247),
  [System.Drawing.Color]::FromArgb(34, 197, 94)
)
$rows = 4; $cols = 13
$marginX = 48; $marginY = 36; $gap = 12
$keyW = ($kw - $marginX * 2 - $gap * ($cols - 1)) / $cols
$keyH = ($kh - $marginY * 2 - $gap * ($rows - 1)) / $rows
$keyFont = New-Object System.Drawing.Font($yahei, 22, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$keyBrushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$yellow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(251, 191, 36))
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(146, 64, 14))
for ($r = 0; $r -lt $rows; $r++) {
  for ($c = 0; $c -lt $cols; $c++) {
    $x = $kx + $marginX + $c * ($keyW + $gap)
    $y = $ky + $marginY + $r * ($keyH + $gap)
    $hl = ($r -eq 2 -and $c -eq 4)
    $col = if ($hl) { [System.Drawing.Color]::FromArgb(251, 191, 36) } else { $keyColors[($r + $c) % 3] }
    $kb = New-Object System.Drawing.SolidBrush($col)
    $kp = RoundedRect $x $y $keyW $keyH 10
    $g.FillPath($kb, $kp)
    if ($hl) {
      $g.DrawString('F', $keyFont, $darkBrush, (New-Object System.Drawing.RectangleF($x, $y, $keyW, $keyH)), $sf)
    }
    $kb.Dispose()
  }
}
# 空格键
$spX = $kx + $marginX + $keyW * 3 + $gap * 3
$spW = $keyW * 7 + $gap * 6
$spPath = RoundedRect $spX ($ky + $marginY + 3 * ($keyH + $gap)) $spW $keyH 10
$spaceCol = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(129, 140, 248))
$g.FillPath($spaceCol, $spPath)

# 底部标语
$tagFont = New-Object System.Drawing.Font($yahei, 28, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$tagRect = New-Object System.Drawing.RectangleF(0, 544, $W, 50)
$g.DrawString('认识键盘  ·  找键位闯关  ·  趣味练打字  ·  星球大战', $tagFont, $white, $tagRect, $sf)

$out = Join-Path $PSScriptRoot '..\public\og-cover.png'
$out = [System.IO.Path]::GetFullPath($out)
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "saved: $out"
