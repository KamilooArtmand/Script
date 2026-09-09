#!/usr/bin/env python3
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
from dataclasses import dataclass, asdict, field
from typing import Optional, List, Dict, Tuple, Any

# Ensure UTF-8 output encoding across all terminals
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Attempt to import fontTools (critical font binary parser)
try:
    from fontTools.ttLib import TTFont, TTCollection
    from fontTools.ttLib.tables._n_a_m_e import NameRecord
except ImportError:
    print("\n[!] Critical Dependency Missing: 'fonttools' is not installed.")
    print("    Please run: pip install fonttools rich\n")
    sys.exit(1)

# Attempt to import rich for modern CLI styling (with automatic graceful fallback)
RICH_AVAILABLE = False
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeRemainingColumn
    from rich.text import Text
    from rich.prompt import Confirm
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
# Matches patterns like " 1.0", " 1.02", " v1.20", " V2.001", " [v1.0]", " (1.2)"
FOLDER_VERSION_SUFFIX_REGEX = re.compile(
    r'(?:\s+[\(\[\{]?(?:v|ver|version)?\s*(\d+(?:\.\d+)+)[\)\]\}]?)$',
    re.IGNORECASE
)

@dataclass
class FontMetadata:
    """Represents extracted font version information with provenance."""
    raw_version: str
    normalized_version: str
    major: int
    minor: str
    source_table: str  # 'nameID:5' or 'head:fontRevision'
    font_family: str
    font_subfamily: str
    file_path: str

@dataclass
class FolderProcessResult:
    """Represents the outcome of analyzing and renaming a directory."""
    folder_path: str
    original_name: str
    new_name: Optional[str] = None
    status: str = "PENDING"  # SUCCESS, ALREADY_VERSIONED, SKIPPED_NO_FONTS, ERROR, DRY_RUN
    detected_version: Optional[str] = None
    existing_version: Optional[str] = None
    font_file_used: Optional[str] = None
    message: str = ""
    error_details: Optional[str] = None


# ==============================================================================
# BLOCK 03: LOGGING & TERMINAL OUTPUT HELPERS
# ==============================================================================
class TerminalUI:
    """Handles unified output across rich-enabled and plain-text terminals."""

    @staticmethod
    def banner():
        title = "🏷️  Font-FIX Pro • OpenType & TrueType Directory Normalizer"
        subtitle = "Zero-Duplicate | Deep-Inspection | Bottom-Up Traversal | Undo Support"
        if RICH_AVAILABLE:
            console.print(Panel(f"[bold cyan]{title}[/bold cyan]\n[dim]{subtitle}[/dim]", border_style="cyan"))
        else:
            print("=" * 70)
            print(title)
            print(subtitle)
            print("=" * 70)

    @staticmethod
    def log_info(message: str):
        if RICH_AVAILABLE:
            console.print(f"[bold blue]ℹ[/bold blue] {message}")
        else:
            print(f"[*] {message}")

    @staticmethod
    def log_success(message: str):
        if RICH_AVAILABLE:
            console.print(f"[bold green]✔[/bold green] {message}")
        else:
            print(f"[+] {message}")

    @staticmethod
    def log_warning(message: str):
        if RICH_AVAILABLE:
            console.print(f"[bold yellow]▲[/bold yellow] [yellow]{message}[/yellow]")
        else:
            print(f"[!] {message}")

    @staticmethod
    def log_error(message: str):
        if RICH_AVAILABLE:
            console.print(f"[bold red]✖[/bold red] [red]{message}[/red]")
        else:
            print(f"[-] {message}")


