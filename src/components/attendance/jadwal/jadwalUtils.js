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
  return `'${formatted}`;
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
  Senin:  "bg-blue-100 text-blue-700",
  Selasa: "bg-purple-100 text-purple-700",
  Rabu:   "bg-green-100 text-green-700",
  Kamis:  "bg-yellow-100 text-yellow-700",
  Jumat:  "bg-orange-100 text-orange-700",
  Sabtu:  "bg-pink-100 text-pink-700",
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
  top:    { style: "thin", color: { argb: argb("BFCCD9") } },
  bottom: { style: "thin", color: { argb: argb("BFCCD9") } },
  left:   { style: "thin", color: { argb: argb("BFCCD9") } },
  right:  { style: "thin", color: { argb: argb("BFCCD9") } },
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

export const downloadJadwalTemplate = async () => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();

  const ws1 = workbook.addWorksheet("TEMPLATE_JADWAL");
  ws1.columns = [
    { width: 14 }, { width: 10 }, { width: 18 },
    { width: 28 }, { width: 28 }, { width: 13 }, { width: 13 },
  ];

  ws1.mergeCells("A1:G1");
  const t1 = ws1.getCell("A1");
  t1.value = "TEMPLATE IMPORT JADWAL PELAJARAN";
  t1.font = { name: "Arial", bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 30;

  ws1.mergeCells("A2:G2");
  const sub = ws1.getCell("A2");
  sub.value = "Isi data di bawah ini. Jangan ubah nama kolom. Baris contoh (4–8) dapat dihapus.";
  sub.font = { name: "Arial", italic: true, size: 9, color: { argb: argb("4B5563") } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("DBEAFE") } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 18;

  const HEADER_LABELS = ["HARI", "KELAS", "JURUSAN", "NAMA_MAPEL", "NAMA_GURU", "JAM_MULAI", "JAM_SELESAI"];
  const hRow = ws1.getRow(3);
  hRow.height = 22;
  HEADER_LABELS.forEach((lbl, i) => {
    applyHeaderStyle(hRow.getCell(i + 1), "3B82F6");
    hRow.getCell(i + 1).value = lbl;
  });

  const SAMPLES = [
    ["SENIN",  "10", "RPL",        "Pemrograman Web",   "Budi Santoso",  "'07:00", "'08:30"],
    ["SELASA", "11", "TKJ",        "Jaringan Komputer", "Siti Rahayu",   "'08:30", "'10:00"],
    ["RABU",   "12", "Multimedia", "Desain Grafis",     "Dewi Lestari",  "'10:00", "'11:30"],
    ["KAMIS",  "10", "RPL",        "Basis Data",        "Ahmad Fauzi",   "'07:00", "'08:30"],
    ["JUMAT",  "11", "TKJ",        "Sistem Operasi",    "Rudi Hermawan", "'08:30", "'10:00"],
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
      } else {
        applyDataStyle(cell, bg, ci >= 5 ? "center" : "left");
      }
    });
  });

  const ws3 = workbook.addWorksheet("PETUNJUK");
  ws3.columns = [{ width: 22 }, { width: 85 }];

  const petunjukRows = [
    ["KOLOM", "KETERANGAN"],
    ["HARI", "SENIN / SELASA / RABU / KAMIS / JUMAT / SABTU (huruf kapital)"],
    ["KELAS", "Nomor tingkatan: 10, 11, atau 12"],
    ["JURUSAN", "Nama jurusan. Contoh: RPL, TKJ, Multimedia"],
    ["NAMA_MAPEL", "Nama mata pelajaran (harus sama persis dengan yang terdaftar di sistem)"],
    ["NAMA_GURU", "Nama lengkap guru pengampu (harus sama persis dengan yang terdaftar di sistem)"],
    ["JAM_MULAI", "Format 24 jam HH:MM — contoh: '07:00 (wajib diawali tanda kutip satu ')"],
    ["JAM_SELESAI", "Format 24 jam HH:MM — contoh: '08:30 (wajib diawali tanda kutip satu ')"],
  ];

  const warnings = [
    "⚠️  Jangan ubah nama kolom header di sheet TEMPLATE_JADWAL",
    "⚠️  Baris contoh (4–8) dapat dihapus sebelum diupload",
    "⚠️  NAMA_MAPEL & NAMA_GURU harus sama persis dengan data sistem",
    "⚠️  Diawali tanda kutip satu (') di depan jam (misal: '07:00) agar Excel tidak mengacaukan format waktu",
    "⚠️  Wajib menggunakan pemisah titik dua (:) untuk jam, bukan titik (.) karena sistem hanya membaca pemisah (:)",
    "⚠️  Simpan file dalam format .xlsx sebelum diupload",
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
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: argb("7F1D1D") } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("FEE2E2") } };
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    cell.border = borderStyle;

    const cellB = ws3.getCell(`B${rowIdx}`);
    cellB.border = borderStyle;
    ws3.getRow(rowIdx).height = 22;
  });

  await downloadBuffer(workbook, "template_import_jadwal.xlsx");
};

