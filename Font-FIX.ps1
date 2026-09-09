# ==============================================================================
# 🏷️ Font-FIX Pro - Pure Native Windows PowerShell Edition
# 📜 Purpose: Deep binary extraction of OpenType/TrueType font versions & 
#             idempotent folder renaming with full undo/audit capabilities.
# ⚡ Zero Dependencies: Built-in Windows Native Parsing (No Python, No Pip)
# ==============================================================================

# ==============================================================================
# BLOCK 01: SCRIPT INITIALIZATION & PARAMETERS
# ==============================================================================
[CmdletBinding()]
param (
    [Parameter(Position = 0, Mandatory = $false)]
    [string]$TargetDirectory = "",

    [Parameter(Mandatory = $false)]
    [ValidateSet("All", "FilesOnly", "FoldersOnly")]
    [string]$Scope = "All",

    [Parameter(Mandatory = $false)]
    [switch]$DryRun,

    [Parameter(Mandatory = $false)]
    [switch]$Undo
)

$ErrorActionPreference = "Continue"
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# Determine default target directory (Script folder or current working directory)
$defaultDir = if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) { $PSScriptRoot } else { (Get-Location).Path }

if ([string]::IsNullOrWhiteSpace($TargetDirectory)) {
    $TargetDirectory = $defaultDir
}

$TargetDirectory = $TargetDirectory.Trim('"', "'", " ")

if (-not (Test-Path -LiteralPath $TargetDirectory)) {
    Write-Host "`n[ERROR] Target directory does not exist: '$TargetDirectory'" -ForegroundColor Red
    Write-Host "Press [ENTER] to exit..." -ForegroundColor Cyan
    try { [void][System.Console]::ReadLine() } catch {}
    exit 1
}

$TargetDirectory = (Resolve-Path -LiteralPath $TargetDirectory).Path
$AuditLogPath = Join-Path $TargetDirectory "font_fix_audit.json"

# ==============================================================================
# BLOCK 02: CONFIGURATION & REGEX DEFINITIONS
# ==============================================================================
$FONT_EXTENSIONS = @('.ttf', '.otf', '.woff', '.woff2', '.ttc')
$FOLDER_VERSION_REGEX = '(?i)[\s\-_(\[]*(?:v(?:er(?:sion)?)?\.?\s*)?(\d+(?:\.\d+)+)[\])]*\s*$'
$VERSION_EXTRACT_REGEX = '(?i)(?:Version\s*|v\s*|OTF\s*)?(\d+(?:\.\d+)+)'

# ==============================================================================
# BLOCK 03: ROBUST NATIVE BINARY PARSER & MULTI-FORMAT DECOMPRESSOR (.TTF, .OTF, .WOFF, .WOFF2, .TTC)
# ==============================================================================
function Read-UInt16BE([System.IO.Stream]$stream) {
    $buf = New-Object byte[] 2
    $read = $stream.Read($buf, 0, 2)
    if ($read -lt 2) { return $null }
    if ([System.BitConverter]::IsLittleEndian) {
        [System.Array]::Reverse($buf)
    }
    return [System.BitConverter]::ToUInt16($buf, 0)
}

function Read-UInt32BE([System.IO.Stream]$stream) {
    $buf = New-Object byte[] 4
    $read = $stream.Read($buf, 0, 4)
    if ($read -lt 4) { return $null }
    if ([System.BitConverter]::IsLittleEndian) {
        [System.Array]::Reverse($buf)
    }
    return [System.BitConverter]::ToUInt32($buf, 0)
}

function Read-Tag([System.IO.Stream]$stream) {
    $buf = New-Object byte[] 4
    $read = $stream.Read($buf, 0, 4)
    if ($read -lt 4) { return "" }
    return [System.Text.Encoding]::ASCII.GetString($buf)
}

function Decompress-ZlibBytes([byte[]]$compBytes) {
    if ($null -eq $compBytes -or $compBytes.Length -le 6) { return $compBytes }
    try {
        # zlib RFC 1950 header is 2 bytes (e.g. 0x78 0x9c), and Adler32 checksum is 4 bytes at end
        $dataLen = $compBytes.Length - 6
        if ($dataLen -le 0) { $dataLen = $compBytes.Length - 2 }
        $ms = New-Object System.IO.MemoryStream($compBytes, 2, $dataLen)
        $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
        $outMs = New-Object System.IO.MemoryStream
        $ds.CopyTo($outMs)
        $ds.Close()
        $ms.Close()
        return $outMs.ToArray()
    } catch {
        return $null
    }
}

