export const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  if (timeStr.includes("T")) {
    return new Date(timeStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
  }
  return timeStr.replace(".", ":").slice(0, 5);
};

export const formatTimeForTemplate = (timeStr) => {
  if (!timeStr) return "";
  const formatted = formatTime(timeStr);
  if (formatted === "-") return "";
  return formatted;
};

export const formatTimeForInput = (timeStr) => {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const wibStr = new Date(timeStr).toLocaleTimeString("en-GB", {
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
    return wibStr.slice(0, 5);
  }
  return timeStr.replace(".", ":").slice(0, 5);
};

export const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const HARI_COLOR = {
  Senin: "bg-blue-100 text-blue-700",
  Selasa: "bg-purple-100 text-purple-700",
  Rabu: "bg-green-100 text-green-700",
  Kamis: "bg-yellow-100 text-yellow-700",
  Jumat: "bg-orange-100 text-orange-700",
  Sabtu: "bg-pink-100 text-pink-700",
};

export const HARI_BG = {
  Senin: "DBEAFE", Selasa: "EDE9FE", Rabu: "D1FAE5",
  Kamis: "FEF3C7", Jumat: "FFEDD5", Sabtu: "FCE7F3",
};

export const HARI_DARK = {
  Senin: "1D4ED8", Selasa: "6D28D9", Rabu: "065F46",
  Kamis: "92400E", Jumat: "9A3412", Sabtu: "9D174D",
};

export const argb = (hex) => `FF${hex}`;

export const borderStyle = {
  top: { style: "thin", color: { argb: argb("BFCCD9") } },
  bottom: { style: "thin", color: { argb: argb("BFCCD9") } },
  left: { style: "thin", color: { argb: argb("BFCCD9") } },
  right: { style: "thin", color: { argb: argb("BFCCD9") } },
};

export const makeHeaderFill = (hex) => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: argb(hex) },
});

export const makeDataFill = (hex = "FFFFFF") => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: argb(hex) },
});

export const applyHeaderStyle = (cell, bgHex, textHex = "FFFFFF") => {
  cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb(textHex) } };
  cell.fill = makeHeaderFill(bgHex);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = borderStyle;
};

export const applyDataStyle = (cell, bgHex = "FFFFFF", alignH = "left") => {
  cell.font = { name: "Arial", size: 10, color: { argb: argb("1E293B") } };
  cell.fill = makeDataFill(bgHex);
  cell.alignment = { horizontal: alignH, vertical: "middle" };
  cell.border = borderStyle;
};

// Force a column to be read/written as plain text in Excel, so time values
// like "07:00" are never auto-converted into a time serial number.
export const setColumnAsText = (ws, colIndex) => {
  const col = ws.getColumn(colIndex);
  col.numFmt = "@";
};

export const loadExcelJS = async () => {
  if (window.ExcelJS) return window.ExcelJS;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.ExcelJS;
};

export const downloadBuffer = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportJadwalToExcel = async (filteredJadwal) => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Data Jadwal");

  ws.columns = [
    { width: 14 }, // HARI
    { width: 10 }, // KELAS
    { width: 18 }, // JURUSAN
    { width: 28 }, // NAMA_MAPEL
    { width: 28 }, // NAMA_GURU
    { width: 13 }, // JAM_MULAI
    { width: 13 }, // JAM_SELESAI
  ];
  setColumnAsText(ws, 6); // JAM_MULAI
  setColumnAsText(ws, 7); // JAM_SELESAI

  ws.mergeCells("A1:G1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "DATA JADWAL PELAJARAN";
  titleCell.font = { name: "Arial", bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;

  const HEADERS = ["HARI", "KELAS", "JURUSAN", "NAMA_MAPEL", "NAMA_GURU", "JAM_MULAI", "JAM_SELESAI"];
  const headerRow = ws.getRow(2);
  headerRow.height = 20;
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    applyHeaderStyle(cell, "3B82F6");
  });

  filteredJadwal.forEach((item, ri) => {
    const hari = item.hari || "-";
    const bg = HARI_BG[hari] || "FFFFFF";
    const dark = HARI_DARK[hari] || "1E293B";
    const dataRow = ws.getRow(ri + 3);
    dataRow.height = 18;

    const rowData = [
      hari,
      item.kelas?.kelas || "-",
      item.kelas?.jurusan || "-",
      item.mata_pelajaran?.nama_mapel || "-",
      item.guru?.nama || "-",
      formatTimeForTemplate(item.jam_mulai),
      formatTimeForTemplate(item.jam_selesai),
    ];

    rowData.forEach((val, ci) => {
      const cell = dataRow.getCell(ci + 1);
      cell.value = val;
      if (ci === 0) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb(dark) } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else {
        const alignH = ci >= 5 ? "center" : "left";
        applyDataStyle(cell, bg, alignH);
      }
    });
  });

  const today = new Date().toISOString().slice(0, 10);
  await downloadBuffer(workbook, `data_jadwal_${today}.xlsx`);
};