# ==============================================================================
# BLOCK 04: OPEN-TYPE & TRUE-TYPE METADATA EXTRACTION ENGINE
# ==============================================================================
class FontMetadataExtractor:
    """Deep binary metadata extractor reading from OpenType/TrueType tables."""

    @classmethod
    def extract(cls, font_path: Path) -> Optional[FontMetadata]:
        """
        Parses a font file (.ttf, .otf, .woff, .woff2, .ttc) and extracts
        canonical version and name metadata.
        """
        try:
            # Handle TrueType Collections (.ttc)
            if font_path.suffix.lower() == ".ttc":
                ttc = TTCollection(str(font_path))
                font = ttc.fonts[0] if ttc.fonts else None
            else:
                font = TTFont(str(font_path), fontNumber=0, lazy=True)

            if not font:
                return None

            raw_version = ""
            source_table = ""
            family_name = font_path.stem
            subfamily_name = ""

            # 1. Primary check: 'name' table
            if "name" in font:
                name_table = font["name"]

                # Extract family (nameID 1) and style (nameID 2)
                rec_family = name_table.getName(1, 3, 1) or name_table.getName(1, 1, 0) or name_table.getName(1, 0, 3)
                if rec_family:
                    try:
                        family_name = rec_family.toUnicode().strip()
                    except Exception:
                        pass

                rec_sub = name_table.getName(2, 3, 1) or name_table.getName(2, 1, 0)
                if rec_sub:
                    try:
                        subfamily_name = rec_sub.toUnicode().strip()
                    except Exception:
                        pass

                # NameID 5 is the OpenType official Version String
                # Check Windows Unicode (3, 1), Macintosh Roman (1, 0), and Unicode (0, 3/4)
                candidate_records = [
                    name_table.getName(5, 3, 1),  # Windows Unicode BMP
                    name_table.getName(5, 3, 10), # Windows Unicode Full
                    name_table.getName(5, 1, 0),  # Macintosh Roman
                    name_table.getName(5, 0, 3),  # Unicode 2.0+
                    name_table.getName(5, 0, 4),  # Unicode full
                ]
                for rec in candidate_records:
                    if rec:
                        try:
                            val = rec.toUnicode().strip()
                            if val:
                                raw_version = val
                                source_table = "nameID:5"
                                break
                        except Exception:
                            continue

            # 2. Secondary fallback: 'head' table fontRevision (Fixed 16.16)
            if not raw_version and "head" in font:
                rev = getattr(font["head"], "fontRevision", None)
                if rev is not None:
                    raw_version = f"{rev:.3f}"
                    source_table = "head:fontRevision"

            font.close()

            if not raw_version:
                return None

            # Normalize the extracted raw version string
            normalized, major, minor = cls.normalize_version_string(raw_version)
            if not normalized:
                return None

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
        """
        Parses complex version strings (e.g. 'Version 1.020;Build 001', 'OTF 2.500', '1.0', '3.1.2')
        and converts them into a clean, standardized format.
        """
        raw_str = raw_str.strip()

        # Match numeric sequences like 1.0, 1.020, 2.15.4
        match = re.search(r'(\d+(?:\.\d+)+)', raw_str)
        if not match:
            # Check for standalone single integers (e.g., "Version 2")
            match_single = re.search(r'(?:version|ver|v)?\s*(\d+)', raw_str, re.IGNORECASE)
            if match_single:
                numeric = f"{match_single.group(1)}.0"
            else:
                return None, 0, ""
        else:
            numeric = match.group(1)

        parts = numeric.split(".", 1)
        int_part_str = re.sub(r'^0+', '', parts[0])
        major = int(int_part_str) if int_part_str else 0
        frac_part = parts[1] if len(parts) > 1 else "0"

        # If fraction starts with single zero before other digits (e.g., 02 -> 2 or 020 -> 20)
        if len(frac_part) >= 2 and frac_part[0] == "0" and frac_part[1] != "0":
            frac_part = frac_part[1:]

        # Trim unnecessary trailing zeros if length > 2
        trimmed = frac_part.rstrip("0")
        if not trimmed:
            frac_part = "0"
        else:
            frac_part = trimmed

        # Guarantee at least 2 decimal digits for aesthetic typography (e.g. 1.2 -> 1.20, 1.0 -> 1.00)
        if frac_part == "0":
            frac_part = "00"
        elif len(frac_part) == 1:
            frac_part = f"{frac_part}0"

        normalized = f"{major}.{frac_part}"
        return normalized, major, frac_part


