export type StatementRow = {
  tanggalWaktu: string;
  sumberTujuan: string;
  rincianTransaksi: string;
  catatan: string;
  jumlah: number | null;
  saldo: number | null;
};

type TransactionBlock = {
  tanggal: string;
  waktu: string | null;
  lines: string[];
};

const DATE_ONLY_REGEX =
  /^(\d{1,2}\s(?:Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Agt|Aug|Sep|Sept|Okt|Oct|Nov|Des|Dec)\s\d{4})$/i;
const TIME_ONLY_REGEX = /^\d{1,2}[.:]\d{2}$/;
const MONTH_YEAR_ONLY_REGEX =
  /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Agt|Aug|Sep|Sept|Okt|Oct|Nov|Des|Dec)\s+\d{4}$/i;
const MONEY_TOKEN_REGEX =
  /[+-]?\d{1,3}(?:\.\d{3})+,\d{2}|[+-]?\d{1,3}(?:,\d{3})+\.\d{2}|[+-]?\d{1,3}(?:\.\d{3})+|[+-]?\d{1,3}(?:,\d{3})+|[+-]?\d+(?:[.,]\d{1,2})?|[+-]?0/g;
const RINCIAN_KEYWORD_REGEX =
  /(Transfer Masuk|Transfer Keluar|Pembayaran|Bunga|Pajak|Cashback|Jago Pay|Top\s*Up|Tarik Tunai|Setor Tunai)/i;
const RINCIAN_FALLBACK_REGEX =
  /(Transfer|Masuk|Keluar|Pembayaran|Bunga|Pajak|Cashback|Top\s*Up|Tarik|Setor|Jago Pay)/i;

const DUPLICATE_LABELS = [
  "Cashback",
  "Bunga",
  "Pajak",
  "Transfer",
  "Pembayaran",
];

const NOISE_FRAGMENT_REGEX =
  /(PT Bank Jago Tbk berizin dan diawasi[\s\S]*$|Pockets Transactions History[\s\S]*$|Tanggal\s*&\s*Waktu\s*\|?\s*Sumber\/Tujuan\s*\|?\s*Rincian\s*Transaksi\s*\|?\s*Catatan\s*\|?\s*Jumlah\s*\|?\s*Saldo[\s\S]*$|merupakan peserta penjaminan Lembaga Penjamin Simpanan[\s\S]*$|www\.jago\.com[\s\S]*$)/i;

function cutNoiseFragments(value: string): string {
  return value.replace(NOISE_FRAGMENT_REGEX, " ");
}

function isNoiseLine(line: string): boolean {
  return (
    /^Pockets Transactions History\b/i.test(line) ||
    /^Halaman\s+\d+\s+dari\s+\d+/i.test(line) ||
    /^Menampilkan transaksi\b/i.test(line) ||
    /^Jumlah Saldo terbaru\b/i.test(line) ||
    /^IDR\s+[\d.,]+$/i.test(line) ||
    /^Tanggal\s*&\s*Waktu\s*\|\s*Sumber\/Tujuan\s*\|\s*Rincian Transaksi\s*\|\s*Catatan\s*\|\s*Jumlah\s*\|\s*Saldo$/i.test(
      line,
    ) ||
    /^Tanggal\s*&\s*Waktu\s+Sumber\/Tujuan\s+Rincian Transaksi\s+Catatan\s+Jumlah\s+Saldo$/i.test(
      line,
    ) ||
    /^Tanggal\s*&\s*Waktu\s+Sumber\/Tujuan\s+Rincian Transaksi\s+Catatan\s+Saldo$/i.test(
      line,
    ) ||
    /^PT Bank Jago Tbk berizin dan diawasi/i.test(line) ||
    /^merupakan peserta penjaminan Lembaga Penjamin Simpanan/i.test(line) ||
    /^www\.jago\.com$/i.test(line) ||
    MONTH_YEAR_ONLY_REGEX.test(line)
  );
}

function cleanExtractedText(text: string): string {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(cutNoiseFragments)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isNoiseLine(line));

  return lines.join("\n");
}

