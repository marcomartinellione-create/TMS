# immagini.ps1 — icona dell'app e stella della schermata d'avvio, dall'icona della PWA
# (app-android/web/icon-512.png: stella arancione su fondo nero). Scrive nelle risorse del progetto
# Android generato. Lo lancia build-apk.ps1; usa System.Drawing di Windows, niente da installare.
#   -Icona  percorso di icon-512.png      -Res  cartella android/app/src/main/res
param([Parameter(Mandatory=$true)][string]$Icona, [Parameter(Mandatory=$true)][string]$Res)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Icona).Path)
$fondo = $src.GetPixel(4, 4)          # il nero dell'icona: fondo dell'icona adattiva
$hex = '#{0:X2}{1:X2}{2:X2}' -f $fondo.R, $fondo.G, $fondo.B

function Nuova([int]$lato) {
  $b = New-Object System.Drawing.Bitmap $lato, $lato, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  return @($b, $g)
}
function Salva($b, $g, [string]$file) {
  $g.Dispose()
  New-Item -ItemType Directory -Force -Path (Split-Path $file) | Out-Null
  $b.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}
# l'icona intera, ritagliata con una forma (rettangolo arrotondato o cerchio)
function ConForma([int]$lato, [string]$forma, [string]$file) {
  $b, $g = Nuova $lato
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($forma -eq 'cerchio') { $p.AddEllipse(0, 0, $lato, $lato) }
  else {
    $r = [int][math]::Round($lato * 0.22); $d = 2 * $r
    $p.AddArc(0, 0, $d, $d, 180, 90); $p.AddArc($lato - $d, 0, $d, $d, 270, 90)
    $p.AddArc($lato - $d, $lato - $d, $d, $d, 0, 90); $p.AddArc(0, $lato - $d, $d, $d, 90, 90); $p.CloseFigure()
  }
  $g.SetClip($p)
  $g.DrawImage($src, 0, 0, $lato, $lato)
  Salva $b $g $file
}
# icona adattiva: Android ritaglia il primo piano (108dp) e ne mostra solo il centro (72dp);
# la stella, alta l'80% dell'icona, sta tutta dentro se l'icona occupa il 72% del livello.
# Il fondo nero dell'icona coincide col colore di fondo: non si vede nessun bordo.
function PrimoPiano([int]$lato, [string]$file) {
  $b, $g = Nuova $lato
  $d = [int][math]::Round($lato * 0.72); $o = [int][math]::Floor(($lato - $d) / 2)
  $g.DrawImage($src, $o, $o, $d, $d)
  Salva $b $g $file
}

$dens = [ordered]@{ 'mdpi' = 1; 'hdpi' = 1.5; 'xhdpi' = 2; 'xxhdpi' = 3; 'xxxhdpi' = 4 }
foreach ($k in $dens.Keys) {
  $l = [int](48 * $dens[$k]); $f = [int](108 * $dens[$k])
  ConForma $l 'arrotondato' (Join-Path $Res "mipmap-$k\ic_launcher.png")
  ConForma $l 'cerchio' (Join-Path $Res "mipmap-$k\ic_launcher_round.png")
  PrimoPiano $f (Join-Path $Res "mipmap-$k\ic_launcher_foreground.png")
}
# stella della schermata d'avvio: 480 px in xxhdpi = 160dp al centro dello schermo nero
$b, $g = Nuova 480
$g.DrawImage($src, 0, 0, 480, 480)
Salva $b $g (Join-Path $Res 'drawable-xxhdpi\tms_logo.png')

$xml = "<?xml version=`"1.0`" encoding=`"utf-8`"?>`n<!-- TMS Scheda: il nero dell'icona (scripts/immagini.ps1) -->`n<resources>`n    <color name=`"ic_launcher_background`">$hex</color>`n</resources>`n"
[System.IO.File]::WriteAllText((Join-Path $Res 'values\ic_launcher_background.xml'), $xml, (New-Object System.Text.UTF8Encoding $false))
$src.Dispose()
Write-Host "icone e stella d'avvio generate (fondo $hex)"
