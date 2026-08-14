// ============================================================
// FUNGSI UTAMA: PROSES PERBAIKAN GAMBAR (DIPERBAIKI)
// ============================================================
async function processImage() {
  hideError();
  let imageUrl = "";

  // Validasi input
  if (currentMode === "gallery") {
    if (!selectedFile) {
      showError("Pilih foto dari galeri dulu ya!");
      return;
    }
  } else {
    imageUrl = urlInput.value.trim();
    if (!imageUrl) {
      showError("Masukkan URL gambar dulu ya!");
      return;
    }
  }

  showLoading(true);
  resultSection.classList.add("hidden");

  try {
    // ✅ FIX UTAMA: Upload file galeri ke server sementara (Telegra.ph) agar menghasilkan URL HTTP, 
    // sehingga tidak menyebabkan error akibat string Base64 yang terlalu panjang di parameter API.
    if (currentMode === "gallery") {
      loadingStatusText.innerText = "📤 Mengunggah gambar galeri ke server sementara...";
      
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("https://telegra.ph/upload", {
        method: "POST",
        body: formData
      });

      if (!uploadRes.ok) throw new Error("Gagal mengunggah file galeri ke server.");
      
      const uploadData = await uploadRes.json();
      if (!uploadData || !uploadData[0] || !uploadData[0].src) {
        throw new Error("Format respons upload tidak valid.");
      }

      // Dapatkan URL absolut dari server telegra.ph
      imageUrl = "https://telegra.ph" + uploadData[0].src;
      console.log("URL Gambar Galeri Berhasil Dibuat:", imageUrl);
    }

    // Panggil API AI Upscaler
    loadingStatusText.innerText = "🧠 Meningkatkan kualitas gambar dengan AI...\nMohon tunggu beberapa detik, AI sedang meningkatkan resolusi foto kamu.";
    
    const qualityMode = document.querySelector('input[name="quality"]:checked').value;
    let hdResultUrl = "";

    if (qualityMode === "hd") {
      // HD pakai ?url=
      const res = await fetch(`${API_HD}?url=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) throw new Error(`Server HD error: ${res.status}`);
      
      const data = await res.json();
      console.log("Respon HD:", data);
      
      if (!data.status || !data.result) throw new Error(data.error || "Gagal memproses HD");
      hdResultUrl = data.result;
    } else {
      // Ultra HD pakai ?image=
      const res = await fetch(`${API_ULTRA_HD}?image=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) throw new Error(`Server Ultra HD error: ${res.status}`);
      
      const data = await res.json();
      console.log("Respon Ultra HD:", data);
      
      if (!data.status || !data.result?.image_upscaled) throw new Error(data.error || "Gagal memproses Ultra HD");
      hdResultUrl = data.result.image_upscaled;
    }

    if (!hdResultUrl) throw new Error("Tidak ada hasil gambar yang diperbaiki");
    
    // Tampilkan hasil perbandingan (gunakan imageUrl asli sebagai "Sebelum")
    const originalPreviewUrl = currentMode === "gallery" ? smallPreview.src : imageUrl;
    setupComparisonSlider(originalPreviewUrl, hdResultUrl);

  } catch (err) {
    console.error("Error Lengkap:", err);
    showError("⚠️ " + (err.message || "Terjadi kesalahan tidak diketahui"));
  } finally {
    showLoading(false);
  }
}