# ==============================================================================
# BLOCK 05: DIRECTORY SCANNER & IDEMPOTENCY ENGINE
# ==============================================================================
class FolderRenamingEngine:
    """
    Engine responsible for safe, bottom-up directory renaming, conflict avoidance,
    and idempotency (preventing 'Font 1.0 1.0' duplicate version appending).
    """

    def __init__(
        self,
        root_path: Path,
        dry_run: bool = False,
        version_prefix: str = "",
        clean_existing: bool = True,
        max_depth: Optional[int] = None
    ):
        self.root_path = root_path.resolve()
        self.dry_run = dry_run
        self.version_prefix = version_prefix  # e.g. "v" produces "FontName v1.20"
        self.clean_existing = clean_existing
        self.max_depth = max_depth
        self.results: List[FolderProcessResult] = []
        self.audit_records: List[Dict[str, Any]] = []

    def scan_and_collect_folders(self) -> List[Path]:
        """
        Collects all subfolders and sorts them by path depth in DESCENDING order.
        Crucial: Processing bottom-up guarantees renaming child folders first,
        avoiding path invalidation for parent folders!
        """
        collected = []
        for dirpath, dirnames, _ in os.walk(str(self.root_path), topdown=False):
            current = Path(dirpath)
            if current == self.root_path:
                continue

            # Check depth limit if specified
            if self.max_depth is not None:
                depth = len(current.relative_to(self.root_path).parts)
                if depth > self.max_depth:
                    continue

            collected.append(current)

        # Sort strictly by path depth descending
        collected.sort(key=lambda p: len(p.parts), reverse=True)
        return collected

    def find_best_font_file(self, folder_path: Path) -> Optional[Path]:
        """Finds candidate font files in the directory sorted alphabetically."""
        try:
            candidates = [
                f for f in folder_path.iterdir()
                if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
            ]
            if not candidates:
                return None
            # Prioritize Regular or normal weights if available, else first alphabetically
            candidates.sort(key=lambda x: (
                0 if "regular" in x.name.lower() else (
                    1 if "bold" in x.name.lower() else 2
                ),
                x.name.lower()
            ))
            return candidates[0]
        except (PermissionError, OSError):
            return None

    def detect_existing_version_in_name(self, folder_name: str) -> Tuple[str, Optional[str]]:
        """
        Detects if a folder name already ends with a version string.
        Returns (base_name_without_version, existing_version_string).
        """
        match = FOLDER_VERSION_SUFFIX_REGEX.search(folder_name)
        if match:
            existing_ver = match.group(1)
            # Remove the version suffix cleanly from folder name
            clean_base = folder_name[:match.start()].strip()
            return clean_base, existing_ver
        return folder_name.strip(), None

    def process_folder(self, folder: Path) -> FolderProcessResult:
        """Analyzes a single folder, extracts font version, and plans or executes renaming."""
        original_name = folder.name
        res = FolderProcessResult(folder_path=str(folder), original_name=original_name)

        # 1. Locate font file
        best_font = self.find_best_font_file(folder)
        if not best_font:
            res.status = "SKIPPED_NO_FONTS"
            res.message = "No supported font files found (.ttf, .otf, .woff, .woff2, .ttc)"
            return res

        res.font_file_used = best_font.name

        # 2. Extract font metadata
        metadata = FontMetadataExtractor.extract(best_font)
        if not metadata:
            res.status = "ERROR"
            res.message = f"Failed to extract valid OpenType version table from '{best_font.name}'"
            return res

        res.detected_version = metadata.normalized_version

        # 3. Check for existing version in the folder name (Idempotency protection)
        clean_base_name, existing_ver = self.detect_existing_version_in_name(original_name)
        res.existing_version = existing_ver

        # Determine target formatted version string
        formatted_version = f"{self.version_prefix}{metadata.normalized_version}".strip()

        # If folder already has the exact same version, skip it!
        if existing_ver and (existing_ver == metadata.normalized_version or existing_ver == formatted_version):
            res.status = "ALREADY_VERSIONED"
            res.new_name = original_name
            res.message = f"Folder already up to date with version [{existing_ver}]"
            return res

        # 4. Formulate new target folder name
        if self.clean_existing and existing_ver:
            # Replace old version with newly detected version
            new_folder_name = f"{clean_base_name} {formatted_version}".strip()
        elif not existing_ver:
            new_folder_name = f"{original_name} {formatted_version}".strip()
        else:
            new_folder_name = f"{original_name} {formatted_version}".strip()

        res.new_name = new_folder_name

        # 5. Check if new name is identical to current name
        if new_folder_name == original_name:
            res.status = "ALREADY_VERSIONED"
            res.message = "Folder name already matches target version format"
            return res

        target_path = folder.parent / new_folder_name

        # 6. Check for collision with an existing directory
        if target_path.exists() and target_path != folder:
            res.status = "ERROR"
            res.message = f"Target directory already exists: '{new_folder_name}'"
            return res

        # 7. Execute or simulate rename
        if self.dry_run:
            res.status = "DRY_RUN"
            res.message = f"Would rename '{original_name}' -> '{new_folder_name}'"
            return res

        try:
            folder.rename(target_path)
            res.status = "SUCCESS"
            res.message = f"Successfully renamed to '{new_folder_name}'"

            # Record in audit log for rollback support
            self.audit_records.append({
                "timestamp": datetime.datetime.now().isoformat(),
                "original_path": str(folder),
                "original_name": original_name,
                "new_path": str(target_path),
                "new_name": new_folder_name,
                "version": metadata.normalized_version
            })

        except PermissionError:
            res.status = "ERROR"
            res.message = "Permission denied. Ensure files/folders are not open in another application."
        except OSError as exc:
            res.status = "ERROR"
            res.message = f"Filesystem error during rename: {str(exc)}"

        return res

    def execute(self) -> List[FolderProcessResult]:
        """Main execution sequence traversing all directories bottom-up."""
        folders = self.scan_and_collect_folders()
        total = len(folders)

        if total == 0:
            TerminalUI.log_warning(f"No subfolders found inside '{self.root_path}'")
            return []

        TerminalUI.log_info(f"Discovered {total} subdirectories. Processing bottom-up...")

        # Progress reporting
        if RICH_AVAILABLE:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
                TimeRemainingColumn(),
                console=console
            ) as progress:
                task = progress.add_task("[cyan]Processing folders...", total=total)
                for folder in folders:
                    res = self.process_folder(folder)
                    self.results.append(res)
                    progress.advance(task)
        else:
            for idx, folder in enumerate(folders, start=1):
                res = self.process_folder(folder)
                self.results.append(res)
                if idx % 10 == 0 or idx == total:
                    print(f"[*] Processed {idx}/{total} folders...")

        return self.results


