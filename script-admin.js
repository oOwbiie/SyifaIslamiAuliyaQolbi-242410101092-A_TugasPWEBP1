/* ================================================================
   script-admin.js — JavaScript Manajemen Paket Diving
   Project  : DeepBlue Diving — Admin Panel

   Fitur    :
   (1) Form tambah dengan validasi custom
   (2) Tabel render dari array of objects
   (3) Edit: isi form dari data, simpan update array + re-render
   (4) Hapus dengan konfirmasi dialog
   (5) Pencarian real-time nama/kode
   (6) Filter berdasarkan kategori
   (7) Statistik: total, nilai inventaris, stok menipis
   (8) Data tersimpan di localStorage

   Wajib   : const/let, arrow function, array methods,
             DOM manipulation, event delegation, localStorage
================================================================ */


/* ----------------------------------------------------------------
   DATA & STATE
---------------------------------------------------------------- */

// Data awal (contoh) — hanya dipakai jika localStorage kosong
const dataSeedAwal = [
  { kode: 'PKT-001', nama: 'Paket Pemula',  kategori: 'Pemula',   stok: 10, harga: 150000, tanggal: '2025-01-15' },
  { kode: 'PKT-002', nama: 'Paket Menengah',kategori: 'Menengah', stok:  8, harga: 300000, tanggal: '2025-01-15' },
  { kode: 'PKT-003', nama: 'Paket Expert',  kategori: 'Expert',   stok:  4, harga: 500000, tanggal: '2025-02-01' },
  { kode: 'PKT-004', nama: 'Paket Sunrise', kategori: 'Spesial',  stok:  6, harga: 450000, tanggal: '2025-02-10' },
  { kode: 'PKT-005', nama: 'Paket Coral',   kategori: 'Menengah', stok:  3, harga: 275000, tanggal: '2025-03-05' },
];

// (8) Muat data dari localStorage, jika kosong pakai seed awal
const muatDariStorage = () => {
  const raw = localStorage.getItem('deepblue_paket');
  return raw ? JSON.parse(raw) : dataSeedAwal;
};

// (8) Simpan data ke localStorage
const simpanKeStorage = (data) => {
  localStorage.setItem('deepblue_paket', JSON.stringify(data));
};

// State aplikasi
let daftarPaket = muatDariStorage(); // Array utama
let idEdit      = null;              // null = tambah baru, index = mode edit


/* ----------------------------------------------------------------
   (7) STATISTIK — Render stats cards
---------------------------------------------------------------- */
const renderStatistik = () => {
  const total       = daftarPaket.length;
  const totalNilai  = daftarPaket.reduce((sum, p) => sum + (p.harga * p.stok), 0);
  const stokMenipis = daftarPaket.filter(p => p.stok < 5).length;
  const totalSlot   = daftarPaket.reduce((sum, p) => sum + p.stok, 0);

  // Format rupiah
  const formatRp = (angka) =>
    'Rp ' + angka.toLocaleString('id-ID');

  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = `
    <div class="stat-card primary">
      <div class="stat-icon">&#128230;</div>
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total Paket</div>
    </div>
    <div class="stat-card success">
      <div class="stat-icon">&#127915;</div>
      <div class="stat-value">${totalSlot}</div>
      <div class="stat-label">Total Slot Tersedia</div>
    </div>
    <div class="stat-card warning">
      <div class="stat-icon">&#128178;</div>
      <div class="stat-value" style="font-size:1.3rem;">${formatRp(totalNilai)}</div>
      <div class="stat-label">Total Nilai Inventaris</div>
    </div>
    <div class="stat-card danger">
      <div class="stat-icon">&#9888;</div>
      <div class="stat-value">${stokMenipis}</div>
      <div class="stat-label">Stok Menipis (&lt;5 slot)</div>
    </div>
  `;
};


