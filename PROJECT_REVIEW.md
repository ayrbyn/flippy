# Flippy — Riwayat Perubahan dan Evaluasi

> Dokumen ini merangkum perubahan yang diminta sepanjang percakapan dan evaluasi berdasarkan source code yang tersedia saat ini. Riwayat ini bukan audit commit Git; perubahan lama dirangkum dari konteks percakapan, lalu dicocokkan dengan implementasi yang masih ada.

## Ringkasan perubahan sejak awal percakapan

### Identitas visual dan navigasi

- Mengarahkan tampilan Flippy ke tema **hand-drawn doodle journal**: warna kertas krem, tinta gelap, aksen pastel, tipografi dekoratif, dan komponen seperti kartu catatan.
- Menata tab navigasi utama menjadi **Home**, **Kata**, **Album**, dan **User**; tab web dan native memiliki implementasi navigasi tersendiri.
- Menambahkan aset maskot flashcard dan menghubungkannya ke konfigurasi ikon Android, iOS, adaptive icon, favicon, serta splash screen.
- Menambahkan halaman User untuk informasi akun, XP, streak, statistik kata, daftar kursus/bahasa, konfirmasi pindah kursus, tambah kursus, dan logout.

### Kata dan album flashcard

- Memisahkan tab **Kata** untuk menambah kata dan tab **Album** untuk mengatur serta melihat kartu.
- Setelah kartu berhasil dibuat, kartu besar langsung ditampilkan dengan animasi flip dan tombol simpan.
- Album disusun otomatis per bulan berdasarkan tanggal pembuatan. Di dalam album, kartu dikelompokkan lagi berdasarkan tanggal dan ditampilkan dalam grid maksimal tiga kolom; kartu dapat dibuka dalam tampilan besar dan dibalik.
- Kartu yang belum tersimpan ke album tetap menjadi draft di tab Kata, sehingga pengguna diminta menyimpannya sebelum membuat kartu berikutnya.
- Pembuatan kartu tidak lagi memiliki batas harian aplikasi; perubahan Edge Function sudah diterapkan ke Supabase.

### Latihan dan progres belajar

- Menambahkan sesi latihan dengan dua cakupan: **Kata baru** (kata berstatus `new`) dan **10 kata acak** dari seluruh kartu. Jika total kartu kurang dari 10, semua kartu dipakai.
- Metode soal diacak per pertanyaan: **melengkapi kalimat** atau **menebak kata dari artinya**.
- Metode kartu hafalan dengan penilaian mandiri “Aku ingat” sudah dihapus karena jawaban mudah dinilai sendiri tanpa bukti.
- Menambahkan `practice_count` pada `user_words`, migrasi sudah diterapkan, dan penghitung awal diisi dari riwayat `practice_logs`.
- Benchmark diperketat: status `memorized` memerlukan 10 jawaban benar tanpa petunjuk; jumlah semua percobaan tetap disimpan terpisah.
- Jika jawaban salah, kata dimasukkan sekali lagi pada akhir sesi. Satu jawaban salah dan pengulangan tersebut masing-masing tercatat sebagai satu latihan.

### Stabilitas pengingat

- Modul notifikasi dimuat secara lazy dan fitur pengingat dinonaktifkan pada Android Expo Go saat modul native yang dibutuhkan tidak tersedia, untuk mencegah crash `ExpoTopicSubscriptionModule`.

## Arsitektur aplikasi saat ini

- **Klien:** Expo SDK 57, React Native 0.86, TypeScript, Expo Router. Route berada di `src/app`; layar aplikasi ada di grup `(app)` dan autentikasi di `(auth)`.
- **Konteks aplikasi:** `AuthProvider` menangani sesi Supabase; `CourseProvider` mengelola kursus dan kursus aktif; `ProfileProvider` mengelola XP dan streak.
- **Layar utama:** Home (`src/app/(app)/index.tsx`), input kata (`explore.tsx`), album (`albums.tsx`), profil/progres akun (`user.tsx`), dan login/daftar.
- **Data dan layanan:** Supabase Auth dan Postgres melalui klien `src/lib/supabase.ts`; pembuatan kartu dilakukan oleh Supabase Edge Function `buat-flashcard`, yang memanggil OpenRouter dan memakai shared cache.
- **Data penting:** `courses`, `user_words`, `shared_flashcards`, `practice_logs`, `profiles`, dan `ai_usage` didefinisikan dalam migrasi. `practice_count` ditambahkan lewat migrasi Oktober 2026.
- **Gaya:** token warna dan font berada di `src/constants/theme.ts`; beberapa layar masih menetapkan styling lokal melalui `StyleSheet`.

## Evaluasi aplikasi

### Yang sudah kuat

- **Alur inti mudah dipahami:** buat kursus, tambah kata, lihat kartu, simpan ke album, lalu latihan.
- **Kartu menjadi objek belajar yang jelas:** definisi, dua contoh, terjemahan, dan pembacaan dapat dilihat tanpa memenuhi daftar utama.
- **Organisasi sesuai permintaan:** arsip bulanan dan tanggal pembuatan membantu pengguna menemukan kembali kartu.
- **Dua jenis latihan saling melengkapi:** isian konteks menguji penggunaan kata; mengingat kata dari arti menguji recall aktif.
- **Progres memiliki sinyal motivasi sederhana:** XP, streak, jumlah kata, dan status hafal memberi rasa kemajuan.
- **Pemisahan UI dan layanan cukup jelas:** query kartu/latihan berada di `src/lib`, halaman di `src/app`, dan komponen lintas layar di `src/components`.
- **Kredensial AI tidak berada di klien:** OpenRouter dipanggil dari Edge Function dengan secret server.

