import { FontInfo } from '../types';

export function normalizeVersionString(rawStr: string): { normalized: string; major: number; minor: string } {
  const trimmed = rawStr.trim();
  const match = trimmed.match(/(\d+(?:\.\d+)+)/);

  let numeric = '0.00';
  if (match) {
    numeric = match[1];
  } else {
    const singleMatch = trimmed.match(/(?:version|ver|v)?\s*(\d+)/i);
    if (singleMatch) {
      numeric = `${singleMatch[1]}.0`;
    }
  }

  const parts = numeric.split('.');
  let intPart = parts[0].replace(/^0+/, '') || '0';
  let fracPart = parts[1] || '0';

  if (fracPart.length >= 2 && fracPart[0] === '0' && fracPart[1] !== '0') {
    fracPart = fracPart.substring(1);
  }

  const trimmedFrac = fracPart.replace(/0+$/, '');
  fracPart = trimmedFrac === '' ? '0' : trimmedFrac;

  if (fracPart === '0') {
    fracPart = '00';
  } else if (fracPart.length === 1) {
    fracPart = `${fracPart}0`;
  }

  const major = parseInt(intPart, 10) || 0;
  return {
    normalized: `${intPart}.${fracPart}`,
    major,
    minor: fracPart
  };
}

export function parseFontBuffer(buffer: ArrayBuffer, fileName: string): FontInfo | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 12) return null;

    // Check SFNT signature
    const sfntVersion = view.getUint32(0);
    const validSignatures = [
      0x00010000, // TrueType
      0x4f54544f, // 'OTTO' OpenType with CFF
      0x74727565, // 'true' Apple TrueType
      0x74797031, // 'typ1'
    ];

    if (!validSignatures.includes(sfntVersion)) {
      // Could be WOFF/WOFF2 or non-sfnt
      return null;
    }

    const numTables = view.getUint16(4);
    let nameTableOffset = 0;
    let headTableOffset = 0;

    for (let i = 0; i < numTables; i++) {
      const entryOffset = 12 + i * 16;
      if (entryOffset + 16 > view.byteLength) break;

      const tag1 = String.fromCharCode(view.getUint8(entryOffset));
      const tag2 = String.fromCharCode(view.getUint8(entryOffset + 1));
      const tag3 = String.fromCharCode(view.getUint8(entryOffset + 2));
      const tag4 = String.fromCharCode(view.getUint8(entryOffset + 3));
      const tag = `${tag1}${tag2}${tag3}${tag4}`;

      const offset = view.getUint32(entryOffset + 8);

      if (tag === 'name') {
        nameTableOffset = offset;
      } else if (tag === 'head') {
        headTableOffset = offset;
      }
    }

    let rawVersion = '';
    let family = fileName.replace(/\.[^/.]+$/, '');
    let style = 'Regular';
    let sourceTable = 'nameID:5';

    if (nameTableOffset > 0 && nameTableOffset + 6 <= view.byteLength) {
      const count = view.getUint16(nameTableOffset + 2);
      const stringOffset = view.getUint16(nameTableOffset + 4);
      const storageOffset = nameTableOffset + stringOffset;

      const records: Array<{
        platformID: number;
        encodingID: number;
        nameID: number;
        length: number;
        offset: number;
      }> = [];

      for (let i = 0; i < count; i++) {
        const recOffset = nameTableOffset + 6 + i * 12;
        if (recOffset + 12 > view.byteLength) break;

        const platformID = view.getUint16(recOffset);
        const encodingID = view.getUint16(recOffset + 2);
        const nameID = view.getUint16(recOffset + 6);
        const length = view.getUint16(recOffset + 8);
        const offset = view.getUint16(recOffset + 10);

        records.push({ platformID, encodingID, nameID, length, offset });
      }

      const decodeString = (rec: { platformID: number; encodingID: number; length: number; offset: number }): string => {
        const strBytesOffset = storageOffset + rec.offset;
        if (strBytesOffset + rec.length > view.byteLength) return '';

        // UTF-16BE decoding for Windows (platformID 3) or Unicode (platformID 0)
        if (rec.platformID === 3 || rec.platformID === 0) {
          let str = '';
          for (let b = 0; b < rec.length; b += 2) {
            str += String.fromCharCode(view.getUint16(strBytesOffset + b));
          }
          return str.trim();
        } else {
          // 8-bit ASCII / MacRoman
          let str = '';
          for (let b = 0; b < rec.length; b++) {
            str += String.fromCharCode(view.getUint8(strBytesOffset + b));
          }
          return str.trim();
        }
      };

      // Extract family (nameID 1)
      const familyRec = records.find(r => r.nameID === 1 && (r.platformID === 3 || r.platformID === 1));
      if (familyRec) {
        const decoded = decodeString(familyRec);
        if (decoded) family = decoded;
      }

      // Extract style (nameID 2)
      const styleRec = records.find(r => r.nameID === 2 && (r.platformID === 3 || r.platformID === 1));
      if (styleRec) {
        const decoded = decodeString(styleRec);
        if (decoded) style = decoded;
      }

      // Extract version (nameID 5)
      // Preference: Windows Unicode (3, 1), Mac (1, 0), any other
      const versionCandidates = records
        .filter(r => r.nameID === 5)
        .sort((a, b) => {
          if (a.platformID === 3 && b.platformID !== 3) return -1;
          if (a.platformID !== 3 && b.platformID === 3) return 1;
          return 0;
        });

      for (const rec of versionCandidates) {
        const decoded = decodeString(rec);
        if (decoded) {
          rawVersion = decoded;
          sourceTable = 'nameID:5';
          break;
        }
      }
    }

    // Fallback to head table fontRevision if nameID 5 missing
    if (!rawVersion && headTableOffset > 0 && headTableOffset + 12 <= view.byteLength) {
      // fontRevision is at offset 8 (Fixed 16.16)
      const intPart = view.getInt16(headTableOffset + 8);
      const fracPart = view.getUint16(headTableOffset + 10);
      const decimalVal = intPart + fracPart / 65536.0;
      rawVersion = `Version ${decimalVal.toFixed(3)}`;
      sourceTable = 'head:fontRevision';
    }

    if (!rawVersion) {
      rawVersion = 'Version 1.000';
      sourceTable = 'fallback:default';
    }

    const { normalized } = normalizeVersionString(rawVersion);

    return {
      fileName,
      fileSize: buffer.byteLength,
      family,
      style,
      rawVersion,
      normalizedVersion: normalized,
      sourceTable,
      isCustomUpload: true,
    };
  } catch (err) {
    console.error('Error parsing font binary:', err);
    return null;
  }
}