/* ----------------------------------------------------------------
   (2) RENDER TABEL — dari array of objects
---------------------------------------------------------------- */
const renderTabel = (data) => {
  const tbody      = document.getElementById('tabelBody');
  const emptyMsg   = document.getElementById('emptyMsg');
  const totalLabel = document.getElementById('totalLabel');

  totalLabel.textContent = `${data.length} data ditemukan`;

  if (data.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  // Gunakan array method .map() untuk buat baris tabel
  tbody.innerHTML = data.map((paket, index) => {
    const indexAsli = daftarPaket.indexOf(paket); // index di array asli
    const stokClass = paket.stok < 5 ? 'stok-rendah' : 'stok-normal';
    const hargaFmt  = 'Rp ' + paket.harga.toLocaleString('id-ID');
    const tglFmt    = new Date(paket.tanggal).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    return `
      <tr>
        <td><span class="kode-badge">${paket.kode}</span></td>
        <td>${paket.nama}</td>
        <td><span class="kat-badge kat-${paket.kategori}">${paket.kategori}</span></td>
        <td class="${stokClass}">${paket.stok} slot</td>
        <td>${hargaFmt}</td>
        <td>${tglFmt}</td>
        <td>
          <button class="btn-edit"   data-index="${indexAsli}" onclick="editPaket(${indexAsli})">&#9998; Edit</button>
          <button class="btn-hapus"  data-index="${indexAsli}" onclick="hapusPaket(${indexAsli})">&#128465; Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
};


/* ----------------------------------------------------------------
   (5) PENCARIAN REAL-TIME + (6) FILTER KATEGORI
---------------------------------------------------------------- */
const filterData = () => {
  const keyword  = document.getElementById('inputCari').value.toLowerCase().trim();
  const kategori = document.getElementById('filterKategori').value;

  // Gunakan array method .filter()
  const hasil = daftarPaket.filter(paket => {
    const cocoKata = keyword === '' ||
      paket.nama.toLowerCase().includes(keyword) ||
      paket.kode.toLowerCase().includes(keyword);

    const cocoKategori = kategori === '' || paket.kategori === kategori;

    return cocoKata && cocoKategori;
  });

  renderTabel(hasil);
};


/* ----------------------------------------------------------------
   (1) VALIDASI FORM — Validasi custom semua field
---------------------------------------------------------------- */
const validasiForm = () => {
  let valid = true;

  // Helper: tampilkan/hapus error
  const setError = (idInput, idErr, pesan) => {
    const input = document.getElementById(idInput);
    const err   = document.getElementById(idErr);
    if (pesan) {
      err.textContent = pesan;
      input.classList.add('input-error');
      valid = false;
    } else {
      err.textContent = '';
      input.classList.remove('input-error');
    }
  };

  const kode    = document.getElementById('kodePaket').value.trim();
  const nama    = document.getElementById('namaPaket').value.trim();
  const kat     = document.getElementById('kategori').value;
  const stok    = document.getElementById('stok').value;
  const harga   = document.getElementById('harga').value;
  const tanggal = document.getElementById('tanggalMasuk').value;

  // Validasi Kode Paket
  if (!kode) {
    setError('kodePaket', 'errKode', 'Kode paket wajib diisi.');
  } else if (!/^[A-Z]{2,5}-\d{3}$/i.test(kode)) {
    setError('kodePaket', 'errKode', 'Format kode: PKT-001 (huruf-angka 3 digit).');
  } else {
    // Cek duplikasi kode (kecuali saat edit diri sendiri)
    const duplikat = daftarPaket.some((p, i) =>
      p.kode.toLowerCase() === kode.toLowerCase() && i !== idEdit
    );
    setError('kodePaket', 'errKode', duplikat ? 'Kode paket sudah digunakan.' : null);
  }

  // Validasi Nama Paket
  if (!nama) {
    setError('namaPaket', 'errNama', 'Nama paket wajib diisi.');
  } else if (nama.length < 3) {
    setError('namaPaket', 'errNama', 'Nama paket minimal 3 karakter.');
  } else {
    setError('namaPaket', 'errNama', null);
  }

  // Validasi Kategori
  if (!kat) {
    setError('kategori', 'errKategori', 'Pilih salah satu kategori.');
  } else {
    setError('kategori', 'errKategori', null);
  }

  // Validasi Stok
  if (stok === '') {
    setError('stok', 'errStok', 'Stok wajib diisi.');
  } else if (parseInt(stok) < 0) {
    setError('stok', 'errStok', 'Stok tidak boleh negatif.');
  } else {
    setError('stok', 'errStok', null);
  }

  // Validasi Harga
  if (harga === '') {
    setError('harga', 'errHarga', 'Harga wajib diisi.');
  } else if (parseInt(harga) <= 0) {
    setError('harga', 'errHarga', 'Harga harus lebih dari 0.');
  } else {
    setError('harga', 'errHarga', null);
  }

  // Validasi Tanggal
  if (!tanggal) {
    setError('tanggalMasuk', 'errTanggal', 'Tanggal masuk wajib diisi.');
  } else {
    setError('tanggalMasuk', 'errTanggal', null);
  }

  return valid;
};


/* ----------------------------------------------------------------
   SIMPAN PAKET — Tambah baru atau Update (Edit)
---------------------------------------------------------------- */
const simpanPaket = () => {
  if (!validasiForm()) return; // Berhenti jika validasi gagal

  const dataBaru = {
    kode    : document.getElementById('kodePaket').value.trim().toUpperCase(),
    nama    : document.getElementById('namaPaket').value.trim(),
    kategori: document.getElementById('kategori').value,
    stok    : parseInt(document.getElementById('stok').value),
    harga   : parseInt(document.getElementById('harga').value),
    tanggal : document.getElementById('tanggalMasuk').value,
  };

  if (idEdit !== null) {
    // (3) MODE EDIT — update array di index yg dipilih
    daftarPaket[idEdit] = dataBaru;
    idEdit = null;
    document.getElementById('formTitle').textContent = '+ Tambah Paket Baru';
    document.getElementById('btnBatal').style.display = 'none';
    document.getElementById('btnSimpan').textContent = '💾 Simpan Paket';
  } else {
    // MODE TAMBAH — push ke array
    daftarPaket.push(dataBaru);
  }

  // (8) Simpan ke localStorage
  simpanKeStorage(daftarPaket);

  // Reset form
  resetForm();

  // Re-render semua komponen
  renderStatistik();
  filterData();

  // Scroll ke tabel
  document.querySelector('.table-wrapper').scrollIntoView({ behavior: 'smooth' });
};


/* ----------------------------------------------------------------
   (3) EDIT PAKET — Isi form dengan data yang dipilih
---------------------------------------------------------------- */
const editPaket = (index) => {
  const paket = daftarPaket[index];
  idEdit = index;

  // Isi semua field form dengan data paket
  document.getElementById('kodePaket').value    = paket.kode;
  document.getElementById('namaPaket').value    = paket.nama;
  document.getElementById('kategori').value     = paket.kategori;
  document.getElementById('stok').value         = paket.stok;
  document.getElementById('harga').value        = paket.harga;
  document.getElementById('tanggalMasuk').value = paket.tanggal;

  // Update tampilan form ke mode edit
  document.getElementById('formTitle').textContent     = '✏️ Edit Paket: ' + paket.nama;
  document.getElementById('btnSimpan').textContent     = '💾 Update Paket';
  document.getElementById('btnBatal').style.display    = 'inline-block';

  // Scroll ke form
  document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
};


/* ----------------------------------------------------------------
   BATAL EDIT — Kembali ke mode tambah baru
---------------------------------------------------------------- */
const batalEdit = () => {
  idEdit = null;
  resetForm();
  document.getElementById('formTitle').textContent  = '+ Tambah Paket Baru';
  document.getElementById('btnBatal').style.display = 'none';
  document.getElementById('btnSimpan').textContent  = '💾 Simpan Paket';
};


/* ----------------------------------------------------------------
   (4) HAPUS PAKET — Dengan konfirmasi dialog
---------------------------------------------------------------- */
const hapusPaket = (index) => {
  const paket = daftarPaket[index];

  // Konfirmasi menggunakan confirm() dialog
  const konfirmasi = confirm(
    `⚠️ KONFIRMASI HAPUS\n\n` +
    `Apakah kamu yakin ingin menghapus paket:\n` +
    `"${paket.nama}" (${paket.kode})?\n\n` +
    `Tindakan ini tidak dapat dibatalkan.`
  );

  if (!konfirmasi) return; // Batalkan jika user klik "Cancel"

  // Gunakan array method .filter() untuk hapus berdasarkan index
  daftarPaket = daftarPaket.filter((_, i) => i !== index);

  // (8) Update localStorage
  simpanKeStorage(daftarPaket);

  // Re-render
  renderStatistik();
  filterData();

  // Jika sedang edit item yang dihapus, reset form
  if (idEdit === index) batalEdit();
};


/* ----------------------------------------------------------------
   HELPER — Reset semua field form
---------------------------------------------------------------- */
const resetForm = () => {
  const fieldsId = ['kodePaket', 'namaPaket', 'kategori', 'stok', 'harga', 'tanggalMasuk'];
  const errorsId = ['errKode', 'errNama', 'errKategori', 'errStok', 'errHarga', 'errTanggal'];

  // Gunakan array method .forEach()
  fieldsId.forEach(id => {
    const el = document.getElementById(id);
    el.value = el.tagName === 'SELECT' ? '' : '';
    el.classList.remove('input-error');
  });

  errorsId.forEach(id => {
    document.getElementById(id).textContent = '';
  });
};


/* ----------------------------------------------------------------
   INIT — Jalankan saat halaman pertama kali dibuka
---------------------------------------------------------------- */
const init = () => {
  renderStatistik();
  renderTabel(daftarPaket);
};

// Panggil init saat DOM siap
document.addEventListener('DOMContentLoaded', init);