### Status temuan evaluasi

- **Benchmark hafal:** kini menghitung 10 jawaban benar tanpa petunjuk. `practice_count` tetap merekam semua percobaan, tetapi jawaban salah dan jawaban berbantuan tidak menambah `correct_count`.
- **Pengulangan kata salah:** tidak lagi dimasukkan lagi secara otomatis di akhir sesi; satu jawaban tersimpan sebagai satu percobaan. Jadwal ulang salah tetap dicatat untuk dipakai kemudian.
- **Kumpulan kata baru:** definisinya kini eksplisit, yaitu kartu dengan `practice_count = 0` (belum pernah dicoba), bukan kartu yang baru ditambahkan hari ini.
- **Variasi jawaban:** server memeriksa jawaban, menerima alternatif/sinonim yang aman untuk konteks recall, serta alternatif bentuk yang sesuai untuk isian kalimat. Jawaban dengan petunjuk memberi XP lebih sedikit dan tidak meningkatkan benchmark hafal.
- **Konteks lebih kaya:** kartu baru menyertakan dua contoh kalimat berbeda untuk sense yang sama; metode isian mengacak contoh yang diuji. Kartu cache lama tetap memakai contoh tunggal.
- **Penyimpanan latihan dan profil:** jawaban, log, penghitung kartu, XP, serta streak kini ditulis dalam satu transaksi RPC; hasil profil dari server langsung disinkronkan ke UI.
- **Skalabilitas:** pemilihan 10 kartu menggunakan reservoir sampling melewati halaman penuh koleksi. Album juga menggunakan pagination, sehingga tidak berhenti pada batas respons awal Supabase.
- **Permintaan AI bersamaan:** lock singkat per kata/bahasa mencegah beberapa permintaan identik menjalankan generasi OpenRouter sekaligus. Batas harian aplikasi tetap tidak dipasang sesuai permintaan; kuota/batas belanja OpenRouter tetap berada di sisi provider.
- **Identitas visual:** font Caveat kini dibundel dan dimuat lintas platform; token warna doodle/feedback dipusatkan dan konfigurasi tampilan dikunci ke light agar cocok dengan tema kertas yang tersedia. Lisensi Caveat ikut dibundel.
- **Dokumentasi:** README kini berisi arsitektur, langkah setup lokal, konfigurasi backend, keamanan secret, dan alur utama.

### Batasan yang masih perlu dipantau

- Sepuluh jawaban benar adalah benchmark sederhana, bukan bukti retensi jangka panjang. Jawaban benar beruntun dalam waktu singkat masih bisa menaikkan status hafal; uji ulang setelah jeda beberapa hari akan memberi sinyal yang lebih kuat.
- Alternatif jawaban berasal dari AI dan dibatasi ke variasi yang diminta agar aman untuk konteks. Kartu yang sudah tersimpan di cache lama hanya memiliki jawaban kanonis; alternatif baru tersedia pada kartu yang dibuat setelah perubahan ini.
- Pembuatan kartu tetap tanpa batas harian seperti yang diminta. Lock menghindari duplikasi bersamaan, tetapi pemakaian berulang tetap dapat mencapai kuota atau biaya OpenRouter; pengendali belanja harus disetel di akun OpenRouter.
- Kumpulan semua kartu tetap dipilih acak merata sesuai kebutuhan produk. Karena itu jadwal `next_review_at` tidak menjadi filter wajib untuk sesi cakupan semua kartu.

### Penilaian metode belajar

**Kelebihan**

- Melengkapi kalimat membantu menghubungkan kosakata dengan konteks, bukan hanya menghafal terjemahan.
- Menebak kata dari arti meminta pengguna memproduksi jawaban dari ingatan (active recall), yang umumnya lebih menantang daripada sekadar mengenali jawaban.
- Pengacakan metode membuat sesi tidak monoton dan mengurangi kecenderungan pengguna mengantisipasi satu format soal.
- Jadwal pengulangan menempatkan jawaban salah lebih cepat dan memperpanjang jeda untuk streak benar.

**Kekurangan**

- Sinonim dan bentuk jawaban alternatif bergantung pada daftar dari AI; variasi yang tidak tercantum masih dapat dinilai salah.
- Petunjuk huruf pertama dan jumlah huruf tetap memudahkan soal. Sekarang XP dikurangi dan jawaban dengan petunjuk tidak menambah jumlah benar untuk benchmark hafal.
- Satu contoh kalimat yang dihasilkan AI mungkin tidak cukup untuk menjelaskan semua penggunaan kata, khususnya kata polisemi atau idiom.
- Cakupan latihan semua kartu acak memberi variasi, tetapi tidak menjamin pengguna meninjau kata yang paling lama belum dijawab.

## Pekerjaan lanjutan yang paling bernilai

1. Tambahkan uji ingat tertunda yang memakai `next_review_at` tanpa menghilangkan sesi acak semua kartu.
2. Beri cara melaporkan atau mengoreksi alternatif jawaban AI yang keliru.
3. Pertimbangkan evaluasi kualitas definisi dan contoh AI sebelum menampilkan kartu.

