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
    
    # Because PowerShell hashes are unordered, sort keys by length descending to replace "Extra Black" before "Black"
    $sortedKeys = $weightMap.Keys | Sort-Object -Property Length -Descending
    foreach ($key in $sortedKeys) {
        $val = $weightMap[$key]
        $name = [System.Text.RegularExpressions.Regex]::Replace($name, "\b$key\b", $val, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
    
    return $name
}

$testNames = @(
    "BLACKBOXOutline",
    "cascadeur-extrablack",
    "salanderpixelregular",
    "StriktPlusVariable-ExtraBlack",
    "Studio Innate - Typeface - Carnival"
)

foreach ($t in $testNames) {
    $res = Format-FontName $t
    Write-Host "$t -> $res"
}
