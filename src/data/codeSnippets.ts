import { BugComparison, FolderSimulationItem } from '../types';

export const PYTHON_SCRIPT_CODE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
🏷️ Font-FIX (Kamiloo Font Version Toolkit Pro)
================================================================================
Description : High-performance, idempotent OpenType/TrueType font metadata
              inspector and directory normalizer. Scans directories, parses font
              tables (nameID 5 & head.fontRevision), standardizes version
              strings, and safely updates folder names with rollback capability.
Version     : 2.0.0 Pro
Author      : Kamiloo / Refactored & Enhanced
License     : MIT Open Source
================================================================================
"""

# ==============================================================================
# BLOCK 01: IMPORTS & SYSTEM DEPENDENCY CHECK
# ==============================================================================
import os
import sys
import re
import json
import argparse
import datetime
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, List, Dict, Tuple, Any

# Ensure UTF-8 output encoding across all terminals
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Attempt to import fontTools (critical font binary parser)
try:
    from fontTools.ttLib import TTFont, TTCollection
except ImportError:
    print("\\n[!] Critical Dependency Missing: 'fonttools' is not installed.")
    print("    Please run: pip install fonttools rich\\n")
    sys.exit(1)

# Attempt to import rich for modern CLI styling (with automatic graceful fallback)
RICH_AVAILABLE = False
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeRemainingColumn
    console = Console()
    RICH_AVAILABLE = True
except ImportError:
    console = None

# ==============================================================================
# BLOCK 02: CONSTANTS, SCHEMAS & DATA STRUCTURES
# ==============================================================================
SUPPORTED_EXTENSIONS = {".ttf", ".otf", ".woff", ".woff2", ".ttc"}
DEFAULT_AUDIT_LOG = "font_fix_audit.json"
DEFAULT_INFO_LOG = "info.txt"

# Regex pattern to identify pre-existing versions in folder names
FOLDER_VERSION_SUFFIX_REGEX = re.compile(
    r'(?:\\s+[\\(\\[\\{]?(?:v|ver|version)?\\s*(\\d+(?:\\.\\d+)+)[\\)\\]\\}]?)$',
    re.IGNORECASE
)

@dataclass
class FontMetadata:
    raw_version: str
    normalized_version: str
    major: int
    minor: str
    source_table: str
    font_family: str
    font_subfamily: str
    file_path: str

@dataclass
class FolderProcessResult:
    folder_path: str
    original_name: str
    new_name: Optional[str] = None
    status: str = "PENDING"
    detected_version: Optional[str] = None
    existing_version: Optional[str] = None
    font_file_used: Optional[str] = None
    message: str = ""
    error_details: Optional[str] = None

# ==============================================================================
# BLOCK 03: LOGGING & TERMINAL OUTPUT HELPERS
# ==============================================================================
class TerminalUI:
    @staticmethod
    def banner():
        title = "🏷️  Font-FIX Pro • OpenType & TrueType Directory Normalizer"
        subtitle = "Zero-Duplicate | Deep-Inspection | Bottom-Up Traversal | Undo Support"
        if RICH_AVAILABLE:
            console.print(Panel(f"[bold cyan]{title}[/bold cyan]\\n[dim]{subtitle}[/dim]", border_style="cyan"))
        else:
            print("=" * 70)
            print(title)
            print(subtitle)
            print("=" * 70)

    @staticmethod
    def log_info(msg: str):
        if RICH_AVAILABLE: console.print(f"[bold blue]ℹ[/bold blue] {msg}")
        else: print(f"[*] {msg}")

    @staticmethod
    def log_success(msg: str):
        if RICH_AVAILABLE: console.print(f"[bold green]✔[/bold green] {msg}")
        else: print(f"[+] {msg}")

    @staticmethod
    def log_warning(msg: str):
        if RICH_AVAILABLE: console.print(f"[bold yellow]▲[/bold yellow] [yellow]{msg}[/yellow]")
        else: print(f"[!] {msg}")

    @staticmethod
    def log_error(msg: str):
        if RICH_AVAILABLE: console.print(f"[bold red]✖[/bold red] [red]{msg}[/red]")
        else: print(f"[-] {msg}")

# ==============================================================================
# BLOCK 04: OPEN-TYPE & TRUE-TYPE METADATA EXTRACTION ENGINE
# ==============================================================================
class FontMetadataExtractor:
    @classmethod
    def extract(cls, font_path: Path) -> Optional[FontMetadata]:
        try:
            if font_path.suffix.lower() == ".ttc":
                ttc = TTCollection(str(font_path))
                font = ttc.fonts[0] if ttc.fonts else None
            else:
                font = TTFont(str(font_path), fontNumber=0, lazy=True)
            if not font: return None

            raw_version = ""
            source_table = ""
            family_name = font_path.stem
            subfamily_name = ""

            if "name" in font:
                name_table = font["name"]
                rec_fam = name_table.getName(1, 3, 1) or name_table.getName(1, 1, 0)
                if rec_fam: family_name = rec_fam.toUnicode().strip()

                rec_sub = name_table.getName(2, 3, 1) or name_table.getName(2, 1, 0)
                if rec_sub: subfamily_name = rec_sub.toUnicode().strip()

                candidate_records = [
                    name_table.getName(5, 3, 1),
                    name_table.getName(5, 3, 10),
                    name_table.getName(5, 1, 0),
                    name_table.getName(5, 0, 3),
                ]
                for rec in candidate_records:
                    if rec:
                        try:
                            val = rec.toUnicode().strip()
                            if val:
                                raw_version = val
                                source_table = "nameID:5"
                                break
                        except Exception: continue

            if not raw_version and "head" in font:
                rev = getattr(font["head"], "fontRevision", None)
                if rev is not None:
                    raw_version = f"{rev:.3f}"
                    source_table = "head:fontRevision"

            font.close()
            if not raw_version: return None

            normalized, major, minor = cls.normalize_version_string(raw_version)
            if not normalized: return None

            return FontMetadata(
                raw_version=raw_version,
                normalized_version=normalized,
                major=major,
                minor=minor,
                source_table=source_table,
                font_family=family_name,
                font_subfamily=subfamily_name,
                file_path=str(font_path)
            )
        except Exception:
            return None

    @staticmethod
    def normalize_version_string(raw_str: str) -> Tuple[Optional[str], int, str]:
        match = re.search(r'(\\d+(?:\\.\\d+)+)', raw_str.strip())
        if not match:
            single = re.search(r'(?:version|ver|v)?\\s*(\\d+)', raw_str, re.IGNORECASE)
            if single: numeric = f"{single.group(1)}.0"
            else: return None, 0, ""
        else: numeric = match.group(1)

        parts = numeric.split(".", 1)
        int_part = re.sub(r'^0+', '', parts[0]) or "0"
        major = int(int_part)
        frac_part = parts[1] if len(parts) > 1 else "0"

        if len(frac_part) >= 2 and frac_part[0] == "0" and frac_part[1] != "0":
            frac_part = frac_part[1:]

        trimmed = frac_part.rstrip("0")
        frac_part = "00" if not trimmed else (trimmed if len(trimmed) >= 2 else f"{trimmed}0")

        return f"{major}.{frac_part}", major, frac_part

# ==============================================================================
# BLOCK 05: DIRECTORY SCANNER & IDEMPOTENCY ENGINE
# ==============================================================================
class FolderRenamingEngine:
    def __init__(self, root_path: Path, dry_run=False, version_prefix="", clean_existing=True, max_depth=None):
        self.root_path = root_path.resolve()
        self.dry_run = dry_run
        self.version_prefix = version_prefix
        self.clean_existing = clean_existing
        self.max_depth = max_depth
        self.results: List[FolderProcessResult] = []
        self.audit_records: List[Dict[str, Any]] = []

    def scan_and_collect_folders(self) -> List[Path]:
        collected = []
        for dirpath, _, _ in os.walk(str(self.root_path), topdown=False):
            current = Path(dirpath)
            if current == self.root_path: continue
            if self.max_depth is not None:
                if len(current.relative_to(self.root_path).parts) > self.max_depth: continue
            collected.append(current)
        # Sort bottom-up by path depth descending
        collected.sort(key=lambda p: len(p.parts), reverse=True)
        return collected

    def find_best_font_file(self, folder_path: Path) -> Optional[Path]:
        try:
            candidates = [f for f in folder_path.iterdir() if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS]
            if not candidates: return None
            candidates.sort(key=lambda x: (0 if "regular" in x.name.lower() else (1 if "bold" in x.name.lower() else 2), x.name.lower()))
            return candidates[0]
        except (PermissionError, OSError): return None

    def detect_existing_version(self, folder_name: str) -> Tuple[str, Optional[str]]:
        match = FOLDER_VERSION_SUFFIX_REGEX.search(folder_name)
        if match:
            return folder_name[:match.start()].strip(), match.group(1)
        return folder_name.strip(), None

    def process_folder(self, folder: Path) -> FolderProcessResult:
        original_name = folder.name
        res = FolderProcessResult(folder_path=str(folder), original_name=original_name)

        best_font = self.find_best_font_file(folder)
        if not best_font:
            res.status = "SKIPPED_NO_FONTS"
            res.message = "No font files found"
            return res

        res.font_file_used = best_font.name
        metadata = FontMetadataExtractor.extract(best_font)
        if not metadata:
            res.status = "ERROR"
            res.message = f"Failed to extract version table from '{best_font.name}'"
            return res

        res.detected_version = metadata.normalized_version
        clean_base, existing_ver = self.detect_existing_version(original_name)
        res.existing_version = existing_ver
        formatted_version = f"{self.version_prefix}{metadata.normalized_version}".strip()

        # Idempotency check: Already matches current version!
        if existing_ver and (existing_ver == metadata.normalized_version or existing_ver == formatted_version):
            res.status = "ALREADY_VERSIONED"
            res.new_name = original_name
            res.message = f"Already up-to-date with [{existing_ver}]"
            return res

        new_folder_name = f"{clean_base if (self.clean_existing and existing_ver) else original_name} {formatted_version}".strip()
        res.new_name = new_folder_name
        target_path = folder.parent / new_folder_name

        if target_path.exists() and target_path != folder:
            res.status = "ERROR"
            res.message = f"Target already exists: '{new_folder_name}'"
            return res

        if self.dry_run:
            res.status = "DRY_RUN"
            res.message = f"Would rename '{original_name}' -> '{new_folder_name}'"
            return res

        try:
            folder.rename(target_path)
            res.status = "SUCCESS"
            res.message = f"Renamed to '{new_folder_name}'"
            self.audit_records.append({
                "timestamp": datetime.datetime.now().isoformat(),
                "original_path": str(folder),
                "original_name": original_name,
                "new_path": str(target_path),
                "new_name": new_folder_name,
                "version": metadata.normalized_version
            })
        except Exception as exc:
            res.status = "ERROR"
            res.message = f"Rename error: {exc}"

        return res

    def execute(self) -> List[FolderProcessResult]:
        folders = self.scan_and_collect_folders()
        total = len(folders)
        if total == 0:
            TerminalUI.log_warning(f"No subfolders inside '{self.root_path}'")
            return []
        TerminalUI.log_info(f"Discovered {total} subdirectories. Processing bottom-up...")
        for folder in folders:
            self.results.append(self.process_folder(folder))
        return self.results

# ==============================================================================
# BLOCK 06: AUDIT LOGGING & ROLLBACK (UNDO) SYSTEM
# ==============================================================================
class AuditAndRollbackManager:
    @staticmethod
    def save_audit_log(audit_file: Path, records: List[Dict[str, Any]]):
        if not records: return
        existing = []
        if audit_file.exists():
            try:
                with open(audit_file, "r", encoding="utf-8") as f: existing = json.load(f)
            except Exception: pass
        try:
            with open(audit_file, "w", encoding="utf-8") as f: json.dump(existing + records, f, indent=2, ensure_ascii=False)
            TerminalUI.log_info(f"Audit log saved: '{audit_file.name}'")
        except Exception: pass

    @staticmethod
    def save_text_log(info_file: Path, results: List[FolderProcessResult]):
        lines = [f"# Font-FIX Pro Report - {datetime.datetime.now()}", "-" * 60]
        for r in results:
            lines.append(f"[{r.status}] {r.original_name} -> {r.new_name} : {r.message}")
        try:
            with open(info_file, "w", encoding="utf-8") as f: f.write("\\n".join(lines) + "\\n")
        except Exception: pass

    @staticmethod
    def perform_rollback(audit_file: Path) -> bool:
        if not audit_file.exists():
            TerminalUI.log_error("Audit file not found. Cannot perform undo.")
            return False
        with open(audit_file, "r", encoding="utf-8") as f: records = json.load(f)
        for rec in reversed(records):
            p = Path(rec["new_path"])
            orig = Path(rec["original_path"])
            if p.exists():
                try: p.rename(orig); TerminalUI.log_success(f"Reverted: {p.name} -> {orig.name}")
                except Exception as e: TerminalUI.log_error(f"Failed to revert {p.name}: {e}")
        audit_file.unlink()
        return True

# ==============================================================================
# BLOCK 07: REPORTING & SUMMARY DASHBOARD
# ==============================================================================
class ReportingManager:
    @staticmethod
    def display_summary_table(results: List[FolderProcessResult], dry_run: bool):
        counts = {s: sum(1 for r in results if r.status == s) for s in ["SUCCESS", "DRY_RUN", "ALREADY_VERSIONED", "SKIPPED_NO_FONTS", "ERROR"]}
        if RICH_AVAILABLE:
            t = Table(title="Execution Summary", header_style="bold cyan")
            t.add_column("Status"); t.add_column("Count", justify="right")
            for k, v in counts.items():
                if v > 0: t.add_row(k, str(v))
            console.print(t)
        else:
            print(f"Summary: Success={counts['SUCCESS']}, Up-to-date={counts['ALREADY_VERSIONED']}, Skipped={counts['SKIPPED_NO_FONTS']}, Errors={counts['ERROR']}")

# ==============================================================================
# BLOCK 08: CLI ARGUMENT PARSER & CONFIGURATION
# ==============================================================================
def parse_arguments():
    parser = argparse.ArgumentParser(description="🏷️ Font-FIX Pro: Smart Font Version Extractor & Folder Normalizer.")
    parser.add_argument("target_path", nargs="?", default=".", help="Root folder to process.")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Preview without making changes.")
    parser.add_argument("--undo", "-u", action="store_true", help="Rollback previously renamed folders.")
    parser.add_argument("--prefix", "-p", default="", help="Optional version prefix like 'v'.")
    parser.add_argument("--no-clean", action="store_true", help="Do not strip existing versions.")
    parser.add_argument("--max-depth", type=int, default=None, help="Max recursion depth.")
    return parser.parse_args()

# ==============================================================================
# BLOCK 09: ENTRY POINT & EXECUTION ORCHESTRATION
# ==============================================================================
def main():
    args = parse_arguments()
    root_dir = Path(args.target_path).resolve()
    audit_file = root_dir / DEFAULT_AUDIT_LOG
    info_file = root_dir / DEFAULT_INFO_LOG

    if args.undo:
        sys.exit(0 if AuditAndRollbackManager.perform_rollback(audit_file) else 1)

    TerminalUI.banner()
    engine = FolderRenamingEngine(root_dir, args.dry_run, args.prefix, not args.no_clean, args.max_depth)
    results = engine.execute()
    ReportingManager.display_summary_table(results, args.dry_run)

    if not args.dry_run and engine.audit_records:
        AuditAndRollbackManager.save_audit_log(audit_file, engine.audit_records)
    AuditAndRollbackManager.save_text_log(info_file, results)
    TerminalUI.log_success("Finished. Use --undo if you ever need to revert.")

if __name__ == "__main__":
    main()
`;

export const POWERSHELL_SCRIPT_CODE = `# ==============================================================================
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
    Write-Host "\`n[ERROR] Target directory does not exist: '$TargetDirectory'" -ForegroundColor Red
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
$FOLDER_VERSION_REGEX = '(?i)[\\s\\-_(\\[]*(?:v(?:er(?:sion)?)?\\.?\\s*)?(\\d+(?:\\.\\d+)+)[\\])]*\\s*$'
$VERSION_EXTRACT_REGEX = '(?i)(?:Version\\s*|v\\s*|OTF\\s*)?(\\d+(?:\\.\\d+)+)'

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
            $pyOut = & python -c "import sys, re; from fontTools.ttLib import TTFont; f=TTFont(sys.argv[1]); n=f['name'].getDebugName(5); m=re.search(r'(?:Version\\s*|v\\s*)?(\\d+(?:\\.\\d+)+)', n or ''); print(m.group(1) if m else '')" $filePath 2>$null
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
                    if ($metaXml -match '(?i)<version[^>]*>([^<]+)</version>' -or $metaXml -match '(?i)version\\s*=\\s*["'']([^"'']+)["'']') {
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
                if ($metaXml -match '(?i)<version[^>]*>([^<]+)</version>' -or $metaXml -match '(?i)version\\s*=\\s*["'']([^"'']+)["'']') {
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
        if ($ascii -match '(?i)Version\\s*[:=]?\\s*(\\d+(?:\\.\\d+)+)') { return $Matches[1] }
        if ($ascii -match '(?i)<version[^>]*>(\\d+(?:\\.\\d+)+)</version>') { return $Matches[1] }
        if ($ascii -match '(?i)OTF\\s*(\\d+(?:\\.\\d+)+)') { return $Matches[1] }

        $beUnicode = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes)
        if ($beUnicode -match '(?i)Version\\s*[:=]?\\s*(\\d+(?:\\.\\d+)+)') { return $Matches[1] }
        if ($beUnicode -match '(?i)OTF\\s*(\\d+(?:\\.\\d+)+)') { return $Matches[1] }

        $utf8 = [System.Text.Encoding]::UTF8.GetString($bytes)
        if ($utf8 -match '(?i)Version\\s*[:=]?\\s*(\\d+(?:\\.\\d+)+)') { return $Matches[1] }
    } catch {}
    return $null
}

# ==============================================================================
# BLOCK 04: AUDIT LOGGING & ROLLBACK (UNDO) SYSTEM
# ==============================================================================
function Invoke-Rollback {
    Write-Host "\`n==============================================================================" -ForegroundColor Yellow
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
    Write-Host "\`n[OK] Successfully reverted $revertedCount item(s). Audit log cleared.\`n" -ForegroundColor Green
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

    $name = $name -replace '\\s*-\\s*', ' '
    $name = $name -replace '[-_]', ' '
    $name = [System.Text.RegularExpressions.Regex]::Replace($name, '(?<=[a-z])(?=[A-Z])', ' ')
    
    $words = $name -split '\\s+'
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
    $name = $name -replace '\\s+', ' '
    $name = $name.Trim()
    
    $name = (Get-Culture).TextInfo.ToTitleCase($name.ToLower())
    
    $sortedKeys = $weightMap.Keys | Sort-Object -Property Length -Descending
    foreach ($key in $sortedKeys) {
        $val = $weightMap[$key]
        $name = [System.Text.RegularExpressions.Regex]::Replace($name, "\\b$key\\b", $val, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
    
    return $name
}

# ==============================================================================
# BLOCK 05: DUAL SCANNER & RENAMER (INDIVIDUAL FILES + FOLDERS)
# ==============================================================================
function Start-FontFixProcess {
    Write-Host "\`n==============================================================================" -ForegroundColor Cyan
    Write-Host "   Font-FIX Pro - Dual Engine (Folders & Individual Files)" -ForegroundColor Cyan
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "[*] Target Directory : $TargetDirectory" -ForegroundColor White
    Write-Host "[*] Scope            : $Scope (Folders & Individual Font Files)" -ForegroundColor White
    Write-Host "[*] Mode             : $(if ($DryRun) { 'DRY-RUN (Preview)' } else { 'LIVE (Renaming)' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Green' })
    Write-Host "==============================================================================\`n" -ForegroundColor Cyan

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

        Write-Host "\`n>> Directory: $($dir.Name) ($($fontFiles.Count) font file(s))" -ForegroundColor Cyan

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
            Write-Host "\`n>> Root Directory: ($($rootFonts.Count) loose font file(s))" -ForegroundColor Magenta
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
        Write-Host "\`n[*] Complete audit history saved to: $AuditLogPath" -ForegroundColor DarkGray
    }

    Write-Host "\`n==============================================================================" -ForegroundColor Cyan
    Write-Host " Execution Finished:" -ForegroundColor Cyan
    Write-Host "   - Files Renamed    : $filesRenamed | Up-to-date: $filesUpToDate" -ForegroundColor White
    Write-Host "   - Folders Renamed  : $foldersRenamed | Up-to-date: $foldersUpToDate" -ForegroundColor White
    Write-Host "   - Skipped / Errors : $errors" -ForegroundColor $(if ($errors -gt 0) { 'Red' } else { 'White' })
    Write-Host "==============================================================================\`n" -ForegroundColor Cyan
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
    Write-Host "\`n[FATAL ERROR] An unexpected error occurred: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
} finally {
    Write-Host "\`nPress [ENTER] to exit..." -ForegroundColor Cyan
    try { [void][System.Console]::ReadLine() } catch {}
}
`;

export const BATCH_LAUNCHER_CODE = `@echo off
chcp 65001 >nul
title Font-FIX Pro - Dual Engine (Folders and Individual Files)
cd /d "%~dp0"

echo ==============================================================================
echo    Font-FIX Pro - Dual Engine (Folders and Individual Files)
echo ==============================================================================
echo [*] Working Directory: %~dp0
echo.

if not exist "%~dp0Font-FIX.ps1" (
    echo [ERROR] "Font-FIX.ps1" was not found in:
    echo         %~dp0
    echo.
    echo Please ensure both "Font-FIX.bat" and "Font-FIX.ps1" are in the same folder.
    echo Download both files together and place them in: %~dp0
    echo.
    echo ==============================================================================
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo [*] Starting automatic processing on root and all subfolders...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Font-FIX.ps1" -TargetDirectory "%~dp0"

echo.
echo ==============================================================================
echo [*] Batch execution finished.
echo ==============================================================================
echo Press any key to close this window...
pause >nul
`;

export const BUG_COMPARISONS: BugComparison[] = [
  {
    title: 'Idempotency & Duplicate Version Loop',
    severity: 'Critical',
    oldApproach: 'Unconditionally appended version string to current folder name',
    oldFlaw: 'Running the script twice turned "Peyda 1.02" into "Peyda 1.02 1.02", then "Peyda 1.02 1.02 1.02"',
    newSolution: 'Smart regex detects pre-existing version suffixes. If identical, skips gracefully as UP-TO-DATE; if font version changed, updates cleanly without duplicating.',
    technologies: ['Regex Suffix Detection', 'Idempotent State Check', 'Clean Name Replacement']
  },
  {
    title: 'Path Invalidation in Recursive Walk',
    severity: 'Critical',
    oldApproach: 'Renamed folders top-down while continuing to traverse child folders',
    oldFlaw: 'Renaming parent folder immediately invalidated all child folder paths, throwing file not found errors.',
    newSolution: 'Bottom-up traversal: sorts directories by path depth in descending order so deepest child folders are processed first.',
    technologies: ['Bottom-Up Sort', 'Pathlib Depth Hierarchy', 'os.walk topdown=False']
  },
  {
    title: 'Fragile Shell Execution & Inline Python',
    severity: 'Major',
    oldApproach: 'PowerShell spawned a separate python.exe sub-process per each single folder via -c string escape',
    oldFlaw: 'Slow process overhead (100 folders = 100 Python process boots), and quotation escaping often broke on apostrophes.',
    newSolution: 'Single, unified Python 3.9+ application with pure native execution and fast binary table parsing in memory.',
    technologies: ['Unified Process Runtime', 'Single Memory Context', 'Safe Path Encoding']
  },
  {
    title: 'TrueType & OpenType Binary Parsing',
    severity: 'Major',
    oldApproach: 'Checked only nameID 5 with basic (3, 1) and (1, 0) records; failed if records differed',
    oldFlaw: 'Crashed on variable fonts, Unicode 2.0+ records, TrueType Collections (.ttc), or when nameID 5 was omitted.',
    newSolution: 'Multi-layer extraction: checks Windows BMP (3,1), Full Unicode (3,10), MacRoman (1,0), and falls back to head.fontRevision (Fixed 16.16 decimal).',
    technologies: ['fontTools.ttLib.TTFont', 'head.fontRevision', 'TrueType Collections (.ttc)']
  },
  {
    title: 'Rollback & Safety Net (Undo Capability)',
    severity: 'Improvement',
    oldApproach: 'No undo mechanism; once renamed, hundreds of folders could not be restored automatically',
    oldFlaw: 'Accidental executions or wrong directories caused irreversible manual renaming headaches.',
    newSolution: 'Automatic JSON audit logging (font_fix_audit.json). Revert every single rename with a single command: python Font-FIX.py --undo.',
    technologies: ['JSON Audit Trail', 'Atomic Reverse Renaming', 'CLI --undo flag']
  },
  {
    title: 'Dry-Run Simulation Mode',
    severity: 'Improvement',
    oldApproach: 'Directly committed changes to disk with no way to test beforehand',
    oldFlaw: 'Users could not preview what changes would occur before actually altering their filesystem.',
    newSolution: '--dry-run flag simulates the complete scan and presents a full preview report with 0 disk writes.',
    technologies: ['Dry-Run Mode (--dry-run)', 'Safe Simulation Flag']
  }
];

export const SAMPLE_FOLDERS: FolderSimulationItem[] = [
  {
    id: '1',
    originalName: 'Peyda',
    sampleFontName: 'Peyda-Regular.ttf',
    rawVersion: 'Version 1.020;Build 001',
    detectedVersion: '1.02',
    newName: 'Peyda 1.02',
    status: 'SUCCESS',
    statusExplanation: 'Clean folder with no previous version. Extracted and normalized.'
  },
  {
    id: '2',
    originalName: 'Vazirmatn 1.02',
    sampleFontName: 'Vazirmatn-Medium.ttf',
    rawVersion: 'Version 1.020;2023',
    existingVersion: '1.02',
    detectedVersion: '1.02',
    newName: 'Vazirmatn 1.02',
    status: 'ALREADY_VERSIONED',
    statusExplanation: 'Idempotency protection triggered! Skipped duplicate appending.'
  },
  {
    id: '3',
    originalName: 'IranSans v1.00',
    sampleFontName: 'IranSans-Bold.otf',
    rawVersion: 'Version 2.300',
    existingVersion: '1.00',
    detectedVersion: '2.30',
    newName: 'IranSans 2.30',
    status: 'SUCCESS',
    statusExplanation: 'Detected updated font version! Replaced old v1.00 cleanly with 2.30.'
  },
  {
    id: '4',
    originalName: 'Documentation & Icons',
    sampleFontName: '(no font files)',
    rawVersion: '-',
    detectedVersion: '-',
    newName: 'Documentation & Icons',
    status: 'SKIPPED_NO_FONTS',
    statusExplanation: 'No .ttf/.otf/.woff files found in directory. Safely skipped.'
  }
];