function Parse-NameTableStream([System.IO.Stream]$stream, [int64]$tableOffset, [uint32]$tableLength) {
    if ($tableLength -le 6 -or ($tableOffset + 6 -gt $stream.Length)) { return $null }
    $null = $stream.Seek($tableOffset, [System.IO.SeekOrigin]::Begin)
    $format = Read-UInt16BE $stream
    $count = Read-UInt16BE $stream
    $stringOffset = Read-UInt16BE $stream

    if ($count -eq $null -or $stringOffset -eq $null -or $count -le 0) { return $null }

    $storageAreaOffset = [int64]($tableOffset + $stringOffset)
    $candidates = [System.Collections.Generic.List[psobject]]::new()

    for ($i = 0; $i -lt $count; $i++) {
        $platID = Read-UInt16BE $stream
        $encID = Read-UInt16BE $stream
        $langID = Read-UInt16BE $stream
        $nameID = Read-UInt16BE $stream
        $recLength = Read-UInt16BE $stream
        $recOffset = Read-UInt16BE $stream

        if ($nameID -eq 5 -and $recLength -ne $null -and $recLength -gt 0) {
            $candidates.Add([pscustomobject]@{
                PlatformID = $platID
                EncodingID = $encID
                Length     = $recLength
                Offset     = $recOffset
            })
        }
    }

    # Prioritize: Windows Unicode (plat 3), then Mac Roman (plat 1), then Unicode (plat 0)
    $sorted = $candidates | Sort-Object -Property @{
        Expression = {
            if ($_.PlatformID -eq 3) { 1 }
            elseif ($_.PlatformID -eq 1) { 2 }
            elseif ($_.PlatformID -eq 0) { 3 }
            else { 4 }
        }
    }

    foreach ($cand in $sorted) {
        $strPos = $storageAreaOffset + [int64]$cand.Offset
        if ($strPos + $cand.Length -le $stream.Length) {
            $null = $stream.Seek($strPos, [System.IO.SeekOrigin]::Begin)
            $bytes = New-Object byte[] $cand.Length
            $null = $stream.Read($bytes, 0, $cand.Length)

            $decoded = ""
            if ($cand.PlatformID -eq 3 -or $cand.PlatformID -eq 0) {
                $decoded = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes)
            } else {
                $decoded = [System.Text.Encoding]::UTF8.GetString($bytes)
            }

            if ($decoded -match $VERSION_EXTRACT_REGEX) {
                return $Matches[1]
            }
        }
    }
    return $null
}

function Parse-HeadTableRevision([System.IO.Stream]$stream, [int64]$tableOffset, [uint32]$tableLength) {
    if ($tableLength -lt 8 -or ($tableOffset + 8 -gt $stream.Length)) { return $null }
    $null = $stream.Seek([int64]($tableOffset + 4), [System.IO.SeekOrigin]::Begin)
    $rev = Read-UInt32BE $stream
    if ($rev -ne $null -and $rev -gt 0) {
        $major = [math]::Floor($rev / 65536)
        $fraction = ($rev % 65536)
        $fractionStr = ([math]::Round(($fraction / 65536) * 1000)).ToString().PadLeft(3, '0').TrimEnd('0')
        if ([string]::IsNullOrEmpty($fractionStr)) { $fractionStr = "0" }
        return "$major.$fractionStr"
    }
    return $null
}

function Get-VersionViaPythonFontTools([string]$filePath) {
    try {
        if (Get-Command python -ErrorAction SilentlyContinue) {
            $pyOut = & python -c "import sys, re; from fontTools.ttLib import TTFont; f=TTFont(sys.argv[1]); n=f['name'].getDebugName(5); m=re.search(r'(?:Version\s*|v\s*)?(\d+(?:\.\d+)+)', n or ''); print(m.group(1) if m else '')" $filePath 2>$null
            if ($pyOut -and $pyOut.Trim()) {
                return $pyOut.Trim()
            }
        }
    } catch {}
    return $null
}