export const addReferenceSheets = (
  workbook,
  { mapelList = [], guruList = [], kelasList = [] } = {}
) => {
  // ── Sheet: KODE_MAPEL ──
  const wsMapel = workbook.addWorksheet("KODE_MAPEL");
  wsMapel.columns = [{ width: 10 }, { width: 22 }, { width: 38 }];
  wsMapel.mergeCells("A1:C1");
  const tMapel = wsMapel.getCell("A1");
  tMapel.value = "REFERENSI KODE MATA PELAJARAN";
  tMapel.font = { name: "Arial", bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  tMapel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  tMapel.alignment = { horizontal: "center", vertical: "middle" };
  wsMapel.getRow(1).height = 26;

  const hMapel = wsMapel.getRow(2);
  hMapel.height = 20;
  ["ID", "KODE_MAPEL", "NAMA_MAPEL"].forEach((lbl, i) => {
    applyHeaderStyle(hMapel.getCell(i + 1), "3B82F6");
    hMapel.getCell(i + 1).value = lbl;
  });

  if (!mapelList || mapelList.length === 0) {
    const emptyRow = wsMapel.getRow(3);
    wsMapel.mergeCells("A3:C3");
    emptyRow.getCell(1).value = "Tidak ada data mata pelajaran atau belum dimuat";
    emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    emptyRow.getCell(1).font = { name: "Arial", italic: true, size: 10, color: { argb: argb("6B7280") } };
  } else {
    mapelList.forEach((m, idx) => {
      const row = wsMapel.getRow(idx + 3);
      row.height = 18;
      const bg = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
      const idCell = row.getCell(1);
      idCell.value = m.id;
      applyDataStyle(idCell, bg, "center");

      const kodeCell = row.getCell(2);
      kodeCell.value = m.kode_mapel || "-";
      kodeCell.font = {
        name: "Arial",
        bold: true,
        size: 10,
        color: { argb: argb(m.kode_mapel ? "1D4ED8" : "9CA3AF") },
      };
      kodeCell.fill = makeDataFill(bg);
      kodeCell.alignment = { horizontal: "center", vertical: "middle" };
      kodeCell.border = borderStyle;

      const namaCell = row.getCell(3);
      namaCell.value = m.nama_mapel;
      applyDataStyle(namaCell, bg, "left");
    });
  }

  // ── Sheet: ID_GURU ──
  const wsGuru = workbook.addWorksheet("ID_GURU");
  wsGuru.columns = [{ width: 14 }, { width: 38 }, { width: 24 }];
  wsGuru.mergeCells("A1:C1");
  const tGuru = wsGuru.getCell("A1");
  tGuru.value = "REFERENSI ID GURU";
  tGuru.font = { name: "Arial", bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  tGuru.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  tGuru.alignment = { horizontal: "center", vertical: "middle" };
  wsGuru.getRow(1).height = 26;

  const hGuru = wsGuru.getRow(2);
  hGuru.height = 20;
  ["ID_GURU", "NAMA_GURU", "NIP"].forEach((lbl, i) => {
    applyHeaderStyle(hGuru.getCell(i + 1), "6366F1");
    hGuru.getCell(i + 1).value = lbl;
  });

  if (!guruList || guruList.length === 0) {
    const emptyRow = wsGuru.getRow(3);
    wsGuru.mergeCells("A3:C3");
    emptyRow.getCell(1).value = "Tidak ada data guru atau belum dimuat";
    emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    emptyRow.getCell(1).font = { name: "Arial", italic: true, size: 10, color: { argb: argb("6B7280") } };
  } else {
    guruList.forEach((g, idx) => {
      const row = wsGuru.getRow(idx + 3);
      row.height = 18;
      const bg = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
      const idCell = row.getCell(1);
      idCell.value = g.id;
      idCell.font = {
        name: "Arial",
        bold: true,
        size: 10,
        color: { argb: argb("4338CA") },
      };
      idCell.fill = makeDataFill(bg);
      idCell.alignment = { horizontal: "center", vertical: "middle" };
      idCell.border = borderStyle;

      const namaCell = row.getCell(2);
      namaCell.value = g.nama;
      applyDataStyle(namaCell, bg, "left");

      const nipCell = row.getCell(3);
      nipCell.value = g.nip || "-";
      applyDataStyle(nipCell, bg, "center");
    });
  }

  // ── Sheet: DAFTAR_KELAS ──
  const wsKelas = workbook.addWorksheet("DAFTAR_KELAS");
  wsKelas.columns = [{ width: 12 }, { width: 14 }, { width: 22 }, { width: 30 }];
  wsKelas.mergeCells("A1:D1");
  const tKelas = wsKelas.getCell("A1");
  tKelas.value = "REFERENSI KELAS AKTIF";
  tKelas.font = { name: "Arial", bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  tKelas.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };
  tKelas.alignment = { horizontal: "center", vertical: "middle" };
  wsKelas.getRow(1).height = 26;

  const hKelas = wsKelas.getRow(2);
  hKelas.height = 20;
  ["ID_KELAS", "KELAS", "JURUSAN", "NAMA_LENGKAP"].forEach((lbl, i) => {
    applyHeaderStyle(hKelas.getCell(i + 1), "14B8A6");
    hKelas.getCell(i + 1).value = lbl;
  });

  if (!kelasList || kelasList.length === 0) {
    const emptyRow = wsKelas.getRow(3);
    wsKelas.mergeCells("A3:D3");
    emptyRow.getCell(1).value = "Tidak ada data kelas atau belum dimuat";
    emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    emptyRow.getCell(1).font = { name: "Arial", italic: true, size: 10, color: { argb: argb("6B7280") } };
  } else {
    kelasList.forEach((k, idx) => {
      const row = wsKelas.getRow(idx + 3);
      row.height = 18;
      const bg = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
      const idCell = row.getCell(1);
      idCell.value = k.id;
      applyDataStyle(idCell, bg, "center");

      const tingkatCell = row.getCell(2);
      tingkatCell.value = k.kelas;
      applyDataStyle(tingkatCell, bg, "center");

      const jurCell = row.getCell(3);
      jurCell.value = k.jurusan;
      applyDataStyle(jurCell, bg, "left");

      const namaCell = row.getCell(4);
      namaCell.value = `${k.kelas} ${k.jurusan}`;
      applyDataStyle(namaCell, bg, "left");
    });
  }
};

export const downloadJadwalTemplate = async ({
  mapelList = [],
  guruList = [],
  kelasList = [],
} = {}) => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();

  const ws1 = workbook.addWorksheet("TEMPLATE_JADWAL");
  ws1.columns = [
    { width: 14 }, // HARI
    { width: 10 }, // KELAS
    { width: 18 }, // JURUSAN
    { width: 22 }, // KODE_MAPEL
    { width: 14 }, // ID_GURU
    { width: 13 }, // JAM_MULAI
    { width: 13 }, // JAM_SELESAI
  ];
  setColumnAsText(ws1, 6); // JAM_MULAI
  setColumnAsText(ws1, 7); // JAM_SELESAI

  ws1.mergeCells("A1:G1");
  const t1 = ws1.getCell("A1");
  t1.value = "TEMPLATE IMPORT JADWAL PELAJARAN";
  t1.font = { name: "Arial", bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 30;

  ws1.mergeCells("A2:G2");
  const sub = ws1.getCell("A2");
  sub.value =
    "Format v0.0.4: Wajib isi KODE_MAPEL & ID_GURU (lihat sheet referensi). Baris contoh (4–8) dapat dihapus.";
  sub.font = { name: "Arial", italic: true, size: 9, color: { argb: argb("4B5563") } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("DBEAFE") } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 18;

  const HEADER_LABELS = [
    "HARI",
    "KELAS",
    "JURUSAN",
    "KODE_MAPEL",
    "ID_GURU",
    "JAM_MULAI",
    "JAM_SELESAI",
  ];
  const hRow = ws1.getRow(3);
  hRow.height = 22;
  HEADER_LABELS.forEach((lbl, i) => {
    applyHeaderStyle(hRow.getCell(i + 1), "3B82F6");
    hRow.getCell(i + 1).value = lbl;
  });

  const sampleMapel1 = mapelList[0]?.kode_mapel || "MTK";
  const sampleMapel2 = mapelList[1]?.kode_mapel || "BINDO";
  const sampleMapel3 = mapelList[2]?.kode_mapel || "BIG";
  const sampleGuru1 = guruList[0]?.id || 1;
  const sampleGuru2 = guruList[1]?.id || 2;
  const sampleGuru3 = guruList[2]?.id || 3;
  const sampleKelas1 = kelasList[0] || { kelas: "10", jurusan: "RPL 1" };
  const sampleKelas2 = kelasList[1] || { kelas: "11", jurusan: "TKJ 1" };
  const sampleKelas3 = kelasList[2] || { kelas: "12", jurusan: "DKV 1" };

  const SAMPLES = [
    ["SENIN", sampleKelas1.kelas, sampleKelas1.jurusan, sampleMapel1, sampleGuru1, "07:00", "08:30"],
    ["SELASA", sampleKelas1.kelas, sampleKelas1.jurusan, sampleMapel2, sampleGuru2, "08:30", "10:00"],
    ["RABU", sampleKelas2.kelas, sampleKelas2.jurusan, sampleMapel3, sampleGuru3, "10:00", "11:30"],
    ["KAMIS", sampleKelas2.kelas, sampleKelas2.jurusan, sampleMapel1, sampleGuru1, "07:00", "08:30"],
    ["JUMAT", sampleKelas3.kelas, sampleKelas3.jurusan, sampleMapel2, sampleGuru2, "08:30", "10:00"],
  ];

  SAMPLES.forEach((row, ri) => {
    const bg = HARI_BG[row[0]] || "FFFFFF";
    const dark = HARI_DARK[row[0]] || "1E293B";
    const dataRow = ws1.getRow(ri + 4);
    dataRow.height = 18;
    row.forEach((val, ci) => {
      const cell = dataRow.getCell(ci + 1);
      cell.value = val;
      if (ci === 0) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb(dark) } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else if (ci === 3) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb("1D4ED8") } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else if (ci === 4) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb("4338CA") } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else {
        applyDataStyle(cell, bg, ci >= 5 ? "center" : "left");
      }
    });
  });

  // Sheet 2: PETUNJUK
  const ws3 = workbook.addWorksheet("PETUNJUK");
  ws3.columns = [{ width: 22 }, { width: 88 }];

  const petunjukRows = [
    ["KOLOM", "KETERANGAN"],
    ["HARI", "SENIN / SELASA / RABU / KAMIS / JUMAT / SABTU (sistem akan menormalisasi format)"],
    ["KELAS", "Nomor tingkatan kelas: 10, 11, atau 12 (lihat sheet 'DAFTAR_KELAS')"],
    ["JURUSAN", "Nama jurusan sesuai kelas aktif di sistem (contoh: RPL 1, TKJ 2). Lihat sheet 'DAFTAR_KELAS'"],
    ["KODE_MAPEL", "Kode unik mata pelajaran yang terdaftar di sistem. WAJIB DIISI! Lihat sheet 'KODE_MAPEL'"],
    ["ID_GURU", "ID sistem guru pengampu berupa ANGKA bulat. WAJIB DIISI! Lihat sheet 'ID_GURU'"],
    ["JAM_MULAI", "Format 24 jam HH:MM dengan titik dua — contoh: 07:00"],
    ["JAM_SELESAI", "Format 24 jam HH:MM dengan titik dua — contoh: 08:30 (jam selesai harus setelah jam mulai)"],
  ];

  const warnings = [
    "📌  UPDATE v0.0.4: Import jadwal sekarang menggunakan KODE_MAPEL dan ID_GURU (bukan nama mapel / nama guru).",
    "⚠️  Jangan ubah atau hapus baris nama kolom header di baris ke-3 sheet TEMPLATE_JADWAL.",
    "⚠️  Baris contoh (4–8) dapat Anda hapus atau ganti dengan jadwal yang sebenarnya sebelum diupload.",
    "⚠️  KODE_MAPEL harus sama persis dengan yang ada di sistem (silakan cek dan copy dari sheet 'KODE_MAPEL').",
    "⚠️  ID_GURU harus berupa angka ID sistem guru (silakan cek dan copy dari sheet 'ID_GURU').",
    "⚠️  Wajib menggunakan pemisah titik dua (:) untuk jam, misalnya 07:00 atau 08:30 (bukan titik seperti 07.00).",
    "⚠️  Simpan file dalam format .xlsx sebelum diupload.",
  ];

  petunjukRows.forEach((row, ri) => {
    const wsRow = ws3.getRow(ri + 1);
    wsRow.height = 18;
    row.forEach((val, ci) => {
      const cell = wsRow.getCell(ci + 1);
      cell.value = val;
      if (ri === 0) {
        applyHeaderStyle(cell, "3B82F6");
      } else {
        applyDataStyle(cell, ri % 2 === 0 ? "FFFFFF" : "DBEAFE", "left");
      }
    });
  });

  const startWarnRow = petunjukRows.length + 2;
  warnings.forEach((warn, idx) => {
    const rowIdx = startWarnRow + idx;
    ws3.mergeCells(`A${rowIdx}:B${rowIdx}`);
    const cell = ws3.getCell(`A${rowIdx}`);
    cell.value = warn;
    cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: argb("7F1D1D") } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("FEE2E2") } };
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    cell.border = borderStyle;

    const cellB = ws3.getCell(`B${rowIdx}`);
    cellB.border = borderStyle;
    ws3.getRow(rowIdx).height = 22;
  });

  // Tambahkan Sheet Referensi
  addReferenceSheets(workbook, { mapelList, guruList, kelasList });

  await downloadBuffer(workbook, "template_import_jadwal.xlsx");
};