function cleanTextField(value: string): string {
  return cutNoiseFragments(value)
    .replace(/\bID#\s*[A-Za-z0-9-]+/gi, " ")
    .replace(/\b\d{8}\b/g, " ")
    .replace(/\b_+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitDuplicatedLabel(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();

  for (const label of DUPLICATE_LABELS) {
    const joinedPattern = new RegExp(`^${label}${label}$`, "i");
    const spacedPattern = new RegExp(`^${label}\\s+${label}$`, "i");

    if (joinedPattern.test(normalized) || spacedPattern.test(normalized)) {
      return label;
    }
  }

  return null;
}

function normalizeAmount(raw: string): number {
  const value = raw.trim();

  if (!value) {
    return Number.NaN;
  }

  const sign = value.startsWith("-") ? -1 : 1;
  const unsigned = value.replace(/^[+-]/, "");

  // For positive amounts, ignore decimal fractions to reduce OCR separator issues.
  // Example: +1.234,56 => 1234, +1234.00 => 1234, +1234 => 1234.
  if (value.startsWith("+")) {
    const lastComma = unsigned.lastIndexOf(",");
    const lastDot = unsigned.lastIndexOf(".");
    const lastSeparatorIndex = Math.max(lastComma, lastDot);

    const integerPart =
      lastSeparatorIndex >= 0 &&
      unsigned.length - lastSeparatorIndex - 1 >= 1 &&
      unsigned.length - lastSeparatorIndex - 1 <= 2
        ? unsigned.slice(0, lastSeparatorIndex)
        : unsigned;

    const normalizedInteger = integerPart.replace(/[.,]/g, "");
    const numericInteger = Number.parseFloat(normalizedInteger);

    if (!Number.isFinite(numericInteger)) {
      return Number.NaN;
    }

    return numericInteger;
  }

  const commaCount = (unsigned.match(/,/g) ?? []).length;
  const dotCount = (unsigned.match(/\./g) ?? []).length;

  let normalized = unsigned;

  if (commaCount > 0 && dotCount > 0) {
    normalized = unsigned.replace(/\./g, "").replace(/,/g, ".");
  } else if (commaCount > 0) {
    const lastComma = unsigned.lastIndexOf(",");
    const fractionLength = unsigned.length - lastComma - 1;

    if (fractionLength >= 1 && fractionLength <= 2) {
      normalized = unsigned.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = unsigned.replace(/,/g, "");
    }
  } else if (dotCount > 0) {
    const lastDot = unsigned.lastIndexOf(".");
    const fractionLength = unsigned.length - lastDot - 1;

    if (dotCount > 1 || fractionLength === 3) {
      normalized = unsigned.replace(/\./g, "");
    } else if (fractionLength >= 1 && fractionLength <= 2) {
      normalized = unsigned;
    } else {
      normalized = unsigned.replace(/\./g, "");
    }
  }

  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) {
    return Number.NaN;
  }

  return sign * numeric;
}

function normalizeBalance(raw: string): number {
  const value = raw.trim();

  if (!value) {
    return Number.NaN;
  }

  const unsigned = value.replace(/^[+-]/, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  const lastSeparatorIndex = Math.max(lastComma, lastDot);

  const integerPart =
    lastSeparatorIndex >= 0 &&
    unsigned.length - lastSeparatorIndex - 1 >= 1 &&
    unsigned.length - lastSeparatorIndex - 1 <= 2
      ? unsigned.slice(0, lastSeparatorIndex)
      : unsigned;

  const normalizedInteger = integerPart.replace(/[.,]/g, "");
  const numericInteger = Number.parseFloat(normalizedInteger);

  if (!Number.isFinite(numericInteger)) {
    return Number.NaN;
  }

  return numericInteger;
}

function splitIntoTransactionBlocks(text: string): TransactionBlock[] {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: TransactionBlock[] = [];
  let current: TransactionBlock | null = null;

  for (const originalLine of lines) {
    const line = cutNoiseFragments(originalLine).trim();
    if (!line || isNoiseLine(line)) {
      continue;
    }

    const dateMatch = line.match(DATE_ONLY_REGEX);
    if (dateMatch) {
      if (current) {
        blocks.push(current);
      }

      current = {
        tanggal: dateMatch[1],
        waktu: null,
        lines: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    if (!current.waktu && TIME_ONLY_REGEX.test(line)) {
      current.waktu = line;
      continue;
    }

    current.lines.push(line);
  }

  if (current) {
    blocks.push(current);
  }

  return blocks;
}

function isMoneyToken(token: string): boolean {
  return (
    token.includes(".") ||
    token.includes(",") ||
    /^[+-]/.test(token) ||
    token === "0"
  );
}

function extractMoneyTokens(line: string): string[] {
  return (line.match(MONEY_TOKEN_REGEX) ?? []).filter(isMoneyToken);
}

function extractAmountInfo(lines: string[]): {
  jumlah: number | null;
  saldo: number | null;
  amountLine: string;
} {
  const candidateLines = lines.filter((line) => {
    if (/^ID#/i.test(line)) {
      return false;
    }

    if (/^_+$/.test(line)) {
      return false;
    }

    const tokens = extractMoneyTokens(line);
    return tokens.length > 0;
  });

  const amountLine =
    [...candidateLines].reverse().find((line) => {
      const tokens = extractMoneyTokens(line);
      return tokens.some((token) => /^[+-]/.test(token)) || tokens.length >= 2;
    }) ??
    candidateLines[candidateLines.length - 1] ??
    "";

  const tokens = extractMoneyTokens(amountLine);

  if (tokens.length === 0) {
    return { jumlah: null, saldo: null, amountLine };
  }

  const signedToken = tokens.find((token) => /^[+-]/.test(token));
  const lastToken = tokens[tokens.length - 1];

  if (signedToken) {
    const jumlah = normalizeAmount(signedToken);
    const saldo =
      lastToken !== signedToken ? normalizeBalance(lastToken) : null;
    return { jumlah, saldo, amountLine };
  }

  if (tokens.length >= 2) {
    return {
      jumlah: normalizeAmount(tokens[0]),
      saldo: normalizeBalance(lastToken),
      amountLine,
    };
  }

  return { jumlah: normalizeAmount(tokens[0]), saldo: null, amountLine };
}

function getRincianInfo(lines: string[]): {
  text: string;
  startIndex: number;
  nextIndexConsumed: boolean;
} | null {
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    if (!current || /^ID#/i.test(current) || /^_+$/.test(current)) {
      continue;
    }

    if (RINCIAN_KEYWORD_REGEX.test(current)) {
      return { text: current, startIndex: index, nextIndexConsumed: false };
    }

    if (/\bTransfer\b/i.test(current)) {
      const next = lines[index + 1] ?? "";
      if (/^(Masuk|Keluar)$/i.test(next)) {
        return {
          text: `${current} ${next}`,
          startIndex: index,
          nextIndexConsumed: true,
        };
      }

      return { text: current, startIndex: index, nextIndexConsumed: false };
    }

    if (/^(Masuk|Keluar)$/i.test(current)) {
      const prev = lines[index - 1] ?? "";
      if (/\bTransfer\b/i.test(prev)) {
        return {
          text: `${prev} ${current}`,
          startIndex: index - 1,
          nextIndexConsumed: true,
        };
      }
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    if (!current || /^ID#/i.test(current) || /^_+$/.test(current)) {
      continue;
    }

    if (RINCIAN_FALLBACK_REGEX.test(current)) {
      return { text: current, startIndex: index, nextIndexConsumed: false };
    }
  }

  return null;
}

function formatToIso8601(tanggal: string, waktu: string | null): string {
  const monthMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    mei: "05",
    may: "05",
    jun: "06",
    jul: "07",
    agu: "08",
    agt: "08",
    aug: "08",
    sep: "09",
    sept: "09",
    okt: "10",
    oct: "10",
    nov: "11",
    des: "12",
    dec: "12",
  };

  const dateMatch = tanggal.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!dateMatch) {
    return new Date().toISOString();
  }

  const day = String(parseInt(dateMatch[1], 10)).padStart(2, "0");
  const month = monthMap[dateMatch[2].toLowerCase()] || "01";
  const year = dateMatch[3];

  let hours = "00";
  let minutes = "00";
  let seconds = "00";

  if (waktu) {
    const timeMatch = waktu.match(/^(\d{1,2})[:.:](\d{2})$/);
    if (timeMatch) {
      hours = String(parseInt(timeMatch[1], 10)).padStart(2, "0");
      minutes = timeMatch[2];
    }
  }

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

function parseBankJagoBlock(block: TransactionBlock): StatementRow | null {
  if (!block.tanggal) {
    return null;
  }

  const safeLines = block.lines
    .map(cutNoiseFragments)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isNoiseLine(line));

  const tanggalWaktu = formatToIso8601(block.tanggal, block.waktu);

  const { jumlah, saldo, amountLine } = extractAmountInfo(safeLines);

  const firstAmountToken = extractMoneyTokens(amountLine)[0] ?? "";
  const catatanFromAmountLine = firstAmountToken
    ? amountLine.split(firstAmountToken)[0]
    : "";

  const idIndex = safeLines.findIndex((line) => /^ID#/i.test(line));
  const rincianInfo = getRincianInfo(safeLines);
  const rincianIndex = rincianInfo?.startIndex ?? -1;
  const rincianEndIndex =
    rincianInfo?.nextIndexConsumed && rincianIndex >= 0
      ? rincianIndex + 1
      : rincianIndex;

  const sourceEndIndex =
    rincianIndex >= 0 ? rincianIndex : Math.min(safeLines.length, 3);
  const sumberTujuan = cleanTextField(
    safeLines
      .slice(0, sourceEndIndex)
      .filter((line) => !/^ID#/i.test(line))
      .join(" "),
  );

  const rincianTransaksi =
    cleanTextField(rincianInfo?.text ?? "") ||
    cleanTextField(safeLines[sourceEndIndex] ?? "") ||
    "-";

  const duplicatedLabel = splitDuplicatedLabel(rincianTransaksi);

  const resolvedSumberTujuan =
    sumberTujuan === "-" && duplicatedLabel ? duplicatedLabel : sumberTujuan;
  const resolvedRincianTransaksi = duplicatedLabel ?? rincianTransaksi;

  const middleNotes = safeLines
    .slice(
      rincianEndIndex >= 0 ? rincianEndIndex + 1 : sourceEndIndex + 1,
      idIndex >= 0 ? idIndex : safeLines.length,
    )
    .filter((line) => !/^ID#/i.test(line))
    .filter((line) => !/^_+$/.test(line))
    .join(" ");

  const catatan =
    cleanTextField(`${middleNotes} ${catatanFromAmountLine}`) || "-";

  return {
    tanggalWaktu,
    sumberTujuan: resolvedSumberTujuan || "-",
    rincianTransaksi: resolvedRincianTransaksi || "-",
    catatan,
    jumlah,
    saldo,
  };
}

export function parseStatementText(text: string): StatementRow[] {
  const cleanedText = cleanExtractedText(text);
  const blocks = splitIntoTransactionBlocks(cleanedText);

  return blocks
    .map(parseBankJagoBlock)
    .filter((row): row is StatementRow => row !== null)
    .filter(
      (row) =>
        row.jumlah !== null || row.saldo !== null || row.sumberTujuan !== "-",
    );
}

export function rowsToCsv(rows: StatementRow[]): string {
  const header = [
    "transaction_at",
    "from_or_to",
    "remark",
    "type",
    "amount",
    "balance",
  ];

  const escapeCell = (value: string | number | null) => {
    if (value === null || value === undefined) {
      return "";
    }

    const asString = String(value).replace(/"/g, '""');
    return `"${asString}"`;
  };

  const csvRows = rows.map((row) => {
    const remark =
      row.rincianTransaksi !== "-" && row.catatan !== "-"
        ? `${row.rincianTransaksi} (${row.catatan})`
        : row.rincianTransaksi === "-"
          ? row.catatan
          : row.rincianTransaksi;

    const type = row.jumlah !== null && row.jumlah < 0 ? "db" : "cr";

    return [
      row.tanggalWaktu,
      row.sumberTujuan,
      remark,
      type,
      row.jumlah !== null ? Math.abs(row.jumlah) : null,
      row.saldo !== null ? Math.abs(row.saldo) : null,
    ]
      .map(escapeCell)
      .join(",");
  });

  return [header.join(","), ...csvRows].join("\n");
}
