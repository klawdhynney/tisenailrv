Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$iconSource = "C:\Users\Claudinei Lima\.gemini\antigravity-ide\brain\16c0b540-3135-44df-a596-ec3322ea44fc\.user_uploaded\media_1791250943384.jpg"
$capaSource = "C:\Users\Claudinei Lima\.gemini\antigravity-ide\brain\16c0b540-3135-44df-a596-ec3322ea44fc\.user_uploaded\media_1791250943435.png"

Write-Host "Iniciando processamento das imagens..."
Write-Host "Origem Icone: $iconSource"
Write-Host "Origem Capa: $capaSource"

function Resize-ImageFile {
    param(
        [System.Drawing.Image]$img,
        [int]$width,
        [int]$height,
        [string]$outputPath,
        [System.Drawing.Imaging.ImageFormat]$format
    )
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $destImage = New-Object System.Drawing.Bitmap($width, $height)
    $destImage.SetResolution($img.HorizontalResolution, $img.VerticalResolution)

    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $destImage.Save($outputPath, $format)
    $destImage.Dispose()
    Write-Host "Gerado: $outputPath ($width x $height)"
}

function Save-WebP {
    param(
        [string]$inputPng,
        [string]$outputWebp
    )
    try {
        $uri = New-Object System.Uri($inputPng)
        $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($uri, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
        $webpGuid = [System.Guid]::Parse('{163bcc30-e2e9-4f0b-961d-a3e9fdb788a3}')
        $encoder = [System.Windows.Media.Imaging.BitmapEncoder]::Create($webpGuid)
        $encoder.Frames.Add($decoder.Frames[0])
        $outStream = [System.IO.File]::Create($outputWebp)
        $encoder.Save($outStream)
        $outStream.Close()
        Write-Host "Gerado WebP: $outputWebp"
    } catch {
        Write-Warning "Falha ao gerar WebP com WIC: $_. Copiando fallback PNG..."
        Copy-Item -Path $inputPng -Destination $outputWebp -Force
    }
}

# 1. Carregar Icone
$iconImg = [System.Drawing.Image]::FromFile($iconSource)

# Gerar icone em src/assets e public
Resize-ImageFile -img $iconImg -width 1024 -height 1024 -outputPath "C:\TISENAILRV\src\assets\icone.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-ImageFile -img $iconImg -width 1024 -height 1024 -outputPath "C:\TISENAILRV\public\icone.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-ImageFile -img $iconImg -width 512 -height 512 -outputPath "C:\TISENAILRV\public\icon-512.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-ImageFile -img $iconImg -width 192 -height 192 -outputPath "C:\TISENAILRV\public\icon-192.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-ImageFile -img $iconImg -width 180 -height 180 -outputPath "C:\TISENAILRV\public\apple-touch-icon.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-ImageFile -img $iconImg -width 48 -height 48 -outputPath "C:\TISENAILRV\public\favicon.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-ImageFile -img $iconImg -width 32 -height 32 -outputPath "C:\TISENAILRV\public\favicon-32x32.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-ImageFile -img $iconImg -width 16 -height 16 -outputPath "C:\TISENAILRV\public\favicon-16x16.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)

# Criar favicon.ico válido
# Um favicon.ico com suporte a PNG embutido (padrão moderno para browsers)
$favStream = [System.IO.File]::Create("C:\TISENAILRV\public\favicon.ico")
$bw = New-Object System.IO.BinaryWriter($favStream)
# ICONDIR header
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type: 1 = ICO
$bw.Write([uint16]1) # Count: 1 image

$pngBytes = [System.IO.File]::ReadAllBytes("C:\TISENAILRV\public\favicon-32x32.png")
# ICONDIRENTRY
$bw.Write([byte]32) # Width
$bw.Write([byte]32) # Height
$bw.Write([byte]0)  # Color count (0 = >=8bpp)
$bw.Write([byte]0)  # Reserved
$bw.Write([uint16]1) # Color planes
$bw.Write([uint16]32) # Bits per pixel
$bw.Write([uint32]$pngBytes.Length) # Image size
$bw.Write([uint32]22) # Offset (6 bytes header + 16 bytes entry = 22)
$bw.Write($pngBytes)
$bw.Close()
$favStream.Close()
Write-Host "Gerado: public/favicon.ico"

$iconImg.Dispose()

# 2. Carregar Capa
$capaImg = [System.Drawing.Image]::FromFile($capaSource)
# Salvar original e 2x em src/assets e public
Copy-Item -Path $capaSource -Destination "C:\TISENAILRV\src\assets\capa.png" -Force
Copy-Item -Path $capaSource -Destination "C:\TISENAILRV\public\capa.png" -Force
Write-Host "Copiado original da Capa para src/assets/capa.png e public/capa.png"

# Versão 1x otimizada
Resize-ImageFile -img $capaImg -width 1024 -height 384 -outputPath "C:\TISENAILRV\src\assets\capa-1x.png" -format ([System.Drawing.Imaging.ImageFormat]::Png)
Copy-Item -Path "C:\TISENAILRV\src\assets\capa-1x.png" -Destination "C:\TISENAILRV\public\capa-1x.png" -Force

Save-WebP -inputPng "C:\TISENAILRV\src\assets\capa.png" -outputWebp "C:\TISENAILRV\src\assets\capa.webp"
Save-WebP -inputPng "C:\TISENAILRV\src\assets\capa.png" -outputWebp "C:\TISENAILRV\public\capa.webp"
Save-WebP -inputPng "C:\TISENAILRV\src\assets\capa-1x.png" -outputWebp "C:\TISENAILRV\src\assets\capa-1x.webp"
Save-WebP -inputPng "C:\TISENAILRV\src\assets\capa-1x.png" -outputWebp "C:\TISENAILRV\public\capa-1x.webp"

$capaImg.Dispose()
Write-Host "Processamento concluído com sucesso!"
