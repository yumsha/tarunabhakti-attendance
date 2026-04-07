import { useState, useEffect } from "react";
import DaftarKehadiranKelas from "./DaftarKehadiranKelas";
import KehadiranTable from "./KehadiranTable";

export default function AttendanceMain() {
  const [kelasId, setKelasId] = useState(null);

  useEffect(() => {
    const updateState = () => {
      const params = new URLSearchParams(window.location.search);
      setKelasId(params.get("kelasId"));
    };

    updateState();

    // Astro transition support
    document.addEventListener("astro:page-load", updateState);
    document.addEventListener("astro:after-swap", updateState);
    window.addEventListener("popstate", updateState);

    return () => {
      document.removeEventListener("astro:page-load", updateState);
      document.removeEventListener("astro:after-swap", updateState);
      window.removeEventListener("popstate", updateState);
    };
  }, []);

  if (kelasId) {
    return <KehadiranTable />;
  }

  return <DaftarKehadiranKelas />;
}