function Get-FontVersionFromBinary([string]$filePath) {
    try {
        $stream = [System.IO.File]::Open($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    } catch {
        return $null
    }

    try {
        if ($stream.Length -lt 12) { return $null }

        $magic = Read-Tag $stream
        $sfntOffset = 0

        # Case 1: TrueType Collection (.ttc)
        if ($magic -eq "ttcf") {
            $ttcVersion = Read-UInt32BE $stream
            $numFonts = Read-UInt32BE $stream
            if ($numFonts -ne $null -and $numFonts -gt 0) {
                $sfntOffset = Read-UInt32BE $stream
                $null = $stream.Seek([int64]$sfntOffset, [System.IO.SeekOrigin]::Begin)
                $magic = Read-Tag $stream
            }
        }

        # Case 2: WOFF 1.0 (.woff) with Native Zlib Decompression
        if ($magic -eq "wOFF") {
            $flavor = Read-UInt32BE $stream
            $woffLen = Read-UInt32BE $stream
            $numTables = Read-UInt16BE $stream
            $reserved = Read-UInt16BE $stream
            $totalSfntSize = Read-UInt32BE $stream
            $major = Read-UInt16BE $stream
            $minor = Read-UInt16BE $stream
            $metaOffset = Read-UInt32BE $stream
            $metaLength = Read-UInt32BE $stream
            $metaOrigLength = Read-UInt32BE $stream

            if ($numTables -gt 0 -and $numTables -le 256) {
                $null = $stream.Seek(44, [System.IO.SeekOrigin]::Begin)
                $woffTables = [System.Collections.Generic.List[psobject]]::new()
                for ($ti = 0; $ti -lt $numTables; $ti++) {
                    $tTag = Read-Tag $stream
                    $tOffset = Read-UInt32BE $stream
                    $tCompLen = Read-UInt32BE $stream
                    $tOrigLen = Read-UInt32BE $stream
                    $tChecksum = Read-UInt32BE $stream
                    $woffTables.Add([pscustomobject]@{
                        Tag        = $tTag
                        Offset     = $tOffset
                        CompLength = $tCompLen
                        OrigLength = $tOrigLen
                    })
                }

                # 2.1 Check decompressed 'name' table
                $nameEntry = $woffTables | Where-Object { $_.Tag -eq "name" } | Select-Object -First 1
                if ($nameEntry -and $nameEntry.CompLength -gt 0) {
                    $null = $stream.Seek([int64]$nameEntry.Offset, [System.IO.SeekOrigin]::Begin)
                    $rawBytes = New-Object byte[] $nameEntry.CompLength
                    $null = $stream.Read($rawBytes, 0, $nameEntry.CompLength)
                    $tableBytes = $rawBytes
                    if ($nameEntry.CompLength -lt $nameEntry.OrigLength) {
                        $tableBytes = Decompress-ZlibBytes $rawBytes
                    }
                    if ($tableBytes) {
                        $tMem = New-Object System.IO.MemoryStream(,$tableBytes)
                        $foundVer = Parse-NameTableStream $tMem 0 $tableBytes.Length
                        $tMem.Close()
                        if ($foundVer) { return $foundVer }
                    }
                }

                # 2.2 Check decompressed 'head' table
                $headEntry = $woffTables | Where-Object { $_.Tag -eq "head" } | Select-Object -First 1
                if ($headEntry -and $headEntry.CompLength -gt 0) {
                    $null = $stream.Seek([int64]$headEntry.Offset, [System.IO.SeekOrigin]::Begin)
                    $rawBytes = New-Object byte[] $headEntry.CompLength
                    $null = $stream.Read($rawBytes, 0, $headEntry.CompLength)
                    $tableBytes = $rawBytes
                    if ($headEntry.CompLength -lt $headEntry.OrigLength) {
                        $tableBytes = Decompress-ZlibBytes $rawBytes
                    }
                    if ($tableBytes) {
                        $tMem = New-Object System.IO.MemoryStream(,$tableBytes)
                        $foundVer = Parse-HeadTableRevision $tMem 0 $tableBytes.Length
                        $tMem.Close()
                        if ($foundVer) { return $foundVer }
                    }
                }
            }

            # 2.3 Check WOFF metadata XML block
            if ($metaOffset -gt 0 -and $metaLength -gt 0) {
                $null = $stream.Seek([int64]$metaOffset, [System.IO.SeekOrigin]::Begin)
                $metaRaw = New-Object byte[] $metaLength
                $null = $stream.Read($metaRaw, 0, $metaLength)
                $metaBytes = $metaRaw
                if ($metaLength -lt $metaOrigLength) {
                    $metaBytes = Decompress-ZlibBytes $metaRaw
                }
                if ($metaBytes) {
                    $metaXml = [System.Text.Encoding]::UTF8.GetString($metaBytes)
                    if ($metaXml -match '(?i)<version[^>]*>([^<]+)</version>' -or $metaXml -match '(?i)version\s*=\s*["'']([^"'']+)["'']') {
                        if ($Matches[1] -match $VERSION_EXTRACT_REGEX) {
                            return $Matches[1]
                        }
                    }
                }
            }

            # 2.4 Fallback to header major/minor version
            if ($major -ne $null -and $minor -ne $null -and ($major -gt 0 -or $minor -gt 0)) {
                return "$major.$minor"
            }
        }

        # Case 3: WOFF 2.0 (.woff2)
        if ($magic -eq "wOF2") {
            $flavor = Read-UInt32BE $stream
            $woff2Len = Read-UInt32BE $stream
            $numTables = Read-UInt16BE $stream
            $reserved = Read-UInt16BE $stream
            $totalSfntSize = Read-UInt32BE $stream
            $totalCompSize = Read-UInt32BE $stream
            $major = Read-UInt16BE $stream
            $minor = Read-UInt16BE $stream
            $metaOffset = Read-UInt32BE $stream
            $metaLength = Read-UInt32BE $stream
            $metaOrigLength = Read-UInt32BE $stream

            # 3.1 Check uncompressed metadata block if present
            if ($metaOffset -gt 0 -and $metaLength -gt 0 -and $metaLength -eq $metaOrigLength) {
                $null = $stream.Seek([int64]$metaOffset, [System.IO.SeekOrigin]::Begin)
                $metaBytes = New-Object byte[] $metaLength
                $null = $stream.Read($metaBytes, 0, $metaLength)
                $metaXml = [System.Text.Encoding]::UTF8.GetString($metaBytes)
                if ($metaXml -match '(?i)<version[^>]*>([^<]+)</version>' -or $metaXml -match '(?i)version\s*=\s*["'']([^"'']+)["'']') {
                    if ($Matches[1] -match $VERSION_EXTRACT_REGEX) {
                        return $Matches[1]
                    }
                }
            }

            # 3.2 Check Python with fonttools if available on host
            $pyVer = Get-VersionViaPythonFontTools $filePath
            if ($pyVer) { return $pyVer }

            # 3.3 Header major/minor version
            if ($major -ne $null -and $minor -ne $null -and ($major -gt 0 -or $minor -gt 0)) {
                return "$major.$minor"
            }
        }

        # Case 4: Standard OpenType / TrueType sfnt table directory (.ttf, .otf)
        $numTables = Read-UInt16BE $stream
        if ($numTables -eq $null -or $numTables -le 0 -or $numTables -gt 256) {
            return Get-FontVersionByPatternFallback $filePath
        }

        # Skip searchRange, entrySelector, rangeShift (6 bytes)
        $null = $stream.Seek(6, [System.IO.SeekOrigin]::Current)

        $nameTableOffset = [uint32]0
        $nameTableLength = [uint32]0
        $headTableOffset = [uint32]0
        $headTableLength = [uint32]0

        for ($i = 0; $i -lt $numTables; $i++) {
            $tag = Read-Tag $stream
            $checksum = Read-UInt32BE $stream
            $offset = Read-UInt32BE $stream
            $length = Read-UInt32BE $stream

            if ($tag -eq "name") {
                $nameTableOffset = $offset
                $nameTableLength = $length
            } elseif ($tag -eq "head") {
                $headTableOffset = $offset
                $headTableLength = $length
            }
        }

        # 4.1 Parse sfnt 'name' table
        if ($nameTableOffset -gt 0 -and $nameTableLength -gt 6) {
            $foundVer = Parse-NameTableStream $stream $nameTableOffset $nameTableLength
            if ($foundVer) { return $foundVer }
        }

        # 4.2 Fallback to 'head' table fontRevision
        if ($headTableOffset -gt 0 -and $headTableLength -ge 8) {
            $foundVer = Parse-HeadTableRevision $stream $headTableOffset $headTableLength
            if ($foundVer) { return $foundVer }
        }

        return Get-FontVersionByPatternFallback $filePath
    }
    finally {
        $stream.Close()
        $stream.Dispose()
    }
}

function Get-FontVersionByPatternFallback([string]$filePath) {
    try {
        $fileInfo = New-Object System.IO.FileInfo($filePath)
        $readLen = [math]::Min([int]$fileInfo.Length, 524288) # Scan up to 512 KB
        $bytes = New-Object byte[] $readLen
        $fs = [System.IO.File]::Open($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $null = $fs.Read($bytes, 0, $readLen)
        $fs.Close()
        $fs.Dispose()

        $ascii = [System.Text.Encoding]::ASCII.GetString($bytes)
        if ($ascii -match '(?i)Version\s*[:=]?\s*(\d+(?:\.\d+)+)') { return $Matches[1] }
        if ($ascii -match '(?i)<version[^>]*>(\d+(?:\.\d+)+)</version>') { return $Matches[1] }
        if ($ascii -match '(?i)OTF\s*(\d+(?:\.\d+)+)') { return $Matches[1] }

        $beUnicode = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes)
        if ($beUnicode -match '(?i)Version\s*[:=]?\s*(\d+(?:\.\d+)+)') { return $Matches[1] }
        if ($beUnicode -match '(?i)OTF\s*(\d+(?:\.\d+)+)') { return $Matches[1] }

        $utf8 = [System.Text.Encoding]::UTF8.GetString($bytes)
        if ($utf8 -match '(?i)Version\s*[:=]?\s*(\d+(?:\.\d+)+)') { return $Matches[1] }
    } catch {}
    return $null
}

# ==============================================================================
# BLOCK 04: AUDIT LOGGING & ROLLBACK (UNDO) SYSTEM
# ==============================================================================
function Invoke-Rollback {
    Write-Host "`n==============================================================================" -ForegroundColor Yellow
    Write-Host " [*] REVERT / ROLLBACK MODE ACTIVATED" -ForegroundColor Yellow
    Write-Host "==============================================================================" -ForegroundColor Yellow

    if (-not (Test-Path -LiteralPath $AuditLogPath)) {
        Write-Host "[!] No audit log found at: $AuditLogPath" -ForegroundColor Red
        return
    }

    try {
        $rawJson = Get-Content -LiteralPath $AuditLogPath -Raw -Encoding UTF8
        $records = $rawJson | ConvertFrom-Json
    } catch {
        Write-Host "[!] Failed to parse audit log: $_" -ForegroundColor Red
        return
    }

    $reversed = [System.Collections.ArrayList]::new($records)
    $reversed.Reverse()
    $revertedCount = 0

    foreach ($rec in $reversed) {
        $itemType = if ($rec.PSObject.Properties['type']) { $rec.type } else { "folder" }
        $targetPath = $null

        if (Test-Path -LiteralPath $rec.new_path) {
            $targetPath = $rec.new_path
        } else {
            # In case the parent folder was already reverted, check original directory location
            $parentOriginal = Split-Path -Path $rec.original_path -Parent
            $altPath = Join-Path $parentOriginal $rec.new_name
            if (Test-Path -LiteralPath $altPath) {
                $targetPath = $altPath
            }
        }

        if ($targetPath -and (Test-Path -LiteralPath $targetPath)) {
            Write-Host " [REVERT] ($itemType) $($rec.new_name) --> $($rec.original_name)" -ForegroundColor Green
            Rename-Item -LiteralPath $targetPath -NewName $rec.original_name -Force
            $revertedCount++
        } else {
            Write-Host " [SKIP] Could not locate: $($rec.new_path)" -ForegroundColor DarkYellow
        }
    }

    Remove-Item -LiteralPath $AuditLogPath -Force
    Write-Host "`n[OK] Successfully reverted $revertedCount item(s). Audit log cleared.`n" -ForegroundColor Green
}

# ==============================================================================
# BLOCK 04.5: FONT NAME FORMATTING
# ==============================================================================
function Format-FontName {
    param ([string]$name)

    $styles = @(
        "ExtraBlack", "UltraBlack", "ExtraBold", "UltraBold", "ExtraLight", "UltraLight",
        "SemiBold", "DemiBold", "SemiExpanded", "UltraExpanded", "Hairline", "Thin", 
        "Light", "Regular", "Normal", "Book", "Medium", "Bold", "Black", "Heavy", 
        "Italic", "Oblique", "Outline", "Outlined", "Expanded", "Condensed", 
        "Pixel", "Smooth", "Variable", "End", "Pro", "Round", "ExtBlk", "Obliq", "Mono",
        "Typeface", "Display"
    )
    $styles = $styles | Sort-Object -Property Length -Descending

    $weightMap = @{
        "Thin" = "100"; "Hairline" = "100"
        "Extralight" = "200"; "Extra Light" = "200"; "Ultralight" = "200"; "Ultra Light" = "200"
        "Light" = "300"
        "Regular" = "400"; "Normal" = "400"; "Book" = "400"
        "Medium" = "500"
        "Semibold" = "600"; "Semi Bold" = "600"; "Demibold" = "600"; "Demi Bold" = "600"
        "Bold" = "700"
        "Extrabold" = "800"; "Extra Bold" = "800"; "Ultrabold" = "800"; "Ultra Bold" = "800"
        "Extrablack" = "950"; "Extra Black" = "950"; "Ultrablack" = "950"; "Ultra Black" = "950"; "Extblk" = "950"
        "Black" = "900"; "Heavy" = "900"
    }

    $name = $name -replace '\s*-\s*', ' '
    $name = $name -replace '[-_]', ' '
    $name = [System.Text.RegularExpressions.Regex]::Replace($name, '(?<=[a-z])(?=[A-Z])', ' ')
    
    $words = $name -split '\s+'
    $newWords = [System.Collections.Generic.List[string]]::new()
    
    foreach ($word in $words) {
        $subWords = [System.Collections.Generic.List[string]]::new()
        $current = $word
        while ($true) {
            $matched = $false
            foreach ($s in $styles) {
                if ($current.ToLower().EndsWith($s.ToLower()) -and $current.Length -gt $s.Length) {
                    $subWords.Insert(0, $current.Substring($current.Length - $s.Length))
                    $current = $current.Substring(0, $current.Length - $s.Length)
                    $matched = $true
                    break
                }
            }
            if (-not $matched) {
                $subWords.Insert(0, $current)
                break
            }
        }
        foreach ($sw in $subWords) {
            $newWords.Add($sw)
        }
    }
    
    $name = $newWords -join ' '
    $name = $name -replace '\s+', ' '
    $name = $name.Trim()
    
    $name = (Get-Culture).TextInfo.ToTitleCase($name.ToLower())
    
    $sortedKeys = $weightMap.Keys | Sort-Object -Property Length -Descending
    foreach ($key in $sortedKeys) {
        $val = $weightMap[$key]
        $name = [System.Text.RegularExpressions.Regex]::Replace($name, "\b$key\b", $val, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
    
    return $name
}

# ==============================================================================
# BLOCK 05: DUAL SCANNER & RENAMER (INDIVIDUAL FILES + FOLDERS)
# ==============================================================================
function Start-FontFixProcess {
    Write-Host "`n==============================================================================" -ForegroundColor Cyan
    Write-Host "   Font-FIX Pro - Dual Engine (Folders & Individual Files)" -ForegroundColor Cyan
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "[*] Target Directory : $TargetDirectory" -ForegroundColor White
    Write-Host "[*] Scope            : $Scope (Folders & Individual Font Files)" -ForegroundColor White
    Write-Host "[*] Mode             : $(if ($DryRun) { 'DRY-RUN (Preview)' } else { 'LIVE (Renaming)' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Green' })
    Write-Host "==============================================================================`n" -ForegroundColor Cyan

    Write-Host "[*] Scanning for subdirectories in: $TargetDirectory ..." -ForegroundColor Gray
    $allDirs = @(Get-ChildItem -LiteralPath $TargetDirectory -Directory -Recurse -ErrorAction SilentlyContinue |
        Sort-Object -Property { $_.FullName.Split([System.IO.Path]::DirectorySeparatorChar).Count } -Descending)
    Write-Host "[*] Found $($allDirs.Count) subdirectory(ies) to process." -ForegroundColor Gray

    $auditEntries = [System.Collections.Generic.List[psobject]]::new()
    $filesRenamed = 0
    $filesUpToDate = 0
    $foldersRenamed = 0
    $foldersUpToDate = 0
    $noFonts = 0
    $errors = 0

    # 1. Process all subdirectories (Bottom-Up)
    foreach ($dir in $allDirs) {
        $fontFiles = @(Get-ChildItem -LiteralPath $dir.FullName -File -ErrorAction SilentlyContinue |
            Where-Object { $FONT_EXTENSIONS -contains $_.Extension.ToLower() })

        if (-not $fontFiles -or $fontFiles.Count -eq 0) {
            $noFonts++
            continue
        }

        Write-Host "`n>> Directory: $($dir.Name) ($($fontFiles.Count) font file(s))" -ForegroundColor Cyan

        $detectedDirVersion = $null
        $detectedFontName = $null

        # Context detection 1: check if folder name itself already has a version (e.g. 'Alpha 1.002')
        if ($dir.Name -match $FOLDER_VERSION_REGEX) {
            $detectedDirVersion = $Matches[1]
            $detectedFontName = "[Folder: $($dir.Name)]"
        }

        # Context detection 2: probe sibling font files to discover binary version across folder
        if (-not $detectedDirVersion) {
            foreach ($f in $fontFiles) {
                $probeVer = Get-FontVersionFromBinary $f.FullName
                if ($probeVer) {
                    $detectedDirVersion = $probeVer
                    $detectedFontName = $f.Name
                    break
                }
            }
        }

        # Step A: Rename individual font files inside the directory
        if ($Scope -ne "FoldersOnly") {
            foreach ($file in $fontFiles) {
                $fVer = Get-FontVersionFromBinary $file.FullName

                # Fallback: check file name for version, or inherit from folder / sibling fonts
                if (-not $fVer) {
                    $baseNoExt = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                    if ($baseNoExt -match $FOLDER_VERSION_REGEX) {
                        $fVer = $Matches[1]
                    } elseif ($detectedDirVersion) {
                        $fVer = $detectedDirVersion
                    }
                }

                if (-not $fVer) {
                    Write-Host "    [FILE-NO-VER] $($file.Name)" -ForegroundColor DarkYellow
                    continue
                }

                if (-not $detectedDirVersion) {
                    $detectedDirVersion = $fVer
                    $detectedFontName = $file.Name
                }

                $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                $ext = $file.Extension
                
                $cleanBase = $baseName
                if ($baseName -match $FOLDER_VERSION_REGEX) {
                    $cleanBase = [regex]::Replace($baseName, $FOLDER_VERSION_REGEX, '').Trim()
                }

                $formattedBase = Format-FontName $cleanBase
                $newFileName = "$formattedBase $fVer$ext"

                if ($newFileName -eq $file.Name) {
                    Write-Host "    [FILE-OK] $($file.Name) (v$fVer)" -ForegroundColor DarkGreen
                    $filesUpToDate++
                    continue
                }

                $newFilePath = Join-Path $dir.FullName $newFileName

                if ($DryRun) {
                    Write-Host "    [FILE-PREVIEW] $($file.Name) --> $newFileName" -ForegroundColor Yellow
                    $filesRenamed++
                } else {
                    if (($newFileName -ne $file.Name) -and (Test-Path -LiteralPath $newFilePath)) {
                        Write-Host "    [FILE-EXISTS] Skip collision: $newFileName" -ForegroundColor DarkYellow
                        continue
                    }
                    try {
                        Rename-Item -LiteralPath $file.FullName -NewName $newFileName -Force
                        Write-Host "    [FILE-RENAMED] $($file.Name) --> $newFileName" -ForegroundColor Green
                        $auditEntries.Add([pscustomobject]@{
                            type          = "file"
                            timestamp     = (Get-Date).ToString("o")
                            original_name = $file.Name
                            new_name      = $newFileName
                            original_path = $file.FullName
                            new_path      = $newFilePath
                            version       = $fVer
                        })
                        $filesRenamed++
                    } catch {
                        Write-Host "    [FILE-ERROR] Failed to rename $($file.Name): $_" -ForegroundColor Red
                        $errors++
                    }
                }
            }
        }

        # Step B: Rename the folder itself based on primary font version
        if ($Scope -ne "FilesOnly") {
            if (-not $detectedDirVersion) {
                $primaryFont = $fontFiles | Select-Object -First 1
                if ($primaryFont) {
                    $detectedDirVersion = Get-FontVersionFromBinary $primaryFont.FullName
                    $detectedFontName = $primaryFont.Name
                }
            }

            if ($detectedDirVersion) {
                $currentName = $dir.Name
                
                $cleanBase = $currentName
                if ($currentName -match $FOLDER_VERSION_REGEX) {
                    $cleanBase = [regex]::Replace($currentName, $FOLDER_VERSION_REGEX, '').Trim()
                }

                $formattedBase = Format-FontName $cleanBase
                $newFolderName = "$formattedBase $detectedDirVersion"

                if ($newFolderName -eq $currentName) {
                    Write-Host "  [FOLDER-OK] $currentName (v$detectedDirVersion)" -ForegroundColor DarkGreen
                    $foldersUpToDate++
                }

                if ($newFolderName -and ($newFolderName -ne $currentName)) {
                    $destinationPath = Join-Path $dir.Parent.FullName $newFolderName

                    if (($destinationPath -ne $dir.FullName) -and (Test-Path -LiteralPath $destinationPath)) {
                        Write-Host "  [FOLDER-EXISTS] Skip collision: $newFolderName" -ForegroundColor DarkYellow
                        continue
                    }

                    if ($DryRun) {
                        Write-Host "  [FOLDER-PREVIEW] $currentName --> $newFolderName" -ForegroundColor Yellow
                        $foldersRenamed++
                    } else {
                        try {
                            Rename-Item -LiteralPath $dir.FullName -NewName $newFolderName -Force
                            Write-Host "  [FOLDER-RENAMED] $currentName --> $newFolderName" -ForegroundColor Green
                            $auditEntries.Add([pscustomobject]@{
                                type          = "folder"
                                timestamp     = (Get-Date).ToString("o")
                                original_name = $currentName
                                new_name      = $newFolderName
                                original_path = $dir.FullName
                                new_path      = $destinationPath
                                font_file     = $detectedFontName
                                version       = $detectedDirVersion
                            })
                            $foldersRenamed++
                        } catch {
                            Write-Host "  [FOLDER-ERROR] Failed to rename $($dir.Name): $_" -ForegroundColor Red
                            $errors++
                        }
                    }
                }
            }
        }
    }

    # 2. Process any loose font files sitting directly in the root TargetDirectory
    if ($Scope -ne "FoldersOnly") {
        $rootFonts = @(Get-ChildItem -LiteralPath $TargetDirectory -File -ErrorAction SilentlyContinue |
            Where-Object { $FONT_EXTENSIONS -contains $_.Extension.ToLower() })

        if ($rootFonts -and $rootFonts.Count -gt 0) {
            Write-Host "`n>> Root Directory: ($($rootFonts.Count) loose font file(s))" -ForegroundColor Magenta
            foreach ($file in $rootFonts) {
                $fVer = Get-FontVersionFromBinary $file.FullName
                if (-not $fVer) {
                    $baseNoExt = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                    if ($baseNoExt -match $FOLDER_VERSION_REGEX) {
                        $fVer = $Matches[1]
                    }
                }

                if (-not $fVer) {
                    Write-Host "    [FILE-NO-VER] $($file.Name)" -ForegroundColor DarkYellow
                    continue
                }

                $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
                $ext = $file.Extension
                
                $cleanBase = $baseName
                if ($baseName -match $FOLDER_VERSION_REGEX) {
                    $cleanBase = [regex]::Replace($baseName, $FOLDER_VERSION_REGEX, '').Trim()
                }

                $formattedBase = Format-FontName $cleanBase
                $newFileName = "$formattedBase $fVer$ext"

                if ($newFileName -eq $file.Name) {
                    Write-Host "    [FILE-OK] $($file.Name) (v$fVer)" -ForegroundColor DarkGreen
                    $filesUpToDate++
                    continue
                }

                $newFilePath = Join-Path $TargetDirectory $newFileName

                if ($DryRun) {
                    Write-Host "    [FILE-PREVIEW] $($file.Name) --> $newFileName" -ForegroundColor Yellow
                    $filesRenamed++
                } else {
                    if (($newFileName -ne $file.Name) -and (Test-Path -LiteralPath $newFilePath)) {
                        Write-Host "    [FILE-EXISTS] Skip collision: $newFileName" -ForegroundColor DarkYellow
                        continue
                    }
                    try {
                        Rename-Item -LiteralPath $file.FullName -NewName $newFileName -Force
                        Write-Host "    [FILE-RENAMED] $($file.Name) --> $newFileName" -ForegroundColor Green
                        $auditEntries.Add([pscustomobject]@{
                            type          = "file"
                            timestamp     = (Get-Date).ToString("o")
                            original_name = $file.Name
                            new_name      = $newFileName
                            original_path = $file.FullName
                            new_path      = $newFilePath
                            version       = $fVer
                        })
                        $filesRenamed++
                    } catch {
                        Write-Host "    [FILE-ERROR] Failed to rename $($file.Name): $_" -ForegroundColor Red
                        $errors++
                    }
                }
            }
        }
    }

    if (-not $DryRun -and $auditEntries.Count -gt 0) {
        $json = $auditEntries | ConvertTo-Json -Depth 4
        [System.IO.File]::WriteAllText($AuditLogPath, $json, [System.Text.Encoding]::UTF8)
        Write-Host "`n[*] Complete audit history saved to: $AuditLogPath" -ForegroundColor DarkGray
    }

    Write-Host "`n==============================================================================" -ForegroundColor Cyan
    Write-Host " Execution Finished:" -ForegroundColor Cyan
    Write-Host "   - Files Renamed    : $filesRenamed | Up-to-date: $filesUpToDate" -ForegroundColor White
    Write-Host "   - Folders Renamed  : $foldersRenamed | Up-to-date: $foldersUpToDate" -ForegroundColor White
    Write-Host "   - Skipped / Errors : $errors" -ForegroundColor $(if ($errors -gt 0) { 'Red' } else { 'White' })
    Write-Host "==============================================================================`n" -ForegroundColor Cyan
}

# ==============================================================================
# BLOCK 06: ENTRYPOINT DISPATCHER
# ==============================================================================
try {
    if ($Undo) {
        Invoke-Rollback
    } else {
        Start-FontFixProcess
    }
} catch {
    Write-Host "`n[FATAL ERROR] An unexpected error occurred: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
} finally {
    Write-Host "`nPress [ENTER] to exit..." -ForegroundColor Cyan
    try { [void][System.Console]::ReadLine() } catch {}
}
