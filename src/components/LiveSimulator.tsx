import React, { useState, useRef } from 'react';
import { Upload, Folder, FileType, CheckCircle, AlertCircle, RefreshCw, Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { FontInfo, FolderSimulationItem } from '../types';
import { parseFontBuffer, normalizeVersionString } from '../utils/fontParser';
import { SAMPLE_FOLDERS } from '../data/codeSnippets';

export default function LiveSimulator() {
  const [folders, setFolders] = useState<FolderSimulationItem[]>(SAMPLE_FOLDERS);
  const [prefix, setPrefix] = useState<string>('');
  const [cleanExisting, setCleanExisting] = useState<boolean>(true);
  const [customFolderName, setCustomFolderName] = useState<string>('');
  const [customRawVersion, setCustomRawVersion] = useState<string>('Version 1.050;Build 24');
  const [parsedFonts, setParsedFonts] = useState<FontInfo[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFontFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newParsedList: FontInfo[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = await file.arrayBuffer();
        const info = parseFontBuffer(buffer, file.name);
        if (info) {
          newParsedList.push(info);

          // Also auto-add to simulation list as a realistic folder test
          const folderBaseName = info.family || file.name.replace(/\.[^/.]+$/, '');
          const existingMatch = folderBaseName.match(/(?:\s+(?:v|ver|version)?\s*(\d+(?:\.\d+)+))$/i);
          const existingVer = existingMatch ? existingMatch[1] : undefined;

          let targetName = `${folderBaseName} ${prefix}${info.normalizedVersion}`.trim();
          let status: FolderSimulationItem['status'] = 'SUCCESS';
          let explanation = `Parsed binary '${file.name}' from ${info.sourceTable}. Normalized version: ${info.normalizedVersion}.`;

          if (existingVer && existingVer === info.normalizedVersion) {
            status = 'ALREADY_VERSIONED';
            targetName = folderBaseName;
            explanation = `Folder already ends with v${existingVer}. Skipped duplicate!`;
          }

          setFolders(prev => [
            {
              id: `custom-${Date.now()}-${i}`,
              originalName: folderBaseName,
              sampleFontName: file.name,
              rawVersion: info.rawVersion,
              existingVersion: existingVer,
              detectedVersion: info.normalizedVersion,
              newName: targetName,
              status,
              statusExplanation: explanation
            },
            ...prev
          ]);
        }
      } catch (err) {
        console.error('Failed reading font file', err);
      }
    }

    if (newParsedList.length > 0) {
      setParsedFonts(prev => [...newParsedList, ...prev]);
    }
  };

  const handleAddCustomFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFolderName.trim()) return;

    const { normalized } = normalizeVersionString(customRawVersion);
    const folderBase = customFolderName.trim();
    const existingMatch = folderBase.match(/(?:\s+[\(\[\{]?(?:v|ver|version)?\s*(\d+(?:\.\d+)+)[\)\]\}]?)$/i);
    const existingVer = existingMatch ? existingMatch[1] : undefined;

    let targetBase = folderBase;
    if (existingMatch && cleanExisting) {
      targetBase = folderBase.substring(0, existingMatch.index).trim();
    }

    const formattedVer = `${prefix}${normalized}`.trim();
    let status: FolderSimulationItem['status'] = 'SUCCESS';
    let targetName = `${targetBase} ${formattedVer}`.trim();
    let explanation = `Normalized version ${normalized} attached.`;

    if (existingVer && (existingVer === normalized || existingVer === formattedVer)) {
      status = 'ALREADY_VERSIONED';
      targetName = folderBase;
      explanation = `Idempotent safeguard: Folder already up-to-date with version [${existingVer}].`;
    }

    const newItem: FolderSimulationItem = {
      id: `manual-${Date.now()}`,
      originalName: folderBase,
      sampleFontName: 'custom-font.ttf',
      rawVersion: customRawVersion,
      existingVersion: existingVer,
      detectedVersion: normalized,
      newName: targetName,
      status,
      statusExplanation: explanation
    };

    setFolders(prev => [newItem, ...prev]);
    setCustomFolderName('');
  };

  const resetSamples = () => {
    setFolders(SAMPLE_FOLDERS);
    setParsedFonts([]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Real-time Font Binary Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFontFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-950/20'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFontFileUpload(e.target.files)}
          multiple
          accept=".ttf,.otf,.woff,.woff2,.ttc"
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-semibold text-zinc-200">
              Drop real .ttf / .otf / .woff font files here
            </span>
            <p className="text-xs text-zinc-400 mt-0.5">
              Client-side binary parser directly reads the OpenType <code className="text-blue-400">nameID:5</code> and <code className="text-blue-400">head.fontRevision</code> tables.
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Font Binary Cards */}
      {parsedFonts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Parsed Font Binaries ({parsedFonts.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {parsedFonts.map((font, idx) => (
              <div key={idx} className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                    <FileType className="w-3.5 h-3.5 text-indigo-400" />
                    {font.family} {font.style}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/40 rounded-md">
                    {font.sourceTable}
                  </span>
                </div>
                <div className="text-zinc-400 font-mono text-[11px] truncate">
                  Raw: &quot;{font.rawVersion}&quot;
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                  <span className="text-zinc-400">Cleaned Version:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {font.normalizedVersion}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Simulation Controls */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-zinc-200">
              Folder Renaming Simulator & Idempotency Test
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-zinc-300">
              <span>Prefix:</span>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. v"
                className="w-14 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-center text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </label>

            <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={cleanExisting}
                onChange={(e) => setCleanExisting(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-0"
              />
              <span>Clean Old Suffixes</span>
            </label>

            <button
              onClick={resetSamples}
              className="flex items-center gap-1 px-2.5 py-1 text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Custom Folder Input Bar */}
        <form onSubmit={handleAddCustomFolder} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs pt-1">
          <input
            type="text"
            value={customFolderName}
            onChange={(e) => setCustomFolderName(e.target.value)}
            placeholder="Folder name (e.g. Sahel 1.0 or Dana)"
            className="sm:col-span-5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={customRawVersion}
            onChange={(e) => setCustomRawVersion(e.target.value)}
            placeholder="Raw font version (e.g. Version 1.050;Build 24)"
            className="sm:col-span-4 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="submit"
            className="sm:col-span-3 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            Test Folder Rename
          </button>
        </form>
      </div>

      {/* Simulated Folders List */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Folder Processing Pipeline Results ({folders.length})
        </span>

        <div className="flex flex-col gap-2">
          {folders.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-zinc-900/50 border border-zinc-800/90 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-zinc-900/80 transition-all"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  <Folder className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap font-medium">
                    <span className="text-zinc-300 line-through text-zinc-500">
                      {item.originalName}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-100 font-semibold bg-zinc-800/80 px-2 py-0.5 rounded">
                      {item.newName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400 text-[11px] flex-wrap">
                    <span>File: <code className="text-zinc-300">{item.sampleFontName}</code></span>
                    <span>Raw: <code className="text-zinc-300">&quot;{item.rawVersion}&quot;</code></span>
                    {item.detectedVersion !== '-' && (
                      <span className="text-emerald-400 font-semibold">
                        Extracted: {prefix}{item.detectedVersion}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400">{item.statusExplanation}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="self-start md:self-center">
                {item.status === 'SUCCESS' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-800/40 text-[11px] font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Renamed
                  </span>
                )}
                {item.status === 'ALREADY_VERSIONED' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/70 text-blue-300 border border-blue-800/40 text-[11px] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    Up-to-Date (Idempotent)
                  </span>
                )}
                {item.status === 'SKIPPED_NO_FONTS' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/70 text-zinc-400 border border-zinc-700/40 text-[11px] font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Skipped
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