# ==============================================================================
# BLOCK 06: AUDIT LOGGING & ROLLBACK (UNDO) SYSTEM
# ==============================================================================
class AuditAndRollbackManager:
    """Manages writing audit logs and executing full undo/revert operations."""

    @staticmethod
    def save_audit_log(audit_file: Path, records: List[Dict[str, Any]]):
        """Appends or creates an audit log in JSON format."""
        if not records:
            return
        existing = []
        if audit_file.exists():
            try:
                with open(audit_file, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                existing = []

        combined = existing + records
        try:
            with open(audit_file, "w", encoding="utf-8") as f:
                json.dump(combined, f, indent=2, ensure_ascii=False)
            TerminalUI.log_info(f"Audit log saved: '{audit_file.name}' ({len(records)} operations recorded)")
        except Exception as e:
            TerminalUI.log_warning(f"Could not save audit log: {e}")

    @staticmethod
    def save_text_log(info_file: Path, results: List[FolderProcessResult]):
        """Writes traditional human-readable info.txt report."""
        lines = [
            f"# Font-FIX Pro - Execution Report",
            f"# Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"# Total Folders Processed: {len(results)}",
            "-" * 70
        ]
        for r in results:
            if r.status in ("SUCCESS", "DRY_RUN"):
                lines.append(f"[{r.status}] {r.original_name} -> {r.new_name} (v{r.detected_version})")
            elif r.status == "ALREADY_VERSIONED":
                lines.append(f"[UP-TO-DATE] {r.original_name} (Current: {r.existing_version})")
            elif r.status == "SKIPPED_NO_FONTS":
                lines.append(f"[SKIPPED] {r.folder_path} : {r.message}")
            else:
                lines.append(f"[ERROR] {r.folder_path} : {r.message}")

        try:
            with open(info_file, "w", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")
            TerminalUI.log_info(f"Summary log written to: '{info_file.name}'")
        except Exception as e:
            TerminalUI.log_warning(f"Could not write text log: {e}")

    @staticmethod
    def perform_rollback(audit_file: Path) -> bool:
        """Reads audit log and reverts renames in reverse chronological order."""
        if not audit_file.exists():
            TerminalUI.log_error(f"Audit file '{audit_file}' not found. Cannot perform undo.")
            return False

        try:
            with open(audit_file, "r", encoding="utf-8") as f:
                records = json.load(f)
        except Exception as e:
            TerminalUI.log_error(f"Failed to parse audit file: {e}")
            return False

        if not records:
            TerminalUI.log_warning("No operations found in audit log to revert.")
            return False

        TerminalUI.banner()
        TerminalUI.log_info(f"Reverting {len(records)} operations from '{audit_file.name}'...")

        reverted_count = 0
        failed_count = 0

        # Rollback in reverse order
        for rec in reversed(records):
            new_path = Path(rec["new_path"])
            orig_path = Path(rec["original_path"])

            if not new_path.exists():
                TerminalUI.log_warning(f"Folder '{new_path.name}' no longer exists at path. Skipping.")
                failed_count += 1
                continue

            try:
                new_path.rename(orig_path)
                TerminalUI.log_success(f"Reverted: '{new_path.name}' -> '{orig_path.name}'")
                reverted_count += 1
            except Exception as e:
                TerminalUI.log_error(f"Failed to revert '{new_path.name}': {e}")
                failed_count += 1

        TerminalUI.log_info(f"Undo completed: {reverted_count} reverted, {failed_count} skipped/failed.")

        # Clear or truncate audit log once reverted
        try:
            audit_file.unlink()
            TerminalUI.log_info("Audit log cleaned up.")
        except Exception:
            pass

        return True


# ==============================================================================
# BLOCK 07: REPORTING & SUMMARY DASHBOARD
# ==============================================================================
class ReportingManager:
    """Generates modern rich summary tables and detailed metrics."""

    @staticmethod
    def display_summary_table(results: List[FolderProcessResult], dry_run: bool):
        if not results:
            return

        counts = {
            "SUCCESS": sum(1 for r in results if r.status == "SUCCESS"),
            "DRY_RUN": sum(1 for r in results if r.status == "DRY_RUN"),
            "ALREADY_VERSIONED": sum(1 for r in results if r.status == "ALREADY_VERSIONED"),
            "SKIPPED_NO_FONTS": sum(1 for r in results if r.status == "SKIPPED_NO_FONTS"),
            "ERROR": sum(1 for r in results if r.status == "ERROR"),
        }

        if RICH_AVAILABLE:
            table = Table(title="Execution Results Summary", show_header=True, header_style="bold cyan")
            table.add_column("Status", style="bold")
            table.add_column("Count", justify="right")
            table.add_column("Description")

            if dry_run:
                table.add_row("[yellow]DRY RUN[/yellow]", str(counts["DRY_RUN"]), "Planned renames previewed without filesystem changes")
            else:
                table.add_row("[green]SUCCESS[/green]", str(counts["SUCCESS"]), "Folders successfully renamed with detected version")

            table.add_row("[blue]UP-TO-DATE[/blue]", str(counts["ALREADY_VERSIONED"]), "Folders already having the correct version (skipped duplicate)")
            table.add_row("[dim]SKIPPED[/dim]", str(counts["SKIPPED_NO_FONTS"]), "Folders without supported font files")
            if counts["ERROR"] > 0:
                table.add_row("[bold red]ERRORS[/bold red]", str(counts["ERROR"]), "Folders that encountered permission or extraction errors")

            console.print(table)
        else:
            print("\n" + "=" * 50)
            print("EXECUTION SUMMARY")
            print("=" * 50)
            for k, v in counts.items():
                print(f" - {k:<18}: {v}")
            print("=" * 50)


# ==============================================================================
# BLOCK 08: CLI ARGUMENT PARSER & CONFIGURATION
# ==============================================================================
def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="🏷️ Font-FIX Pro: Smart OpenType Font Version Extractor and Directory Normalizer.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python Font-FIX.py                    # Process all subfolders in current directory
  python Font-FIX.py --dry-run          # Preview proposed renames without changing anything
  python Font-FIX.py "D:\\My Fonts"       # Target specific font directory
  python Font-FIX.py --prefix "v"       # Use 'v' prefix, e.g. "Peyda v1.02"
  python Font-FIX.py --undo             # Rollback all previous renames using audit log
        """
    )

    parser.add_argument(
        "target_path",
        nargs="?",
        default=".",
        help="Root folder containing font subfolders to process (default: current directory)."
    )
    parser.add_argument(
        "--dry-run", "-d",
        action="store_true",
        help="Simulate the scan and renaming process without modifying any files or directories."
    )
    parser.add_argument(
        "--undo", "-u",
        action="store_true",
        help="Revert/rollback previous directory renames using the audit log."
    )
    parser.add_argument(
        "--prefix", "-p",
        default="",
        help="Optional prefix for the version string, e.g. 'v' produces 'FontName v1.20'."
    )
    parser.add_argument(
        "--no-clean",
        action="store_true",
        help="Do not clean existing version suffix if present; append directly."
    )
    parser.add_argument(
        "--audit-file",
        default=DEFAULT_AUDIT_LOG,
        help=f"Path to JSON audit log for rollback tracking (default: {DEFAULT_AUDIT_LOG})."
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=None,
        help="Limit recursive subfolder search depth (e.g. 1 for direct children only)."
    )

    return parser.parse_args()


# ==============================================================================
# BLOCK 09: ENTRY POINT & EXECUTION ORCHESTRATION
# ==============================================================================
def main():
    args = parse_arguments()
    root_dir = Path(args.target_path).resolve()
    audit_path = root_dir / args.audit_file
    info_path = root_dir / DEFAULT_INFO_LOG

    # Handle Rollback / Undo Mode
    if args.undo:
        success = AuditAndRollbackManager.perform_rollback(audit_path)
        sys.exit(0 if success else 1)

    # Validate target directory
    if not root_dir.exists() or not root_dir.is_dir():
        TerminalUI.log_error(f"Provided path is not a valid directory: '{root_dir}'")
        sys.exit(1)

    TerminalUI.banner()
    if args.dry_run:
        TerminalUI.log_warning("DRY RUN MODE ENABLED: No filesystem changes will be committed.")

    TerminalUI.log_info(f"Target Working Directory: '{root_dir}'")
    if args.prefix:
        TerminalUI.log_info(f"Version Prefix: '{args.prefix}'")

    # Initialize and execute renaming engine
    engine = FolderRenamingEngine(
        root_path=root_dir,
        dry_run=args.dry_run,
        version_prefix=args.prefix,
        clean_existing=not args.no_clean,
        max_depth=args.max_depth
    )

    results = engine.execute()

    # Display rich summary
    ReportingManager.display_summary_table(results, dry_run=args.dry_run)

    # Save audit log & human-readable report
    if not args.dry_run and engine.audit_records:
        AuditAndRollbackManager.save_audit_log(audit_path, engine.audit_records)

    AuditAndRollbackManager.save_text_log(info_path, results)

    TerminalUI.log_success("Operation completed successfully.")
    if not args.dry_run and engine.audit_records:
        TerminalUI.log_info(f"Tip: You can rollback these changes anytime by running: python Font-FIX.py --undo")


if __name__ == "__main__":
    main()
