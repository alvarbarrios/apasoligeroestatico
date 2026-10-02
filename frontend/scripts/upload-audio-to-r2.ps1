[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter()]
  [ValidatePattern("^[a-z0-9-]+$")]
  [string]$BucketName = "apl-audio"
)

$audioRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\public\assets\audio")).Path
$files = @(Get-ChildItem -Path $audioRoot -Filter "*.mp3" -File -Recurse)
if ($files.Count -eq 0) {
  throw "No se encontraron MP3 en $audioRoot."
}

foreach ($file in $files) {
  $relativePath = $file.FullName.Substring($audioRoot.Length).TrimStart([char[]]"\/").Replace("\", "/")
  $objectKey = "$BucketName/$relativePath"
  if ($PSCmdlet.ShouldProcess($objectKey, "Subir audio a Cloudflare R2")) {
    & npx.cmd wrangler r2 object put $objectKey "--file=$($file.FullName)" "--content-type=audio/mpeg"
    if ($LASTEXITCODE -ne 0) {
      throw "Falló la subida de $relativePath (código $LASTEXITCODE)."
    }
  }
}

Write-Output "$($files.Count) archivos MP3 procesados."