export const downloadJadwalUpdateTemplate = async (filteredJadwal) => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();

  const ws1 = workbook.addWorksheet("TEMPLATE_JADWAL");
  ws1.columns = [
    { width: 10 }, // ID
    { width: 14 }, // HARI
    { width: 10 }, // KELAS
    { width: 18 }, // JURUSAN
    { width: 28 }, // NAMA_MAPEL
    { width: 28 }, // NAMA_GURU
    { width: 13 }, // JAM_MULAI
    { width: 13 }, // JAM_SELESAI
  ];

  ws1.mergeCells("A1:H1");
  const t1 = ws1.getCell("A1");
  t1.value = "TEMPLATE UPDATE DATA JADWAL PELAJARAN";
  t1.font = { name: "Arial", bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 30;

  ws1.mergeCells("A2:H2");
  const sub = ws1.getCell("A2");
  sub.value = "Ubah data di bawah ini. Jangan ubah kolom ID. Baris dengan ID akan diupdate, baris tanpa ID akan dibuat baru.";
  sub.font = { name: "Arial", italic: true, size: 9, color: { argb: argb("047857") } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("D1FAE5") } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 18;

  const HEADER_LABELS = ["ID", "HARI", "KELAS", "JURUSAN", "NAMA_MAPEL", "NAMA_GURU", "JAM_MULAI", "JAM_SELESAI"];
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
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb("374151") } };
        cell.fill = makeDataFill("E5E7EB");
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else if (ci === 1) {
        cell.font = { name: "Arial", bold: true, size: 10, color: { argb: argb(dark) } };
        cell.fill = makeDataFill(bg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      } else {
        applyDataStyle(cell, bg, ci >= 6 ? "center" : "left");
      }
    });
  });

  const ws2 = workbook.addWorksheet("PETUNJUK");
  ws2.columns = [{ width: 22 }, { width: 85 }];

  const petunjukRows = [
    ["KOLOM", "KETERANGAN"],
    ["ID", "ID Jadwal yang ada di sistem (Jangan diubah! Digunakan untuk mendeteksi data yang akan diupdate)"],
    ["HARI", "SENIN / SELASA / RABU / KAMIS / JUMAT / SABTU (huruf kapital)"],
    ["KELAS", "Nomor tingkatan: 10, 11, atau 12"],
    ["JURUSAN", "Nama jurusan. Contoh: RPL, TKJ, Multimedia"],
    ["NAMA_MAPEL", "Nama mata pelajaran (harus sama persis dengan yang terdaftar di sistem)"],
    ["NAMA_GURU", "Nama lengkap guru pengampu (harus sama persis dengan yang terdaftar di sistem)"],
    ["JAM_MULAI", "Format 24 jam HH:MM — contoh: '07:00 (wajib diawali tanda kutip satu ')"],
    ["JAM_SELESAI", "Format 24 jam HH:MM — contoh: '08:30 (wajib diawali tanda kutip satu ')"],
  ];

  const warnings = [
    "⚠️  Kolom ID wajib diisi jika Anda ingin mengupdate jadwal yang sudah ada",
    "⚠️  Jika kolom ID dikosongkan atau dihapus, baris tersebut akan dianggap sebagai Jadwal Baru",
    "⚠️  Jangan ubah nama kolom header di sheet TEMPLATE_JADWAL",
    "⚠️  NAMA_MAPEL & NAMA_GURU harus sama persis dengan data sistem",
    "⚠️  Diawali tanda kutip satu (') di depan jam (misal: '07:00) agar Excel tidak mengacaukan format waktu",
    "⚠️  Wajib menggunakan pemisah titik dua (:) untuk jam, bukan titik (.) karena sistem hanya membaca pemisah (:)",
    "⚠️  Simpan file dalam format .xlsx sebelum diupload",
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
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: argb("7F1D1D") } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("FEE2E2") } };
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    cell.border = borderStyle;

    const cellB = ws2.getCell(`B${rowIdx}`);
    cellB.border = borderStyle;
    ws2.getRow(rowIdx).height = 22;
  });

  await downloadBuffer(workbook, "template_update_jadwal.xlsx");
};
