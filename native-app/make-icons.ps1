# Regenerates the Android launcher icons and splash screens from ../icons/icon-512.png.
# Run after `npx cap add android` or when the app logo changes:
#   powershell -ExecutionPolicy Bypass -File make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = [System.Drawing.Image]::FromFile((Join-Path $root '..\icons\icon-512.png'))
$res = Join-Path $root 'android\app\src\main\res'
$bg = [System.Drawing.ColorTranslator]::FromHtml('#020617')

function Save-Png($w, $h, $path, [scriptblock]$draw) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'
  & $draw $g $w $h
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

# Legacy icon = 48dp, adaptive foreground = 108dp (logo kept inside the 66dp safe zone)
$densities = @{ 'mdpi' = 1; 'hdpi' = 1.5; 'xhdpi' = 2; 'xxhdpi' = 3; 'xxxhdpi' = 4 }
foreach ($d in $densities.Keys) {
  $dir = Join-Path $res "mipmap-$d"
  $s = [int](48 * $densities[$d])
  Save-Png $s $s (Join-Path $dir 'ic_launcher.png') { param($g, $w, $h) $g.DrawImage($src, 0, 0, $w, $h) }
  Save-Png $s $s (Join-Path $dir 'ic_launcher_round.png') {
    param($g, $w, $h)
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath; $p.AddEllipse(0, 0, $w, $h); $g.SetClip($p)
    $g.DrawImage($src, 0, 0, $w, $h)
  }
  $f = [int](108 * $densities[$d])
  Save-Png $f $f (Join-Path $dir 'ic_launcher_foreground.png') {
    param($g, $w, $h)
    $inner = [int]($w * 70 / 108); $o = [int](($w - $inner) / 2)
    $g.DrawImage($src, $o, $o, $inner, $inner)
  }
}
Set-Content -Encoding utf8 (Join-Path $res 'values\ic_launcher_background.xml') @'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#020617</color>
</resources>
'@

# Splash screens: dark background with the logo centred, same sizes Capacitor generated
Get-ChildItem $res -Recurse -Filter splash.png | ForEach-Object {
  $old = [System.Drawing.Image]::FromFile($_.FullName); $w = $old.Width; $h = $old.Height; $old.Dispose()
  Save-Png $w $h $_.FullName {
    param($g, $w, $h)
    $g.Clear($bg)
    $s = [int]([Math]::Min($w, $h) * 0.42)
    $g.DrawImage($src, [int](($w - $s) / 2), [int](($h - $s) / 2), $s, $s)
  }
}
$src.Dispose()
'icons and splash screens written'
