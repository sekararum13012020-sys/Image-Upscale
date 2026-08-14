// ============================================================
// KONFIGURASI API
// ============================================================
const API_HD = "https://api-faa.my.id/faa/hdv2";
const API_ULTRA_HD = "https://api-faa.my.id/faa/hdv4";

// ============================================================
// ELEMEN HALAMAN
// ============================================================
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const urlInput = document.getElementById("urlInput");
const previewBox = document.getElementById("previewBox");
const smallPreview = document.getElementById("smallPreview");
const previewName = document.getElementById("previewName");

const loadingState = document.getElementById("loadingState");
const loadingStatusText = document.getElementById("loadingStatusText");
const errorState = document.getElementById("errorState");
const errorText = document.getElementById("errorText");
const resultSection = document.getElementById("resultSection");

const comparisonContainer = document.getElementById("comparisonContainer");
const beforeImageWrapper = document.getElementById("beforeImageWrapper");
const sliderHandle = document.getElementById("sliderHandle");
const imgBefore = document.getElementById("imgBefore");
const imgAfter = document.getElementById("imgAfter");
const downloadBtn = document.getElementById("downloadBtn");

let currentMode = "gallery";
let selectedFile = null;
let isDragging = false;

// ============================================================
// PILIH MODE: GALERI / LINK (DIPERBAIKI AGAR KLIK TOMBOL RESPONSIF)
// ============================================================
function switchInputMode(mode) {
  currentMode = mode;
  const galleryArea = document.getElementById("galleryInputArea");
  const urlArea = document.getElementById("urlInputArea");
  const modeGalleryBtn = document.getElementById("modeGalleryBtn");
  const modeUrlBtn = document.getElementById("modeUrlBtn");

  if (mode === 'gallery') {
    galleryArea.classList.remove("hidden");
    urlArea.classList.add("hidden");
    modeGalleryBtn.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md";
    modeUrlBtn.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 text-slate-400 hover:text-white";
  } else {
    galleryArea.classList.add("hidden");
    urlArea.classList.remove("hidden");
    modeUrlBtn.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md";
    modeGalleryBtn.className = "flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 text-slate-400 hover:text-white";
  }
}

// ============================================================
// PILIH GAMBAR DARI GALERI / DRAG & DROP
// ============================================================
dropZone.addEventListener("click", () => {
  fileInput.value = ""; // Reset agar bisa pilih file yang sama berulang kali
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("border-cyan-500", "bg-cyan-500/5");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("border-cyan-500", "bg-cyan-500/5");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("border-cyan-500", "bg-cyan-500/5");
  if (e.dataTransfer.files.length > 0) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

function handleFileSelect(file) {
  if (!file.type.startsWith("image/")) {
    alert("Harap pilih berkas gambar yang valid!");
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    alert("File terlalu besar! Maksimal 20MB.");
    return;
  }
  selectedFile = file;
  previewName.innerText = file.name;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    smallPreview.src = e.target.result;
    previewBox.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function clearSelectedImage() {
  selectedFile = null;
  fileInput.value = "";
  previewBox.classList.add("hidden");
}

// ============================================================
// FUNGSI UTAMA: PROSES PERBAIKAN GAMBAR (MENGATASI GAGAL & URL)
// ============================================================
async function processImage() {
  hideError();
  let imageUrl = "";

  // Validasi input berdasarkan mode yang aktif
  if (currentMode === "gallery") {
    if (!selectedFile) {
      showError("Pilih foto dari galeri terlebih dahulu!");
      return;
    }
  } else {
    imageUrl = urlInput.value.trim();
    if (!imageUrl) {
      showError("Masukkan URL atau tautan gambar terlebih dahulu!");
      return;
    }
  }

  showLoading(true);
  resultSection.classList.add("hidden");

  try {
    // Jika mode galeri, ubah file lokal menjadi URL internet via Telegra.ph agar API tidak error (payload too large / URI too long)
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
        throw new Error("Format respons server upload tidak valid.");
      }

      imageUrl = "https://telegra.ph" + uploadData[0].src;
    }

    // Panggil API AI Upscaler
    loadingStatusText.innerText = "🧠 Meningkatkan kualitas gambar dengan AI...\nMohon tunggu beberapa detik.";
    
    const qualityMode = document.querySelector('input[name="quality"]:checked').value;
    let hdResultUrl = "";

    if (qualityMode === "hd") {
      const res = await fetch(`${API_HD}?url=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) throw new Error(`Server HD error: ${res.status}`);
      
      const data = await res.json();
      if (!data.status || !data.result) throw new Error(data.error || "Gagal memproses HD");
      hdResultUrl = data.result;
    } else {
      const res = await fetch(`${API_ULTRA_HD}?image=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) throw new Error(`Server Ultra HD error: ${res.status}`);
      
      const data = await res.json();
      if (!data.status || !data.result?.image_upscaled) throw new Error(data.error || "Gagal memproses Ultra HD");
      hdResultUrl = data.result.image_upscaled;
    }

    if (!hdResultUrl) throw new Error("Tidak ada hasil gambar yang diperbaiki.");
    
    // Tampilkan hasil perbandingan
    const originalPreviewUrl = currentMode === "gallery" ? smallPreview.src : imageUrl;
    setupComparisonSlider(originalPreviewUrl, hdResultUrl);

  } catch (err) {
    console.error("Error Detail:", err);
    showError("⚠️ " + (err.message || "Terjadi kesalahan tidak diketahui"));
  } finally {
    showLoading(false);
  }
}

// ============================================================
// TAMPILKAN HASIL & SLIDER PERBANDINGAN
// ============================================================
function setupComparisonSlider(beforeUrl, afterUrl) {
  imgBefore.src = beforeUrl;
  imgAfter.src = afterUrl;
  downloadBtn.href = afterUrl;
  downloadBtn.target = "_blank";

  imgAfter.onload = () => {
    alignImageSizes();
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth" });
  };

  imgAfter.onerror = () => {
    showError("Gagal memuat hasil gambar yang dijernihkan.");
    showLoading(false);
  };
}

function alignImageSizes() {
  const containerWidth = comparisonContainer.offsetWidth;
  imgBefore.style.width = containerWidth + "px";
  imgAfter.style.width = containerWidth + "px";
}

window.addEventListener("resize", alignImageSizes);

// Geser slider perbandingan (Before vs After)
function moveSlider(x) {
  const rect = comparisonContainer.getBoundingClientRect();
  let position = x - rect.left;
  if (position < 0) position = 0;
  if (position > rect.width) position = rect.width;

  const percentage = (position / rect.width) * 100;
  beforeImageWrapper.style.width = `${percentage}%`;
  sliderHandle.style.left = `${percentage}%`;
}

sliderHandle.addEventListener("mousedown", () => isDragging = true);
window.addEventListener("mouseup", () => isDragging = false);
comparisonContainer.addEventListener("mousemove", (e) => {
  if (isDragging) moveSlider(e.clientX);
});

sliderHandle.addEventListener("touchstart", (e) => {
  isDragging = true;
  e.preventDefault();
});
window.addEventListener("touchend", () => isDragging = false);
comparisonContainer.addEventListener("touchmove", (e) => {
  if (isDragging && e.touches[0]) moveSlider(e.touches[0].clientX);
});

// ============================================================
// BANTUAN TAMPILAN (UI HELPERS)
// ============================================================
function showLoading(state) {
  loadingState.classList.toggle("hidden", !state);
}
function showError(msg) {
  errorText.innerText = msg;
  errorState.classList.remove("hidden");
}
function hideError() {
  errorState.classList.add("hidden");
}