export const downloadJadwalUpdateTemplate = async (
  filteredJadwal = [],
  { mapelList = [], guruList = [], kelasList = [] } = {}
) => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();

  const ws1 = workbook.addWorksheet("TEMPLATE_JADWAL");
  ws1.columns = [
    { width: 10 }, // ID
    { width: 14 }, // HARI
    { width: 10 }, // KELAS
    { width: 18 }, // JURUSAN
    { width: 22 }, // KODE_MAPEL
    { width: 14 }, // ID_GURU
    { width: 13 }, // JAM_MULAI
    { width: 13 }, // JAM_SELESAI
  ];
  setColumnAsText(ws1, 7); // JAM_MULAI
  setColumnAsText(ws1, 8); // JAM_SELESAI

  ws1.mergeCells("A1:H1");
  const t1 = ws1.getCell("A1");
  t1.value = "TEMPLATE UPDATE DATA JADWAL PELAJARAN (v0.0.4)";
  t1.font = { name: "Arial", bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 30;

  ws1.mergeCells("A2:H2");
  const sub = ws1.getCell("A2");
  sub.value =
    "Ubah data di bawah ini. Baris dengan ID akan diupdate, baris tanpa ID akan dibuat baru.";
  sub.font = { name: "Arial", italic: true, size: 9, color: { argb: argb("047857") } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("D1FAE5") } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 18;

  const HEADER_LABELS = [
    "ID",
    "HARI",
    "KELAS",
    "JURUSAN",
    "KODE_MAPEL",
    "ID_GURU",
    "JAM_MULAI",
    "JAM_SELESAI",
  ];
  const hRow = ws1.getRow(3);
  hRow.height = 22;
  HEADER_LABELS.forEach((lbl, i) => {
    applyHeaderStyle(hRow.getCell(i + 1), "10B981");
    hRow.getCell(i + 1).value = lbl;
  });

  filteredJadwal.forEach((item, ri) => {
    const hari = item.hari || "-";
    const bg = HARI_BG[hari] || "FFFFFF";
    const dark = HARI_DARK[hari] || "1E293B";
    const dataRow = ws1.getRow(ri + 4);
    dataRow.height = 18;

    const rowData = [
      item.id,
      hari,
      item.kelas?.kelas || "",
      item.kelas?.jurusan || "",
      item.mata_pelajaran?.kode_mapel || item.mata_pelajaran?.nama_mapel || "",
      item.guru?.id || item.guru_id || "",
      formatTimeForTemplate(item.jam_mulai),
      formatTimeForTemplate(item.jam_selesai),
    ];

    rowData.forEach((val, ci) => {
      const cell = dataRow.getCell(ci + 1);
      cell.value = val;
      if (ci === 0) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb("374151") } };
        cell.fill = makeDataFill("E5E7EB");
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else if (ci === 1) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb(dark) } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else if (ci === 4) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb("047857") } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else if (ci === 5) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb("047857") } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else {
        applyDataStyle(cell, bg, ci >= 6 ? "center" : "left");
      }
    });
  });

  // Sheet 2: PETUNJUK
  const ws2 = workbook.addWorksheet("PETUNJUK");
  ws2.columns = [{ width: 22 }, { width: 88 }];

  const petunjukRows = [
    ["KOLOM", "KETERANGAN"],
    ["ID", "ID Jadwal yang ada di sistem (Jangan diubah! Digunakan untuk mendeteksi data yang akan diupdate). Kosongkan jika ingin menambah baru."],
    ["HARI", "SENIN / SELASA / RABU / KAMIS / JUMAT / SABTU"],
    ["KELAS", "Nomor tingkatan: 10, 11, atau 12 (lihat sheet 'DAFTAR_KELAS')"],
    ["JURUSAN", "Nama jurusan (lihat sheet 'DAFTAR_KELAS')"],
    ["KODE_MAPEL", "Kode unik mata pelajaran yang terdaftar (lihat sheet 'KODE_MAPEL')"],
    ["ID_GURU", "ID sistem guru berupa angka bulat (lihat sheet 'ID_GURU')"],
    ["JAM_MULAI", "Format 24 jam HH:MM — contoh: 07:00"],
    ["JAM_SELESAI", "Format 24 jam HH:MM — contoh: 08:30"],
  ];

  const warnings = [
    "📌  UPDATE v0.0.4: Menggunakan kolom KODE_MAPEL dan ID_GURU untuk validasi akurat.",
    "⚠️  Kolom ID wajib diisi jika Anda ingin mengupdate jadwal yang sudah ada.",
    "⚠️  Jika kolom ID dikosongkan atau dihapus, baris tersebut akan dianggap sebagai Jadwal Baru.",
    "⚠️  Jangan ubah nama kolom header di sheet TEMPLATE_JADWAL.",
    "⚠️  Wajib menggunakan pemisah titik dua (:) untuk jam, bukan titik (.) karena sistem hanya membaca pemisah (:).",
    "⚠️  Simpan file dalam format .xlsx sebelum diupload.",
  ];

  petunjukRows.forEach((row, ri) => {
    const wsRow = ws2.getRow(ri + 1);
    wsRow.height = 18;
    row.forEach((val, ci) => {
      const cell = wsRow.getCell(ci + 1);
      cell.value = val;
      if (ri === 0) {
        applyHeaderStyle(cell, "10B981");
      } else {
        applyDataStyle(cell, ri % 2 === 0 ? "FFFFFF" : "D1FAE5", "left");
      }
    });
  });

  const startWarnRow = petunjukRows.length + 2;
  warnings.forEach((warn, idx) => {
    const rowIdx = startWarnRow + idx;
    ws2.mergeCells(`A${rowIdx}:B${rowIdx}`);
    const cell = ws2.getCell(`A${rowIdx}`);
    cell.value = warn;
    cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: argb("7F1D1D") } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("FEE2E2") } };
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    cell.border = borderStyle;

    const cellB = ws2.getCell(`B${rowIdx}`);
    cellB.border = borderStyle;
    ws2.getRow(rowIdx).height = 22;
  });

  // Tambahkan Sheet Referensi
  addReferenceSheets(workbook, { mapelList, guruList, kelasList });

  await downloadBuffer(workbook, "template_update_jadwal.xlsx");
};