function normalizeStatus(status) {
  return String(status || "").toUpperCase();
}

function resolveFinalStatus(siswa) {
  const savedStatus = normalizeStatus(siswa?.status_saat_ini);
  if (savedStatus) return savedStatus;
  if (siswa?.tap_in) return "HADIR";
  return "ALPHA";
}

export function buildWalasAttendanceSummary(payload, totalSiswa = 0) {
  const daftarSiswa = Array.isArray(payload?.daftar_siswa) ? payload.daftar_siswa : [];
  const total = totalSiswa > 0 ? totalSiswa : payload?.summary?.total || daftarSiswa.length;

  const summary = daftarSiswa.reduce(
    (acc, siswa) => {
      const finalStatus = resolveFinalStatus(siswa);
      const statusTapIn = normalizeStatus(siswa?.status_tapin);
      const sudahTap = !!siswa?.tap_in;

      if (finalStatus !== "HADIR") {
        return acc;
      }

      if (!sudahTap) {
        acc.manual_hadir += 1;
      } else if (statusTapIn === "TERLAMBAT") {
        acc.terlambat += 1;
      } else {
        acc.tepat_waktu += 1;
      }

      return acc;
    },
    {
      tepat_waktu: 0,
      terlambat: 0,
      manual_hadir: 0,
    }
  );

  const hadir =
    summary.tepat_waktu + summary.terlambat + summary.manual_hadir;

  return {
    total,
    hadir,
    belum_hadir: Math.max(0, total - hadir),
    ...summary,
  };
}
